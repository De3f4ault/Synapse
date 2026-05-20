import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button variants — Warm design system
 *
 * Variants follow Claude's 5-button system:
 *   default   → Brand Terracotta (primary CTA)
 *   secondary → Warm Sand (workhorse button)
 *   outline   → Border with warm ring shadow
 *   ghost     → Transparent, warm hover
 *   link      → Terracotta underline
 *   destructive → Error crimson
 *   surface   → White/Ivory elevated context
 *   dark      → Dark Charcoal inverted emphasis
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3898ec] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Brand Terracotta — primary CTA, the only chromatic button
        default:
          "bg-primary text-primary-foreground shadow-ring-brand hover:bg-primary/90 active:scale-[0.98]",

        // Warm Sand — secondary workhorse
        secondary:
          "bg-secondary text-secondary-foreground shadow-ring hover:bg-secondary/80 active:scale-[0.98]",

        // Outline — bordered with warm ring
        outline:
          "border border-input bg-transparent shadow-ring hover:bg-accent/10 hover:text-accent-foreground hover:shadow-ring-hover",

        // Ghost — minimal, warm hover
        ghost:
          "hover:bg-accent/10 hover:text-accent-foreground",

        // Link — terracotta underline
        link:
          "text-primary underline-offset-4 hover:underline",

        // Destructive — error crimson
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",

        // White Surface — elevated light context
        surface:
          "bg-white text-near-black rounded-xl hover:bg-warm-50 shadow-ring active:scale-[0.98]",

        // Dark Charcoal — inverted emphasis on light surfaces
        dark:
          "bg-warm-900 text-warm-50 rounded-lg shadow-ring hover:bg-warm-950 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        xl: "h-12 rounded-xl px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
