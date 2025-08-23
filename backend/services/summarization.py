import logging
from typing import Optional



logger = logging.getLogger(__name__)

class HuggingFaceSummarizationService:
    """
    Simplified summarization service with mock functionality
    """
    
    def __init__(self, model_name: str = "facebook/bart-large-cnn"):
        self.model_name = model_name
        logger.info(f"Mock summarization service initialized with model: {model_name}")
    
    async def summarize(self, text: str, max_length: int = 150, min_length: int = 30) -> str:
        """
        Mock text summarization for development/testing
        """
        logger.info(f"Mock summarization of text (length: {len(text)})")
        
        if not text.strip():
            return ""
        
        # Simple extractive summarization fallback
        sentences = text.split('.')
        if len(sentences) <= 2:
            return text
        
        # Take first few sentences as summary
        summary_sentences = sentences[:2]
        summary = '. '.join(summary_sentences).strip()
        
        if not summary.endswith('.'):
            summary += '.'
        
        return summary
    
    async def summarize_with_keywords(self, text: str, max_length: int = 150) -> dict:
        """
        Mock summarization with keyword extraction
        """
        summary = await self.summarize(text, max_length)
        
        # Simple keyword extraction
        words = text.lower().split()
        word_freq = {}
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        for word in words:
            word = word.strip('.,!?;:()[]{}"\'-')
            if word and word not in stop_words and len(word) > 2:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top 5 keywords
        keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "summary": summary,
            "keywords": [word for word, freq in keywords],
            "model": self.model_name
        }
    
    async def get_model_info(self) -> dict:
        """
        Get information about the mock model
        """
        return {
            "model_name": self.model_name,
            "loaded": True,
            "device": "cpu",
            "fallback_mode": True,
            "note": "Mock service for development"
        }
