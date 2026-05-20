import { toast as sonnerToast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from "lucide-react";

/**
 * Toast Utilities
 *
 * Wrapper around Sonner toast library with consistent styling
 * and icon components for different toast types.
 */

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  description?: string;
  action?: ToastAction;
  duration?: number;
}

/**
 * Success toast with green checkmark icon
 */
export const success = (title: string, options?: ToastOptions) => {
  return sonnerToast.success(title, {
    description: options?.description,
    duration: options?.duration ?? 3000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
    icon: (
      <CheckCircle className="h-5 w-5 text-green-600 dark:text-accent-olive" />
    ),
  });
};

/**
 * Error toast with red X icon
 */
export const error = (title: string, options?: ToastOptions) => {
  return sonnerToast.error(title, {
    description: options?.description,
    duration: options?.duration ?? 7000, // Longer duration for errors
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
    icon: <XCircle className="h-5 w-5 text-red-600 dark:text-destructive" />,
  });
};

/**
 * Warning toast with amber alert icon
 */
export const warning = (title: string, options?: ToastOptions) => {
  return sonnerToast.warning(title, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
    icon: (
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-warning" />
    ),
  });
};

/**
 * Info toast with blue info icon
 */
export const info = (title: string, options?: ToastOptions) => {
  return sonnerToast.info(title, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-info" />,
  });
};

/**
 * Loading toast with spinner
 * Returns toast ID that can be used to update/dismiss later
 */
export const loading = (title: string, description?: string) => {
  return sonnerToast.loading(title, {
    description,
    icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
  });
};

/**
 * Promise toast - shows loading, then success/error based on promise result
 */
export const promise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  },
) => {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};

/**
 * Update an existing toast (useful with loading toasts)
 */
export const update = (
  toastId: string | number,
  options: {
    title?: string;
    description?: string;
    variant?: "success" | "error" | "warning" | "info";
  },
) => {
  const iconMap = {
    success: (
      <CheckCircle className="h-5 w-5 text-green-600 dark:text-accent-olive" />
    ),
    error: <XCircle className="h-5 w-5 text-red-600 dark:text-destructive" />,
    warning: (
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-warning" />
    ),
    info: <Info className="h-5 w-5 text-blue-600 dark:text-info" />,
  };

  sonnerToast.success(options.title ?? "", {
    id: toastId,
    description: options.description,
    icon: options.variant ? iconMap[options.variant] : undefined,
  });
};

/**
 * Dismiss a specific toast
 */
export const dismiss = (toastId?: string | number) => {
  sonnerToast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
  sonnerToast.dismiss();
};

// Export as default object for convenience
export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  update,
  dismiss,
  dismissAll,
};
