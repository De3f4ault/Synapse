import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";

// Define the Alert Block
export const AlertBlock = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      ...defaultProps,
      type: {
        default: "info",
        values: ["info", "warning", "error", "success"],
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      // Map alert types to Tailwind styles
      const styles = {
        info: {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-200 dark:border-blue-500/50",
          text: "text-blue-800 dark:text-blue-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          )
        },
        warning: {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-500/50",
          text: "text-amber-800 dark:text-amber-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 dark:text-amber-400">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          )
        },
        error: {
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-200 dark:border-red-500/50",
          text: "text-red-800 dark:text-red-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          )
        },
        success: {
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-500/50",
          text: "text-emerald-800 dark:text-emerald-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 dark:text-emerald-400">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          )
        }
      };

      const style = styles[props.block.props.type as keyof typeof styles];

      return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border my-2 ${style.bg} ${style.border}`}>
          <div className="flex-none mt-0.5 select-none" contentEditable={false}>
             {/* 
               Dropdown to change alert type could go here. 
               For now, simple icon.
             */}
             <div 
               className="cursor-pointer hover:opacity-80 transition-opacity"
               onClick={() => {
                  // Cycle types on icon click
                  const types = ["info", "warning", "error", "success"] as const;
                  const currentIdx = types.indexOf(props.block.props.type as typeof types[number]);
                  const nextType = types[(currentIdx + 1) % types.length];
                  
                  props.editor.updateBlock(props.block, {
                    props: { type: nextType }
                  });
               }}
             >
               {style.icon}
             </div>
          </div>
          <div className={`flex-1 min-w-0 ${style.text}`} ref={props.contentRef} />
        </div>
      );
    },
  }
);
