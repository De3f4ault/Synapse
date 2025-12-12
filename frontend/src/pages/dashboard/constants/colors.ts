/**
 * Color scheme for dashboard modules and components
 * FIXED: Changed keys to singular form (document, note, flashcard, chat, quiz)
 */

export const MODULE_COLORS = {
    document: {
        primary: 'hsl(217, 91%, 60%)', // Blue
        light: 'hsl(217, 91%, 95%)',
        dark: 'hsl(217, 91%, 20%)',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-300 dark:border-blue-700',
    },
    note: {
        primary: 'hsl(271, 91%, 65%)', // Purple
        light: 'hsl(271, 91%, 95%)',
        dark: 'hsl(271, 91%, 20%)',
        text: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        border: 'border-purple-300 dark:border-purple-700',
    },
    flashcard: {
        primary: 'hsl(142, 76%, 36%)', // Green
        light: 'hsl(142, 76%, 95%)',
        dark: 'hsl(142, 76%, 15%)',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-300 dark:border-green-700',
    },
    chat: {
        primary: 'hsl(189, 94%, 43%)', // Cyan
        light: 'hsl(189, 94%, 95%)',
        dark: 'hsl(189, 94%, 15%)',
        text: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-100 dark:bg-cyan-900/30',
        border: 'border-cyan-300 dark:border-cyan-700',
    },
    quiz: {
        primary: 'hsl(24, 94%, 50%)', // Orange
        light: 'hsl(24, 94%, 95%)',
        dark: 'hsl(24, 94%, 15%)',
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        border: 'border-orange-300 dark:border-orange-700',
    },
} as const;

export const PRIORITY_COLORS = {
    urgent: {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-300 dark:border-red-700',
    },
    high: {
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        border: 'border-orange-300 dark:border-orange-700',
    },
    medium: {
        text: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-300 dark:border-yellow-700',
    },
    low: {
        text: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-900/30',
        border: 'border-gray-300 dark:border-gray-700',
    },
} as const;

export const SEVERITY_COLORS = {
    high: 'text-red-600 dark:text-red-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-green-600 dark:text-green-400',
} as const;

export const ACTIVITY_HEATMAP_COLORS = [
    'hsl(var(--muted))', // 0 activity
    'hsl(142, 76%, 85%)', // Low
    'hsl(142, 76%, 65%)', // Medium
    'hsl(142, 76%, 45%)', // High
    'hsl(142, 76%, 36%)', // Very high
] as const;
