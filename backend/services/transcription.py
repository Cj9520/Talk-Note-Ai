import logging
from typing import Optional

logger = logging.getLogger(__name__)

class WhisperTranscriptionService:
    """
    Simplified transcription service with mock functionality
    """
    
    def __init__(self, whisper_path: str = "whisper", model: str = "base.en"):
        self.whisper_path = whisper_path
        self.model = model
        logger.info("Mock transcription service initialized")
    
    async def transcribe(self, audio_file_path: str) -> str:
        """
        Mock transcription for development/testing
        """
        logger.info(f"Mock transcription of file: {audio_file_path}")
        
        # Return a mock transcript
        return (
            "This is a sample transcript generated for development purposes. "
            "In production, this would be the actual transcription from your audio "
            "processed by Whisper.cpp. The audio contains speech that has been "
            "converted to text using advanced speech recognition technology."
        )
    
    async def transcribe_with_timestamps(self, audio_file_path: str) -> dict:
        """
        Mock transcription with timestamps
        """
        transcript = await self.transcribe(audio_file_path)
        return {
            "text": transcript,
            "segments": [
                {
                    "start": 0.0,
                    "end": 5.0,
                    "text": transcript[:100] + "..."
                }
            ]
        }
