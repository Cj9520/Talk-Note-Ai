'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Play, Pause, Save, Trash2, Loader2, Sparkles, Timer } from 'lucide-react';
import { Button } from './ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

interface TranscriptionPanelProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  onTranscript: (transcript: string) => void;
  onSummary: (summary: string, keyPoints: string[]) => void;
  onSaved: () => void;
  currentTranscript: string;
  currentSummary: string;
  currentKeyPoints: string[];
  isGeneratingSummary: boolean;
}

export function TranscriptionPanel({ 
  isRecording, 
  onToggleRecording, 
  onTranscript, 
  onSummary, 
  onSaved, 
  currentTranscript, 
  currentSummary, 
  currentKeyPoints, 
  isGeneratingSummary 
}: TranscriptionPanelProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackTimer, setPlaybackTimer] = useState<NodeJS.Timeout | null>(null);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording timer
  useEffect(() => {
    if (isRecording) {
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
    } else {
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    }

    return () => {
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
    };
  }, [isRecording]);

  // Start/stop recorder when parent toggles
  useEffect(() => {
    const setupRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onerror = (e) => {
          console.error('Recording error:', e);
          setError('Recording failed. Please check microphone permissions.');
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          audioChunksRef.current = [];
          
          // Set the final recording duration - ensure it's at least 1 second
          const finalDuration = Math.max(recordingTime, 1);
          setAudioDuration(finalDuration);
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        };

        if (isRecording && recorder.state === 'inactive') {
          setRecordingTime(0);
          recorder.start(1000); // 1 second chunks
        }
      } catch (err) {
        console.error('Microphone access error:', err);
        setError('Microphone permission denied. Please allow microphone access.');
      }
    };

    if (isRecording) {
      setupRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      } else {
        // Fallback to recording time if audio duration is not available
        setAudioDuration(recordingTime);
      }
    };

    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      } else {
        setAudioDuration(recordingTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (playbackTimer) {
        clearInterval(playbackTimer);
        setPlaybackTimer(null);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (playbackTimer) {
        clearInterval(playbackTimer);
        setPlaybackTimer(null);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [playbackTimer, recordingTime]);

  const playAudio = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimer) {
        clearInterval(playbackTimer);
        setPlaybackTimer(null);
      }
    } else {
      audioRef.current.src = audioUrl;
      
      // Set duration immediately if available
      if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
        setAudioDuration(audioRef.current.duration);
      } else {
        setAudioDuration(recordingTime);
      }
      
      audioRef.current.play();
      setIsPlaying(true);
      
      // Start playback timer to update current time
      const timer = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          if (isFinite(current)) {
            setCurrentTime(current);
          }
        }
      }, 100);
      setPlaybackTimer(timer);
    }
  };

  const processAudio = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch(`${API_BASE_URL}/transcribe`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      const transcriptText = data.transcript || '';
      setTranscript(transcriptText);
      onTranscript?.(transcriptText);
      
    } catch (e) {
      console.error('Processing error:', e);
      setError('Audio processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveNote = async () => {
    if (!audioBlob || !transcript || !title.trim()) {
      setError('Please record audio, process it, and add a title before saving.');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('title', title);
      formData.append('tags', tags);
      
      const response = await fetch(`${API_BASE_URL}/process-audio`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Save failed');
      }
      
      // Clear form after successful save
      setTitle('');
      setTags('');
      setTranscript('');
      setAudioUrl('');
      setAudioBlob(null);
      setRecordingTime(0);
      setAudioDuration(0);
      setCurrentTime(0);
      onSaved?.();
      
    } catch (e) {
      console.error('Save error:', e);
      setError('Failed to save note. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setTranscript('');
    setAudioUrl('');
    setAudioBlob(null);
    setTitle('');
    setTags('');
    setError('');
    setRecordingTime(0);
    setAudioDuration(0);
    setCurrentTime(0);
    if (playbackTimer) {
      clearInterval(playbackTimer);
      setPlaybackTimer(null);
    }
  };

  return (
    <motion.div
      className="flex-1 bg-card p-6 overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-card-foreground">Live Transcription</h2>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={clearAll}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            size="sm"
            className="bg-voice-primary hover:bg-voice-primary/90 text-white"
            onClick={processAudio}
            disabled={!audioBlob || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Process
          </Button>
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <motion.div 
          className="flex items-center justify-center gap-4 mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
            <span className="text-destructive font-medium">Recording</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-600 font-medium">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-lg font-medium">{formatTime(recordingTime)}</span>
          </div>
        </motion.div>
      )}

      {/* Recording Controls */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-block"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={onToggleRecording}
            size="lg"
            className={`w-20 h-20 rounded-full text-2xl shadow-2xl transition-all duration-300 ${
              isRecording
                ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
                : 'bg-voice-primary hover:bg-voice-primary/90'
            }`}
          >
            {isRecording ? <MicOff /> : <Mic />}
          </Button>
        </motion.div>
        <div className="mt-4 text-muted-foreground font-medium">
          {isRecording ? 'Click to stop recording' : 'Click to start recording'}
        </div>
        {error && (
          <div className="mt-3 text-destructive text-sm">{error}</div>
        )}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-muted/50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">Audio Preview</h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="bg-voice-primary hover:bg-voice-primary/90 text-white border-voice-primary"
              onClick={playAudio}
            >
              {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <span className="text-muted-foreground">
              {isPlaying 
                ? `${formatTime(currentTime)} / ${formatTime(audioDuration || recordingTime)}`
                : `Duration: ${formatTime(audioDuration || recordingTime)}`
              }
            </span>
          </div>
          <audio 
            ref={audioRef} 
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      )}

      {/* Transcription Text */}
      <div className="bg-muted/50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-card-foreground">Transcript</h3>
        <div className="min-h-[200px] bg-background rounded-lg p-4 border border-border">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {transcript || (isRecording
              ? 'Recording in progress... Your transcription will appear here.'
              : 'Click the record button to start transcribing your voice.')}
          </p>
        </div>
      </div>

      {/* Save section */}
      <div className="bg-muted/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-card-foreground">Save Note</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="px-3 py-2 rounded-md bg-background border border-border text-card-foreground"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="px-3 py-2 rounded-md bg-background border border-border text-card-foreground"
          />
        </div>
        <div className="mt-4 flex gap-3">
          <Button 
            className="bg-voice-primary hover:bg-voice-primary/90 text-white" 
            onClick={saveNote} 
            disabled={isProcessing || !transcript || !title.trim()}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Note
          </Button>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <motion.div 
          className="mt-6 p-4 bg-voice-primary/10 border border-voice-primary/20 rounded-lg" 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-voice-primary">
            <div className="w-2 h-2 bg-voice-primary rounded-full animate-pulse"></div>
            <span className="font-medium">Processing audio...</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
