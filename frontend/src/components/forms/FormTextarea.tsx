import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldError } from 'react-hook-form';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: FieldError;
    helperText?: string;
    required?: boolean;
    showCharCount?: boolean;
    maxLength?: number;
}

/**
 * FormTextarea Component
 *
 * Enhanced textarea field with label, error handling, and optional character counter.
 * Integrates with react-hook-form for validation display.
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    ({ label, error, helperText, required, showCharCount, maxLength, className, id, value, ...props }, ref) => {
        const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
        const hasError = !!error;
        const currentLength = typeof value === 'string' ? value.length : 0;

        return (
            <div className="space-y-2">
            {/* Label with optional character count */}
            <div className="flex items-center justify-between">
            <Label htmlFor={fieldId} className="flex items-center gap-1">
            {label}
            {required && (
                <span className="text-destructive" aria-label="required">
                *
                </span>
            )}
            </Label>

            {showCharCount && maxLength && (
                <span className={cn(
                    'text-xs text-muted-foreground',
                    currentLength > maxLength && 'text-destructive'
                )}>
                {currentLength} / {maxLength}
                </span>
            )}
            </div>

            {/* Textarea */}
            <Textarea
            ref={ref}
            id={fieldId}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={
                error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
            }
            maxLength={maxLength}
            value={value}
            className={cn(
                hasError && 'border-destructive focus-visible:ring-destructive',
                className
            )}
            {...props}
            />

            {/* Helper Text (only show when no error) */}
            {!hasError && helperText && (
                <p
                id={`${fieldId}-helper`}
                className="text-sm text-muted-foreground"
                >
                {helperText}
                </p>
            )}

            {/* Error Message */}
            <AnimatePresence mode="wait">
            {hasError && (
                <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id={`${fieldId}-error`}
                role="alert"
                className="flex items-center gap-1.5 text-sm text-destructive"
                >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error.message}</span>
                </motion.div>
            )}
            </AnimatePresence>
            </div>
        );
    }
);

FormTextarea.displayName = 'FormTextarea';
