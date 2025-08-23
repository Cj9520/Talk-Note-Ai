'use client';

import { motion } from 'framer-motion';
import { Brain, Download, Share2, Sparkles, RefreshCw, Copy, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface SummaryPanelProps {
  isGenerating: boolean;
  summaryText?: string;
  keyPoints?: string[];
  onRegenerate?: () => void;
}

export function SummaryPanel({ isGenerating, summaryText, keyPoints = [], onRegenerate }: SummaryPanelProps) {
  const handleCopy = async () => {
    if (summaryText) {
      try {
        await navigator.clipboard.writeText(summaryText);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleDownload = () => {
    if (summaryText) {
      const blob = new Blob([summaryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voice-note-summary.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <motion.div
      className="w-96 bg-card border-l border-border p-6 overflow-y-auto"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-voice-primary" />
          <h2 className="text-xl font-bold text-card-foreground">AI Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2" onClick={onRegenerate}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Confidence & Sentiment */}
      <div className="flex gap-2 mb-6">
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          94% Confidence
        </span>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          Positive
        </span>
      </div>

      {/* Summary Content */}
      <div className="space-y-6">
        {/* Key Points */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Key Points
          </h3>
          <div className="space-y-2">
            {isGenerating ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
              </div>
            ) : keyPoints.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No key points available yet.</p>
            )}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Action Items
          </h3>
          <div className="space-y-2">
            {isGenerating ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-2/3"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-4/5"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Complete testing by Friday</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Review marketing materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Schedule client presentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Prepare deployment checklist</span>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-voice-primary" />
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Participants
          </h3>
          <div className="flex flex-wrap gap-2">
            {isGenerating ? (
              <div className="flex flex-wrap gap-2">
                <div className="h-6 bg-muted rounded-full animate-pulse w-20"></div>
                <div className="h-6 bg-muted rounded-full animate-pulse w-24"></div>
                <div className="h-6 bg-muted rounded-full animate-pulse w-16"></div>
                <div className="h-6 bg-muted rounded-full animate-pulse w-28"></div>
              </div>
            ) : (
              <>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Sarah (UI Team)
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Engineering Team
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Marketing
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Customer Support
                </span>
              </>
            )}
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-voice-secondary" />
            Summary
          </h3>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {isGenerating ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-2/3"></div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">
                {summaryText || 'No summary available yet. Start recording to generate an AI summary.'}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
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
            disabled={isGenerating}
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Summary
          </Button>
        </div>

        {/* Processing Status */}
        {isGenerating && (
          <motion.div
            className="p-4 bg-voice-accent/10 border border-voice-accent/20 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 text-voice-accent">
              <div className="w-2 h-2 bg-voice-accent rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">AI is analyzing your transcript...</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
