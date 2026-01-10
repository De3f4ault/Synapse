import React from 'react';

export type TextTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface TextViewerProps {
    content: string;
    theme?: TextTheme;
    className?: string;
}

const themeClasses: Record<TextTheme, { bg: string; text: string }> = {
    light: { bg: 'bg-white', text: 'text-gray-900' },
    sepia: { bg: 'bg-amber-50', text: 'text-amber-900' },
    twilight: { bg: 'bg-slate-900', text: 'text-slate-200' },
    dark: { bg: 'bg-zinc-950', text: 'text-zinc-100' },
};

/**
 * Plain text viewer with theme support
 */
export const TextViewer: React.FC<TextViewerProps> = ({
    content,
    theme = 'dark',
    className = '',
}) => {
    const { bg, text } = themeClasses[theme];

    return (
        <div className={`w-full h-full overflow-auto ${bg} ${className}`}>
            <div className="max-w-4xl mx-auto p-8">
                <pre className={`whitespace-pre-wrap font-mono text-sm leading-relaxed ${text}`}>
                    {content || 'No content available'}
                </pre>
            </div>
        </div>
    );
};

export default TextViewer;
