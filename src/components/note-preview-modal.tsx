'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Brain, Hash, Calendar, Clock,
  Copy, Download, Trash2, Tag,
} from 'lucide-react';
import { Button } from './ui/button';

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

interface NotePreviewModalProps {
  note: Note | null;
  onClose: () => void;
  onDelete?: (noteId: string) => void;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function NotePreviewModal({ note, onClose, onDelete }: NotePreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (note) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [note]);

  const handleCopyAll = async () => {
    if (!note) return;
    const parts = [
      `Title: ${note.title}`,
      `Date: ${formatDate(note.created_at)}`,
      note.summary ? `\nSummary:\n${note.summary}` : '',
      note.transcript ? `\nFull Transcript:\n${note.transcript}` : '',
      note.tags.length ? `\nTags: ${note.tags.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(parts); } catch { /* ignore */ }
  };

  const handleDownloadPDF = async () => {
    if (!note) return;
    // Dynamic import so jspdf is never bundled into the initial JS chunk
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    let y = margin;

    const addText = (
      text: string,
      opts: { fontSize?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}
    ) => {
      const { fontSize = 11, bold = false, color = [30, 30, 30], gap = 6 } = opts;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, usableWidth) as string[];
      const lineH = fontSize * 1.5;
      // Page-break guard
      if (y + lines.length * lineH > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin, y);
      y += lines.length * lineH + gap;
    };

    const addDivider = () => {
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    };

    // Title block
    addText('Voice Notes AI', { fontSize: 10, color: [100, 120, 200] });
    addText(note.title, { fontSize: 22, bold: true, color: [15, 15, 40], gap: 4 });
    addText(formatDate(note.created_at), { fontSize: 9, color: [120, 120, 140], gap: 2 });
    if (note.tags.length) addText(`Tags: ${note.tags.join('  •  ')}`, { fontSize: 9, color: [100, 150, 100], gap: 8 });
    addDivider();

    // Summary
    if (note.summary) {
      addText('SUMMARY', { fontSize: 9, bold: true, color: [80, 80, 200], gap: 4 });
      addText(note.summary, { fontSize: 11, gap: 16 });
    }

    // Transcript
    if (note.transcript) {
      addDivider();
      addText('FULL TRANSCRIPT', { fontSize: 9, bold: true, color: [80, 80, 200], gap: 4 });
      addText(note.transcript, { fontSize: 10, color: [50, 50, 60], gap: 4 });
    }

    // Footer
    const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 180);
      doc.text(
        `Page ${i} of ${pageCount}  •  Voice Notes AI`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 24,
        { align: 'center' }
      );
    }

    doc.save(`${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const handleDelete = () => {
    if (!note || !onDelete) return;
    onDelete(note.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {note && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div
              className="pointer-events-auto w-full max-w-2xl max-h-[88vh] flex flex-col
                         bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ─────────────────────────────────────── */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-xl font-bold text-card-foreground truncate">{note.title}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(note.created_at)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {wordCount(note.transcript).toLocaleString()} words
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Scrollable body ─────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 bg-voice-primary/10 text-voice-primary text-xs font-medium rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {note.summary && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
                      <Brain className="w-4 h-4 text-voice-primary" />
                      AI Summary
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {note.summary}
                    </p>
                  </div>
                )}

                {/* Transcript */}
                {note.transcript && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Full Transcript
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {note.transcript}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer actions ───────────────────────────────── */}
              <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-muted/20 shrink-0 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopyAll} className="gap-1.5">
                    <Copy className="w-4 h-4" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownloadPDF} className="gap-1.5 text-blue-600 hover:text-blue-700">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </div>
                {onDelete && (
                  <Button
                    variant="ghost" size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
