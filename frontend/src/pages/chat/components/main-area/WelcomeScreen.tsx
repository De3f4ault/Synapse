/**
 * WelcomeScreen - DeepSeek exact replica
 * Centered "How can I help you?" with icon and prompt cards
 *
 * Location: src/pages/chat/components/main-area/WelcomeScreen.tsx
 */

import React from 'react';
import { MessageSquare, Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  onPromptClick?: (prompt: string) => void;
  className?: string;
}

const suggestedPrompts = [
  {
    icon: BookOpen,
    title: 'Study Help',
    prompt: 'Help me understand this concept',
  },
{
  icon: Lightbulb,
  title: 'Generate Quiz',
  prompt: 'Create a quiz from my notes',
},
{
  icon: Sparkles,
  title: 'Flashcards',
  prompt: 'Generate flashcards for review',
},
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onPromptClick,
  className,
}) => {
  return (
    <div
    className={cn(
      'flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]',
                  className
    )}
    >
    {/* Main Icon with Gradient */}
    <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="mb-8"
    >
    <div
    className={cn(
      'w-20 h-20 rounded-full',
      'bg-gradient-to-br from-[#5685FE]/20 to-[#5685FE]/5',
      'border border-[#5685FE]/20',
      'flex items-center justify-center',
      'shadow-[0_0_30px_rgba(86,133,254,0.1)]'
    )}
    >
    <MessageSquare className="w-10 h-10 text-[#5685FE]" strokeWidth={1.5} />
    </div>
    </motion.div>

    {/* Welcome Text */}
    <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.1 }}
    className="text-center mb-12"
    >
    <h1 className="text-3xl font-medium text-white mb-3">
    How can I help you?
    </h1>
    <p className="text-white/50 text-base">
    Ask me anything about your studies
    </p>
    </motion.div>

    {/* Suggested Prompt Cards */}
    <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.2 }}
    className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl"
    >
    {suggestedPrompts.map((item, index) => {
      const Icon = item.icon;
      return (
        <motion.button
        key={index}
        onClick={() => onPromptClick?.(item.prompt)}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'group relative p-4 rounded-xl',
          'bg-[#1D1E22]/60 hover:bg-[#1D1E22]/80',
          'border border-[#353638] hover:border-[#5685FE]/30',
          'backdrop-blur-xl',
          'transition-all duration-200',
          'text-left'
        )}
        >
        <div className="flex items-start gap-3">
        {/* Icon Container */}
        <div
        className={cn(
          'w-9 h-9 rounded-lg flex-shrink-0',
          'bg-[#5685FE]/10 group-hover:bg-[#5685FE]/15',
          'border border-[#5685FE]/20',
          'flex items-center justify-center',
          'transition-colors duration-200'
        )}
        >
        <Icon className="w-4 h-4 text-[#5685FE]" strokeWidth={2} />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white mb-1">
        {item.title}
        </h3>
        <p className="text-xs text-white/50 line-clamp-2">
        {item.prompt}
        </p>
        </div>
        </div>
        </motion.button>
      );
    })}
    </motion.div>
    </div>
  );
};

export default WelcomeScreen;
