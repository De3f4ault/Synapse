import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Check, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { FlashcardsService, type ImportRequest } from '@/api/generated';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useDecks } from '../list';
import { toast } from 'sonner';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckId?: number | null;  // Optional: if not provided, show deck selector
    onImportSuccess: () => void;
}

interface ParsedCard {
    front: string;
    back: string;
}

export function ImportModal({ isOpen, onClose, deckId: initialDeckId, onImportSuccess }: ImportModalProps) {
    const queryClient = useQueryClient();
    const { data: decksData } = useDecks();
    const decks = Array.isArray(decksData) ? decksData : [];

    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(initialDeckId ?? null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ParsedCard[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update selected deck when initialDeckId changes
    useEffect(() => {
        if (initialDeckId) {
            setSelectedDeckId(initialDeckId);
        }
    }, [initialDeckId]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
    });

    const parseFile = (file: File) => {
        setError(null);

        Papa.parse(file, {
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    // Change: filter out empty rows and map to front/back
                    // Assuming NO headers by default (standard Anki), or auto-detect?
                    // Let's assume simplest standard: Col 1 = Front, Col 2 = Back
                    const cards: ParsedCard[] = results.data
                        .filter((row: any) => Array.isArray(row) && row.length >= 2 && row[0] && row[1])
                        .map((row: any) => ({
                            front: row[0].toString().trim(),
                            back: row[1].toString().trim(),
                        }));

                    if (cards.length === 0) {
                        setError('No valid cards found. Ensure CSV has at least two columns (Front, Back).');
                        setPreview([]);
                    } else {
                        setPreview(cards);
                    }
                }
            },
            error: (err) => {
                setError(`Failed to parse CSV: ${err.message}`);
            },
            header: false, // Assume no headers for Anki compatibility usually, but could toggle
            skipEmptyLines: true,
        });
    };

    const handleImport = async () => {
        if (preview.length === 0 || isImporting) return;

        setIsImporting(true);
        setError(null);

        try {
            const requestBody: ImportRequest = {
                cards: preview
            };

            if (!selectedDeckId) {
                setError('Please select a deck');
                setIsImporting(false);
                return;
            }

            const result = await FlashcardsService.importFlashcardsApiV1DecksDeckIdImportPost(selectedDeckId, requestBody);

            // Invalidate queries to refresh deck counts
            await queryClient.invalidateQueries({ queryKey: queryKeys.decks.list() });
            await queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(selectedDeckId) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(selectedDeckId) });

            // Show structured result
            const importedCount = (result as any).imported || preview.length;
            const skippedCount = (result as any).skipped_duplicates || 0;

            if (skippedCount > 0) {
                toast.success(`Imported ${importedCount} cards (${skippedCount} duplicates skipped)`);
            } else {
                toast.success(`Successfully imported ${importedCount} cards`);
            }

            onImportSuccess();
            onClose();
            // Reset state
            setFile(null);
            setPreview([]);
        } catch (err: any) {
            toast.error(err.message || 'Failed to import cards');
            setError(err.message || 'Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-popover border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Import Flashcards</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Deck Selector - only show if no initial deck provided */}
                    {!initialDeckId && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Select Target Deck
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedDeckId || ''}
                                    onChange={(e) => setSelectedDeckId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full h-12 bg-card border border-border rounded-xl pl-4 pr-10 text-foreground appearance-none focus:outline-none focus:border-primary/50 transition-colors"
                                >
                                    <option value="">Choose a deck...</option>
                                    {decks.map((deck) => (
                                        <option key={deck.id} value={deck.id}>
                                            {deck.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {!file ? (
                        <div
                            {...getRootProps()}
                            className={`
border - 2 border - dashed rounded - xl p - 12 text - center cursor - pointer transition - colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-border hover:bg-muted/50'}
`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex justify-center mb-4">
                                <Upload size={48} className="text-muted-foreground" />
                            </div>
                            <p className="text-lg font-medium text-foreground/80">
                                {isDragActive ? 'Drop your CSV here' : 'Drag & drop a CSV file, or click to select'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Supported format: .csv, .txt (First column: Front, Second column: Back)
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* File Info */}
                            <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-xl border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent-olive/10 rounded-lg">
                                        <FileText size={24} className="text-accent-olive" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">{file.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB • {preview.length} cards found
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setFile(null); setPreview([]); setError(null); }}
                                    className="text-xs text-destructive hover:text-red-300 font-medium"
                                >
                                    Change File
                                </button>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
                                    <AlertCircle size={20} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {/* Preview Table */}
                            {preview.length > 0 && (
                                <div className="border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-foreground/5 text-muted-foreground font-medium text-xs uppercase tracking-wider sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">Front (Column 1)</th>
                                                <th className="px-4 py-3">Back (Column 2)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {preview.slice(0, 50).map((card, i) => (
                                                <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 text-foreground/80 font-mono truncate max-w-[200px]">{card.front}</td>
                                                    <td className="px-4 py-3 text-foreground/80 font-mono truncate max-w-[200px]">{card.back}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {preview.length > 50 && (
                                        <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                                            And {preview.length - 50} more...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || preview.length === 0 || isImporting}
                        className={`
px - 6 py - 2 rounded - lg font - medium flex items - center gap - 2
              ${!file || preview.length === 0 || isImporting
                                ? 'bg-slate-800 text-muted-foreground cursor-not-allowed'
                                : 'bg-accent-olive text-black hover:bg-accent-olive shadow-lg '
                            }
transition - all duration - 200
    `}
                    >
                        {isImporting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Import {preview.length} Cards
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
