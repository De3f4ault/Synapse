/**
 * SourcesPanel - Exact NotebookLM Replica
 * Pixel-perfect match to Google's NotebookLM sources panel
 *
 * Location: frontend/src/pages/chat/components/panels/SourcesPanel.tsx
 */

import React, { useState } from 'react';
import { Plus, FileText, Globe, ChevronDown, Search, X } from 'lucide-react';

export interface Source {
    id: number;
    title: string;
    type: 'pdf' | 'doc' | 'txt' | 'url';
    document_id?: number;
}

interface SourcesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    sources: Source[];
    onAddSource: () => void;
    onRemoveSource: (id: number) => void;
    isLoading?: boolean;
}

const SourceItem = ({ source, onRemove }: { source: Source; onRemove: () => void }) => {
    const getIconColor = () => {
        switch (source.type) {
            case 'pdf': return 'source-icon-pdf';
            case 'doc': return 'source-icon-doc';
            case 'txt': return 'source-icon-txt';
            default: return 'source-icon-txt';
        }
    };

    return (
        <div className="source-item group">
        <div className={`source-icon ${getIconColor()}`}>
        <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
        <div className="source-title">{source.title}</div>
        </div>
        <button
        onClick={(e) => {
            e.stopPropagation();
            onRemove();
        }}
        className="icon-button opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
        aria-label="Remove source"
        >
        <X size={16} />
        </button>
        </div>
    );
};

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
    isOpen,
    onClose,
    sources,
    onAddSource,
    onRemoveSource,
    isLoading = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    return (
        <div
        className="flex-shrink-0 notebook-panel transition-all duration-300 ease-in-out overflow-hidden h-full w-[360px]"
        >
        {/* Panel Header - At the very top */}
        <div className="panel-header flex-shrink-0">
        <div className="flex items-center gap-2">
        <FileText size={18} className="text-secondary" />
        <span className="panel-header-title">Sources</span>
        </div>
        <div className="flex items-center gap-1">
        <button
        onClick={onClose}
        className="icon-button"
        aria-label="Close sources panel"
        >
        <X size={20} />
        </button>
        </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Add Sources Button */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
        <button
        onClick={onAddSource}
        className="notebook-button w-full flex items-center justify-center gap-2"
        >
        <Plus size={18} />
        <span>Add sources</span>
        </button>
        </div>

        {/* Deep Research Banner */}
        <div className="p-4">
        <div className="deep-research-banner cursor-pointer">
        <div className="deep-research-banner-icon">
        <Search size={48} />
        </div>
        <div className="relative z-10">
        <div className="deep-research-title">Deep Research</div>
        <div className="deep-research-text">
        Try Deep Research for an in-depth report and new sources!
        </div>
        </div>
        </div>
        </div>

        {/* Search the web */}
        <div className="px-4 pb-4">
        <div className="search-box">
        <Globe size={18} className="text-[var(--text-tertiary)]" />
        <input
        type="text"
        placeholder="Search the web for new sources"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1"
        />
        <div className="flex items-center gap-1">
        <button className="icon-button w-8 h-8">
        <span className="text-xs text-[var(--text-tertiary)]">Web</span>
        </button>
        <button className="icon-button w-8 h-8">
        <ChevronDown size={16} />
        </button>
        </div>
        </div>
        </div>

        {/* Sources List */}
        <div className="px-4 pb-4">
        {isLoading ? (
            <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--notebook-primary)]" />
            </div>
        ) : sources.length === 0 ? (
            <div className="empty-state py-8">
            <div className="empty-state-icon">
            <FileText size={28} />
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center px-4">
            Saved sources will appear here
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center px-4">
            Click Add source above to add PDFs, websites, text, videos, or audio files. Or import a file directly from Google Drive.
            </p>
            </div>
        ) : (
            <div className="space-y-1">
            {sources.map((source) => (
                <SourceItem
                key={source.id}
                source={source}
                onRemove={() => onRemoveSource(source.id)}
                />
            ))}
            </div>
        )}
        </div>
        </div>
        </div>
    );
};

export default SourcesPanel;
