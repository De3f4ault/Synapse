import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * FeedbackButton Component
 *
 * Fixed floating button that opens a feedback form.
 * Useful for collecting user feedback from anywhere in the app.
 */
export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!feedback.trim()) {
            toast.error('Please enter your feedback');
            return;
        }

        setIsSubmitting(true);

        // Simulate API call (replace with actual endpoint)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // TODO: Replace with actual API call
        console.log('Feedback submitted:', feedback);

        toast.success('Thank you for your feedback!');
        setFeedback('');
        setIsOpen(false);
        setIsSubmitting(false);
    };

    return (
        <>
        {/* Floating Button */}
        <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
        <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow',
            isOpen && 'bg-muted hover:bg-muted'
        )}
        aria-label={isOpen ? 'Close feedback form' : 'Open feedback form'}
        >
        <AnimatePresence mode="wait">
        {isOpen ? (
            <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            >
            <X className="h-6 w-6" />
            </motion.div>
        ) : (
            <motion.div
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            >
            <MessageSquare className="h-6 w-6" />
            </motion.div>
        )}
        </AnimatePresence>
        </Button>
        </motion.div>

        {/* Feedback Form Panel */}
        <AnimatePresence>
        {isOpen && (
            <>
            {/* Backdrop */}
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
            >
            <div className="rounded-lg border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Send Feedback</h3>
            <p className="text-sm text-muted-foreground mb-4">
            Help us improve by sharing your thoughts
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
            id="feedback"
            placeholder="Tell us what you think..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            disabled={isSubmitting}
            className="resize-none"
            />
            </div>

            <div className="flex gap-2 justify-end">
            <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            >
            Cancel
            </Button>
            <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !feedback.trim()}
            >
            {isSubmitting ? (
                <>
                <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                />
                Sending...
                </>
            ) : (
                <>
                <Send className="mr-2 h-4 w-4" />
                Send
                </>
            )}
            </Button>
            </div>
            </form>
            </div>
            </motion.div>
            </>
        )}
        </AnimatePresence>
        </>
    );
}
