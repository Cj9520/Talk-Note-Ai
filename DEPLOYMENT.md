# 🚀 Deployment Guide

This guide will help you deploy your Voice Notes AI application to production.

## 📋 Prerequisites

- GitHub account
- MongoDB Atlas account (free tier available)
- Vercel account (free tier available)
- Railway or Render account (free tier available)

## 🎯 Deployment Options

### Option 1: Full Cloud Deployment (Recommended)

Deploy both frontend and backend to cloud services.

### Option 2: Local Backend + Cloud Frontend

Run backend locally and deploy only frontend to cloud.

### Option 3: Self-Hosted

Deploy everything on your own server/VPS.

---

## 🌐 Option 1: Full Cloud Deployment

### Step 1: Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new project

2. **Create Cluster**
   - Choose "FREE" tier (M0)
   - Select your preferred cloud provider and region
   - Click "Create"

3. **Set Up Database Access**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create a username and password
   - Select "Read and write to any database"
   - Click "Add User"

4. **Set Up Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for cloud deployment)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database"
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### Step 2: Backend Deployment (Railway)

1. **Create Railway Account**
   - Go to [Railway](https://railway.app/)
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Set the root directory to `backend`

3. **Configure Environment Variables**
   ```
   MONGODB_URL=your_mongodb_atlas_connection_string
   MONGODB_DATABASE=voice_notes
   AUDIO_STORAGE_PATH=./audio_files
   WHISPER_PATH=whisper
   SUMMARIZATION_MODEL=facebook/bart-large-cnn
   ```

4. **Deploy**
   - Railway will automatically detect it's a Python project
   - It will install dependencies from `requirements.txt`
   - The app will be deployed and you'll get a URL

### Step 3: Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Go to [Vercel](https://vercel.com/)
   - Sign up with GitHub

2. **Deploy Frontend**
   - Click "New Project"
   - Import your GitHub repository
   - Set the root directory to the project root (not backend)

3. **Configure Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app-url.railway.app
   ```

4. **Deploy**
   - Vercel will automatically detect it's a Next.js project
   - The app will be deployed and you'll get a URL

---

## 🏠 Option 2: Local Backend + Cloud Frontend

### Backend Setup (Local)

1. **Install Dependencies**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   # Create .env file
   MONGODB_URL=your_mongodb_atlas_connection_string
   MONGODB_DATABASE=voice_notes
   AUDIO_STORAGE_PATH=./audio_files
   ```

3. **Start Backend**
   ```bash
   python start.py
   # or
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Deployment (Vercel)

Follow the same steps as Option 1, but set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Note**: For this to work, you'll need to:
- Keep your backend running locally
- Use a service like ngrok to expose your local backend
- Or deploy frontend to a service that can access your local network

---

## 🖥️ Option 3: Self-Hosted (VPS)

### Server Requirements

- Ubuntu 20.04+ or similar Linux distribution
- 2GB RAM minimum (4GB recommended)
- 20GB storage
- Domain name (optional but recommended)

### Step 1: Server Setup

1. **Connect to Your Server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Install Dependencies**
   ```bash
   # Install Python, Node.js, and MongoDB
   sudo apt install python3 python3-pip python3-venv nodejs npm mongodb -y
   
   # Install FFmpeg for audio processing
   sudo apt install ffmpeg -y
   
   # Install Nginx
   sudo apt install nginx -y
   ```

### Step 2: Deploy Backend

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/voice-notes-app.git
   cd voice-notes-app/backend
   ```

2. **Setup Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   # Create .env file
   nano .env
   ```
   ```env
   MONGODB_URL=mongodb://localhost:27017
   MONGODB_DATABASE=voice_notes
   AUDIO_STORAGE_PATH=./audio_files
   ```

4. **Create Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/voice-notes-backend.service
   ```
   ```ini
   [Unit]
   Description=Voice Notes AI Backend
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/home/your-username/voice-notes-app/backend
   Environment=PATH=/home/your-username/voice-notes-app/backend/venv/bin
   ExecStart=/home/your-username/voice-notes-app/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

5. **Start Backend Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable voice-notes-backend
   sudo systemctl start voice-notes-backend
   ```

### Step 3: Deploy Frontend

1. **Build Frontend**
   ```bash
   cd /home/your-username/voice-notes-app
   npm install
   npm run build
   ```

2. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/voice-notes
   ```
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend
       location / {
           root /home/your-username/voice-notes-app/.next;
           try_files $uri $uri/ /index.html;
       }

       # Backend API
       location /api/ {
           proxy_pass http://localhost:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/voice-notes /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 🔧 Environment Variables Reference

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | `voice_notes` |
| `AUDIO_STORAGE_PATH` | Path for audio files | `./audio_files` |
| `WHISPER_PATH` | Path to Whisper.cpp binary | `whisper` |
| `SUMMARIZATION_MODEL` | HuggingFace model name | `facebook/bart-large-cnn` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

---

## 🧪 Testing Your Deployment

1. **Test Backend**
   ```bash
   curl https://your-backend-url/health
   ```

2. **Test Frontend**
   - Open your frontend URL in a browser
   - Try recording audio
   - Check if transcription and summarization work

3. **Check Logs**
   ```bash
   # Railway
   railway logs

   # Vercel
   vercel logs

   # Self-hosted
   sudo journalctl -u voice-notes-backend -f
   ```

---

## 🔒 Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit sensitive data to Git
3. **CORS**: Configure CORS properly for your domains
4. **Rate Limiting**: Consider adding rate limiting for API endpoints
5. **Authentication**: Add user authentication for production use

---

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration in backend
   - Ensure frontend URL is in allowed origins

2. **MongoDB Connection Issues**
   - Verify connection string
   - Check network access settings
   - Ensure database user has correct permissions

3. **Audio Processing Fails**
   - Check if Whisper.cpp is installed
   - Verify audio file format
   - Check server logs for errors

4. **Frontend Can't Connect to Backend**
   - Verify API URL in environment variables
   - Check if backend is running
   - Test API endpoints directly

### Getting Help

1. Check the application logs
2. Test individual components
3. Create an issue on GitHub
4. Join our community Discord

---

**Happy Deploying! 🚀**
