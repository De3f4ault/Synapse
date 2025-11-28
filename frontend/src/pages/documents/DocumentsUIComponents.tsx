import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, useTransform } from 'framer-motion';
import { Grid, AlignLeft, Hexagon, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * OMNI-KINETIC UI Components
 * Background effects, headers, and display elements
 *
 * Location: pages/documents/DocumentsUIComponents.tsx
 */

// 1. SINGULARITY GRID ATMOSPHERE
interface SingularityGridProps {
    mouseX: any;
    mouseY: any;
}

export const SingularityGrid: React.FC<SingularityGridProps> = ({ mouseX, mouseY }) => {
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

// 2. SYSTEM LOG
interface SystemLogProps {
    logs: string[];
}

export const SystemLog: React.FC<SystemLogProps> = ({ logs }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="fixed bottom-32 right-6 w-64 h-32 pointer-events-none z-20 flex flex-col justify-end">
        <div className="text-[10px] font-mono text-cyan-500/40 uppercase mb-2 tracking-widest border-b border-cyan-500/20 pb-1">
        OMNI_LINK_v7.2
        </div>
        <div ref={scrollRef} className="overflow-hidden flex flex-col gap-1 opacity-70">
        <AnimatePresence>
        {logs.slice(-5).map((log, i) => (
            <motion.div
            key={i}
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

// 3. SYSTEM HEADER
interface SystemHeaderProps {
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    logAction: (msg: string) => void;
}

export const SystemHeader: React.FC<SystemHeaderProps> = ({ viewMode, setViewMode, logAction }) => {
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
            viewMode === 'grid'
            ? 'bg-cyan-500 text-black'
            : 'text-slate-500 hover:text-white'
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
            viewMode === 'list'
            ? 'bg-cyan-500 text-black'
            : 'text-slate-500 hover:text-white'
        )}
        >
        <AlignLeft size={18} />
        </button>
        </div>
        </div>
        </div>
    );
};

// Utility: File Icon Component
interface FileIconProps {
    type: string;
    className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ type, className }) => {
    const iconMap: Record<string, any> = {
        pdf: 'FileText',
        doc: 'FileText',
        docx: 'FileText',
        txt: 'FileText',
        py: 'FileCode',
        js: 'FileCode',
        tsx: 'FileCode',
        json: 'FileCode',
        png: 'Image',
        jpg: 'Image',
        jpeg: 'Image',
        mp4: 'Video',
        mp3: 'Music',
        wav: 'Music',
        sql: 'Database',
        db: 'Database',
    };

    // For simplicity, we'll use a generic icon for now
    // You can expand this with actual imports from lucide-react
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
