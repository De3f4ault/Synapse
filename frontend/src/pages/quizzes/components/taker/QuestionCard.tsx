import React from "react";
import { motion } from "framer-motion";
import { AnswerOptions } from "./AnswerOptions";
import type { ParsedQuestion } from "../../types/quizzes.types";

interface QuestionCardProps {
  question: ParsedQuestion;
  questionIndex: number;
  selectedOption: string | null;
  onAnswer: (option: string) => void;
}

/**
 * Question card with military styling
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  selectedOption,
  onAnswer,
}) => {
  return (
    <motion.div
      key={questionIndex}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#0A0A0A]/90 border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden"
    >
      {/* Accent Bar */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-500" />

      {/* Question ID */}
      <span className="text-cyan-500 font-mono text-xs mb-4 block tracking-[0.2em] uppercase">
        QUERY_ID: {question.id.toString().padStart(4, "0")}
      </span>

      {/* Question Text */}
      <h2 className="text-2xl font-serif text-white leading-relaxed mb-8">
        {question.question_text}
      </h2>

      {/* Options */}
      <AnswerOptions
        options={question.options}
        selectedOption={selectedOption}
        onAnswer={onAnswer}
      />
    </motion.div>
  );
};
