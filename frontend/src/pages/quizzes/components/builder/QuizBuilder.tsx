import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Wand2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizBuilderProps {
    onCancel: () => void;
    onCreate: (topic: string) => Promise<void>;
    isCreating: boolean;
}

/**
 * The Architect - AI Quiz Generator Interface
 */
export const QuizBuilder: React.FC<QuizBuilderProps> = ({
    onCancel,
    onCreate,
    isCreating,
}) => {
    const [topic, setTopic] = useState('');

    const handleCreate = async () => {
        if (!topic.trim() || isCreating) return;
        await onCreate(topic);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && topic.trim() && !isCreating) {
            handleCreate();
        }
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative"
        >
        {/* Radial Gradient Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent opacity-80" />

        <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-12">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 mb-6 shadow-[0_0_40px_rgba(220,38,38,0.3)] relative">
        <Terminal size={32} className="text-red-500" />
        <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
        </div>

        <h1 className="text-5xl font-serif font-bold text-white mb-3 tracking-tight">
        The Architect
        </h1>
        <p className="text-slate-500 font-mono text-xs tracking-[0.25em] uppercase">
        Construct Simulation Parameters
        </p>
        </div>

        {/* Input Field */}
        <div className="relative group mb-8">
        <div
        className={cn(
            'absolute -inset-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 rounded-xl blur opacity-20 transition-opacity duration-500',
            isCreating && 'opacity-50 animate-pulse'
        )}
        />
        <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="ENTER SIMULATION TOPIC..."
        className="relative w-full bg-black/50 border border-white/10 rounded-xl p-6 text-lg text-white placeholder:text-slate-700 focus:border-red-500/50 outline-none transition-all text-center font-mono uppercase tracking-[0.15em] focus:shadow-[0_0_30px_rgba(220,38,38,0.2)]"
        disabled={isCreating}
        autoFocus
        />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
        <button
        onClick={onCancel}
        className="px-6 py-3 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-white/5 rounded-lg disabled:opacity-50"
        disabled={isCreating}
        >
        <XCircle size={14} />
        Abort
        </button>
        <button
        onClick={handleCreate}
        disabled={isCreating || !topic.trim()}
        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 flex items-center gap-2 hover:scale-105 active:scale-95"
        >
        {isCreating ? (
            <>
            <Loader2 size={14} className="animate-spin" />
            Compiling...
            </>
        ) : (
            <>
            <Wand2 size={14} />
            Initialize
            </>
        )}
        </button>
        </div>

        {/* Generation Status */}
        <AnimatePresence>
        {isCreating && (
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-8 text-center font-mono text-[10px] text-red-500/60 space-y-1"
            >
            <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            >
            &gt; PARSING SEMANTIC VECTORS...
            </motion.p>
            <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            >
            &gt; GENERATING OPPOSING FORCES...
            </motion.p>
            <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
            >
            &gt; FINALIZING PARAMETERS...
            </motion.p>
            </motion.div>
        )}
        </AnimatePresence>
        </div>
        </motion.div>
    );
};
