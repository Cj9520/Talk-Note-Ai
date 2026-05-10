"""
Real local summarization using sumy (LexRank) + NLTK.
No GPU, no HuggingFace model download — works 100% offline.

LexRank: graph-based extractive summarization that scores sentences by
centrality (similar to PageRank on the sentence similarity graph).
"""
import asyncio
import logging
import re
import string
from collections import Counter
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-import sumy so startup doesn't fail if the package isn't installed yet
# ---------------------------------------------------------------------------
_sumy_ok = False
try:
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.lex_rank import LexRankSummarizer
    from sumy.nlp.stemmers import Stemmer
    from sumy.utils import get_stop_words
    import nltk

    # Ensure punkt tokenizer data is present (tiny, downloaded once)
    for _corpus in ("punkt", "punkt_tab", "stopwords"):
        try:
            nltk.data.find(f"tokenizers/{_corpus}")
        except LookupError:
            nltk.download(_corpus, quiet=True)

    _sumy_ok = True
    logger.info("Summarization: sumy + NLTK ready (LexRank mode)")
except ImportError:
    logger.warning(
        "sumy / nltk not installed — using extractive fallback. "
        "Run: pip install sumy nltk"
    )


# ---------------------------------------------------------------------------
# Stop-words for keyword extraction (English + common Hindi romanized words)
# ---------------------------------------------------------------------------
_STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "are", "was", "were", "be", "been", "have",
    "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "can", "this", "that", "these", "those", "i", "you",
    "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "so", "if", "as", "up", "out", "about", "from", "into", "then",
    "than", "there", "when", "where", "who", "which", "what", "just",
    "also", "very", "more", "some", "my", "your", "his", "its", "our",
    "their", "not", "no", "yes", "ok", "okay", "um", "uh", "like", "well",
    # common romanized Hindi filler words
    "aur", "hai", "hain", "mein", "ka", "ki", "ke", "ko", "se", "ne",
    "ek", "yeh", "woh", "jo", "toh", "bhi", "nahi", "kya",
}


