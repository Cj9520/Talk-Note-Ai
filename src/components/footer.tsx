'use client';

import { motion } from 'motion/react';
import { Info, FileText, Github, MessageCircle } from 'lucide-react';

const navigation = [
  { name: 'About', icon: Info, href: '#about' },
  { name: 'Docs', icon: FileText, href: '#docs' },
  { name: 'GitHub', icon: Github, href: '#github' },
  { name: 'Contact', icon: MessageCircle, href: '#contact' }
];

export function Footer() {
  return (
    <footer className="py-16 px-6 bg-gradient-to-t from-background to-muted/20">
      <div className="max-w-7xl mx-auto text-center">
        {/* Logo */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="text-3xl font-bold bg-gradient-to-r from-voice-primary to-voice-secondary bg-clip-text text-transparent mb-4">
            Voice Notes AI
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your voice into organized, searchable insights with the power of AI
          </p>
        </motion.div>

        {/* Navigation */}
        <motion.div
          className="flex flex-wrap justify-center gap-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-2 text-muted-foreground hover:text-voice-primary transition-colors duration-300 group"
            >
              <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-medium">{item.name}</span>
            </a>
          ))}
        </motion.div>

        {/* Copyright */}
        <motion.div
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          © 2024 Voice Notes AI. Built with modern web technologies.
        </motion.div>
      </div>
    </footer>
  );
}
