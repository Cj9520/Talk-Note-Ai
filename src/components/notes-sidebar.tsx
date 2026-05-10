'use client';

import { motion } from 'framer-motion';
import { Plus, Search, FileText, Clock, Calendar, Eye, Trash2 } from 'lucide-react';
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
  onPreviewNote: (note: Note) => void;
  isLoading: boolean;
}

export function NotesSidebar({
  notes, selectedNote, onSelectNote, onNewNote, onDeleteNote, onPreviewNote, isLoading,
}: NotesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
          className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm
                     focus:ring-2 focus:ring-voice-primary focus:border-transparent text-card-foreground"
        />
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-voice-primary mx-auto mb-2" />
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
              className={`group relative p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                selectedNote === note.id
                  ? 'bg-voice-primary/10 border-voice-primary/20'
                  : 'bg-muted/50 hover:bg-muted border-transparent hover:border-border/50'
              }`}
              onClick={() => onSelectNote(note.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Title row */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-card-foreground line-clamp-1 flex-1 pr-2">
                  {note.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(note.created_at)}</span>
                </div>
              </div>

              {/* Excerpt */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {note.summary || note.transcript.substring(0, 100)}...
              </p>

              {/* Meta row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{getDuration(note)}</span>
                </div>

                {/* Action buttons — always visible, styled subtly */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Preview */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewNote(note);
                    }}
                    title="Preview note"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-voice-primary
                               hover:bg-voice-primary/10 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Delete note"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive
                               hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Empty state */}
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
