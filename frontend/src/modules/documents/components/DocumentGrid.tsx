import { motion } from "framer-motion";
import type { EnhancedDocument } from "../core/types";
import { DocumentCard } from "./DocumentCard";

interface DocumentGridProps {
    documents: EnhancedDocument[];
    onDocumentClick?: (doc: EnhancedDocument) => void;
    thumbnails?: Record<string, string | null>;
}

export const DocumentGrid = ({ documents, onDocumentClick, thumbnails }: DocumentGridProps) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5"
        >
            {documents.map((doc) => (
                <DocumentCard
                    key={doc.id}
                    document={doc}
                    onClick={() => onDocumentClick?.(doc)}
                    thumbnailUrl={thumbnails?.[doc.id.toString()]}
                />
            ))}
        </motion.div>
    );
};
