import React from "react";
import { AnimatePresence } from "framer-motion";
import { ScanLine } from "lucide-react";
import { DocumentListItem } from "./DocumentListItem";
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
 * Uses lazy loading for thumbnails natively via the img tag.
 */
export const DocumentGrid: React.FC<DocumentGridProps> = ({
    documents,
    isLoading = false,
    onSelect,
    onDelete,
    logAction,
}) => {
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
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {documents.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center opacity-30">
                        <ScanLine size={48} className="mx-auto mb-4 text-primary" />
                        <h2 className="text-xl font-mono text-primary tracking-widest">
                            SECTOR EMPTY
                        </h2>
                    </div>
                </div>
            )}
        </div>
    );
};
