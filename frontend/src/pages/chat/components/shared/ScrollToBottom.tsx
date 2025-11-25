/**
 * ScrollToBottom - Floating scroll button
 * Appears when user scrolls up, scrolls to bottom on click
 */

import React, { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollToBottomProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  threshold?: number;
  className?: string;
}

export const ScrollToBottom: React.FC<ScrollToBottomProps> = ({
  scrollRef,
  threshold = 100,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsVisible(distanceFromBottom > threshold);
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [scrollRef, threshold]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
    {isVisible && (
      <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onClick={scrollToBottom}
      className={cn(
        'fixed bottom-24 right-8 z-20',
        'p-3 rounded-full',
        'bg-[#1D1E22]/90 backdrop-blur-xl',
        'border border-[#353638]',
        'text-white/80 hover:text-white',
        'hover:bg-[#353638]/80',
        'shadow-lg shadow-black/20',
        'transition-colors duration-200',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Scroll to bottom"
      >
      <ArrowDown className="w-5 h-5" strokeWidth={2} />
      </motion.button>
    )}
    </AnimatePresence>
  );
};

export default ScrollToBottom;
