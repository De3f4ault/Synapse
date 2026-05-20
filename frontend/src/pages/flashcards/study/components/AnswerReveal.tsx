/**
 * AnswerReveal Component
 * 
 * Simple reveal button for showing the answer.
 * Uses solid dark styling per architecture constraints.
 */

import { motion } from 'framer-motion';

interface AnswerRevealProps {
    onReveal: () => void;
    disabled?: boolean;
}

export function AnswerReveal({ onReveal, disabled = false }: AnswerRevealProps) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={onReveal}
            disabled={disabled}
            className="
        px-16 h-14 
        rounded-full
        bg-primary text-foreground
        text-lg font-bold tracking-wide
        transition-all duration-200
        hover:bg-primary
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-lg shadow-cyan-500/30
      "
        >
            Show Answer
        </motion.button>
    );
}
