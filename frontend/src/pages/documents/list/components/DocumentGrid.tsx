import React from "react";
import { AnimatePresence } from "framer-motion";
import { ScanLine } from "lucide-react";
import { DocumentListItem } from "./DocumentListItem";
import { useThumbnails } from "../hooks/useThumbnails";
import type { EnhancedDocument } from "../../core";

interface DocumentGridProps {
    documents: EnhancedDocument[];
    isLoading?: boolean;
    onSelect: (doc: EnhancedDocument) => void;
    onDelete: (id: number) => void;
    logAction: (msg: string) => void;
}

/**
 * Grid view for documents with flat grid layout
 * Uses batch thumbnail fetching for performance (1 request instead of N)
 */
export const DocumentGrid: React.FC<DocumentGridProps> = ({
    documents,
    isLoading = false,
    onSelect,
    onDelete,
    logAction,
}) => {
    // Batch fetch all thumbnails in one request
    const documentIds = React.useMemo(
        () => documents
            .filter(doc => doc.type === "pdf" || ["jpg", "png", "jpeg", "webp"].includes(doc.type))
            .map(doc => doc.id),
        [documents]
    );
    const { data: thumbnails } = useThumbnails(documentIds);

    return (
        <div className="relative w-full h-full">
            <div className="w-full h-full p-6 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 overflow-visible content-start">
                <AnimatePresence mode="popLayout">
                    {documents.map((doc, i) => (
                        <DocumentListItem
                            key={doc.id}
                            doc={doc}
                            index={i}
                            onSelect={onSelect}
                            onDelete={() => onDelete(doc.id)}
                            logAction={logAction}
                            thumbnailUrl={thumbnails?.[String(doc.id)]}
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
