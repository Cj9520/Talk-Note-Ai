from transformers import pipeline

_summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

def summarize_text(text: str) -> str:
    if not text.strip():
        return ""
    result = _summarizer(text, max_length=120, min_length=40, do_sample=False, truncation=True)
    return result[0]["summary_text"].strip()


