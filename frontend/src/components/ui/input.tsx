import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — Warm design system
 *
 * 6 form states per Claude spec:
 *   Default    — warm border, elevated bg
 *   Focus      — cool-blue ring (sole cool-toned moment)
 *   Disabled   — shifted bg + color, not just opacity
 *   Error      — red border + error ring (use aria-invalid)
 *   Read-only  — parchment bg, default border, cursor-default
 *   Success    — communicated via message copy, not border
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2",
          "text-base text-foreground leading-relaxed",
          // File inputs
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus — cool-blue ring, sole cool moment
          "focus-visible:outline-none focus-visible:border-[#3898ec] focus-visible:ring-2 focus-visible:ring-[#3898ec]/20",
          // Disabled — colour shift, not just opacity
          "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:border-muted",
          // Read-only
          "read-only:cursor-default read-only:bg-background read-only:text-muted-foreground",
          // Error state via aria-invalid
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15",
          // Transition
          "transition-all duration-200 ease-out",
          // Responsive
          "md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
