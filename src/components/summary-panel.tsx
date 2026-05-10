'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Download, Sparkles, RefreshCw, Copy, Clock, Hash,
  ListChecks, FileText, BookOpen,
} from 'lucide-react';
import { Button } from './ui/button';

interface SummaryPanelProps {
  isGenerating: boolean;
  summaryText?: string;
  keyPoints?: string[];
  keywords?: string[];
  wordCount?: number;
  readingTimeSeconds?: number;
  onRegenerate?: () => void;
}

export function SummaryPanel({
  isGenerating,
  summaryText,
  keyPoints = [],
  keywords = [],
  wordCount,
  readingTimeSeconds,
  onRegenerate,
}: SummaryPanelProps) {

  const handleCopy = async () => {
    const parts: string[] = [];
    if (summaryText) parts.push(`Summary:\n${summaryText}`);
    if (keyPoints.length) parts.push(`\nKey Points:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
    if (keywords.length) parts.push(`\nKeywords: ${keywords.join(', ')}`);
    try {
      await navigator.clipboard.writeText(parts.join('\n'));
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadPDF = async () => {
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
      if (y + lines.length * lineH > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin, y);
      y += lines.length * lineH + gap;
    };

    const addDivider = () => {
      y += 4;
      doc.setDrawColor(200, 200, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    };

    // Header
    addText('Voice Notes AI — Summary Export', { fontSize: 9, color: [100, 120, 220], gap: 4 });
    addText(`Generated: ${new Date().toLocaleString()}`, { fontSize: 8, color: [150, 150, 170], gap: 12 });

    // Summary
    if (summaryText) {
      addText('SUMMARY', { fontSize: 9, bold: true, color: [80, 80, 200], gap: 4 });
      addText(summaryText, { fontSize: 11, gap: 12 });
    }

    // Key Points
    if (keyPoints.length > 0) {
      addDivider();
      addText('KEY POINTS', { fontSize: 9, bold: true, color: [80, 80, 200], gap: 6 });
      keyPoints.forEach((pt, i) => {
        addText(`${i + 1}.  ${pt}`, { fontSize: 10, color: [40, 40, 60], gap: 4 });
      });
    }

    // Keywords
    if (keywords.length > 0) {
      addDivider();
      addText('KEYWORDS', { fontSize: 9, bold: true, color: [80, 80, 200], gap: 4 });
      addText(keywords.map((k) => `#${k}`).join('   '), { fontSize: 10, color: [60, 140, 80], gap: 4 });
    }

    // Stats
    if (wordCount !== undefined || readingTimeSeconds !== undefined) {
      addDivider();
      const stats = [
        wordCount !== undefined ? `${wordCount} words` : '',
        readingTimeSeconds !== undefined ? `~${Math.ceil(readingTimeSeconds / 60)} min read` : '',
      ].filter(Boolean).join('   •   ');
      addText(stats, { fontSize: 8, color: [150, 150, 170], gap: 4 });
    }

    // Page footer
    const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 200);
      doc.text(
        `Page ${i} of ${pageCount}  •  Voice Notes AI`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 24,
        { align: 'center' }
      );
    }

    doc.save('voice-note-summary.pdf');
  };

  const isEmpty = !isGenerating && !summaryText && keyPoints.length === 0;

  return (
    <motion.div
      className="w-96 bg-card border-l border-border p-6 overflow-y-auto flex flex-col gap-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-voice-primary" />
          <h2 className="text-xl font-bold text-card-foreground">AI Summary</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="p-2" onClick={onRegenerate} title="Regenerate">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2" onClick={handleCopy} title="Copy all">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2" onClick={handleDownloadPDF} title="Export PDF">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Stats pills ────────────────────────────────── */}
      {(wordCount !== undefined || readingTimeSeconds !== undefined) && !isGenerating && (
        <div className="flex flex-wrap gap-2">
          {wordCount !== undefined && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              <BookOpen className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
          )}
          {readingTimeSeconds !== undefined && (
            <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              <Clock className="w-3 h-3" />
              ~{Math.ceil(readingTimeSeconds / 60)} min read
            </span>
          )}
        </div>
      )}

      <div className="space-y-4 flex-1">
        {/* ── Empty state ─────────────────────────────── */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center gap-3"
            >
              <Sparkles className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No summary yet. Record audio and hit <strong>Transcribe</strong> to generate an AI summary.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AI Summary paragraph ─────────────────────── */}
        {(isGenerating || summaryText) && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-voice-secondary" />
              Summary
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {isGenerating ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                </div>
              ) : (
                <motion.p
                  key={summaryText}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="whitespace-pre-wrap"
                >
                  {summaryText}
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* ── Key Points ───────────────────────────────── */}
        {(isGenerating || keyPoints.length > 0) && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-500" />
              Key Points
            </h3>
            {isGenerating ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                ))}
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {keyPoints.map((point, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{point}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Keywords ────────────────────────────────── */}
        {(isGenerating || keywords.length > 0) && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-green-500" />
              Keywords
            </h3>
            {isGenerating ? (
              <div className="flex flex-wrap gap-2">
                {[20, 28, 16, 24, 20].map((w, i) => (
                  <div key={i} className="h-6 bg-muted rounded-full animate-pulse" style={{ width: `${w * 4}px` }} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <motion.span
                    key={kw}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full capitalize"
                  >
                    #{kw}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons ──────────────────────────── */}
      <div className="space-y-3 pt-2">
        <Button
          className="w-full bg-voice-primary hover:bg-voice-primary/90 text-white"
          disabled={isGenerating}
          onClick={() => onRegenerate?.()}
        >
          <Brain className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Regenerate Summary'}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          disabled={isGenerating || isEmpty}
          onClick={handleDownloadPDF}
        >
          <Download className="w-4 h-4 mr-2" />
          Export as PDF
        </Button>
      </div>

      {/* ── Processing indicator ─────────────────────── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            className="p-4 bg-voice-accent/10 border border-voice-accent/20 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex items-center gap-3 text-voice-accent">
              <div className="w-2 h-2 bg-voice-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium">AI is analyzing your transcript…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
