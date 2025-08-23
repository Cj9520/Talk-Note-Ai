# 🎤 Voice Notes AI

A modern, free, and open-source voice note-taking application that uses AI to transcribe and summarize your voice recordings. Built with Next.js, FastAPI, Whisper.cpp, and HuggingFace Transformers.

## ✨ Features

- **🎙️ Voice Recording**: Record audio directly in your browser
- **🤖 AI Transcription**: Convert speech to text using Whisper.cpp (free, local processing)
- **📝 AI Summarization**: Generate summaries using HuggingFace Transformers
- **🏷️ Smart Tagging**: Organize notes with custom tags
- **🔍 Search & Filter**: Find notes quickly with full-text search
- **💾 Persistent Storage**: Save notes to MongoDB database
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🆓 Completely Free**: No API costs, runs entirely on your machine

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons

### Backend
- **FastAPI** - Modern Python web framework
- **Whisper.cpp** - Local speech-to-text transcription
- **HuggingFace Transformers** - Local text summarization
- **MongoDB** - NoSQL database for note storage
- **Motor** - Async MongoDB driver

### AI Models
- **Whisper.cpp** - OpenAI's Whisper model for transcription
- **BART (facebook/bart-large-cnn)** - Text summarization model

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- MongoDB (local or Atlas)
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd voice-notes-app
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Start the backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### 4. Install Whisper.cpp (Optional)

For production use, install Whisper.cpp for better transcription:

```bash
# On macOS with Homebrew
brew install whisper

# On Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg
# Then follow the Whisper.cpp installation guide

# On Windows
# Download from: https://github.com/ggerganov/whisper.cpp/releases
```

## 📁 Project Structure

```
voice-notes-app/
├── src/
│   └── app/
│       ├── page.tsx          # Main application page
│       ├── layout.tsx        # Root layout
│       └── globals.css       # Global styles
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── services/
│   │   ├── transcription.py # Whisper.cpp service
│   │   ├── summarization.py # HuggingFace service
│   │   └── database.py      # MongoDB service
│   └── models/
│       └── note.py          # Data models
├── public/                  # Static assets
├── package.json            # Frontend dependencies
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=voice_notes

# Audio Storage
AUDIO_STORAGE_PATH=./audio_files

# Optional: Whisper.cpp path
WHISPER_PATH=whisper
```

### Frontend Environment

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎯 Usage

1. **Record Audio**: Click the microphone button to start recording
2. **Process Audio**: Click "Process Audio" to transcribe and summarize
3. **Add Details**: Enter a title and tags for your note
4. **Save Note**: Click "Save Note" to store in the database
5. **Search & Organize**: Use the search bar to find specific notes

## 🚀 Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Backend (Railway/Render)

1. Create a new service on Railway or Render
2. Connect your GitHub repository
3. Set environment variables:
   - `MONGODB_URL` (MongoDB Atlas connection string)
   - `AUDIO_STORAGE_PATH`
4. Deploy!

### Database (MongoDB Atlas)

1. Create a free MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Add it to your backend environment variables

## 🔍 API Endpoints

### Transcription
- `POST /transcribe` - Transcribe audio file

### Summarization
- `POST /summarize` - Summarize text

### Notes
- `GET /notes` - Get all notes
- `POST /process-audio` - Process audio and save note
- `GET /notes/{id}` - Get specific note
- `DELETE /notes/{id}` - Delete note

### Health
- `GET /health` - Health check

## 🛠️ Development

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest
```

### Code Quality

```bash
# Frontend linting
npm run lint

# Backend formatting
cd backend
black .
isort .
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition model
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) - C++ port of Whisper
- [HuggingFace Transformers](https://huggingface.co/transformers/) - NLP models
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [Next.js](https://nextjs.org/) - React framework

## 📞 Support

If you have any questions or need help:

1. Check the [Issues](https://github.com/yourusername/voice-notes-app/issues) page
2. Create a new issue with a detailed description
3. Join our Discord community (if available)

---

**Made with ❤️ for the open-source community**
