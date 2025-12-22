import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export type SpreadsheetTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface SpreadsheetViewerProps {
    url: string;
    theme?: SpreadsheetTheme;
    className?: string;
}

const themeClasses: Record<SpreadsheetTheme, { bg: string; table: string; header: string; cell: string; border: string }> = {
    light: {
        bg: 'bg-white',
        table: 'bg-white',
        header: 'bg-gray-100 text-gray-900',
        cell: 'text-gray-800',
        border: 'border-gray-200',
    },
    sepia: {
        bg: 'bg-amber-50',
        table: 'bg-amber-50',
        header: 'bg-amber-100 text-amber-900',
        cell: 'text-amber-800',
        border: 'border-amber-200',
    },
    twilight: {
        bg: 'bg-slate-900',
        table: 'bg-slate-800',
        header: 'bg-slate-700 text-slate-100',
        cell: 'text-slate-200',
        border: 'border-slate-600',
    },
    dark: {
        bg: 'bg-zinc-950',
        table: 'bg-zinc-900',
        header: 'bg-zinc-800 text-zinc-100',
        cell: 'text-zinc-200',
        border: 'border-zinc-700',
    },
};

interface SheetData {
    name: string;
    data: (string | number | null)[][];
}

/**
 * Spreadsheet Viewer for CSV, XLSX, XLS files using xlsx library
 */
export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
    url,
    theme = 'dark',
    className = '',
}) => {
    const [sheets, setSheets] = useState<SheetData[]>([]);
    const [activeSheet, setActiveSheet] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSpreadsheet = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                const parsedSheets: SheetData[] = workbook.SheetNames.map((name) => {
                    const sheet = workbook.Sheets[name];
                    const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
                        header: 1,
                        defval: null,
                    });
                    return { name, data };
                });

                setSheets(parsedSheets);
            } catch (err) {
                console.error('Spreadsheet load error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
            } finally {
                setLoading(false);
            }
        };

        loadSpreadsheet();
    }, [url]);

    const currentSheet = useMemo(() => sheets[activeSheet], [sheets, activeSheet]);
    const styles = themeClasses[theme];

    if (loading) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${styles.bg} ${className}`}>
                <div className="text-center">
                    <Loader2 className="animate-spin text-cyan-500 mx-auto mb-4" size={32} />
                    <p className="text-slate-400 text-sm">Loading spreadsheet...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${styles.bg} ${className}`}>
                <div className="text-center text-red-400">
                    <AlertCircle className="mx-auto mb-4" size={32} />
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (!currentSheet || currentSheet.data.length === 0) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${styles.bg} ${className}`}>
                <p className="text-slate-400">No data in spreadsheet</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex flex-col ${styles.bg} ${className}`}>
            {/* Sheet Tabs */}
            {sheets.length > 1 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-black/20">
                    <button
                        onClick={() => setActiveSheet((p) => Math.max(0, p - 1))}
                        disabled={activeSheet === 0}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronLeft size={16} className="text-white" />
                    </button>
                    <div className="flex gap-1 overflow-x-auto">
                        {sheets.map((sheet, i) => (
                            <button
                                key={sheet.name}
                                onClick={() => setActiveSheet(i)}
                                className={`px-3 py-1 text-xs rounded whitespace-nowrap transition-colors ${i === activeSheet
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                {sheet.name}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setActiveSheet((p) => Math.min(sheets.length - 1, p + 1))}
                        disabled={activeSheet === sheets.length - 1}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronRight size={16} className="text-white" />
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
                <table className={`min-w-full text-sm ${styles.table}`}>
                    <thead>
                        {currentSheet.data.length > 0 && (
                            <tr>
                                {currentSheet.data[0].map((cell, i) => (
                                    <th
                                        key={i}
                                        className={`px-3 py-2 text-left font-semibold border ${styles.header} ${styles.border}`}
                                    >
                                        {cell ?? ''}
                                    </th>
                                ))}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {currentSheet.data.slice(1).map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-white/5">
                                {row.map((cell, cellIdx) => (
                                    <td
                                        key={cellIdx}
                                        className={`px-3 py-1.5 border ${styles.cell} ${styles.border}`}
                                    >
                                        {cell ?? ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SpreadsheetViewer;
