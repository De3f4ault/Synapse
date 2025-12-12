import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
}

/**
 * PageTransition Component
 *
 * Wraps page content with smooth entry/exit animations.
 * Use this wrapper for all page-level components.
 */
export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
            duration: 0.3,
            ease: 'easeInOut',
        }}
        >
        {children}
        </motion.div>
    );
}