class HuggingFaceSummarizationService:
    """
    Local summarization service using sumy (LexRank extractive algorithm).
    Class name kept for backward compatibility with main.py imports.
    """

    def __init__(self, model_name: str = "sumy/lexrank"):
        self.model_name = model_name
        self._language = "english"
        logger.info(
            "Summarization service ready (engine=%s, sumy_available=%s)",
            "LexRank" if _sumy_ok else "extractive-fallback",
            _sumy_ok,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def summarize(self, text: str, max_length: int = 150, min_length: int = 30) -> str:
        """Return a plain-text summary of *text*."""
        return await asyncio.to_thread(self._summarize_sync, text, max_length)

    async def summarize_with_keywords(self, text: str, max_length: int = 150) -> dict:
        """Return summary, key_points list, and keywords list."""
        result = await asyncio.to_thread(self._full_analysis_sync, text, max_length)
        return result

    async def get_model_info(self) -> dict:
        return {
            "model_name": self.model_name,
            "loaded": True,
            "device": "cpu",
            "engine": "LexRank (sumy)" if _sumy_ok else "extractive-fallback",
            "fallback_mode": not _sumy_ok,
        }

    # ------------------------------------------------------------------
    # Sync helpers (run in thread via asyncio.to_thread)
    # ------------------------------------------------------------------

    def _summarize_sync(self, text: str, max_length: int) -> str:
        if not text.strip():
            return ""
        sentences = self._split_sentences(text)
        if len(sentences) <= 2:
            return text.strip()

        if _sumy_ok:
            return self._lexrank_summary(text, n_sentences=3)
        return self._extractive_fallback(sentences, n=3)

    def _full_analysis_sync(self, text: str, max_length: int) -> dict:
        if not text.strip():
            return {"summary": "", "key_points": [], "keywords": [], "word_count": 0, "reading_time_seconds": 0}

        sentences = self._split_sentences(text)
        word_count = len(text.split())
        reading_time = max(1, round(word_count / 200 * 60))  # 200 wpm

        # Summary paragraph
        if len(sentences) <= 2:
            summary = text.strip()
        elif _sumy_ok:
            summary = self._lexrank_summary(text, n_sentences=3)
        else:
            summary = self._extractive_fallback(sentences, n=3)

        # Key points: top distinct scored sentences (different from summary if possible)
        if _sumy_ok and len(sentences) > 3:
            key_points = self._lexrank_key_points(text, n=5)
        else:
            key_points = [s.strip() for s in sentences[:5] if s.strip()]

        # Keywords
        keywords = self._extract_keywords(text, top_n=8)

        return {
            "summary": summary,
            "key_points": key_points,
            "keywords": keywords,
            "word_count": word_count,
            "reading_time_seconds": reading_time,
            "model": self.model_name,
        }

    # ------------------------------------------------------------------
    # LexRank helpers
    # ------------------------------------------------------------------

    def _lexrank_summary(self, text: str, n_sentences: int = 3) -> str:
        try:
            parser = PlaintextParser.from_string(text, Tokenizer(self._language))
            stemmer = Stemmer(self._language)
            summarizer = LexRankSummarizer(stemmer)
            summarizer.stop_words = get_stop_words(self._language)
            sentences = summarizer(parser.document, n_sentences)
            return " ".join(str(s) for s in sentences).strip()
        except Exception as e:
            logger.warning("LexRank failed (%s), using fallback", e)
            return self._extractive_fallback(self._split_sentences(text), n=n_sentences)

    def _lexrank_key_points(self, text: str, n: int = 5) -> list[str]:
        """Return up to *n* key sentences as bullet-point strings."""
        try:
            parser = PlaintextParser.from_string(text, Tokenizer(self._language))
            stemmer = Stemmer(self._language)
            summarizer = LexRankSummarizer(stemmer)
            summarizer.stop_words = get_stop_words(self._language)
            sentences = summarizer(parser.document, n)
            points = []
            for s in sentences:
                clean = str(s).strip()
                if clean:
                    points.append(clean)
            return points
        except Exception as e:
            logger.warning("LexRank key_points failed (%s)", e)
            return [s.strip() for s in self._split_sentences(text)[:n] if s.strip()]

    # ------------------------------------------------------------------
    # Pure-Python extractive fallback (no external deps)
    # ------------------------------------------------------------------

    def _extractive_fallback(self, sentences: list[str], n: int = 3) -> str:
        """Score each sentence by word frequency and return top-n joined."""
        if not sentences:
            return ""
        words = " ".join(sentences).lower().split()
        freq: Counter = Counter(
            w.strip(string.punctuation) for w in words
            if w.strip(string.punctuation) not in _STOP_WORDS and len(w) > 2
        )
        scored = []
        for i, sent in enumerate(sentences):
            score = sum(freq.get(w.lower().strip(string.punctuation), 0) for w in sent.split())
            # Slight position bias: first and last sentences tend to be informative
            if i == 0:
                score *= 1.2
            scored.append((score, i, sent))
        scored.sort(key=lambda x: (-x[0], x[1]))
        top = sorted(scored[:n], key=lambda x: x[1])  # restore reading order
        return " ".join(s for _, _, s in top).strip()

    # ------------------------------------------------------------------
    # Keyword extraction
    # ------------------------------------------------------------------

    def _extract_keywords(self, text: str, top_n: int = 8) -> list[str]:
        words = re.findall(r"[a-zA-Z\u0900-\u097F]{3,}", text.lower())
        freq: Counter = Counter(w for w in words if w not in _STOP_WORDS)
        return [word for word, _ in freq.most_common(top_n)]

    # ------------------------------------------------------------------
    # Sentence splitter (handles Hindi/multilingual text gracefully)
    # ------------------------------------------------------------------

    def _split_sentences(self, text: str) -> list[str]:
        if _sumy_ok:
            try:
                from nltk.tokenize import sent_tokenize
                return [s.strip() for s in sent_tokenize(text) if s.strip()]
            except Exception:
                pass
        # Fallback: split on . ! ?
        parts = re.split(r"(?<=[.!?])\s+", text.strip())
        return [p.strip() for p in parts if p.strip()]
