/**
 * SpacedRepetitionInfo Component
 * Educational tooltip/modal explaining spaced repetition algorithm
 */

import { Brain, TrendingUp, Calendar, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SpacedRepetitionInfo() {
    return (
        <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5">
        <CardHeader>
        <CardTitle className="text-white font-serif text-xl flex items-center gap-2">
        <Brain className="h-5 w-5 text-cyan-500" />
        Neural Imprinting Algorithm
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300">
        <p className="text-sm leading-relaxed">
        The Mnemosyne Protocol uses an advanced <strong>SuperMemo 2 (SM-2)</strong> spaced
        repetition algorithm to optimize long-term memory retention.
        </p>

        <div className="space-y-3">
        <div className="flex items-start gap-3">
        <div className="mt-1">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
        <h4 className="text-sm font-bold text-white mb-1">Adaptive Scheduling</h4>
        <p className="text-xs text-slate-400">
        Review intervals adjust based on your performance. Master a card, and the system
        extends the time until your next review.
        </p>
        </div>
        </div>

        <div className="flex items-start gap-3">
        <div className="mt-1">
        <Calendar className="h-4 w-4 text-purple-400" />
        </div>
        <div>
        <h4 className="text-sm font-bold text-white mb-1">Optimal Timing</h4>
        <p className="text-xs text-slate-400">
        Cards are presented just before you're likely to forget them, maximizing retention
        with minimal effort.
        </p>
        </div>
        </div>

        <div className="flex items-start gap-3">
        <div className="mt-1">
        <Zap className="h-4 w-4 text-amber-400" />
        </div>
        <div>
        <h4 className="text-sm font-bold text-white mb-1">Difficulty Ratings</h4>
        <p className="text-xs text-slate-400">
        Your ratings (Again, Hard, Good, Easy) fine-tune the algorithm, creating a
        personalized learning path.
        </p>
        </div>
        </div>
        </div>

        <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
        <p className="text-xs font-mono text-cyan-300 leading-relaxed">
        <strong>Pro Tip:</strong> Review daily for optimal results. The algorithm works best
        with consistent engagement—even 10 minutes a day yields dramatic improvements.
        </p>
        </div>
        </CardContent>
        </Card>
    );
}
