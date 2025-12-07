/**
 * AddSourceModal - NotebookLM Exact Replica
 * Modal for adding sources (upload, Drive, link, paste)
 *
 * Location: frontend/src/pages/chat/components/modals/AddSourceModal.tsx
 */

import React, { useRef, useState } from 'react';
import { X, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AddSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
}

const NotebookLMLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <path
    d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
    fill="url(#notebookGradient)"
    />
    <defs>
    <linearGradient id="notebookGradient" x1="2" y1="2" x2="20" y2="20">
    <stop offset="0%" stopColor="#4285f4" />
    <stop offset="100%" stopColor="#34a853" />
    </linearGradient>
    </defs>
    </svg>
);

const GoogleWorkspaceIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
);

const DriveIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 ml-4">
    <path fill="#0066DA" d="M7.71 3.5L1.15 15l3.85 6.5h13l-6.56-11.35z"/>
    <path fill="#00AC47" d="M7.71 3.5h8.58L21.85 15H8.29z"/>
    <path fill="#EA4335" d="M8.29 15l-3.43 6.5h13L21.85 15z"/>
    <path fill="#00832D" d="M7.71 3.5L1.15 15l3.85 6.5z"/>
    <path fill="#2684FC" d="M21.85 15l-4.56 6.5-8.58-6.5z"/>
    <path fill="#FFBA00" d="M16.29 3.5L21.85 15l-5.56-11.5z"/>
    </svg>
);

export const AddSourceModal: React.FC<AddSourceModalProps> = ({
    isOpen,
    onClose,
    onUpload,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sourceCount] = useState(0);
    const maxSources = 300;

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onUpload(files);
            toast.success(`Selected ${files.length} file${files.length > 1 ? 's' : ''}`);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onUpload(files);
            toast.success(`Dropped ${files.length} file${files.length > 1 ? 's' : ''}`);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDiscoverSources = () => {
        toast.info('Discover sources feature coming soon');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#202124] rounded-3xl w-full max-w-5xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
        <NotebookLMLogo />
        <h2 className="text-xl text-white font-normal">NotebookLM</h2>
        </div>
        <button
        onClick={onClose}
        className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
        >
        <X size={20} />
        </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
        {/* Title and Discover Button */}
        <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl text-white font-normal">Add sources</h3>
        <button
        onClick={handleDiscoverSources}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-white text-sm transition-colors"
        >
        <Sparkles size={16} />
        Discover sources
        </button>
        </div>

        {/* Description */}
        <p className="text-white/70 text-sm mb-6 leading-relaxed">
        Sources let NotebookLM base its responses on the information that matters most to you.<br />
        (Examples: marketing plans, course reading, research notes, meeting transcripts, sales documents, etc.)
        </p>

        {/* Upload Area */}
        <div
        className="border-2 border-dashed border-white/20 rounded-2xl min-h-[280px] flex flex-col items-center justify-center mb-6 hover:border-[#8ab4f8] hover:bg-white/5 transition-all cursor-pointer group relative"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        >
        <div className="w-16 h-16 rounded-full bg-[#8ab4f8]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Upload size={28} className="text-[#8ab4f8]" />
        </div>
        <span className="text-white font-medium text-lg mb-2">Upload sources</span>
        <span className="text-white/50 text-sm">
        Drag & drop or{' '}
        <span className="text-[#8ab4f8] hover:underline">choose file</span> to upload
        </span>

        {/* Supported file types at bottom */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/40 text-xs">
        Supported file types: PDF, txt, Markdown, Audio (e.g. mp3), .docx, .avif, .bmp, .gif, .ico, .jp2, .png, .webp, .tif, .tiff, .heic, .heif, .jpeg, .jpg, .jpe
        </p>
        </div>
        </div>

        <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.docx,.mp3,.avif,.bmp,.gif,.ico,.jp2,.png,.webp,.tif,.tiff,.heic,.heif,.jpeg,.jpg,.jpe"
        className="hidden"
        onChange={handleFileSelect}
        />

        {/* Source Type Options - 3 Columns */}
        <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Google Workspace */}
        <div className="bg-[#292a2d] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors">
        <button className="flex items-center gap-3 w-full text-left mb-4">
        <GoogleWorkspaceIcon />
        <span className="text-white text-sm font-medium">Google Workspace</span>
        </button>
        <button className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-2 transition-colors">
        <DriveIcon />
        <span className="text-white/70 text-sm">Google Drive</span>
        </button>
        </div>

        {/* Link */}
        <div className="bg-[#292a2d] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors">
        <button className="flex items-center gap-3 w-full text-left mb-4">
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        </div>
        <span className="text-white text-sm font-medium">Link</span>
        </button>
        <button className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-2 transition-colors mb-2">
        <div className="w-5 h-5 flex items-center justify-center ml-0.5">
        <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="2"/>
        <path d="M8 21h8M12 17v4" strokeWidth="2"/>
        </svg>
        </div>
        <span className="text-white/70 text-sm">Website</span>
        </button>
        <button className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-2 transition-colors">
        <div className="w-5 h-5 flex items-center justify-center ml-0.5">
        <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
        </svg>
        </div>
        <span className="text-white/70 text-sm">YouTube</span>
        </button>
        </div>

        {/* Paste Text */}
        <div className="bg-[#292a2d] rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors">
        <button className="flex items-center gap-3 w-full text-left mb-4">
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeWidth="2"/>
        <rect x="9" y="3" width="6" height="4" rx="1" strokeWidth="2"/>
        </svg>
        </div>
        <span className="text-white text-sm font-medium">Paste text</span>
        </button>
        <button className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-2 transition-colors">
        <div className="w-5 h-5 flex items-center justify-center ml-0.5">
        <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" strokeWidth="2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" strokeWidth="2"/>
        </svg>
        </div>
        <span className="text-white/70 text-sm">Copied text</span>
        </button>
        </div>
        </div>

        {/* Source Limit Progress */}
        <div className="flex items-center gap-3 text-sm">
        <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="2"/>
        <polyline points="14 2 14 8 20 8" strokeWidth="2"/>
        </svg>
        <span className="text-white/50">Source limit</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
        className="h-full bg-[#8ab4f8] rounded-full transition-all"
        style={{ width: `${(sourceCount / maxSources) * 100}%` }}
        />
        </div>
        <span className="text-white/50 tabular-nums">
        {sourceCount} / {maxSources}
        </span>
        </div>
        </div>
        </div>
        </div>
    );
};

export default AddSourceModal;
