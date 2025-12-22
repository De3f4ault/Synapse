/**
 * CreateCardPage - Fragment Constructor
 * Neumorphic Design
 */

import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { FlashcardEditor } from "./components/card/FlashcardEditor";
import { NeumorphicButton, NeumorphicCard } from "@/components/neumorphic";

export function CreateCardPage() {
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();
  const id = parseInt(deckId || "0", 10);

  if (!id) {
    navigate("/flashcards");
    return null;
  }

  return (
    <div className="min-h-screen nm-bg nm-constellation-bg flex flex-col items-center p-8 relative z-10">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <NeumorphicButton
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/flashcards/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </NeumorphicButton>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Construct Memory Fragment
            </h1>
            <p className="text-slate-400 font-mono text-xs tracking-wider uppercase mt-1">
              ADD NEW FLASHCARD TO CORE
            </p>
          </div>
        </motion.div>

        {/* Editor Card */}
        <NeumorphicCard className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FlashcardEditor
              deckId={id}
              onSuccess={() => navigate(`/flashcards/${id}`)}
              onCancel={() => navigate(`/flashcards/${id}`)}
              mode="modal"
            />
          </motion.div>
        </NeumorphicCard>
      </div>
    </div>
  );
}
