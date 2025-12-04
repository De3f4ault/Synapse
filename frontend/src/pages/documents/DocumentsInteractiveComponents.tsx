mport React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Upload, File, Lock, Shield, Loader2, AlertCircle,
    CheckCircle2, Clock, Trash2, Download, Eye, X, Activity,
    MoreVertical, ChevronUp, Progress as ProgressIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { DocumentResponse } from '@/api/generated/types.gen';
import { FileIcon } from './DocumentsUIComponents';

/**
 * OMNI-KINETIC Interactive Components
 * Command deck, document cards, modals
 *
 * Location: pages/documents/DocumentsInteractiveComponents.tsx
 */

// COMMAND DECK HUD
interface CommandDeckProps {
    activeSector: string;
    setActiveSector: (sector: string) => void;
    sectors: string[];
    search: string;
    setSearch: (search: string) => void;
    logAction: (msg: string) => void;
    uploadProgress: Record<string, number>;
    getRootProps: any;
    getInputProps: any;
    isDragActive: boolean;
}

export const CommandDeck: React.FC<CommandDeckProps> = ({
    activeSector,
    setActiveSector,
    sectors,
    search,
    setSearch,
    logAction,
    uploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
}) => {
    const [uploadMode, setUploadMode] = useState(false);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4">
        <motion.div
        layout
        className="bg-[#050505]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] p-3 flex items-stretch gap-4 overflow-hidden relative group"
        >
        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        {/* Left: System Status */}
        <div className="hidden md:flex flex-col justify-center px-4 border-r border-white/10 pr-6">
        <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono tracking-widest uppercase mb-1">
        <Activity size={10} className="animate-pulse" /> Sys.Online
        </div>
        <div className="text-white font-bold text-xs">OMNI-KINETIC</div>
        </div>

        {/* Center: Navigation & Tools */}
        <div className="flex-1 flex flex-col justify-center gap-2">
        <AnimatePresence mode="wait">
        {uploadMode ? (
            <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
            >
            <div
            {...getRootProps()}
            className={cn(
                'flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border transition-colors cursor-pointer',
                isDragActive
                ? 'border-cyan-500/50 bg-cyan-500/10'
                : 'border-white/10 hover:border-cyan-500/30'
            )}
            >
            <input {...getInputProps()} />
            <Upload className="text-cyan-400 w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm text-slate-300 font-mono uppercase">
            {isDragActive ? 'Drop files here...' : 'Click or drag files to upload'}
            </span>
            <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                setUploadMode(false);
            }}
            className="text-[10px] text-slate-400 hover:text-white px-2"
            >
            CANCEL
            </button>
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
            {Object.entries(uploadProgress).length > 0 && (
                <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
                >
                {Object.entries(uploadProgress).map(([filename, progress]) => (
                    <div key={filename} className="bg-black/60 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-300 truncate">{filename}</span>
                    <span className="text-xs text-cyan-400">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                    </div>
                ))}
                </motion.div>
            )}
            </AnimatePresence>
            </motion.div>
        ) : (
            <motion.div
            key="nav"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3"
            >
            {/* Sector Tabs */}
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
            {sectors.map((sector) => (
                <button
                key={sector}
                onClick={() => {
                    setActiveSector(sector);
                    logAction(`SECTOR CHANGE: ${sector.toUpperCase()}`);
                }}
                className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                    activeSector === sector
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                )}
                >
                {sector}
                </button>
            ))}
            </div>

            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Search Bar */}
            <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3 group-focus-within:text-cyan-400" />
            <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH ARCHIVES..."
            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 focus:bg-black/60 transition-all font-mono tracking-wide"
            />
            </div>
            </motion.div>
        )}
        </AnimatePresence>
        </div>

        {/* Right: Actions */}
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

// DATA MONOLITH (Grid Card)
interface DataMonolithProps {
    doc: DocumentResponse & { sector: string; type: string; size: string };
    index: number;
    onSelect: (doc: any) => void;
    onDelete: () => void;
    logAction: (msg: string) => void;
}

