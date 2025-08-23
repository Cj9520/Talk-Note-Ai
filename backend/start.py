#!/usr/bin/env python3
"""
Startup script for Voice Notes AI Backend
"""

import os
import sys
import uvicorn
from pathlib import Path

def create_env_file():
    """Create .env file if it doesn't exist"""
    env_file = Path(".env")
    if not env_file.exists():
        print("Creating .env file with default configuration...")
        env_content = """# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=voice_notes

# Audio Storage
AUDIO_STORAGE_PATH=./audio_files

# Optional: Whisper.cpp path (if installed)
WHISPER_PATH=whisper

# Optional: HuggingFace model configuration
SUMMARIZATION_MODEL=facebook/bart-large-cnn

# Optional: Logging level
LOG_LEVEL=INFO
"""
        with open(env_file, "w") as f:
            f.write(env_content)
        print("✅ .env file created successfully!")

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import motor
        import aiofiles
        print("✅ All required dependencies are installed!")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def create_directories():
    """Create necessary directories"""
    directories = [
        "./audio_files",
        "./logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    print("✅ Directories created successfully!")

def main():
    """Main startup function"""
    print("🎤 Starting Voice Notes AI Backend...")
    print("=" * 50)
    
    # Create .env file if it doesn't exist
    create_env_file()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Create necessary directories
    create_directories()
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    
    print(f"🚀 Starting server on {host}:{port}")
    print(f"🔄 Auto-reload: {reload}")
    print("=" * 50)
    
    # Start the server
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
