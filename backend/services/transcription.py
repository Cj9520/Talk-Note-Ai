import asyncio
import logging
import os
import pathlib
import shutil
import subprocess
import tempfile
logger = logging.getLogger(__name__)

_BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent
_BUILTIN_WHISPER_DIR = _BACKEND_ROOT / "whisper_bin" / "Release"
_BUILTIN_CLI_EXE = _BUILTIN_WHISPER_DIR / "whisper-cli.exe"
_BUILTIN_MAIN_EXE = _BUILTIN_WHISPER_DIR / "main.exe"
# Prefer the multilingual model when both are present.
_BUILTIN_MULTILINGUAL_MODEL = _BUILTIN_WHISPER_DIR / "models" / "ggml-base.bin"
_BUILTIN_ENGLISH_MODEL = _BUILTIN_WHISPER_DIR / "models" / "ggml-base.en.bin"
_BUILTIN_MODEL = (
    _BUILTIN_MULTILINGUAL_MODEL
    if _BUILTIN_MULTILINGUAL_MODEL.is_file()
    else _BUILTIN_ENGLISH_MODEL
)

_MOCK_FALLBACK_MESSAGE = (
    "This is a sample transcript generated for development purposes. "
    "In production, this would be the actual transcription from your audio "
    "processed by Whisper.cpp. Configure WHISPER_CPP_EXECUTABLE + WHISPER_CPP_MODEL "
    "or place whisper.cpp binaries under backend/whisper_bin/Release/."
)


