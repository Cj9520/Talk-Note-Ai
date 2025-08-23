from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from pydantic import BaseModel, ValidationError
from typing import List, Optional, Dict, Any
import os
import tempfile
import logging
import asyncio
from datetime import datetime, timezone
import uuid
from contextlib import asynccontextmanager
import aiofiles

# Import our custom modules
from services.transcription import WhisperTranscriptionService
from services.summarization import HuggingFaceSummarizationService
from services.database import DatabaseService
from models.note import NoteCreate, NoteResponse, NoteUpdate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

# Configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_AUDIO_TYPES = {
    'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 
    'audio/webm', 'audio/m4a', 'audio/aac', 'audio/*'
}

# Global services (will be initialized in lifespan)
transcription_service: Optional[WhisperTranscriptionService] = None
summarization_service: Optional[HuggingFaceSummarizationService] = None
database_service: Optional[DatabaseService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for proper startup and shutdown"""
    global transcription_service, summarization_service, database_service
    
    # Startup
    logger.info("Starting Voice Notes AI API...")
    
    try:
        # Initialize services
        transcription_service = WhisperTranscriptionService()
        summarization_service = HuggingFaceSummarizationService()
        database_service = DatabaseService()
        
        logger.info("All services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Voice Notes AI API...")
    if database_service:
        await database_service.close()
    logger.info("Cleanup completed")

app = FastAPI(
    title="Voice Notes AI API",
    description="Free, open-source voice transcription and summarization API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "https://your-frontend-domain.com")
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Dependency to get services
async def get_services() -> Dict[str, Any]:
    """Dependency to get initialized services"""
    if not all([transcription_service, summarization_service, database_service]):
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    return {
        "transcription": transcription_service,
        "summarization": summarization_service,
        "database": database_service
    }

# Validation functions
def validate_audio_file(file: UploadFile) -> None:
    """Validate uploaded audio file"""
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Very flexible audio type validation - accept any audio type or if content_type is missing
    if file.content_type and not (
        file.content_type in ALLOWED_AUDIO_TYPES or 
        file.content_type.startswith('audio/') or
        file.content_type == 'application/octet-stream'  # Some browsers send this
    ):
        logger.warning(f"Unexpected content type: {file.content_type}, but proceeding anyway")
        # Don't raise error, just log warning

def validate_text_input(text: str, max_length: int = 10000) -> str:
    """Validate text input"""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(text) > max_length:
        raise HTTPException(
            status_code=400, 
            detail=f"Text too long. Maximum length is {max_length} characters"
        )
    
    return text.strip()

# Background task for cleanup
async def cleanup_temp_file(file_path: str):
    """Clean up temporary file"""
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to cleanup temp file {file_path}: {e}")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Voice Notes AI API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "features": [
            "Audio transcription with Whisper.cpp",
            "Text summarization with HuggingFace",
            "Note storage and retrieval"
        ],
        "endpoints": {
            "transcribe": "/transcribe",
            "summarize": "/summarize",
            "process_audio": "/process-audio",
            "notes": "/notes",
            "health": "/health"
        }
    }

@app.post("/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    services: Dict[str, Any] = Depends(get_services)
):
    """
    Transcribe audio file using Whisper.cpp (free, local processing)
    """
    start_time = datetime.now()
    
    # Debug logging
    logger.info(f"Received audio file: {audio_file.filename}, type: {audio_file.content_type}, size: {audio_file.size}")
    
    try:
        # Validate file
        validate_audio_file(audio_file)
        logger.info("File validation passed")
        
        # Create temporary file
        temp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                content = await audio_file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Transcribe using Whisper.cpp
            transcript = await services["transcription"].transcribe(temp_file_path)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "success": True,
                "transcript": transcript,
                "model": "whisper.cpp",
                "processing_time_seconds": processing_time,
                "file_size_bytes": len(content),
                "original_filename": audio_file.filename
            }
            
        finally:
            # Clean up temporary file
            if temp_file_path and background_tasks:
                background_tasks.add_task(cleanup_temp_file, temp_file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Transcription failed. Please try again.")

@app.post("/summarize")
async def summarize_text(
    text: str = Form(...),
    max_length: int = Form(150),
    services: Dict[str, Any] = Depends(get_services)
):
    """
    Summarize text using HuggingFace transformers (free, local processing)
    """
    start_time = datetime.now()
    
    try:
        # Validate input
        validated_text = validate_text_input(text)
        
        # Validate max_length
        if max_length < 10 or max_length > 500:
            raise HTTPException(status_code=400, detail="max_length must be between 10 and 500")
        
        # Summarize using HuggingFace
        summary = await services["summarization"].summarize(validated_text, max_length)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "success": True,
            "summary": summary,
            "model": "facebook/bart-large-cnn",
            "processing_time_seconds": processing_time,
            "input_length": len(validated_text),
            "output_length": len(summary)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summarization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Summarization failed. Please try again.")

@app.post("/process-audio")
async def process_audio(
    audio_file: UploadFile = File(...),
    title: str = Form(...),
    tags: str = Form(""),
    background_tasks: BackgroundTasks = None,
    services: Dict[str, Any] = Depends(get_services)
):
    """
    Complete audio processing pipeline: transcribe + summarize + save
    """
    start_time = datetime.now()
    
    try:
        # Validate inputs
        validate_audio_file(audio_file)
        validated_title = validate_text_input(title, max_length=200)
        
        # Process tags
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        
        # Create temporary file
        temp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                content = await audio_file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Step 1: Transcribe audio
            transcript = await services["transcription"].transcribe(temp_file_path)
            
            # Step 2: Summarize transcript
            summary = await services["summarization"].summarize(transcript, 150)
            
            # Step 3: Save to database
            audio_filename = f"{uuid.uuid4()}.wav"
            
            note_data = NoteCreate(
                title=validated_title,
                transcript=transcript,
                summary=summary,
                tags=tag_list,
                audio_filename=audio_filename
            )
            
            # Save audio file
            await services["database"].save_audio_file(audio_filename, content)
            
            # Save note to database
            saved_note = await services["database"].create_note(note_data)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "success": True,
                "note": saved_note,
                "processing": {
                    "transcription_model": "whisper.cpp",
                    "summarization_model": "facebook/bart-large-cnn",
                    "processing_time_seconds": processing_time,
                    "file_size_bytes": len(content)
                }
            }
            
        finally:
            # Clean up temporary file
            if temp_file_path and background_tasks:
                background_tasks.add_task(cleanup_temp_file, temp_file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Audio processing failed. Please try again.")

@app.get("/notes")
async def get_notes(
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None,
    services: Dict[str, Any] = Depends(get_services)
):
    """
    Get all notes with optional search and pagination
    """
    try:
        # Validate pagination parameters
        if skip < 0:
            raise HTTPException(status_code=400, detail="skip must be non-negative")
        if limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="limit must be between 1 and 100")
        
        notes = await services["database"].get_notes(skip=skip, limit=limit, search=search)
        
        return {
            "success": True,
            "notes": notes,
            "total": len(notes),
            "pagination": {
                "skip": skip,
                "limit": limit,
                "has_more": len(notes) == limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch notes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch notes. Please try again.")

@app.get("/notes/{note_id}")
async def get_note(
    note_id: str,
    services: Dict[str, Any] = Depends(get_services)
):
    """
    Get a specific note by ID
    """
    try:
        # Validate note_id format (basic MongoDB ObjectId validation)
        if len(note_id) != 24:
            raise HTTPException(status_code=400, detail="Invalid note ID format")
        
        note = await services["database"].get_note(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {"success": True, "note": note}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch note {note_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch note. Please try again.")

@app.delete("/notes/{note_id}")
async def delete_note(
    note_id: str,
    services: Dict[str, Any] = Depends(get_services)
):
    """
    Delete a note by ID
    """
    try:
        # Validate note_id format
        if len(note_id) != 24:
            raise HTTPException(status_code=400, detail="Invalid note ID format")
        
        success = await services["database"].delete_note(note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {"success": True, "message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete note {note_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete note. Please try again.")

@app.get("/health")
async def health_check(services: Dict[str, Any] = Depends(get_services)):
    """
    Health check endpoint with service status
    """
    try:
        # Check database connection
        db_stats = await services["database"].get_note_stats()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "services": {
                "transcription": "whisper.cpp",
                "summarization": "huggingface",
                "database": "mongodb"
            },
            "database_stats": {
                "total_notes": db_stats.get("total_notes", 0),
                "recent_activity": db_stats.get("recent_activity", 0)
            },
            "uptime": "running"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return {
            "status": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }

@app.get("/stats")
async def get_stats(services: Dict[str, Any] = Depends(get_services)):
    """
    Get application statistics
    """
    try:
        stats = await services["database"].get_note_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get statistics")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )
