import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: FieldError;
    helperText?: string;
    required?: boolean;
}

/**
 * FormField Component
 *
 * Enhanced input field with label, error handling, and helper text.
 * Integrates with react-hook-form for validation display.
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
    ({ label, error, helperText, required, className, id, ...props }, ref) => {
        const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
        const hasError = !!error;

        return (
            <div className="space-y-2">
            {/* Label */}
            <Label htmlFor={fieldId} className="flex items-center gap-1">
            {label}
            {required && (
                <span className="text-destructive" aria-label="required">
                *
                </span>
            )}
            </Label>

            {/* Input */}
            <Input
            ref={ref}
            id={fieldId}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={
                error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
            }
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

FormField.displayName = 'FormField';
