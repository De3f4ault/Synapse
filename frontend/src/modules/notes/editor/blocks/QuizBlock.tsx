import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { HelpCircle } from "lucide-react";

export const QuizBlock = createReactBlockSpec(
  {
    type: "quiz",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      correctAnswer: {
        default: "",
      },
      options: {
        default: JSON.stringify(["Option 1", "Option 2"]), // array stored as string
      },
    },
    content: "inline", // The Question
  },
  {
    render: (props) => {
      // For v1, let's keep it simple: A question block with a revealable answer.
      // True multiple choice requires complex UI for adding/removing options.
      // Let's make it a "Q&A" style block: Question (inline) + Answer (hidden).

      return (
        <div className="my-4 w-full rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-3" contentEditable={false}>
            <HelpCircle size={18} className="text-purple-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-purple-400/70">
              Quiz Question
            </span>
          </div>

          {/* Question Content */}
          <div
            className="mb-4 pl-1 text-lg font-medium text-white"
            ref={props.contentRef}
          />

          {/* Placeholder for future multiple choice UI */}
          <div className="pl-1" contentEditable={false}>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm italic text-slate-400">
              Multiple choice options coming in v2...
            </div>
          </div>
        </div>
      );
    },
  },
);
