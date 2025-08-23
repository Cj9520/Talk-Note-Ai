import motor.motor_asyncio
from typing import List, Optional, Dict, Any
import os
import aiofiles
from datetime import datetime
import logging
from bson import ObjectId

from models.note import NoteCreate, NoteResponse, NoteUpdate, NoteSearch

logger = logging.getLogger(__name__)

class DatabaseService:
    """
    Database service for MongoDB operations using motor (async MongoDB driver)
    """
    
    def __init__(self):
        # Get MongoDB connection string from environment or use default
        self.mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        self.database_name = os.getenv("MONGODB_DATABASE", "voice_notes")
        self.audio_storage_path = os.getenv("AUDIO_STORAGE_PATH", "./audio_files")
        
        # Initialize MongoDB client
        self.client = motor.motor_asyncio.AsyncIOMotorClient(self.mongo_url)
        self.database = self.client[self.database_name]
        self.notes_collection = self.database.notes
        
        # Ensure audio storage directory exists
        os.makedirs(self.audio_storage_path, exist_ok=True)
    
    async def create_note(self, note_data: NoteCreate) -> NoteResponse:
        """
        Create a new note in the database
        """
        try:
            note_dict = note_data.dict()
            note_dict["created_at"] = datetime.utcnow()
            note_dict["updated_at"] = datetime.utcnow()
            
            result = await self.notes_collection.insert_one(note_dict)
            
            # Get the created note
            created_note = await self.notes_collection.find_one({"_id": result.inserted_id})

            # Map Mongo document to NoteResponse with string id
            if created_note:
                return NoteResponse(
                    id=str(created_note.get("_id")),
                    title=created_note.get("title", ""),
                    transcript=created_note.get("transcript", ""),
                    summary=created_note.get("summary", ""),
                    tags=created_note.get("tags", []),
                    audio_filename=created_note.get("audio_filename", ""),
                    created_at=created_note.get("created_at"),
                    updated_at=created_note.get("updated_at"),
                )
            
            # Fallback
            raise RuntimeError("Failed to load created note")
            
        except Exception as e:
            logger.error(f"Error creating note: {e}")
            raise
    
    async def get_note(self, note_id: str) -> Optional[NoteResponse]:
        """
        Get a note by ID
        """
        try:
            note = await self.notes_collection.find_one({"_id": ObjectId(note_id)})
            if note:
                return NoteResponse(
                    id=str(note.get("_id")),
                    title=note.get("title", ""),
                    transcript=note.get("transcript", ""),
                    summary=note.get("summary", ""),
                    tags=note.get("tags", []),
                    audio_filename=note.get("audio_filename", ""),
                    created_at=note.get("created_at"),
                    updated_at=note.get("updated_at"),
                )
            return None
        except Exception as e:
            logger.error(f"Error getting note {note_id}: {e}")
            return None
    
    async def get_notes(
        self, 
        skip: int = 0, 
        limit: int = 50, 
        search: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[NoteResponse]:
        """
        Get notes with optional search and filtering
        """
        try:
            # Build query
            query = {}
            
            if search:
                # Text search across title, transcript, and summary
                query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"transcript": {"$regex": search, "$options": "i"}},
                    {"summary": {"$regex": search, "$options": "i"}},
                    {"tags": {"$in": [search]}}
                ]
            
            if tags:
                query["tags"] = {"$in": tags}
            
            # Get notes with pagination
            cursor = self.notes_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
            notes = []
            
            async for note in cursor:
                notes.append(
                    NoteResponse(
                        id=str(note.get("_id")),
                        title=note.get("title", ""),
                        transcript=note.get("transcript", ""),
                        summary=note.get("summary", ""),
                        tags=note.get("tags", []),
                        audio_filename=note.get("audio_filename", ""),
                        created_at=note.get("created_at"),
                        updated_at=note.get("updated_at"),
                    )
                )
            
            return notes
            
        except Exception as e:
            logger.error(f"Error getting notes: {e}")
            return []
    
    async def update_note(self, note_id: str, note_update: NoteUpdate) -> Optional[NoteResponse]:
        """
        Update a note
        """
        try:
            update_data = note_update.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow()
            
            result = await self.notes_collection.update_one(
                {"_id": ObjectId(note_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return await self.get_note(note_id)
            return None
            
        except Exception as e:
            logger.error(f"Error updating note {note_id}: {e}")
            return None
    
    async def delete_note(self, note_id: str) -> bool:
        """
        Delete a note and its associated audio file
        """
        try:
            # Get the note first to get the audio filename
            note = await self.get_note(note_id)
            if not note:
                return False
            
            # Delete from database
            result = await self.notes_collection.delete_one({"_id": ObjectId(note_id)})
            
            if result.deleted_count > 0:
                # Delete audio file
                audio_file_path = os.path.join(self.audio_storage_path, note.audio_filename)
                if os.path.exists(audio_file_path):
                    os.remove(audio_file_path)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting note {note_id}: {e}")
            return False
    
    async def save_audio_file(self, filename: str, audio_content: bytes) -> bool:
        """
        Save audio file to local storage
        """
        try:
            file_path = os.path.join(self.audio_storage_path, filename)
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(audio_content)
            return True
        except Exception as e:
            logger.error(f"Error saving audio file {filename}: {e}")
            return False
    
    async def get_audio_file(self, filename: str) -> Optional[bytes]:
        """
        Get audio file content
        """
        try:
            file_path = os.path.join(self.audio_storage_path, filename)
            if os.path.exists(file_path):
                async with aiofiles.open(file_path, 'rb') as f:
                    return await f.read()
            return None
        except Exception as e:
            logger.error(f"Error reading audio file {filename}: {e}")
            return None
    
    async def get_note_stats(self) -> Dict[str, Any]:
        """
        Get statistics about notes
        """
        try:
            # Total notes
            total_notes = await self.notes_collection.count_documents({})
            
            # Most used tags
            pipeline = [
                {"$unwind": "$tags"},
                {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            
            tag_stats = []
            async for tag_stat in self.notes_collection.aggregate(pipeline):
                tag_stats.append({
                    "tag": tag_stat["_id"],
                    "count": tag_stat["count"]
                })
            
            # Recent activity (last 7 days)
            seven_days_ago = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_notes = await self.notes_collection.count_documents({
                "created_at": {"$gte": seven_days_ago}
            })
            
            return {
                "total_notes": total_notes,
                "most_used_tags": tag_stats,
                "recent_activity": recent_notes,
                "storage_path": self.audio_storage_path
            }
            
        except Exception as e:
            logger.error(f"Error getting note stats: {e}")
            return {
                "total_notes": 0,
                "most_used_tags": [],
                "recent_activity": 0,
                "storage_path": self.audio_storage_path
            }
    
    async def search_notes(self, search_params: NoteSearch) -> List[NoteResponse]:
        """
        Advanced search with multiple filters
        """
        try:
            query = {}
            
            # Text search
            if search_params.query:
                query["$or"] = [
                    {"title": {"$regex": search_params.query, "$options": "i"}},
                    {"transcript": {"$regex": search_params.query, "$options": "i"}},
                    {"summary": {"$regex": search_params.query, "$options": "i"}}
                ]
            
            # Tag filter
            if search_params.tags:
                query["tags"] = {"$in": search_params.tags}
            
            # Date range filter
            date_filter = {}
            if search_params.date_from:
                date_filter["$gte"] = search_params.date_from
            if search_params.date_to:
                date_filter["$lte"] = search_params.date_to
            
            if date_filter:
                query["created_at"] = date_filter
            
            # Execute search
            cursor = self.notes_collection.find(query).sort("created_at", -1).skip(search_params.skip).limit(search_params.limit)
            notes = []
            
            async for note in cursor:
                notes.append(
                    NoteResponse(
                        id=str(note.get("_id")),
                        title=note.get("title", ""),
                        transcript=note.get("transcript", ""),
                        summary=note.get("summary", ""),
                        tags=note.get("tags", []),
                        audio_filename=note.get("audio_filename", ""),
                        created_at=note.get("created_at"),
                        updated_at=note.get("updated_at"),
                    )
                )
            
            return notes
            
        except Exception as e:
            logger.error(f"Error searching notes: {e}")
            return []
    
    async def close(self):
        """
        Close database connection
        """
        self.client.close()