export const DataMonolith = React.forwardRef<HTMLDivElement, DataMonolithProps>(
    ({ doc, index, onSelect, onDelete, logAction }, ref) => {
        return (
            <motion.div
            ref={ref}
            layoutId={`monolith-${doc.id}`}
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', damping: 20, delay: index * 0.05 }}
            onClick={() => {
                onSelect(doc);
                logAction(`FOCUS LOCK: ${doc.filename}`);
            }}
            className="group relative w-full aspect-[3/4] cursor-pointer perspective-1000"
            >
            <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md border border-white/10 rounded-xl transition-all duration-500 group-hover:transform group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(6,182,212,0.2)] group-hover:border-cyan-500/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 p-5 h-full flex flex-col items-center justify-between text-center">
            <div className="w-full flex justify-between items-start opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="text-[9px] font-mono text-cyan-400 border border-cyan-500/30 px-1 rounded">
            {doc.sector.substring(0, 3).toUpperCase()}
            </div>
            {doc.processing_status === 'completed' && <Lock size={10} className="text-emerald-400" />}
            {doc.processing_status === 'processing' && (
                <Loader2 size={10} className="text-amber-400 animate-spin" />
            )}
            </div>

            <motion.div
            className="p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner group-hover:shadow-cyan-500/20 group-hover:border-cyan-500/30 transition-all"
            whileHover={{ rotate: [0, -5, 5, 0] }}
            >
            <FileIcon
            type={doc.type}
            className={cn(
                'w-10 h-10 transition-colors duration-300',
                doc.processing_status === 'processing'
                ? 'text-amber-400 animate-pulse'
                : 'text-slate-400 group-hover:text-cyan-400'
            )}
            />
            </motion.div>

            <div className="w-full">
            <h3 className="text-xs font-bold text-slate-300 group-hover:text-white truncate font-mono tracking-wide">
            {doc.filename}
            </h3>
            <div className="h-0.5 w-8 bg-white/10 mx-auto mt-3 rounded-full overflow-hidden group-hover:w-full transition-all duration-500">
            <div
            className={cn(
                'h-full w-full',
                doc.processing_status === 'processing'
                ? 'bg-amber-500 animate-progress'
                : 'bg-cyan-500'
            )}
            />
            </div>
            </div>
            </div>
            </div>
            <div className="absolute -bottom-8 left-4 right-4 h-4 bg-cyan-500/20 blur-xl rounded-[100%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform scale-x-150" />
            </motion.div>
        );
    }
);
DataMonolith.displayName = 'DataMonolith';

// DATA STREAM ROW (List View)
interface DataStreamRowProps {
    doc: DocumentResponse & { sector: string; type: string; size: string };
    index: number;
    onSelect: (doc: any) => void;
    onDelete: () => void;
    logAction: (msg: string) => void;
}

