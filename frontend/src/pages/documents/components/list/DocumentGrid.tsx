import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import type { EnhancedDocument } from "../../types/documents.types";

interface DocumentGridProps {
  documents: EnhancedDocument[];
  isLoading?: boolean;
  onSelect: (doc: EnhancedDocument) => void;
  onDelete: (id: number) => void;
  logAction: (msg: string) => void;
}

/**
 * Grid view for documents with flat grid layout
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
            <DocumentCard
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
