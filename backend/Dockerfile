# Multi-stage build to compile whisper.cpp and keep the final image small
FROM python:3.11-slim AS builder

# Install build dependencies (cmake is required by newer whisper.cpp build system)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Clone and compile whisper.cpp
WORKDIR /build
RUN git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git
WORKDIR /build/whisper.cpp
RUN make -j2

# Download the tiny model (only ~75MB, fits well in Render's 512MB RAM free tier limit)
# Note: You can change 'tiny' to 'base' (140MB) or 'base.en' if you have more RAM.
RUN ./models/download-ggml-model.sh tiny

# Final runtime image
FROM python:3.11-slim

# Install system dependencies (FFmpeg is required to convert WebM/Opus to WAV)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy whisper.cpp executable and the downloaded model from builder stage
# Newer whisper.cpp versions place the binary under build/bin/whisper-cli
COPY --from=builder /build/whisper.cpp/build/bin/whisper-cli ./whisper.cpp/whisper-cli
COPY --from=builder /build/whisper.cpp/models/ggml-tiny.bin ./whisper.cpp/models/ggml-tiny.bin

# Copy backend source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/audio_files /app/logs

# Set default Environment Variables
ENV PORT=10000
ENV HOST=0.0.0.0
ENV RELOAD=false
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV WHISPER_CPP_EXECUTABLE=/app/whisper.cpp/whisper-cli
ENV WHISPER_CPP_MODEL=/app/whisper.cpp/models/ggml-tiny.bin
ENV AUDIO_STORAGE_PATH=/app/audio_files

EXPOSE 10000

# Start command using uvicorn directly
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
