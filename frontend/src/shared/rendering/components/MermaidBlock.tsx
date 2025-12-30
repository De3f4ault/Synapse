import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import GlassCard from '@/components/ui/GlassCard';
import CodeBlock from '@/shared/rendering/components/CodeBlock';
import { AlertCircle, FileCode, Maximize2, Download, Copy, Check, ZoomIn, ZoomOut, RotateCcw, X, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'framer-motion';

interface MermaidBlockProps {
    content: string;
    className?: string;
}

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
});

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ content, className }) => {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isSourceView, setIsSourceView] = useState(false);
    const elementId = useRef(`mermaid-${nanoid(6)}`).current;

    // Transform component ref for programmatic control
    const transformRef = useRef<ReactZoomPanPinchContentRef>(null);

    useEffect(() => {
        let mounted = true;

        const renderDiagram = async () => {
            // If in source view, don't force re-render, but we do need to parse if we switch back
            try {
                setError(null);
                if (!content.trim()) return;

                if (!await mermaid.parse(content)) {
                    throw new Error('Invalid mermaid syntax');
                }

                // Render
                const { svg } = await mermaid.render(elementId, content);

                if (mounted) {
                    setSvg(svg);
                }
            } catch (err: any) {
                if (mounted) {
                    console.error('Mermaid rendering failed:', err);
                    setError(err.message || 'Failed to render diagram');
                    // Auto-switch to source view on error
                    setIsSourceView(true);
                }
            }
        };

        renderDiagram();

        return () => {
            mounted = false;
        };
    }, [content, elementId]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [content]);

    const handleDownload = useCallback(() => {
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${elementId}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [svg, elementId]);

    // Fallback on error - render CodeBlock directly (managed by state now)
    // We remove the early return for error and handle it via isSourceView

    return (
        <Dialog>
            <div className="group relative my-6">
                <GlassCard className={cn("p-4 overflow-hidden bg-zinc-900/50 backdrop-blur-sm transition-all duration-300", isSourceView && "bg-zinc-950/80", className)}>
                    {/* Floating Toolbar */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {/* Source Toggle */}
                        <button
                            onClick={() => setIsSourceView(!isSourceView)}
                            className={cn(
                                "p-1.5 rounded-md text-zinc-400 hover:text-white border border-white/5 transition-colors",
                                isSourceView ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-zinc-800/80 hover:bg-zinc-700/80"
                            )}
                            title={isSourceView ? "View Diagram" : "View Source"}
                        >
                            <Code className="size-4" />
                        </button>

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        {!isSourceView && (
                            <DialogTrigger asChild>
                                <button className="p-1.5 rounded-md bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-white/5 transition-colors" title="Expand view">
                                    <Maximize2 className="size-4" />
                                </button>
                            </DialogTrigger>
                        )}

                        {!isSourceView && <div className="w-px h-4 bg-white/10 mx-1" />}

                        <button
                            onClick={handleCopy}
                            className="p-1.5 rounded-md bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-white/5 transition-colors"
                            title="Copy source"
                        >
                            {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                        </button>

                        {!isSourceView && (
                            <button
                                onClick={handleDownload}
                                className="p-1.5 rounded-md bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-white/5 transition-colors"
                                title="Download SVG"
                            >
                                <Download className="size-4" />
                            </button>
                        )}
                    </div>

                    {/* Badge */}
                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 rounded text-xs text-zinc-500 border border-white/5">
                            <FileCode className="size-3" />
                            <span>Mermaid</span>
                            {error && <span className="text-rose-400 flex items-center gap-1">• Error <AlertCircle className="size-3" /></span>}
                        </div>
                    </div>

                    {/* Content Area */}
                    {isSourceView || error ? (
                        <div className="mt-8 overflow-hidden rounded-md border border-white/5 bg-black/40">
                            <CodeBlock
                                content={content}
                                language="mermaid"
                                filename="Diagram Source"
                            />
                            {error && (
                                <div className="p-3 text-xs text-rose-300 bg-rose-950/30 border-t border-rose-500/20 font-mono">
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : svg ? (
                        <div
                            dangerouslySetInnerHTML={{ __html: svg }}
                            className="w-full flex justify-center py-4 select-none cursor-pointer [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[400px]"
                            onClick={() => document.getElementById(`trigger-${elementId}`)?.click()}
                        />
                    ) : (
                        <div className="h-32 flex items-center justify-center text-zinc-500 animate-pulse">
                            Rendering diagram...
                        </div>
                    )}
                </GlassCard>

                {/* Lightbox Modal */}
                <DialogContent className="max-w-[95vw] h-[90vh] p-0 border-white/10 bg-zinc-950/90 backdrop-blur-xl flex flex-col overflow-hidden">
                    <DialogTitle className="sr-only">Diagram View</DialogTitle>

                    {/* Lightbox Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-900/50">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <FileCode className="size-4" />
                            <span className="font-medium text-sm">Mermaid Diagram</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5 border border-white/5 mr-4">
                                <button
                                    onClick={() => transformRef.current?.zoomOut()}
                                    className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="size-4" />
                                </button>
                                <button
                                    onClick={() => transformRef.current?.resetTransform()}
                                    className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                                    title="Reset View"
                                >
                                    <RotateCcw className="size-4" />
                                </button>
                                <button
                                    onClick={() => transformRef.current?.zoomIn()}
                                    className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="size-4" />
                                </button>
                            </div>

                            <DialogClose className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                                <X className="size-5" />
                            </DialogClose>
                        </div>
                    </div>

                    {/* Infinite Canvas */}
                    <div className="flex-1 overflow-hidden relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-[0.02]">
                        {svg && (
                            <TransformWrapper
                                ref={transformRef}
                                initialScale={1}
                                minScale={0.5}
                                maxScale={4}
                                centerOnInit
                                wheel={{ step: 0.1 }}
                            >
                                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                    <div
                                        dangerouslySetInnerHTML={{ __html: svg }}
                                        className="w-full h-full p-12 [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-none [&>svg]:max-h-none"
                                    />
                                </TransformComponent>
                            </TransformWrapper>
                        )}
                    </div>
                </DialogContent>
            </div>
        </Dialog>
    );
};
