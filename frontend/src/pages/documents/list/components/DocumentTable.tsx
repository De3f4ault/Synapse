import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Loader2,
    AlertCircle,
    Clock,
    ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancedDocument } from "../../core";

interface DocumentTableProps {
    documents: EnhancedDocument[];
    isLoading?: boolean;
    onSelect: (doc: EnhancedDocument) => void;
    onDelete: (id: number) => void;
    logAction: (msg: string) => void;
}

/**
 * FileIcon Component
 */
const FileIcon: React.FC<{ type: string; className?: string }> = ({
    type: _type,
    className,
}) => {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
};

/**
 * Data Stream Row - List view for documents
 */
const DataStreamRow = React.forwardRef<
    HTMLDivElement,
    {
        doc: EnhancedDocument;
        index: number;
        onSelect: (doc: EnhancedDocument) => void;
        onDelete: () => void;
        logAction: (msg: string) => void;
    }
>(({ doc, index, onSelect, logAction }, ref) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
            case "processing":
                return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
            case "failed":
                return <AlertCircle className="h-4 w-4 text-red-400" />;
            default:
                return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
                onSelect(doc);
                logAction(`STREAM ACCESS: ${doc.filename}`);
            }}
            className="synapse-panel group relative flex items-center gap-6 p-4 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer overflow-hidden mb-2"
        >
            {/* Icon */}
            <div
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    doc.processing_status === "processing"
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-cyan-400 bg-cyan-950/30 group-hover:text-white",
                )}
            >
                <FileIcon type={doc.type} className="w-5 h-5" />
            </div>

            {/* Filename */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-300 group-hover:text-white truncate font-mono tracking-wide">
                    {doc.filename}
                </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-8 text-xs font-mono text-slate-500">
                <div className="w-20 text-right group-hover:text-cyan-400 transition-colors">
                    {doc.size}
                </div>
                <div className="w-24 text-center px-2 py-1 rounded bg-black/20 border border-white/5 uppercase tracking-widest text-[9px]">
                    {doc.sector}
                </div>
                <div className="w-8 flex justify-end">
                    {getStatusIcon(doc.processing_status)}
                </div>
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        </motion.div>
    );
});

DataStreamRow.displayName = "DataStreamRow";

/**
 * Table/List view for documents
 */
export const DocumentTable: React.FC<DocumentTableProps> = ({
    documents,
    isLoading = false,
    onSelect,
    onDelete,
    logAction,
}) => {
    return (
        <div className="relative w-[90%] max-w-7xl h-full">
            <div className="w-full h-full p-8 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {documents.map((doc, i) => (
                        <DataStreamRow
                            key={doc.id}
                            doc={doc}
                            index={i}
                            onSelect={onSelect}
                            onDelete={() => onDelete(doc.id)}
                            logAction={logAction}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {documents.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center opacity-30">
                        <ScanLine size={48} className="mx-auto mb-4 text-cyan-400" />
                        <h2 className="text-xl font-mono text-cyan-400 tracking-[0.5em]">
                            SECTOR EMPTY
                        </h2>
                    </div>
                </div>
            )}
        </div>
    );
};
