/**
 * StudioPanel - Exact NotebookLM Replica
 * Pixel-perfect match to Google's NotebookLM studio panel
 *
 * Location: frontend/src/pages/chat/components/panels/StudioPanel.tsx
 */

import React from 'react';
import {
    Mic,
    Video,
    Network,
    FileText,
    CreditCard,
    HelpCircle,
    BarChart3,
    Presentation,
    Plus,
    Settings,
    X,
    Pencil
} from 'lucide-react';

interface StudioPanelProps {
    isOpen: boolean;
    onClose: () => void;
    hasMessages: boolean;
}

const StudioItem = ({
    icon: Icon,
    label,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
}) => (
    <button
    className="studio-item group"
    onClick={onClick}
    >
    <div className="studio-icon transition-transform group-hover:scale-110">
    <Icon size={24} strokeWidth={1.5} />
    </div>
    <span className="studio-label">{label}</span>
    </button>
);

export const StudioPanel: React.FC<StudioPanelProps> = ({
    isOpen,
    onClose,
    hasMessages
}) => {
    const handleStudioAction = (action: string) => {
        console.log(`Studio action: ${action}`);
        // TODO: Implement studio actions
    };

    if (!isOpen) return null;

    return (
        <div
        className="flex-shrink-0 notebook-panel transition-all duration-300 ease-in-out overflow-hidden h-full w-[360px]"
        >
        {/* Panel Header - At the very top */}
        <div className="panel-header flex-shrink-0">
        <div className="flex items-center gap-2">
        <Presentation size={18} className="text-secondary" />
        <span className="panel-header-title">Studio</span>
        </div>
        <div className="flex items-center gap-1">
        <button
        className="icon-button"
        aria-label="Settings"
        >
        <Settings size={20} />
        </button>
        <button
        onClick={onClose}
        className="icon-button"
        aria-label="Close studio panel"
        >
        <X size={20} />
        </button>
        </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4">
        {/* Create Section */}
        <div className="mb-6">
        <div className="studio-grid">
        <StudioItem
        icon={Mic}
        label="Audio Overview"
        onClick={() => handleStudioAction('audio')}
        />
        <StudioItem
        icon={Video}
        label="Video Overview"
        onClick={() => handleStudioAction('video')}
        />
        <StudioItem
        icon={Network}
        label="Mind Map"
        onClick={() => handleStudioAction('mindmap')}
        />
        <StudioItem
        icon={FileText}
        label="Reports"
        onClick={() => handleStudioAction('reports')}
        />
        <StudioItem
        icon={CreditCard}
        label="Flashcards"
        onClick={() => handleStudioAction('flashcards')}
        />
        <StudioItem
        icon={HelpCircle}
        label="Quiz"
        onClick={() => handleStudioAction('quiz')}
        />
        <StudioItem
        icon={BarChart3}
        label="Infographic"
        onClick={() => handleStudioAction('infographic')}
        />
        <StudioItem
        icon={Presentation}
        label="Slide Deck"
        onClick={() => handleStudioAction('slides')}
        />
        </div>
        </div>

        {/* Divider */}
        <div className="notebook-divider" />

        {/* Saved Notes Section */}
        <div className="min-h-[200px]">
        {!hasMessages ? (
            <div className="empty-state py-12">
            <div className="empty-state-icon">
            <Pencil size={28} />
            </div>
            <p className="text-sm text-[var(--text-secondary)] text-center px-4">
            Studio output will be saved here.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center px-4">
            After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
            </p>
            </div>
        ) : (
            <div className="space-y-2">
            <div className="source-item">
            <div className="source-icon source-icon-doc">
            <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
            <div className="source-title">Kernel Concurrency Notes</div>
            <div className="source-type text-[10px]">Just now</div>
            </div>
            </div>
            </div>
        )}
        </div>

        {/* Add Note Button */}
        <div className="pt-4 border-t border-[var(--border-subtle)] mt-6">
        <button className="notebook-button notebook-button-primary w-full flex items-center justify-center gap-2">
        <Plus size={18} />
        <span>Add note</span>
        </button>
        </div>
        </div>
        </div>
        </div>
    );
};

export default StudioPanel;