class WhisperTranscriptionService:
    """
    Transcription: optional whisper.cpp subprocess (recommended on Windows via main.exe +
    ggml*.bin pretrained model — no fine-tuning required), else mock transcript for offline dev.

    Prerequisites for real transcription:
      - FFmpeg on PATH (converts browser WebM/Opus to 16 kHz WAV for Whisper)
      - whisper.cpp executable + GGML/GGUF model weights (download from whisper.cpp docs)
    """

    def __init__(self) -> None:
        exe = os.getenv("WHISPER_CPP_EXECUTABLE", "").strip()
        model = os.getenv("WHISPER_CPP_MODEL", "").strip()
        # WHISPER_LANGUAGE: ISO-639-1 code (e.g. "hi", "en", "fr") or "auto" to let
        # whisper detect the language automatically. Defaults to "auto" for multilingual use.
        self._language = os.getenv("WHISPER_LANGUAGE", "auto").strip().lower()
        if not exe:
            if _BUILTIN_CLI_EXE.is_file():
                exe = str(_BUILTIN_CLI_EXE)
            elif _BUILTIN_MAIN_EXE.is_file():
                exe = str(_BUILTIN_MAIN_EXE)
        if not model and exe and _BUILTIN_MODEL.is_file():
            model = str(_BUILTIN_MODEL)
        self._cpp_exe = exe
        self._cpp_model = model
        ffmpeg_env = os.getenv("FFMPEG_PATH", "").strip()
        self._ffmpeg_path = ffmpeg_env if ffmpeg_env else None
        exe_ok = bool(exe and pathlib.Path(exe).is_file())
        model_ok = bool(model and pathlib.Path(model).is_file())

        # Guard against placeholder/corrupted model files (real ggml models are ≥ 50 MB).
        if model_ok:
            model_size_mb = pathlib.Path(model).stat().st_size / (1024 * 1024)
            if model_size_mb < 50:
                logger.error(
                    "Model file '%s' is only %.1f MB — this looks like a placeholder or "
                    "corrupted file. Real models (ggml-base.bin or ggml-base.en.bin) are ~141 MB. "
                    "Re-download from https://huggingface.co/ggerganov/whisper.cpp. "
                    "Falling back to MOCK mode.",
                    model,
                    model_size_mb,
                )
                model_ok = False

        self._whisper_cpp_enabled = exe_ok and model_ok

        if self._whisper_cpp_enabled:
            model_name = pathlib.Path(model).name
            is_multilingual = not (model_name.endswith(".en.bin") or ".en." in model_name.lower())
            lang_display = self._language if self._language != "auto" else "auto-detect"
            logger.info(
                "Whisper transcription: whisper.cpp ENABLED (executable=%s, model=%s, "
                "multilingual=%s, language=%s)",
                exe,
                model,
                is_multilingual,
                lang_display,
            )
            if not self._resolve_ffmpeg():
                logger.warning(
                    "FFmpeg was not found on PATH. Browser recordings are WebM/Opus; "
                    "transcription needs FFmpeg to convert to WAV unless you upload raw WAV."
                )
        else:
            logger.warning(
                "Whisper transcription: MOCK MODE (no local whisper.cpp + model detected). "
                "You do NOT need to train models — download a pretrained GGML model. "
                "Set WHISPER_CPP_EXECUTABLE / WHISPER_CPP_MODEL "
                "or add backend/whisper_bin/Release/main.exe + models/ggml-*.bin"
            )

    def _resolve_ffmpeg(self) -> str | None:
        if self._ffmpeg_path:
            p = pathlib.Path(self._ffmpeg_path).expanduser()
            if p.is_file():
                return str(p.resolve())
            # Allow user to pass a directory that contains ffmpeg(.exe)
            if p.is_dir():
                exe = p / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
                if exe.is_file():
                    return str(exe.resolve())
        return shutil.which("ffmpeg")

    async def transcribe(self, audio_file_path: str, language: str | None = None) -> str:
        """Transcribe audio. Pass language='hi' / 'fr' etc. to pin a language,
        or leave None to use the service default (WHISPER_LANGUAGE env var, default=auto-detect)."""
        if self._whisper_cpp_enabled:
            # Do not silently fall back when whisper is configured.
            # If this fails, bubble the error so API/UI can show exact setup/runtime issue.
            lang = (language or self._language).strip().lower()
            return await asyncio.to_thread(self._transcribe_via_whisper_cpp, audio_file_path, lang)
        logger.info(f"Mock transcription of file: {audio_file_path}")
        return _MOCK_FALLBACK_MESSAGE

    async def transcribe_with_timestamps(self, audio_file_path: str) -> dict:
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

    def _ensure_wav_16k_mono(self, src_abs: pathlib.Path, boosted: bool = False) -> tuple[str, bool]:
        """Returns (path_to_wav_for_whisper, should_delete_after)."""
        ffmpeg = self._resolve_ffmpeg()
        if not ffmpeg:
            if src_abs.suffix.lower() == ".wav":
                logger.warning(
                    "FFmpeg missing: using uploaded .wav as-is; must be PCM compatible with whisper.cpp."
                )
                return str(src_abs.resolve()), False
            raise RuntimeError(
                "FFmpeg not found on PATH. Install FFmpeg and add it to PATH so browser WebM/Opus "
                "uploads convert to 16 kHz WAV for whisper.cpp."
            )

        fd, wav_path = tempfile.mkstemp(suffix=".wav", prefix="voice_notes_")
        os.close(fd)
        cmd = [
            ffmpeg,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(src_abs.resolve()),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
        ]
        if boosted:
            # Retry path for quiet recordings: normalize and boost speech energy.
            cmd.extend(["-af", "dynaudnorm=f=150:g=31,volume=8dB"])
        cmd.append(wav_path)
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            if os.path.exists(wav_path):
                os.unlink(wav_path)
            err = (result.stderr or result.stdout or "").strip() or "ffmpeg failed"
            raise RuntimeError(f"Audio conversion failed: {err[:500]}")

        return wav_path, True

    def _run_whisper_once(
        self, exe: pathlib.Path, model: pathlib.Path, work_dir: str, wav_path: str,
        language: str = "auto",
    ) -> tuple[str, str, str]:
        model_name = model.name.lower()
        model_is_english_only = model_name.endswith(".en.bin") or ".en." in model_name

        cmd = [
            str(exe),
            "-m",
            str(model),
            "-f",
            str(pathlib.Path(wav_path).resolve()),
            "-nt",   # no timestamps in output
            "-nth", "1.0",   # raise no-speech threshold — keep all segments
            "-lpt", "-5.0",  # relax log-prob threshold for quiet/accented speech
            "-et",  "10.0",  # relax entropy threshold
            "-tp",  "0.2",   # lower temperature for more deterministic output
            "-otxt",
        ]

        # Language selection:
        #  - English-only models MUST use "-l en" (they don't support other codes)
        #  - Multilingual models: pass the requested code, or omit for auto-detect
        if model_is_english_only:
            cmd.extend(["-l", "en"])
        elif language and language != "auto":
            cmd.extend(["-l", language])
        # else: omit -l entirely → whisper auto-detects the spoken language
        result = subprocess.run(
            cmd,
            cwd=work_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            err = (result.stderr or result.stdout or "").strip() or "whisper.cpp exited with error"
            raise RuntimeError(err[:1200])

        out_path = str(pathlib.Path(wav_path)) + ".txt"
        if pathlib.Path(out_path).is_file():
            text = pathlib.Path(out_path).read_text(encoding="utf-8").strip()
            try:
                pathlib.Path(out_path).unlink(missing_ok=True)
            except OSError:
                pass
            return text, (result.stderr or ""), (result.stdout or "")

        raise RuntimeError(
            "whisper.cpp finished but no .txt sidecar found next to converted WAV "
            "(expected path like input.wav.txt)."
        )

    def _transcribe_via_whisper_cpp(self, audio_file_path: str, language: str = "auto") -> str:
        src_abs = pathlib.Path(audio_file_path).resolve()
        if not src_abs.is_file():
            raise FileNotFoundError(f"Missing audio upload at {audio_file_path}")

        wav_path, delete_wav = self._ensure_wav_16k_mono(src_abs, boosted=False)
        retry_wav_path: str | None = None
        retry_delete_wav = False

        exe = pathlib.Path(self._cpp_exe).resolve()
        model = pathlib.Path(self._cpp_model).resolve()
        work_dir = str(exe.parent)
        model_name = model.name.lower()
        model_is_english_only = model_name.endswith(".en.bin") or ".en." in model_name
        try:
            text, stderr_text, stdout_text = self._run_whisper_once(exe, model, work_dir, wav_path, language)
            if not text:
                # Retry once with boosted/normalized WAV for quiet recordings.
                retry_wav_path, retry_delete_wav = self._ensure_wav_16k_mono(src_abs, boosted=True)
                text, stderr_text, stdout_text = self._run_whisper_once(exe, model, work_dir, retry_wav_path, language)

            if not text:
                stderr_tail = (stderr_text or "").strip()[-600:]
                stdout_tail = (stdout_text or "").strip()[-600:]
                hint_parts = [
                    "whisper.cpp produced an empty transcript.",
                    "Tried standard + boosted audio decoding but transcript is still empty.",
                ]
                if model_is_english_only:
                    hint_parts.append(
                        "Current model appears English-only (ggml-*.en.bin). "
                        "For Hindi/other languages, use multilingual model like ggml-base.bin."
                    )
                if stderr_tail:
                    hint_parts.append(f"stderr tail: {stderr_tail}")
                elif stdout_tail:
                    hint_parts.append(f"stdout tail: {stdout_tail}")
                raise RuntimeError(" ".join(hint_parts))
            return text
        finally:
            if delete_wav and pathlib.Path(wav_path).exists():
                try:
                    pathlib.Path(wav_path).unlink()
                except OSError:
                    pass
            if retry_delete_wav and retry_wav_path and pathlib.Path(retry_wav_path).exists():
                try:
                    pathlib.Path(retry_wav_path).unlink()
                except OSError:
                    pass
