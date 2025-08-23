from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from transcribe import transcribe_audio
from summarizer import summarize_text
import pathlib

app = FastAPI(title="Voice Notes POC API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Voice Notes Backend Running!"}

@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    uploads = pathlib.Path("uploads")
    uploads.mkdir(exist_ok=True)
    wav_path = uploads / file.filename
    with open(wav_path, "wb") as f:
        f.write(await file.read())

    transcript = transcribe_audio(str(wav_path))
    summary = summarize_text(transcript)
    return {"transcript": transcript, "summary": summary}


