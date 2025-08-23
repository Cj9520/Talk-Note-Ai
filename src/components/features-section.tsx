'use client';

import { motion } from 'motion/react';
import { Mic, Brain, FolderSearch, Download } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Real-time Voice Transcription',
    description: 'Advanced speech-to-text technology converts your voice to text instantly with high accuracy, supporting multiple languages and accents.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Brain,
    title: 'AI-Powered Summarization',
    description: 'Intelligent algorithms analyze your transcriptions and generate concise, meaningful summaries that capture key points and insights.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: FolderSearch,
    title: 'Organize & Search Notes',
    description: 'Smart categorization and powerful search functionality help you find exactly what you need from your voice notes library.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Download,
    title: 'Export Options',
    description: 'Export your notes and summaries in multiple formats including PDF, TXT, and more for seamless integration with your workflow.',
    color: 'from-orange-500 to-red-500'
  }
];

export function FeaturesSection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-voice-primary to-voice-secondary bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to transform your voice into organized, actionable insights
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              {/* Glow Effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${feature.color} rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500`}></div>
              
              {/* Feature Card */}
              <div className="relative bg-card glass-card p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 text-card-foreground group-hover:text-voice-primary transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold mb-6 text-card-foreground">
            Ready to experience the future of note-taking?
          </h3>
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-voice-primary to-voice-secondary text-white px-6 py-3 rounded-full shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            <span className="font-medium">Free to use</span>
            <span className="w-2 h-2 bg-white rounded-full"></span>
            <span className="font-medium">No signup required</span>
            <span className="w-2 h-2 bg-white rounded-full"></span>
            <span className="font-medium">Works offline</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
