import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldError } from 'react-hook-form';

interface FormCheckboxProps {
    label: string;
    description?: string;
    error?: FieldError;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    id?: string;
}

/**
 * FormCheckbox Component
 *
 * Enhanced checkbox with label, description, and error handling.
 * Integrates with react-hook-form for validation display.
 */
export const FormCheckbox = forwardRef<HTMLButtonElement, FormCheckboxProps>(
    ({ label, description, error, checked, onCheckedChange, disabled, required, className, id }, ref) => {
        const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
        const hasError = !!error;

        return (
            <div className={cn('space-y-2', className)}>
            {/* Checkbox with Label */}
            <div className="flex items-start gap-3">
            <Checkbox
            ref={ref}
            id={fieldId}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={
                error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
            }
            className={cn(
                'mt-0.5',
                hasError && 'border-destructive'
            )}
            />
            <div className="flex-1 space-y-1">
            <Label
            htmlFor={fieldId}
            className={cn(
                'text-sm font-medium leading-none cursor-pointer',
                disabled && 'cursor-not-allowed opacity-70'
            )}
            >
            {label}
            {required && (
                <span className="ml-1 text-destructive" aria-label="required">
                *
                </span>
            )}
            </Label>
            {description && (
                <p
                id={`${fieldId}-description`}
                className="text-sm text-muted-foreground"
                >
                {description}
                </p>
            )}
            </div>
            </div>

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
                className="flex items-center gap-1.5 text-sm text-destructive pl-7"
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

FormCheckbox.displayName = 'FormCheckbox';
