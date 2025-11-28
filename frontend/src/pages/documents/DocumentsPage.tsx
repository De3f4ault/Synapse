import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    listDocumentsApiV1DocumentsGet,
    uploadDocumentApiV1DocumentsUploadPost,
    deleteDocumentApiV1DocumentsDocumentIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DocumentResponse } from '@/api/generated/types.gen';
import { Loader2, ScanLine } from 'lucide-react';

// Import component modules from same directory
import { SingularityGrid, SystemLog, SystemHeader } from './DocumentsUIComponents';
import { CommandDeck, DataMonolith, DataStreamRow, InspectionModal } from './DocumentsInteractiveComponents';

/**
 * OMNI-KINETIC Documents Interface (v7.2)
 * Enhanced with tactical 3D space and futuristic UI
 * Integrated with existing API infrastructure
 *
 * Location: pages/documents/DocumentsPage.tsx
 */

type ViewMode = 'grid' | 'list';

const SECTORS = ['All', 'Classified', 'Dev', 'Assets', 'System', 'Logs'];

// Map document status to sectors for filtering
const mapDocToSector = (doc: DocumentResponse): string => {
    if (doc.processing_status === 'completed') return 'Assets';
    if (doc.processing_status === 'processing') return 'Dev';
    if (doc.processing_status === 'failed') return 'System';
    return 'Logs';
};

export function DocumentsPage() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [activeSector, setActiveSector] = useState('All');
    const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);
    const [search, setSearch] = useState('');
    const [logs, setLogs] = useState<string[]>(['SYSTEM ONLINE', 'API LINK ESTABLISHED']);

    // Mouse Parallax
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Manual Tilt Controls
    const [tiltY, setTiltY] = useState(20);
    const [tiltX, setTiltX] = useState(0);

    // Derived Transforms
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    const rotateX = useTransform(springY, [0, window.innerHeight], [tiltY + 5, tiltY - 5]);
    const rotateY = useTransform(springX, [0, window.innerWidth], [tiltX - 5, tiltX + 5]);

    const logAction = (msg: string) => setLogs(prev => [...prev, msg]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Fetch documents
    const { data: documents, isLoading } = useQuery({
        queryKey: queryKeys.documents.list(),
                                                    queryFn: () => listDocumentsApiV1DocumentsGet(),
    });

    // Upload mutation
    const { mutate: uploadDocument } = useMutation({
        mutationFn: async (file: File) => {
            const fileId = file.name;
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    const current = prev[fileId] || 0;
                    if (current >= 90) {
                        clearInterval(interval);
                        return prev;
                    }
                    return { ...prev, [fileId]: current + 10 };
                });
            }, 200);

            const formData = { file };
            const result = await uploadDocumentApiV1DocumentsUploadPost({ formData });

            clearInterval(interval);
            setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

            setTimeout(() => {
                setUploadProgress((prev) => {
                    const next = { ...prev };
                    delete next[fileId];
                    return next;
                });
            }, 1000);

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            toast('Document uploaded successfully');
            logAction('UPLOAD COMPLETE');
        },
        onError: (error, file) => {
            const fileId = file.name;
            setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[fileId];
                return next;
            });
            toast('Upload failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            logAction('UPLOAD FAILED');
        },
    });

    // Delete mutation
    const { mutate: deleteDocument } = useMutation({
        mutationFn: (id: number) => deleteDocumentApiV1DocumentsDocumentIdDelete({ documentId: id }),
                                                   onSuccess: () => {
                                                       queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
                                                       toast('Document deleted successfully');
                                                       logAction('DOCUMENT PURGED');
                                                   },
                                                   onError: (error) => {
                                                       toast('Failed to delete document', {
                                                           description: error instanceof Error ? error.message : 'Unknown error',
                                                       });
                                                       logAction('DELETE FAILED');
                                                   },
    });

    // Dropzone
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            acceptedFiles.forEach((file) => {
                uploadDocument(file);
                logAction(`UPLOADING: ${file.name}`);
            });
        },
        [uploadDocument]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
        },
        multiple: true,
    });

    // Transform documents to enhanced format
    const enhancedDocs = documents?.map((doc) => ({
        ...doc,
        sector: mapDocToSector(doc),
                                                  type: doc.filename.split('.').pop() || 'file',
                                                  size: `${(doc.file_size / 1024).toFixed(2)} KB`,
    })) || [];

    // Filter documents
    const filtered = enhancedDocs.filter(d =>
    (activeSector === 'All' || d.sector === activeSector) &&
    d.filename.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full h-screen bg-[#020202] text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30 perspective-2000">
        {/* Background */}
        <SingularityGrid mouseX={mouseX} mouseY={mouseY} />

        {/* Top & Bottom UI */}
        <SystemHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        logAction={logAction}
        />

        <CommandDeck
        activeSector={activeSector}
        setActiveSector={setActiveSector}
        sectors={SECTORS}
        search={search}
        setSearch={setSearch}
        logAction={logAction}
        uploadProgress={uploadProgress}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
        />

        <SystemLog logs={logs} />

        {/* Main Content Plane */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pt-20 pb-32">
        {isLoading ? (
            <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs font-mono text-cyan-500 mt-4 tracking-widest">LOADING ARCHIVES...</p>
            </div>
        ) : (
            <motion.div
            style={{ rotateX, rotateY }}
            animate={{
                rotateX: viewMode === 'list' ? 0 : undefined,
                rotateY: viewMode === 'list' ? 0 : undefined
            }}
            className={cn(
                "relative w-[90%] max-w-7xl h-full transition-all duration-700 transform-style-3d",
                selectedDoc ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
            )}
            >
            {/* Content Container */}
            <div className={cn(
                "w-full h-full p-8 transition-all duration-500",
                viewMode === 'grid'
                ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 overflow-visible"
                : "flex flex-col gap-2 overflow-y-auto custom-scrollbar"
            )}>
            <AnimatePresence mode="popLayout">
            {filtered.map((doc, i) => (
                viewMode === 'grid' ? (
                    <DataMonolith
                    key={doc.id}
                    doc={doc}
                    index={i}
                    onSelect={setSelectedDoc}
                    onDelete={() => deleteDocument(doc.id)}
                    logAction={logAction}
                    />
                ) : (
                    <DataStreamRow
                    key={doc.id}
                    doc={doc}
                    index={i}
                    onSelect={setSelectedDoc}
                    onDelete={() => deleteDocument(doc.id)}
                    logAction={logAction}
                    />
                )
            ))}
            </AnimatePresence>
            </div>

            {filtered.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center opacity-30">
                <ScanLine size={48} className="mx-auto mb-4 text-cyan-400" />
                <h2 className="text-xl font-mono text-cyan-400 tracking-[0.5em]">
                {documents?.length === 0 ? 'NO ARCHIVES' : 'SECTOR EMPTY'}
                </h2>
                </div>
                </div>
            )}
            </motion.div>
        )}
        </div>

        {/* Inspection Modal */}
        <AnimatePresence>
        {selectedDoc && (
            <InspectionModal
            doc={selectedDoc}
            onClose={() => {
                setSelectedDoc(null);
                logAction('CLOSING INSPECTION');
            }}
            onDelete={() => deleteDocument(selectedDoc.id)}
            logAction={logAction}
            />
        )}
        </AnimatePresence>
        </div>
    );
}
