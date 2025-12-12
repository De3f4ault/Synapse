// Your simplified dialog implementation (without Radix UI)
// Use this if you prefer a simpler dialog without all Radix features

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface SimpleDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

const SimpleDialog = ({ open, onOpenChange, children }: SimpleDialogProps) => {
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [open])

    if (!open) return null

        return (
            <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
            className="fixed inset-0 bg-black/80"
            onClick={() => onOpenChange?.(false)}
            />
            {children}
            </div>
            </>
        )
}

const SimpleDialogContent = React.forwardRef<
HTMLDivElement,
React.HTMLAttributes<HTMLDivElement> & { showClose?: boolean }
>(({ className, children, showClose = true, ...props }, ref) => (
    <div
    ref={ref}
    className={cn(
        "relative z-50 grid w-full max-w-lg gap-4 border border-slate-200 bg-white p-6 shadow-lg sm:rounded-lg dark:border-slate-800 dark:bg-slate-950",
        className
    )}
    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
    {...props}
    >
    {children}
    </div>
))
SimpleDialogContent.displayName = "SimpleDialogContent"

const SimpleDialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
    className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
    )}
    {...props}
    />
)
SimpleDialogHeader.displayName = "SimpleDialogHeader"

const SimpleDialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
    className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
    )}
    {...props}
    />
)
SimpleDialogFooter.displayName = "SimpleDialogFooter"

const SimpleDialogTitle = React.forwardRef<
HTMLHeadingElement,
React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
    ref={ref}
    className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
    )}
    {...props}
    />
))
SimpleDialogTitle.displayName = "SimpleDialogTitle"

const SimpleDialogDescription = React.forwardRef<
HTMLParagraphElement,
React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
    ref={ref}
    className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
    {...props}
    />
))
SimpleDialogDescription.displayName = "SimpleDialogDescription"

export {
    SimpleDialog,
    SimpleDialogContent,
    SimpleDialogHeader,
    SimpleDialogFooter,
    SimpleDialogTitle,
    SimpleDialogDescription,
}
