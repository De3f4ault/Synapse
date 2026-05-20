/**
 * ResumeSessionBanner
 *
 * Passive banner shown at the top of StudyPage when the user has an
 * in-progress or recently abandoned session.
 *
 * Data: GET /study/sessions/active via TanStack Query (no streaming needed)
 *
 * Three actions:
 *  - Continue: navigate to the review page with the existing session
 *  - Discard: call POST /sessions/{id}/abandon then refetch
 *  - View summary: future — for now navigates to session detail
 *
 * Stale logic: backend already filters out sessions older than 48h and
 * sessions with no reviewed cards older than 2h, so we just render what
 * comes back.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X, ChevronRight } from 'lucide-react';
import { StudySessionsService } from '@/api/generated';

interface ActiveSession {
  id: number;
  deck_id: number | null;
  deck_name: string | null;
  session_mode: string;
  resume_status: 'in_progress' | 'abandoned';
  cards_planned: { card_id: number; deck_id: number }[];
  current_card_index: number;
  progress_pct: number;
  last_activity_at: string;
}

export function ResumeSessionBanner() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const { data: sessions = [] } = useQuery<ActiveSession[]>({
    queryKey: ['study', 'active-sessions'],
    queryFn: () =>
      StudySessionsService.getActiveSessionsApiV1StudySessionsActiveGet() as Promise<ActiveSession[]>,
    staleTime: 60_000, // 1 min
    refetchOnWindowFocus: true,
  });

  const { mutate: abandonSession } = useMutation({
    mutationFn: (sessionId: number) =>
      StudySessionsService.abandonSessionApiV1StudySessionsSessionIdAbandonPost(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'active-sessions'] });
    },
  });

  // Show the most recent resumable session only
  const session = sessions[0] ?? null;

  if (!session) return null;

  const cardsRemaining =
    session.cards_planned.length - session.current_card_index;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(session.last_activity_at).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  })();

  const handleContinue = () => {
    // Navigate to the review page carrying the session_id as state
    if (session.deck_id) {
      navigate(`/flashcards/${session.deck_id}/review`, {
        state: { resumeSessionId: session.id },
      });
    } else {
      navigate('/study/session', {
        state: { resumeSessionId: session.id },
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="resume-banner"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="relative flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 mb-2"
      >
        {/* Left icon */}
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <RotateCcw size={16} className="text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {session.resume_status === 'in_progress' ? 'Resume your session' : 'Continue where you left off'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.deck_name
              ? `${session.deck_name} · `
              : 'Cross-deck session · '}
            {cardsRemaining} card{cardsRemaining !== 1 ? 's' : ''} remaining ·{' '}
            {timeAgo}
          </p>

          {/* Progress bar */}
          <div className="mt-2 h-1 rounded-full bg-primary/10 overflow-hidden w-40">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${session.progress_pct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleContinue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Continue
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Discard */}
        <button
          onClick={() => abandonSession(session.id)}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          title="Discard session"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
