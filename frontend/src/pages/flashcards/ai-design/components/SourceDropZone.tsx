/**
 * SourceDropZone — inline text paste / drag-drop zone for source material.
 *
 * Sits in the chat input area. Accepts:
 *  - Drag-and-drop of .txt / .md files (text read client-side, no upload)
 *  - Paste trigger to open a textarea for pasting content
 *
 * When content is provided, calls onAttach(text) so the hook can send it
 * as a user message to the designer conversation.
 */

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Upload, ChevronDown } from 'lucide-react';

interface SourceDropZoneProps {
    onAttach: (text: string) => void;
}

export function SourceDropZone({ onAttach }: SourceDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [showPasteArea, setShowPasteArea] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (!file) return;
            if (!file.name.match(/\.(txt|md|markdown)$/i)) {
                alert('Only .txt and .md files are supported. For PDFs, paste the key text instead.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                if (text?.trim()) onAttach(text.trim());
            };
            reader.readAsText(file);
        },
        [onAttach],
    );

    const handleSubmitPaste = useCallback(() => {
        if (!pasteText.trim()) return;
        onAttach(pasteText.trim());
        setPasteText('');
        setShowPasteArea(false);
    }, [pasteText, onAttach]);

    return (
        <div className="relative">
            <AnimatePresence>
                {showPasteArea && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-2"
                    >
                        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-mono text-primary/70 uppercase tracking-wider">
                                    Paste source material
                                </span>
                                <button
                                    onClick={() => setShowPasteArea(false)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder="Paste lecture notes, book excerpts, or any text you want cards generated from…"
                                className="w-full h-28 text-xs bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none outline-none leading-relaxed"
                                autoFocus
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleSubmitPaste}
                                    disabled={!pasteText.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity"
                                >
                                    Attach to conversation
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drop zone trigger row */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer select-none ${
                    isDragging
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/50 bg-foreground/[0.03] hover:bg-foreground/[0.06]'
                }`}
                onClick={() => {
                    setShowPasteArea((v) => !v);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                }}
            >
                {isDragging ? (
                    <Upload className="h-3.5 w-3.5 text-primary" />
                ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-[11px] text-muted-foreground flex-1">
                    {isDragging ? 'Drop .txt or .md file…' : 'Attach source material'}
                </span>
                <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showPasteArea ? 'rotate-180' : ''}`}
                />
            </div>
        </div>
    );
}
