import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FieldError } from "react-hook-form";

interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  label: string;
  options: RadioOption[];
  error?: FieldError;
  helperText?: string;
  required?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
  id?: string;
}

/**
 * FormRadioGroup Component
 *
 * Enhanced radio group with label, descriptions, and error handling.
 * Integrates with react-hook-form for validation display.
 */
export const FormRadioGroup = forwardRef<HTMLDivElement, FormRadioGroupProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      required,
      value,
      onValueChange,
      disabled,
      orientation = "vertical",
      className,
      id,
    },
    ref,
  ) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;

    return (
      <div className={cn("space-y-3", className)}>
        {/* Label */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-base">
            {label}
            {required && (
              <span className="text-destructive" aria-label="required">
                *
              </span>
            )}
          </Label>
          {helperText && !hasError && (
            <p className="text-sm text-muted-foreground">{helperText}</p>
          )}
        </div>

        {/* Radio Group */}
        <RadioGroup
          ref={ref}
          id={fieldId}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(orientation === "horizontal" && "flex flex-wrap gap-4")}
        >
          {options.map((option, index) => {
            const optionId = `${fieldId}-option-${index}`;

            return (
              <div key={option.value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={option.value}
                  id={optionId}
                  disabled={option.disabled || disabled}
                  className={cn("mt-0.5", hasError && "border-destructive")}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={optionId}
                    className={cn(
                      "text-sm font-medium leading-none cursor-pointer",
                      (option.disabled || disabled) &&
                        "cursor-not-allowed opacity-70",
                    )}
                  >
                    {option.label}
                  </Label>
                  {option.description && (
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </RadioGroup>

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
  },
);

FormRadioGroup.displayName = "FormRadioGroup";
