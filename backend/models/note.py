from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    transcript: str = Field(..., description="Transcribed text from audio")
    summary: str = Field(..., description="AI-generated summary")
    tags: List[str] = Field(default=[], description="Tags for categorization")
    audio_filename: str = Field(..., description="Filename of the audio file")

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    transcript: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None

class NoteResponse(NoteBase):
    id: str = Field(..., description="Note ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NoteSearch(BaseModel):
    query: str = Field(..., description="Search query")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    limit: int = Field(default=50, ge=1, le=100)
    skip: int = Field(default=0, ge=0)

class NoteStats(BaseModel):
    total_notes: int
    most_used_tags: List[dict]
    recent_activity: int
