'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Square } from 'lucide-react';

interface FloatingRecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
}

export function FloatingRecordButton({ isRecording, onToggle }: FloatingRecordButtonProps) {
  return (
    <motion.div
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Main Record Button */}
        <motion.button
          onClick={onToggle}
          className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
            isRecording
              ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
              : 'bg-voice-primary hover:bg-voice-primary/90'
          }`}
          animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: isRecording ? Infinity : 0 }}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </motion.button>

        {/* Button Label */}
        <motion.div
          className="text-sm font-medium text-card-foreground bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </motion.div>

        {/* Audio Waveform Visualization */}
        {isRecording && (
          <motion.div
            className="flex items-center gap-1 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-voice-primary rounded-full"
                animate={{
                  height: [8, 20, 8],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
