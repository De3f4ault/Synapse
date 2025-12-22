import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { validateQuestion } from "../../utils/questionValidator";
import { QuestionTypeSelector } from "./QuestionTypeSelector";

interface QuestionEditorProps {
  onSave: (question: QuestionData) => void;
  onCancel: () => void;
  initialData?: QuestionData;
}

export interface QuestionData {
  question_text: string;
  options: string[];
  correct_answer: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  explanation?: string;
}

/**
 * Manual question editor for quiz creation
 */
export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  onSave,
  onCancel,
  initialData,
}) => {
  const [questionData, setQuestionData] = useState<QuestionData>(
    initialData || {
      question_text: "",
      options: ["", ""],
      correct_answer: "",
      type: "multiple_choice",
      explanation: "",
    },
  );

  const [errors, setErrors] = useState<string[]>([]);

  // Handle question text change
  const handleQuestionChange = (text: string) => {
    setQuestionData((prev) => ({ ...prev, question_text: text }));
    setErrors([]);
  };

  // Handle option change
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionData.options];
    newOptions[index] = value;
    setQuestionData((prev) => ({ ...prev, options: newOptions }));
    setErrors([]);
  };

  // Add new option
  const addOption = () => {
    if (questionData.options.length < 6) {
      setQuestionData((prev) => ({
        ...prev,
        options: [...prev.options, ""],
      }));
    }
  };

  // Remove option
  const removeOption = (index: number) => {
    if (questionData.options.length > 2) {
      const newOptions = questionData.options.filter((_, i) => i !== index);
      setQuestionData((prev) => ({
        ...prev,
        options: newOptions,
        // Reset correct answer if it was the removed option
        correct_answer:
          prev.correct_answer === prev.options[index]
            ? ""
            : prev.correct_answer,
      }));
    }
  };

  // Handle correct answer selection
  const handleCorrectAnswerChange = (answer: string) => {
    setQuestionData((prev) => ({ ...prev, correct_answer: answer }));
    setErrors([]);
  };

  // Handle type change
  const handleTypeChange = (type: QuestionData["type"]) => {
    let newOptions = questionData.options;

    // True/False type should only have 2 options
    if (type === "true_false") {
      newOptions = ["True", "False"];
    }
    // Short answer doesn't need options
    else if (type === "short_answer") {
      newOptions = [];
    }
    // Multiple choice needs at least 2 options
    else if (type === "multiple_choice" && newOptions.length === 0) {
      newOptions = ["", ""];
    }

    setQuestionData((prev) => ({
      ...prev,
      type,
      options: newOptions,
      correct_answer: "",
    }));
  };

  // Validate and save
  const handleSave = () => {
    const validation = validateQuestion({
      question_text: questionData.question_text,
      options: questionData.options,
      correct_answer: questionData.correct_answer,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(questionData);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="border-b border-white/5 pb-4">
          <h2 className="text-2xl font-serif font-bold text-white mb-2">
            {initialData ? "Edit Question" : "Create Question"}
          </h2>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
            Tactical Query Configuration
          </p>
        </div>

        {/* Errors */}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2"
            >
              {errors.map((error, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-red-400 text-sm"
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Type Selector */}
        <QuestionTypeSelector
          selectedType={questionData.type}
          onTypeChange={handleTypeChange}
        />

        {/* Question Text */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            Question Text
          </label>
          <Textarea
            value={questionData.question_text}
            onChange={(e) => handleQuestionChange(e.target.value)}
            placeholder="Enter your question here..."
            className="min-h-[100px] bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
          />
        </div>

        {/* Options (Multiple Choice & True/False) */}
        {(questionData.type === "multiple_choice" ||
          questionData.type === "true_false") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Answer Options
              </label>
              {questionData.type === "multiple_choice" &&
                questionData.options.length < 6 && (
                  <Button
                    onClick={addOption}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Option
                  </Button>
                )}
            </div>

            <div className="space-y-2">
              {questionData.options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  {/* Option Input */}
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    disabled={questionData.type === "true_false"}
                    className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                  />

                  {/* Correct Answer Radio */}
                  <button
                    onClick={() => handleCorrectAnswerChange(option)}
                    className={cn(
                      "p-2 rounded-lg border transition-all",
                      questionData.correct_answer === option
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-white/5 border-white/10 text-slate-500 hover:border-cyan-500/30",
                    )}
                    title="Mark as correct answer"
                  >
                    <Check size={16} />
                  </button>

                  {/* Delete Button */}
                  {questionData.type === "multiple_choice" &&
                    questionData.options.length > 2 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Remove option"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                </motion.div>
              ))}
            </div>

            {/* Correct Answer Indicator */}
            {questionData.correct_answer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-emerald-400 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2"
              >
                <Check size={14} />
                Correct answer: {questionData.correct_answer}
              </motion.div>
            )}
          </div>
        )}

        {/* Short Answer */}
        {questionData.type === "short_answer" && (
          <div className="space-y-2">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Expected Answer
            </label>
            <Input
              value={questionData.correct_answer}
              onChange={(e) => handleCorrectAnswerChange(e.target.value)}
              placeholder="Enter the expected answer..."
              className="bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
            />
            <p className="text-xs text-slate-500 font-mono">
              Note: Short answers will be validated with case-insensitive
              matching
            </p>
          </div>
        )}

        {/* Explanation (Optional) */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-purple-400 uppercase tracking-wider">
            Explanation (Optional)
          </label>
          <Textarea
            value={questionData.explanation || ""}
            onChange={(e) =>
              setQuestionData((prev) => ({
                ...prev,
                explanation: e.target.value,
              }))
            }
            placeholder="Provide an explanation for this question..."
            className="min-h-[80px] bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500/50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <Check size={16} className="mr-2" />
            Save Question
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
