import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Loader2, ScanLine, Grid, AlignLeft, Hexagon, Activity, Upload, ChevronUp } from 'lucide-react';
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
 * Singularity Grid Background
 */
const SingularityGrid: React.FC<{ mouseX: any; mouseY: any }> = ({ mouseX, mouseY }) => {
    const moveX = useTransform(mouseX, [0, window.innerWidth], [-20, 20]);
    const moveY = useTransform(mouseY, [0, window.innerHeight], [-20, 20]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden perspective-3d">
        <div
        className="absolute inset-[-100%] bg-[linear-gradient(to_right,#0ea5e9_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e9_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.05] transform-gpu animate-grid-flow"
        style={{ transform: 'rotateX(60deg) scale(2)' }}
        />
        <motion.div
        style={{ x: moveX, y: moveY }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] mix-blend-screen opacity-50"
        />
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#020202] to-transparent z-0" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#020202] via-[#020202]/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>
    );
};

/**
 * System Log
 */
const SystemLog: React.FC<{ logs: string[] }> = ({ logs }) => {
    return (
        <div className="fixed bottom-32 right-6 w-64 h-32 pointer-events-none z-20 flex flex-col justify-end">
        <div className="text-[10px] font-mono text-cyan-500/40 uppercase mb-2 tracking-widest border-b border-cyan-500/20 pb-1">
        OMNI_LINK_v7.2
        </div>
        <div className="overflow-hidden flex flex-col gap-1 opacity-70">
        <AnimatePresence>
        {logs.slice(-5).map((log, i) => (
            <motion.div
            key={`${log}-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[9px] font-mono text-cyan-400/80 truncate"
            >
            <span className="text-slate-600 mr-2">
            {new Date().toLocaleTimeString().split(' ')[0]}
            </span>
            &gt; {log}
            </motion.div>
        ))}
        </AnimatePresence>
        </div>
        </div>
    );
};

/**
 * System Header
 */
const SystemHeader: React.FC<{
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    logAction: (msg: string) => void;
}> = ({ viewMode, setViewMode, logAction }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
        <div className="flex items-center gap-2 text-white font-bold tracking-tight text-xl">
        <Hexagon className="text-cyan-500 fill-cyan-500/20" />
        OMNI-KINETIC <span className="text-xs text-slate-500 font-normal mt-1">v7.2</span>
        </div>
        <div className="text-[10px] font-mono text-cyan-500/60 mt-1 pl-8">
        DOCUMENT MANAGEMENT SYSTEM
        </div>
        </div>

        <div className="flex gap-4 pointer-events-auto">
        <div className="flex bg-black/40 border border-white/10 rounded-full p-1 backdrop-blur-md">
        <button
        onClick={() => {
            setViewMode('grid');
            logAction('VIEW: ISO-PLANE');
        }}
        className={cn(
            'p-2 rounded-full transition-all',
            viewMode === 'grid' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'
        )}
        >
        <Grid size={18} />
        </button>
        <button
        onClick={() => {
            setViewMode('list');
            logAction('VIEW: DATA STREAM');
        }}
        className={cn(
            'p-2 rounded-full transition-all',
            viewMode === 'list' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'
        )}
        >
        <AlignLeft size={18} />
        </button>
        </div>
        </div>
        </div>
    );
};

/**
 * Command Deck
 */
const CommandDeck: React.FC<{
    activeSector: DocumentSector;
    setActiveSector: (sector: DocumentSector) => void;
    search: string;
    setSearch: (search: string) => void;
    logAction: (msg: string) => void;
    uploadMode: boolean;
    setUploadMode: (mode: boolean) => void;
    uploadProgress: Record<string, number>;
    getRootProps: any;
    getInputProps: any;
    isDragActive: boolean;
}> = ({
    activeSector,
    setActiveSector,
    search,
    setSearch,
    logAction,
    uploadMode,
    setUploadMode,
    uploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
}) => {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4">
        <motion.div
        layout
        className="bg-[#050505]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] p-3 flex items-stretch gap-4 overflow-hidden relative group"
        >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="hidden md:flex flex-col justify-center px-4 border-r border-white/10 pr-6">
        <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono tracking-widest uppercase mb-1">
        <Activity size={10} className="animate-pulse" /> Sys.Online
        </div>
        <div className="text-white font-bold text-xs">OMNI-KINETIC</div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2">
        <AnimatePresence mode="wait">
        {uploadMode ? (
            <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full space-y-2"
            >
            <UploadArea
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            onCancel={() => setUploadMode(false)}
            />
            <UploadProgress uploadProgress={uploadProgress} />
            </motion.div>
        ) : (
            <motion.div
            key="nav"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            >
            <FilterBar
            sectors={SECTORS}
            activeSector={activeSector}
            onSectorChange={setActiveSector}
            search={search}
            onSearchChange={setSearch}
            logAction={logAction}
            />
            </motion.div>
        )}
        </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
        <button
        onClick={() => setUploadMode(!uploadMode)}
        className={cn(
            'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all border',
            uploadMode
            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
        )}
        title="Upload Files"
        >
        <Upload size={18} />
        <span className="text-[8px] font-bold mt-1">UPLOAD</span>
        </button>

        <div className="flex flex-col gap-1">
        <button className="w-12 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
        <ChevronUp size={12} />
        </button>
        <div className="text-[8px] text-center font-mono text-slate-600">MENU</div>
        </div>
        </div>
        </motion.div>
        </div>
    );
};

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

    // Mouse parallax
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    const [tiltY] = useState(20);
    const [tiltX] = useState(0);

    const rotateX = useTransform(springY, [0, window.innerHeight], [tiltY + 5, tiltY - 5]);
    const rotateY = useTransform(springX, [0, window.innerWidth], [tiltX - 5, tiltX + 5]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Hooks
    const { documents, isLoading, deleteDocument } = useDocuments();
    const { uploadProgress, getRootProps, getInputProps, isDragActive } = useDocumentUpload({
        logAction,
    });
    const { selectedDocument, isViewerOpen, openViewer, closeViewer } = useDocumentViewer();

    // Filter documents
    const filtered = documents.filter(
        (d) =>
        (activeSector === 'All' || d.sector === activeSector) &&
        d.filename.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full h-screen bg-[#020202] text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30 perspective-2000">
        <SingularityGrid mouseX={mouseX} mouseY={mouseY} />

        <SystemHeader viewMode={viewMode} setViewMode={setViewMode} logAction={logAction} />

        <CommandDeck
        activeSector={activeSector}
        setActiveSector={setActiveSector}
        search={search}
        setSearch={setSearch}
        logAction={logAction}
        uploadMode={uploadMode}
        setUploadMode={setUploadMode}
        uploadProgress={uploadProgress}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
        />

        <SystemLog logs={logs} />

        <div className="absolute inset-0 flex items-center justify-center z-10 pt-20 pb-32">
        {isLoading ? (
            <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs font-mono text-cyan-500 mt-4 tracking-widest">LOADING ARCHIVES...</p>
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
