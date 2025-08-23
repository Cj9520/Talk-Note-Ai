import subprocess
import pathlib

WHISPER_DIR = pathlib.Path(__file__).parent / "whisper_bin" / "Release"
EXEC = WHISPER_DIR / "main.exe"
MODEL = WHISPER_DIR / "models" / "ggml-base.en.bin"

def transcribe_audio(wav_path: str) -> str:
    # Resolve to absolute path because the subprocess runs with cwd = WHISPER_DIR
    abs_wav_path = str(pathlib.Path(wav_path).resolve())
    out_stem = pathlib.Path(abs_wav_path).with_suffix("")
    cmd = [
        str(EXEC),
        "-m", str(MODEL),
        "-f", abs_wav_path,
        "-otxt",
    ]
    subprocess.run(cmd, check=True, cwd=str(WHISPER_DIR))
    txt_path = f"{abs_wav_path}.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        return f.read().strip()