export const DataStreamRow = React.forwardRef<HTMLDivElement, DataStreamRowProps>(
    ({ doc, index, onSelect, onDelete, logAction }, ref) => {
        const getStatusIcon = (status: string) => {
            switch (status) {
                case 'completed':
                    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
                case 'processing':
                    return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
                case 'failed':
                    return <AlertCircle className="h-4 w-4 text-red-400" />;
                default:
                    return <Clock className="h-4 w-4 text-slate-400" />;
            }
        };

        return (
            <motion.div
            ref={ref}
            layoutId={`monolith-${doc.id}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
                onSelect(doc);
                logAction(`STREAM ACCESS: ${doc.filename}`);
            }}
            className="group relative flex items-center gap-6 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all cursor-pointer overflow-hidden mb-2"
            >
            <div
            className={cn(
                'p-2 rounded-lg transition-colors',
                doc.processing_status === 'processing'
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-cyan-400 bg-cyan-950/30 group-hover:text-white'
            )}
            >
            <FileIcon type={doc.type} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-300 group-hover:text-white truncate font-mono tracking-wide">
            {doc.filename}
            </div>
            </div>
            <div className="flex items-center gap-8 text-xs font-mono text-slate-500">
            <div className="w-20 text-right group-hover:text-cyan-400 transition-colors">{doc.size}</div>
            <div className="w-24 text-center px-2 py-1 rounded bg-black/20 border border-white/5 uppercase tracking-widest text-[9px]">
            {doc.sector}
            </div>
            <div className="w-8 flex justify-end">{getStatusIcon(doc.processing_status)}</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            </motion.div>
        );
    }
);
DataStreamRow.displayName = 'DataStreamRow';

// INSPECTION MODAL
interface InspectionModalProps {
    doc: DocumentResponse & { sector: string; type: string; size: string };
    onClose: () => void;
    onDelete: () => void;
    logAction: (msg: string) => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({ doc, onClose, onDelete, logAction }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
            case 'processing':
                return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300';
            case 'failed':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12">
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        />
        <motion.div
        layoutId={`monolith-${doc.id}`}
        className="relative w-full max-w-5xl h-[80vh] bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row pointer-events-auto"
        >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 z-20">
        <div className="flex items-center gap-3">
        <Activity size={16} className="text-cyan-400" />
        <span className="text-xs font-mono text-cyan-400 tracking-[0.2em]">ARTIFACT INSPECTION</span>
        </div>
        <button
        onClick={onClose}
        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
        <X size={18} />
        </button>
        </div>

        {/* Left: 3D Preview */}
        <div className="w-full md:w-2/3 h-full relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-transparent pointer-events-none" />
        <motion.div
        initial={{ scale: 0.5, rotateX: 20 }}
        animate={{ scale: 1, rotateX: 0 }}
        transition={{ type: 'spring', duration: 1.5 }}
        className="relative w-64 h-80 border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.1)] group"
        >
        <FileIcon type={doc.type} className="w-24 h-24 text-white/50 group-hover:text-white transition-colors" />
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/80 shadow-[0_0_20px_cyan] animate-scan-slow opacity-80" />
        </motion.div>
        </div>

        {/* Right: Data Terminal */}
        <div className="w-full md:w-1/3 h-full border-l border-white/10 bg-[#080808] flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 font-mono space-y-6 mt-16">
        <div>
        <h1 className="text-xl font-bold text-white mb-2">{doc.filename}</h1>
        <div className="flex gap-2 text-xs text-slate-500">
        <span className="bg-white/5 px-2 py-0.5 rounded">{doc.size}</span>
        <span className="bg-white/5 px-2 py-0.5 rounded uppercase">{doc.sector}</span>
        </div>
        </div>

        <div className="space-y-2">
        <div className="text-[10px] text-cyan-500 uppercase tracking-widest border-b border-cyan-500/20 pb-1">
        Status
        </div>
        <Badge variant="outline" className={getStatusColor(doc.processing_status)}>
        {getStatusIcon(doc.processing_status)}
        <span className="ml-1">{doc.processing_status}</span>
        </Badge>
        </div>

        <div className="space-y-2">
        <div className="text-[10px] text-purple-500 uppercase tracking-widest border-b border-purple-500/20 pb-1">
        Metadata
        </div>
        <div className="text-xs text-slate-300 space-y-1">
        <div>
        <span className="text-slate-500">Uploaded:</span>{' '}
        {format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')}
        </div>
        <div>
        <span className="text-slate-500">Size:</span> {doc.file_size} bytes
        </div>
        </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
        <Button
        onClick={() => logAction('INIT: DOWNLOAD')}
        variant="outline"
        className="w-full bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyan-500/50"
        >
        <Download size={14} className="mr-2" /> DOWNLOAD
        </Button>
        <Button
        onClick={() => {
            onDelete();
            onClose();
        }}
        variant="outline"
        className="w-full bg-red-900/10 hover:bg-red-900/20 border-red-500/20 hover:border-red-500/50 text-red-400"
        >
        <Trash2 size={14} className="mr-2" /> DELETE
        </Button>
        </div>
        </div>
        </div>
        </motion.div>
        </div>
    );
};
