import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { RotateCw } from "lucide-react";
import { useState } from "react";

export const FlashcardBlock = createReactBlockSpec(
  {
    type: "flashcard",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      front: {
        default: "Front text",
      },
      back: {
        default: "Back text",
      },
      // We can use the block content as the front,
      // but flashcards need TWO fields (front/back).
      // BlockNote blocks usually have one content field.
      // We'll use the main content as 'Front' and a custom editable input for 'Back'.
      // OR we just use props for back?
      // Better: Main content = Front.
      // Back is a separate textarea in the UI?
    },
    content: "inline", // Front content
  },
  {
    render: (props) => {
      const [isFlipped, setIsFlipped] = useState(false);
      const [backText, setBackText] = useState(props.block.props.back);

      const handleFlip = () => setIsFlipped(!isFlipped);

      // Save back text on blur
      const handleBackBlur = () => {
        props.editor.updateBlock(props.block, {
          type: "flashcard",
          props: { back: backText },
        });
      };

      return (
        <div className="perspective-1000 group my-4 w-full">
          <div className="relative min-h-[120px] w-full overflow-visible rounded-xl border border-cyan-500/30 bg-black/40 p-6 pb-2 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)]">
            {/* Header / Flip Control */}
            <div
              className="absolute right-2 top-2 z-10 cursor-pointer rounded-full p-1.5 text-cyan-400 hover:bg-white/10"
              contentEditable={false}
              onClick={handleFlip}
              title="Flip Card"
            >
              <RotateCw
                size={16}
                className={`transition-transform duration-500 ${isFlipped ? "rotate-180" : ""}`}
              />
            </div>

            {/* Label */}
            <div
              className="absolute left-6 top-3 select-none font-mono text-xs uppercase tracking-wider text-cyan-500/50"
              contentEditable={false}
            >
              {isFlipped ? "ANSWER (BACK)" : "QUESTION (FRONT)"}
            </div>

            {/* Front Content (Inline Editable) */}
            <div className={`mt-4 ${isFlipped ? "hidden" : "block"}`}>
              <div
                className="text-lg font-medium text-white"
                ref={props.contentRef}
              />
            </div>

            {/* Back Content (Custom Input) */}
            <div className={`mt-4 ${isFlipped ? "block" : "hidden"}`}>
              <textarea
                className="w-full resize-none border-none bg-transparent font-sans text-lg font-medium text-cyan-100 outline-none"
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                onBlur={handleBackBlur}
                placeholder="Enter answer here..."
                rows={3}
                // Stop blocknote from handling events here
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      );
    },
  },
);
