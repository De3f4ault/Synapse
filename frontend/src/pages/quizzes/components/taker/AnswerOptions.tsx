import React from "react";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerOptionsProps {
  options: string[];
  selectedOption: string | null;
  onAnswer: (option: string) => void;
}

/**
 * Answer options with selection states
 */
export const AnswerOptions: React.FC<AnswerOptionsProps> = ({
  options,
  selectedOption,
  onAnswer,
}) => {
  return (
    <div className="space-y-3">
      {options.map((opt, i) => {
        const optStr = String(opt);
        const isSelected = selectedOption === optStr;

        let statusClass =
          "border-white/10 hover:border-cyan-500/50 hover:bg-white/5 text-slate-300";
        if (selectedOption !== null) {
          if (isSelected) {
            statusClass = "border-cyan-500 bg-cyan-500/10 text-cyan-400";
          } else {
            statusClass = "border-white/5 text-slate-600 opacity-50";
          }
        }

        return (
          <button
            key={i}
            onClick={() => onAnswer(optStr)}
            disabled={selectedOption !== null}
            className={cn(
              "w-full p-4 rounded-lg border text-left transition-all duration-300 relative overflow-hidden group",
              statusClass,
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <span className="text-sm font-medium">{optStr}</span>
              {isSelected && (
                <CheckCircle size={18} className="text-cyan-400" />
              )}
            </div>
            {/* Hover Scanline Effect */}
            {selectedOption === null && (
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            )}
          </button>
        );
      })}
    </div>
  );
};
