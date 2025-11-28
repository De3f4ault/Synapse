/**
 * WelcomeScreen - Oracle Theme
 * The initial view. Displays the "Synapse Visualizer" and prompt suggestions.
 * Replaces the previous Eye with the "Synapse Core" concept.
 *
 * Location: chat/components/main-area/WelcomeScreen.tsx
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Zap } from 'lucide-react';

interface WelcomeScreenProps {
  onPromptClick?: (prompt: string) => void;
  className?: string;
}

const suggestions = [
  { text: 'Predict Trajectory', icon: Zap },
{ text: 'Analyze Pattern', icon: Brain },
{ text: 'Reveal Entropy', icon: Sparkles },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptClick }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
    {/* Note: The main "Synapse Core" (Eye) is rendered in the background by ChatPage.tsx.
      This screen focuses on the textual invitation and suggestions.
      */}

      {/* Title / Invitation */}
      <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="text-center mb-12 relative"
      >
      <h1 className="font-serif text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-widest font-bold mb-4">
      ORACLE
      </h1>
      <p className="text-[10px] md:text-xs font-mono text-cyan-500/60 tracking-[0.3em] uppercase">
      The Veil is Thin. Speak.
      </p>
      </motion.div>

      {/* Suggestions - Floating Cards */}
      <AnimatePresence>
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap justify-center gap-4 max-w-2xl px-4"
      >
      {suggestions.map((item, idx) => (
        <button
        key={item.text}
        onClick={() => onPromptClick?.(item.text)}
        className="group relative px-5 py-3 rounded-full border border-white/5 bg-black/40 hover:bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30"
        >
        <div className="flex items-center gap-2">
        <item.icon size={12} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
        <span className="text-[10px] font-mono text-slate-400 group-hover:text-cyan-100 transition-colors uppercase tracking-wider">
        {item.text}
        </span>
        </div>

        {/* Hover Glow */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-cyan-500/5 blur-md transition-opacity" />
        </button>
      ))}
      </motion.div>
      </AnimatePresence>
      </div>
  );
};

export default WelcomeScreen;
