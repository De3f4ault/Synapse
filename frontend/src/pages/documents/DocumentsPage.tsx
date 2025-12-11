import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { Loader2, Grid, AlignLeft, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import hooks
import { useDocuments } from './hooks/useDocuments';
import { useDocumentUpload } from './hooks/useDocumentUpload';
import { useDocumentViewer } from './hooks/useDocumentViewer';

// Import components
import { DocumentGrid } from './components/list/DocumentGrid';
import { DocumentTable } from './components/list/DocumentTable';
import { UploadArea } from './components/upload/UploadArea';
import { UploadProgress } from './components/upload/UploadProgress';
import { DocumentViewer } from './components/viewer/DocumentViewer';
import { FilterBar } from './components/shared/FilterBar';

// Import types
import type { ViewMode, DocumentSector } from './types/documents.types';

/**
 * OMNI-KINETIC Documents Interface (v7.2)
 * Refactored with modular component structure
 */

const SECTORS: DocumentSector[] = ['All', 'Classified', 'Dev', 'Assets', 'System', 'Logs'];



/**
 * Main Documents Page Component
 */
export function DocumentsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [activeSector, setActiveSector] = useState<DocumentSector>('All');
    const [search, setSearch] = useState('');
    const [logs, setLogs] = useState<string[]>(['SYSTEM ONLINE', 'API LINK ESTABLISHED']);
    const [uploadMode, setUploadMode] = useState(false);

    const logAction = (msg: string) => setLogs((prev) => [...prev, msg]);



    // Hooks
    const { documents, isLoading, deleteDocument } = useDocuments();
    const { uploadProgress, getRootProps, getInputProps, isDragActive } = useDocumentUpload({
        logAction,
    });
    const { selectedDocument, isViewerOpen, openViewer, closeViewer } = useDocumentViewer();

    // Spring animations
    const rotateX = useSpring(0);
    const rotateY = useSpring(0);

    // Filter documents
    const filtered = documents.filter(
        (d) =>
            (activeSector === 'All' || d.sector === activeSector) &&
            d.filename.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 gap-6 overflow-hidden">
            {/* Toolbar Area */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Documents</h1>
                    <p className="text-sm text-slate-400">Manage your knowledge base</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="synapse-input w-full"
                        />
                    </div>

                    <div className="flex bg-black/20 border border-white/10 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-md transition-colors", viewMode === 'grid' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-white")}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-md transition-colors", viewMode === 'list' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-white")}
                        >
                            <AlignLeft size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => setUploadMode(!uploadMode)}
                        className="synapse-button synapse-button-primary"
                    >
                        <Upload size={18} className="mr-2" />
                        Upload
                    </button>
                </div>
            </div>

            <FilterBar
                sectors={SECTORS}
                activeSector={activeSector}
                onSectorChange={setActiveSector}
                search={search}
                onSearchChange={setSearch}
                logAction={logAction}
            />

            {/* Upload Area (Toggleable) */}
            <AnimatePresence>
                {uploadMode && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="synapse-panel p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">Upload Files</h3>
                                <button onClick={() => setUploadMode(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <UploadArea
                                getRootProps={getRootProps}
                                getInputProps={getInputProps}
                                isDragActive={isDragActive}
                                onCancel={() => setUploadMode(false)}
                            />
                            <UploadProgress uploadProgress={uploadProgress} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl relative">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
                        <p className="text-slate-400">Loading archives...</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <DocumentGrid
                        documents={filtered}
                        isLoading={isLoading}
                        onSelect={openViewer}
                        onDelete={deleteDocument}
                        logAction={logAction}
                        rotateX={rotateX}
                        rotateY={rotateY}
                    />
                ) : (
                    <DocumentTable
                        documents={filtered}
                        isLoading={isLoading}
                        onSelect={openViewer}
                        onDelete={deleteDocument}
                        logAction={logAction}
                    />
                )}
            </div>

            <AnimatePresence>
                {isViewerOpen && selectedDocument && (
                    <DocumentViewer
                        doc={selectedDocument}
                        onClose={closeViewer}
                        onDelete={() => deleteDocument(selectedDocument.id)}
                        logAction={logAction}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
