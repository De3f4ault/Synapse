import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { Loader2, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';

export type DOCXTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface DOCXViewerProps {
    url: string;
    theme?: DOCXTheme;
    className?: string;
}

const themeClasses: Record<DOCXTheme, { bg: string; prose: string }> = {
    light: { bg: 'bg-white', prose: 'prose-slate' },
    sepia: { bg: 'bg-amber-50', prose: 'prose-amber' },
    twilight: { bg: 'bg-slate-900', prose: 'prose-invert' },
    dark: { bg: 'bg-zinc-950', prose: 'prose-invert' },
};

/**
 * DOCX Viewer using mammoth.js to convert to HTML
 */
export const DOCXViewer: React.FC<DOCXViewerProps> = ({
    url,
    theme = 'dark',
    className = '',
}) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDocx = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch the DOCX file as ArrayBuffer
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();

                // Convert DOCX to HTML using mammoth
                const result = await mammoth.convertToHtml({ arrayBuffer });

                // Sanitize the HTML
                const sanitizedHtml = DOMPurify.sanitize(result.value, {
                    USE_PROFILES: { html: true },
                });

                setHtmlContent(sanitizedHtml);

                // Log any warnings
                if (result.messages.length > 0) {
                    console.warn('Mammoth conversion warnings:', result.messages);
                }
            } catch (err) {
                console.error('DOCX conversion error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load document');
            } finally {
                setLoading(false);
            }
        };

        loadDocx();
    }, [url]);

    const { bg, prose } = themeClasses[theme];

    if (loading) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${bg} ${className}`}>
                <div className="text-center">
                    <Loader2 className="animate-spin text-cyan-500 mx-auto mb-4" size={32} />
                    <p className="text-slate-400 text-sm">Converting document...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${bg} ${className}`}>
                <div className="text-center text-red-400">
                    <AlertCircle className="mx-auto mb-4" size={32} />
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full overflow-auto ${bg} ${className}`}>
            <div className="max-w-4xl mx-auto p-8">
                <article
                    className={`prose prose-sm lg:prose-base ${prose} max-w-none`}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            </div>
        </div>
    );
};

export default DOCXViewer;
