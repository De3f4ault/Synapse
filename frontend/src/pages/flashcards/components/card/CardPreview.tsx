/**
 * CardPreview Component
 * Preview flashcard without full flip interaction
 */

import { Brain, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Flashcard } from '../../types/flashcards.types';

interface CardPreviewProps {
    card: Flashcard;
    showBack?: boolean;
}

export function CardPreview({ card, showBack = false }: CardPreviewProps) {
    return (
        <div className="grid md:grid-cols-2 gap-4">
        {/* Front */}
        <Card className="bg-[rgba(8,10,14,0.9)] backdrop-blur-xl border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent opacity-50" />
        <CardContent className="p-6 relative z-10">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-500/50 mb-4">
        <Brain size={14} />
        QUERY_LAYER
        </div>
        <p className="text-lg text-slate-200 leading-relaxed">{card.front_text}</p>
        </CardContent>
        </Card>

        {/* Back */}
        {showBack && (
            <Card className="bg-[rgba(10,12,18,0.9)] backdrop-blur-xl border-purple-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-50" />
            <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-2 justify-end text-xs font-mono text-purple-500/50 mb-4">
            DATA_CORE
            <Zap size={14} />
            </div>
            <p className="text-lg text-white/90 leading-relaxed">{card.back_text}</p>
            </CardContent>
            </Card>
        )}
        </div>
    );
}
