'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/theme-toggle';
import { HeroSection } from '../components/hero-section';
import { FeaturesSection } from '../components/features-section';
import { Footer } from '../components/footer';
import { NotesSidebar } from '../components/notes-sidebar';
import { TranscriptionPanel } from '../components/transcription-panel';
import { SummaryPanel } from '../components/summary-panel';
import { FloatingRecordButton } from '../components/floating-record-button';
import { NotePreviewModal } from '../components/note-preview-modal';

type View = 'landing' | 'dashboard';

// Backend API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://voice-notes-backend-wz8c.onrender.com/';

// Note interface matching backend model
interface Note {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  tags: string[];
  audio_filename: string;
  created_at: string;
  updated_at: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  // Transcript / summary state for SummaryPanel
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentSummary, setCurrentSummary] = useState('');
  const [currentKeyPoints, setCurrentKeyPoints] = useState<string[]>([]);
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);
  const [currentWordCount, setCurrentWordCount] = useState<number | undefined>(undefined);
  const [currentReadingTime, setCurrentReadingTime] = useState<number | undefined>(undefined);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  // Note preview modal
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  // Load notes from backend
  useEffect(() => {
    if (currentView === 'dashboard') {
      loadNotes();
    }
  }, [currentView]);

  const loadNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notes`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(data.notes || []);
        }
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleStartRecording = () => {
    setCurrentView('dashboard');
    setSelectedNote('');
    setIsRecording(false);
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleNewNote = () => {
    setSelectedNote('');
    setIsRecording(false);
    setCurrentTranscript('');
    setCurrentSummary('');
    setCurrentKeyPoints([]);
    setCurrentKeywords([]);
    setCurrentWordCount(undefined);
    setCurrentReadingTime(undefined);
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNote(noteId);
    setIsRecording(false);
  };

  const handleBack = () => {
    setCurrentView('landing');
    setIsRecording(false);
    setSelectedNote('');
    setCurrentTranscript('');
    setCurrentSummary('');
    setCurrentKeyPoints([]);
    setCurrentKeywords([]);
    setCurrentWordCount(undefined);
    setCurrentReadingTime(undefined);
  };

  // Summarize helper
  const summarize = async (text: string) => {
    try {
      setIsGeneratingSummary(true);
      const fd = new FormData();
      fd.append('text', text);
      fd.append('max_length', '150');
      const res = await fetch(`${API_BASE_URL}/summarize`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Summarization failed');
      const data = await res.json();
      setCurrentSummary(data.summary || '');
      setCurrentKeyPoints(Array.isArray(data.key_points) ? data.key_points : []);
      setCurrentKeywords(Array.isArray(data.keywords) ? data.keywords : []);
      setCurrentWordCount(typeof data.word_count === 'number' ? data.word_count : undefined);
      setCurrentReadingTime(typeof data.reading_time_seconds === 'number' ? data.reading_time_seconds : undefined);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Callback from TranscriptionPanel when transcript ready
  const handleTranscriptReady = async (text: string) => {
    setCurrentTranscript(text);
    await summarize(text);
  };

  // Callback from TranscriptionPanel when summary ready
  const handleSummaryReady = async (summary: string, keyPoints: string[]) => {
    setCurrentSummary(summary);
    setCurrentKeyPoints(keyPoints);
  };

  // Callback from TranscriptionPanel after a successful save
  const handleSaved = async () => {
    await loadNotes();
  };

  const handleDeleteNote: (noteId: string) => Promise<void> = async (noteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(prev => prev.filter(note => note.id !== noteId));
          if (selectedNote === noteId) setSelectedNote('');
          if (previewNote?.id === noteId) setPreviewNote(null);
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {currentView === 'dashboard' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="glass hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Talk Note AI
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen"
          >
            <HeroSection onStartRecording={handleStartRecording} />
            <FeaturesSection />
            <Footer />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="h-screen pt-20"
          >
            {/* Dashboard Layout */}
            <div className="h-full flex">
              <NotesSidebar
                notes={notes}
                selectedNote={selectedNote}
                onSelectNote={handleSelectNote}
                onNewNote={handleNewNote}
                onDeleteNote={handleDeleteNote}
                onPreviewNote={(note) => setPreviewNote(note)}
                isLoading={isLoadingNotes}
              />
              <TranscriptionPanel
                isRecording={isRecording}
                onToggleRecording={handleToggleRecording}
                onTranscript={handleTranscriptReady}
                onSummary={handleSummaryReady}
                onSaved={handleSaved}
                currentTranscript={currentTranscript}
                currentSummary={currentSummary}
                currentKeyPoints={currentKeyPoints}
                isGeneratingSummary={isGeneratingSummary}
              />
              <SummaryPanel
                isGenerating={isGeneratingSummary}
                summaryText={currentSummary}
                keyPoints={currentKeyPoints}
                keywords={currentKeywords}
                wordCount={currentWordCount}
                readingTimeSeconds={currentReadingTime}
                onRegenerate={() => summarize(currentTranscript)}
              />
            </div>

            {/* Floating Record Button */}
            <FloatingRecordButton
              isRecording={isRecording}
              onToggle={handleToggleRecording}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Preview Modal — rendered outside the layout flow */}
      <NotePreviewModal
        note={previewNote}
        onClose={() => setPreviewNote(null)}
        onDelete={handleDeleteNote}
      />
    </div>
  );
}

