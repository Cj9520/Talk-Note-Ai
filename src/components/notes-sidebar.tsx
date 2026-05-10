'use client';

import { motion } from 'framer-motion';
import { Plus, Search, FileText, Clock, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

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

interface NotesSidebarProps {
  notes: Note[];
  selectedNote: string;
  onSelectNote: (noteId: string) => void;
  onNewNote: () => void;
  onDeleteNote: (noteId: string) => void;
  isLoading: boolean;
}

export function NotesSidebar({ notes, selectedNote, onSelectNote, onNewNote, onDeleteNote, isLoading }: NotesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter notes based on search query
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Mock duration — deterministic from note id so SSR markup matches hydration (no Math.random per render)
  const getDuration = (note: Note) => {
    const durations = ['12:34', '8:45', '25:12', '15:30', '18:22'];
    let hash = 0;
    for (let i = 0; i < note.id.length; i++) {
      hash = (hash << 5) - hash + note.id.charCodeAt(i);
      hash |= 0;
    }
    return durations[Math.abs(hash) % durations.length];
  };

  return (
    <motion.div
      className="w-80 bg-card border-r border-border p-6 overflow-y-auto"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-card-foreground">Voice Notes</h2>
        <Button
          onClick={onNewNote}
          size="sm"
          className="bg-voice-primary hover:bg-voice-primary/90 text-white rounded-full w-10 h-10 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:ring-2 focus:ring-voice-primary focus:border-transparent text-card-foreground"
        />
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-voice-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </p>
            <p className="text-xs">
              {searchQuery ? 'Try a different search term' : 'Start recording to create your first note'}
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                selectedNote === note.id
                  ? 'bg-voice-primary/10 border-voice-primary/20'
                  : 'bg-muted/50 hover:bg-muted border-transparent hover:border-border/50'
              }`}
              onClick={() => onSelectNote(note.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-card-foreground line-clamp-1 flex-1">
                  {note.title}
                </h3>
                <div className="flex items-center gap-2 ml-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {note.summary || note.transcript.substring(0, 100)}...
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{getDuration(note)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Empty state when no notes */}
      {!isLoading && notes.length === 0 && !searchQuery && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No notes yet</p>
          <p className="text-xs">Start recording to create your first note</p>
        </div>
      )}
    </motion.div>
  );
}
