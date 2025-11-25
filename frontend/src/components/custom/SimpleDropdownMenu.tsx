// Your simplified dropdown implementation (without Radix UI)
// Use this if you prefer a simpler dropdown without all Radix features

import * as React from "react"
import { cn } from "@/lib/utils"

interface SimpleDropdownMenuProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

const SimpleDropdownMenu = ({ children }: SimpleDropdownMenuProps) => {
    return <div className="relative inline-block text-left">{children}</div>
}

const SimpleDropdownMenuTrigger = React.forwardRef<
HTMLButtonElement,
React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
    <button ref={ref} className={cn(className)} {...props}>
    {children}
    </button>
))
SimpleDropdownMenuTrigger.displayName = "SimpleDropdownMenuTrigger"

const SimpleDropdownMenuContent = React.forwardRef<
HTMLDivElement,
React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }
>(({ className, align = "start", ...props }, ref) => (
    <div
    ref={ref}
    className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
        align === "end" ? "right-0" : "left-0",
        "mt-2",
        className
    )}
    {...props}
    />
))
SimpleDropdownMenuContent.displayName = "SimpleDropdownMenuContent"

const SimpleDropdownMenuItem = React.forwardRef<
HTMLDivElement,
React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
    ref={ref}
    className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800",
        className
    )}
    {...props}
    />
))
SimpleDropdownMenuItem.displayName = "SimpleDropdownMenuItem"

const SimpleDropdownMenuSeparator = React.forwardRef<
HTMLDivElement,
React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-100 dark:bg-slate-800", className)}
    {...props}
    />
))
SimpleDropdownMenuSeparator.displayName = "SimpleDropdownMenuSeparator"

const SimpleDropdownMenuLabel = React.forwardRef<
HTMLDivElement,
React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
    />
))
SimpleDropdownMenuLabel.displayName = "SimpleDropdownMenuLabel"

export {
    SimpleDropdownMenu,
    SimpleDropdownMenuTrigger,
    SimpleDropdownMenuContent,
    SimpleDropdownMenuItem,
    SimpleDropdownMenuSeparator,
    SimpleDropdownMenuLabel,
}
