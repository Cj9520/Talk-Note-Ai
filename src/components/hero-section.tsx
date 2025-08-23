'use client';

import { motion } from 'motion/react';
import { Mic, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface HeroSectionProps {
  onStartRecording: () => void;
}

export function HeroSection({ onStartRecording }: HeroSectionProps) {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="text-center max-w-4xl mx-auto">
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-voice-neon rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: [0, Math.random() * 200 - 100],
                y: [0, Math.random() * 200 - 100]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          {/* Microphone Icon */}
          <motion.div
            className="mx-auto mb-8 w-24 h-24 bg-gradient-to-r from-voice-primary to-voice-secondary rounded-full flex items-center justify-center shadow-2xl shadow-voice-primary/25"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic className="w-12 h-12 text-white" />
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-voice-primary via-voice-accent to-voice-secondary bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Speak. Capture. Summarize.
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Transform your voice into organized, searchable notes with AI-powered summarization. 
            Never miss an important thought again.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              onClick={onStartRecording}
              size="lg"
              className="bg-gradient-to-r from-voice-primary to-voice-secondary hover:from-voice-primary/90 hover:to-voice-secondary/90 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-2xl shadow-voice-primary/25 hover:shadow-voice-primary/40 transition-all duration-300 transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          </motion.div>

          {/* Feature List */}
          <motion.div
            className="mt-16 flex flex-wrap justify-center gap-8 text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time transcription</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>AI summarization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Smart organization</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
