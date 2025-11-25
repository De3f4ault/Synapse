/**
 * StreamingText - Typewriter effect
 * Animates text character by character
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StreamingTextProps {
  text: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
  className?: string;
}

export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  speed = 20,
  onComplete,
  className,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className={className}>
    {displayedText}
    {currentIndex < text.length && (
      <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity }}
      className="inline-block w-1 h-4 bg-primary ml-0.5 align-middle"
      />
    )}
    </span>
  );
};

export default StreamingText;
