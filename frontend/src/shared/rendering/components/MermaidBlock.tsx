/**
 * MermaidBlock — Simple, Robust Mermaid Diagram Renderer
 *
 * DESIGN PRINCIPLES:
 * - Stupid simple: render or show error, nothing else
 * - Robust: handle malformed content gracefully
 * - Minimal UI: no toolbars, no zoom, no modals
 * - Essential colors only: dark theme, readable
 */

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

interface MermaidBlockProps {
    content: string;
    className?: string;
}

// Initialize mermaid with minimal config
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'system-ui, sans-serif',
    themeVariables: {
        // Essential dark theme colors
        primaryColor: '#3b82f6',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#1e40af',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        background: '#0f172a',
        mainBkg: '#1e293b',
        nodeBorder: '#475569',
        clusterBkg: '#1e293b',
        clusterBorder: '#334155',
        titleColor: '#f8fafc',
        edgeLabelBackground: '#1e293b',
    },
    flowchart: {
        htmlLabels: true,
        curve: 'basis',
    },
});

/**
 * Sanitize mermaid content to prevent common errors
 */
function sanitizeMermaidContent(content: string): string {
    let sanitized = content.trim();

    // Fix common cycle issue: duplicate node definitions with same name
    // Pattern: "A --> A" creates cycle, rewrite as "A --> A_1"
    // Also handle self-referential subgraph issues

    // Remove duplicate node IDs pointing to themselves
    sanitized = sanitized.replace(/(\w+)\s*-->\s*\1(?!\w)/g, (match, node) => {
        console.warn(`[Mermaid] Removed self-reference: ${match}`);
        return `${node} --> ${node}_ref`;
    });

    // Ensure diagram type declaration is present
    const diagramTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'gantt', 'pie', 'erDiagram', 'journey', 'gitGraph', 'mindmap', 'timeline'];
    const hasType = diagramTypes.some(type => sanitized.toLowerCase().startsWith(type.toLowerCase()));
    
    if (!hasType) {
        // Default to flowchart TD if no type specified
        sanitized = `flowchart TD\n${sanitized}`;
    }

    return sanitized;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ content, className }) => {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const elementId = useRef(`mermaid-${nanoid(8)}`).current;

    useEffect(() => {
        let mounted = true;

        const render = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const sanitized = sanitizeMermaidContent(content);
                
                if (!sanitized.trim()) {
                    throw new Error('Empty diagram content');
                }

                // Parse first to catch syntax errors
                const parseResult = await mermaid.parse(sanitized);
                if (!parseResult) {
                    throw new Error('Invalid mermaid syntax');
                }

                // Render diagram
                const { svg: renderedSvg } = await mermaid.render(elementId, sanitized);

                if (mounted) {
                    setSvg(renderedSvg);
                    setIsLoading(false);
                }
            } catch (err: any) {
                if (mounted) {
                    const message = err?.message || 'Failed to render diagram';
                    console.error('[Mermaid] Render error:', message);
                    setError(message);
                    setIsLoading(false);
                }
            }
        };

        render();

        return () => {
            mounted = false;
        };
    }, [content, elementId]);

    // Error state: show source with error message
    if (error) {
        return (
            <div className={cn('my-4 rounded-lg border border-red-500/30 bg-red-950/20 overflow-hidden', className)}>
                <div className="px-3 py-2 text-xs text-red-400 bg-red-950/40 border-b border-red-500/20">
                    ⚠ Diagram Error: {error}
                </div>
                <pre className="p-3 text-xs text-slate-400 overflow-x-auto">
                    <code>{content}</code>
                </pre>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className={cn('my-4 p-6 rounded-lg bg-slate-900/50 border border-slate-700/50', className)}>
                <div className="flex items-center justify-center text-slate-500 text-sm">
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Rendering...
                </div>
            </div>
        );
    }

    // Success: render SVG
    return (
        <div className={cn('my-4 rounded-lg bg-slate-900/50 border border-slate-700/50 overflow-hidden', className)}>
            <div
                dangerouslySetInnerHTML={{ __html: svg || '' }}
                className="w-full flex justify-center p-4 [&>svg]:max-w-full [&>svg]:h-auto"
            />
        </div>
    );
};

export default MermaidBlock;
