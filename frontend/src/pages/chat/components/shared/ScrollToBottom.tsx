/**
 * ScrollToBottom - Oracle Theme
 * Floating navigation anchor.
 *
 * Location: chat/components/shared/ScrollToBottom.tsx
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
  threshold = 200,
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
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={scrollToBottom}
      className={cn(
        'fixed bottom-28 right-8 z-30',
        'p-3 rounded-full',
        'bg-black/80 backdrop-blur-md',
        'border border-white/10 hover:border-cyan-500/50',
        'text-slate-400 hover:text-cyan-300',
        'shadow-lg shadow-black/50 hover:shadow-cyan-500/20',
        'transition-all duration-300',
        className
      )}
      title="Return to present"
      >
      <ArrowDown size={20} />
      </motion.button>
    )}
    </AnimatePresence>
  );
};

export default ScrollToBottom;
