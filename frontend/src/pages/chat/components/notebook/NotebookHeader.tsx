import React from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';

interface NotebookHeaderProps {
    title: string;
    onBack: () => void;
}

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M4 20h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2zm2-8h12v2H6v-2zm0-4h12v2H6V8zm0 8h8v2H6v-2z" />
    </svg>
);

export const NotebookHeader: React.FC<NotebookHeaderProps> = ({ title, onBack }) => {
    return (
        <header className="h-20 flex items-center justify-between px-8 select-none flex-shrink-0 z-30 relative">
        <div className="flex items-center gap-4">
        <button
        onClick={onBack}
        className="p-3 -ml-3 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-all group"
        >
        <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
        <GoogleIcon />
        </div>
        <span className="text-white/90 text-lg font-medium tracking-tight truncate max-w-[300px]">
        {title || 'Untitled notebook'}
        </span>
        </div>
        </div>
        <div className="flex items-center gap-3">
        <div className="flex bg-[#1A1C20] border border-white/5 rounded-full p-1">
        <button className="px-4 py-1.5 rounded-full text-xs font-medium text-white/80 hover:bg-white/5 transition-colors">
        Chat
        </button>
        <button className="px-4 py-1.5 rounded-full text-xs font-medium text-white/40 hover:text-white/80 transition-colors">
        Saved
        </button>
        </div>
        <div className="h-6 w-[1px] bg-white/10 mx-2" />
        <button className="p-2.5 rounded-full hover:bg-white/5 text-white/60 transition-colors">
        <Share2 size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 ring-2 ring-[#131314] flex items-center justify-center text-xs font-bold text-white shadow-lg">
        J
        </div>
        </div>
        </header>
    );
};

export default NotebookHeader;
