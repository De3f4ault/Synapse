import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashcardEditor } from '@/modules/flashcards/components/FlashcardEditor';

/**
 * CreateCardPage - Fragment Constructor
 * Standardized with Dashboard design
 */

export function CreateCardPage() {
    const navigate = useNavigate();
    const { deckId } = useParams<{ deckId: string }>();
    const id = parseInt(deckId || '0', 10);

    if (!id) {
        navigate('/flashcards');
        return null;
    }

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden">
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

        {/* Ambient Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/10 blur-[150px] rounded-full opacity-50" />

        <div className="relative z-10 max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
        >
        <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(`/flashcards/${id}`)}
        className="text-slate-500 hover:text-white hover:bg-white/5"
        >
        <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-wide">
        Construct Memory Fragment
        </h1>
        <p className="text-slate-400 font-mono text-xs tracking-[0.2em] uppercase mt-1">
        ADD NEW FLASHCARD TO CORE
        </p>
        </div>
        </motion.div>

        {/* Editor Card */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl"
        >
        <FlashcardEditor
        deckId={id}
        onSuccess={() => navigate(`/flashcards/${id}`)}
        onCancel={() => navigate(`/flashcards/${id}`)}
        mode="modal"
        />
        </motion.div>
        </div>
        </div>
    );
}
