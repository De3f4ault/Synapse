/**
 * StudySessionPage - Full Immersive Study Session
 * 
 * This page runs under ImmersiveRoute (no header) for distraction-free studying.
 * Matches the ReviewPage experience exactly.
 */

import { useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { AuroraBackground } from "@/shared/ui";
import { StudySession } from "./components/session/StudySession";
import { useDueItems } from "./hooks/useDueItems";
import { useRecommendations } from "./hooks/useRecommendations";
import type { StudyItem } from "./types/study.types";

export function StudySessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine session type from URL params
  const sessionType = searchParams.get("type") as "due" | "recommended" || "due";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  // Fetch items based on session type
  const { data: dueItems, isLoading: dueLoading } = useDueItems("flashcards,quizzes", limit);
  const { data: recommendations, isLoading: recLoading } = useRecommendations(limit);

  const isLoading = sessionType === "due" ? dueLoading : recLoading;
  const items: StudyItem[] = sessionType === "due" 
    ? (dueItems || []) 
    : (recommendations || []);

  const handleComplete = () => {
    navigate("/study");
  };

  const handleCancel = () => {
    navigate("/study");
  };

  // Loading state
  if (isLoading) {
    return (
      <AuroraBackground className="h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
            <p className="text-slate-400 uppercase tracking-widest text-xs">
              Loading session...
            </p>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  // No items state
  if (items.length === 0) {
    return (
      <AuroraBackground className="h-screen">
        {/* Floating Close Button */}
        <button
          onClick={() => navigate("/study")}
          className="fixed top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors z-20 opacity-50 hover:opacity-100"
        >
          <X size={20} className="text-slate-400" />
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-white">All caught up!</h1>
            <p className="text-slate-400">No items due for review right now.</p>
            <button
              onClick={() => navigate("/study")}
              className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-colors"
            >
              Back to Study Hub
            </button>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground className="h-screen">
      {/* Floating Close Button - Top Left Edge (matching ReviewPage) */}
      <button
        onClick={() => {
          if (confirm("End session?")) {
            handleCancel();
          }
        }}
        className="fixed top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors z-20 opacity-50 hover:opacity-100"
      >
        <X size={20} className="text-slate-400" />
      </button>

      {/* Floating Progress - Top Right Edge (matching ReviewPage) */}
      <div className="fixed top-6 right-6 flex flex-col items-end gap-1 z-20 opacity-50 hover:opacity-100 transition-opacity">
        <div className="text-xs font-mono text-slate-500 tracking-widest">
          {items.length} ITEMS
        </div>
        <div className="w-24 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-slate-500/60 w-0" />
        </div>
      </div>

      {/* Main Stage - Full immersive session */}
      <div className="flex-1 w-full flex flex-col z-10">
        <StudySession
          items={items}
          sessionType={sessionType}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </AuroraBackground>
  );
}
