import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentCard } from './DocumentCard';
import type { EnhancedDocument } from '../../types/documents.types';

interface DocumentGridProps {
    documents: EnhancedDocument[];
    isLoading?: boolean;
    onSelect: (doc: EnhancedDocument) => void;
    onDelete: (id: number) => void;
    logAction: (msg: string) => void;
    rotateX?: any;
    rotateY?: any;
}

/**
 * Grid view for documents with 3D perspective
 */
export const DocumentGrid: React.FC<DocumentGridProps> = ({
    documents,
    isLoading = false,
    onSelect,
    onDelete,
    logAction,
    rotateX,
    rotateY,
}) => {
    return (
        <motion.div
        style={{ rotateX, rotateY }}
        className="relative w-[90%] max-w-7xl h-full transition-all duration-700 transform-style-3d"
        >
        <div className="w-full h-full p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 overflow-visible">
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
        </motion.div>
    );
};
