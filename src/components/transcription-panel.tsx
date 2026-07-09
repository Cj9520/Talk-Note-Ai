'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Play, Pause, Save, Trash2, Loader2, Sparkles, Timer } from 'lucide-react';
import { Button } from './ui/button';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function parseFastApiDetail(payload: Record<string, unknown>): string | null {
  const d = payload.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const parts = d.map((entry) =>
      typeof entry === 'object' && entry !== null && 'msg' in entry
        ? String((entry as { msg: unknown }).msg)
        : JSON.stringify(entry)
    );
    return parts.join('; ');
  }
  return null;
}

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
  /** Synced immediately so async getUserMedia does not see a stale `isRecording` closure. */
  const isRecordingRef = useRef(false);
  /** Bumps on each “start recording” effect run to ignore abandoned async setups (e.g. Strict Mode, fast stop). */
  const recordingSetupGenerationRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const playbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  /** Wall-clock length when recording stopped (never overwritten by play/pause or ticker). */
  const [publishedClipDurationSec, setPublishedClipDurationSec] = useState(0);
  /** From `<audio>` metadata when available (refines published duration). */
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Live recording timer (only while isRecording — avoids stale-interval leaks)
  useEffect(() => {
    if (!isRecording) return;
    setRecordingTime(0);
    const id = window.setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  useLayoutEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Start/stop recorder when parent toggles
  useEffect(() => {
    let cancelled = false;

    const stopStream = (stream: MediaStream | null) => {
      stream?.getTracks().forEach((track) => track.stop());
    };

    const setupRecording = async () => {
      recordingSetupGenerationRef.current += 1;
      const setupGeneration = recordingSetupGenerationRef.current;

      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });

        if (cancelled || setupGeneration !== recordingSetupGenerationRef.current || !isRecordingRef.current) {
          stopStream(stream);
          return;
        }

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
          audioChunksRef.current = [];

          let elapsedSeconds = 0;
          if (recordingStartedAtRef.current != null) {
            elapsedSeconds = Math.max(0, (Date.now() - recordingStartedAtRef.current) / 1000);
            recordingStartedAtRef.current = null;
          }

          stopStream(streamRef.current);
          streamRef.current = null;
          mediaRecorderRef.current = null;

          if (blob.size === 0) {
            setError('No audio was captured. Try recording again.');
            setAudioBlob(null);
            setAudioUrl('');
            setAudioDuration(0);
            setPublishedClipDurationSec(0);
            return;
          }

          const clipSec = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 0;
          setPublishedClipDurationSec(clipSec);
          setAudioDuration(clipSec);

          setAudioBlob(blob);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        };

        if (cancelled || setupGeneration !== recordingSetupGenerationRef.current || !isRecordingRef.current) {
          stopStream(stream);
          streamRef.current = null;
          return;
        }

        audioChunksRef.current = [];
        setRecordingTime(0);
        recordingStartedAtRef.current = Date.now();
        recorder.start(1000);
      } catch (err) {
        console.error('Microphone access error:', err);
        setError('Microphone permission denied. Please allow microphone access.');
      }
    };

    if (isRecording) {
      setError('');
      void setupRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    return () => {
      cancelled = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [isRecording]);

  const clearPlaybackPoll = () => {
    if (playbackPollRef.current) {
      clearInterval(playbackPollRef.current);
      playbackPollRef.current = null;
    }
  };

  // Load blob into `<audio>` and sync duration from browser metadata (independent of recordingTime ticker)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      setAudioDuration(0);
      return;
    }

    const syncDurationFromElement = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        setAudioDuration(d);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      clearPlaybackPoll();
    };

    const onPause = () => {
      setIsPlaying(false);
      clearPlaybackPoll();
    };

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    clearPlaybackPoll();

    audio.src = audioUrl;
    audio.preload = 'metadata';
    audio.load();

    audio.addEventListener('loadedmetadata', syncDurationFromElement);
    audio.addEventListener('durationchange', syncDurationFromElement);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('loadedmetadata', syncDurationFromElement);
      audio.removeEventListener('durationchange', syncDurationFromElement);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      clearPlaybackPoll();
    };
  }, [audioUrl]);

  const previewTotalSeconds =
    Number.isFinite(audioDuration) && audioDuration > 0 ? audioDuration : publishedClipDurationSec;

  const playAudio = () => {
    if (!audioRef.current || !audioUrl) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      clearPlaybackPoll();
      return;
    }

    void audio.play();
    setIsPlaying(true);

    clearPlaybackPoll();
    playbackPollRef.current = setInterval(() => {
      const el = audioRef.current;
      if (!el) return;
      const t = el.currentTime;
      if (Number.isFinite(t)) setCurrentTime(t);
    }, 100);
  };

  const processAudio = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      
      const response = await fetch(`${API_BASE_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();
      let payload: Record<string, unknown> | null = null;
      if (raw) {
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          /* HTML error pages, proxies, etc. */
        }
      }

      if (!response.ok) {
        const hint =
          (payload ? parseFastApiDetail(payload) : null) ??
          (raw.trim() ? raw.trim().slice(0, 400) : response.statusText);
        throw new Error(hint || `Transcription failed (HTTP ${response.status})`);
      }

      if (!payload) {
        throw new Error('API returned a non-JSON response — is the backend URL correct (NEXT_PUBLIC_API_BASE_URL)?');
      }

      const transcriptText = typeof payload.transcript === 'string' ? payload.transcript.trim() : '';
      if (!transcriptText) {
        setError(
          'Transcription returned empty text. Speak clearly for a few seconds, ensure the backend is running '
          + '(same host/port as NEXT_PUBLIC_API_BASE_URL), and check server logs for FFmpeg / Whisper errors.'
        );
        return;
      }
      setTranscript(transcriptText);
      onTranscript?.(transcriptText);
      
    } catch (e) {
      console.error('Processing error:', e);
      if (e instanceof TypeError || (e instanceof Error && e.message === 'Failed to fetch')) {
        setError(`Cannot reach API at ${API_BASE_URL}. Start the backend (e.g. python start.py or uvicorn) and check CORS if the page origin differs from localhost / 127.0.0.1.`);
      } else {
        setError(e instanceof Error ? e.message : 'Audio processing failed. Please try again.');
      }
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
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('title', title);
      formData.append('tags', tags);
      
      const response = await fetch(`${API_BASE_URL}/process-audio`, {
        method: 'POST',
        body: formData
      });

      const rawSave = await response.text();
      let savePayload: Record<string, unknown> | null = null;
      if (rawSave) {
        try {
          savePayload = JSON.parse(rawSave) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }

      if (!response.ok) {
        const detail = savePayload ? parseFastApiDetail(savePayload) : null;
        const snippet = rawSave.trim().slice(0, 400);
        const hint =
          detail ?? (snippet ? snippet : null) ?? response.statusText ?? `Save failed (HTTP ${response.status})`;
        throw new Error(hint);
      }

      // Clear form after successful save
      setTitle('');
      setTags('');
      setTranscript('');
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
      setAudioBlob(null);
      setRecordingTime(0);
      setAudioDuration(0);
      setPublishedClipDurationSec(0);
      setCurrentTime(0);
      onSaved?.();
      
    } catch (e) {
      console.error('Save error:', e);
      setError(e instanceof Error ? e.message : 'Failed to save note. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setTranscript('');
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setAudioBlob(null);
    setTitle('');
    setTags('');
    setError('');
    setRecordingTime(0);
    setAudioDuration(0);
    setPublishedClipDurationSec(0);
    setCurrentTime(0);
    clearPlaybackPoll();
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
                ? `${formatTime(currentTime)} / ${formatTime(previewTotalSeconds)}`
                : `Duration: ${formatTime(previewTotalSeconds)}`}
            </span>
          </div>
          <audio ref={audioRef} preload="metadata" />
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
