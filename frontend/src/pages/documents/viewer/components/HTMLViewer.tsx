import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

export type HTMLTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface HTMLViewerProps {
    content: string;
    theme?: HTMLTheme;
    className?: string;
}

const themeClasses: Record<HTMLTheme, { bg: string; text: string }> = {
    light: { bg: 'bg-white', text: 'text-gray-900' },
    sepia: { bg: 'bg-amber-50', text: 'text-amber-900' },
    twilight: { bg: 'bg-slate-900', text: 'text-foreground/70' },
    dark: { bg: 'bg-zinc-950', text: 'text-foreground' },
};

/**
 * HTML Viewer with DOMPurify sanitization
 */
export const HTMLViewer: React.FC<HTMLViewerProps> = ({
    content,
    theme = 'dark',
    className = '',
}) => {
    const { bg, text } = themeClasses[theme];

    // Sanitize HTML to prevent XSS
    const sanitizedHTML = useMemo(() => {
        return DOMPurify.sanitize(content, {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['style'],
            ADD_ATTR: ['target'],
        });
    }, [content]);

    return (
        <div className={`w-full h-full overflow-auto ${bg} ${className}`}>
            <div className="max-w-4xl mx-auto p-8">
                <article
                    className={`prose prose-sm lg:prose-base ${theme === 'dark' || theme === 'twilight' ? 'prose-invert' : ''} max-w-none ${text}`}
                    dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
                />
            </div>
        </div>
    );
};

export default HTMLViewer;
