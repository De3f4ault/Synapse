/**
 * StudioPanel - Synapse Style
 * Pixel-perfect match to Synapse design system
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
        className="synapse-studio-item group"
        onClick={onClick}
    >
        <div className="synapse-studio-icon transition-colors group-hover:text-[var(--synapse-cyan)]">
            <Icon size={18} strokeWidth={2} />
        </div>
        <span className="synapse-studio-label">{label}</span>
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
            className="flex-shrink-0 synapse-panel transition-all duration-300 ease-in-out overflow-hidden h-full w-[360px]"
        >
            {/* Panel Header - At the very top */}
            <div className="synapse-panel-header flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Presentation size={18} className="text-[var(--synapse-cyan)]" />
                    <span className="synapse-panel-title">Studio</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="synapse-icon-button"
                        aria-label="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="synapse-icon-button"
                        aria-label="Close studio panel"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto synapse-scrollbar">
                <div className="p-4">
                    {/* Create Section */}
                    <div className="mb-6">
                        <div className="synapse-studio-grid">
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
                    <div className="h-px bg-[var(--synapse-border-subtle)] my-6" />

                    {/* Saved Notes Section */}
                    <div className="min-h-[200px]">
                        {!hasMessages ? (
                            <div className="synapse-empty-state py-12">
                                <div className="synapse-empty-icon">
                                    <Pencil size={28} />
                                </div>
                                <p className="text-sm text-[var(--synapse-text-secondary)] text-center px-4">
                                    Studio output will be saved here.
                                </p>
                                <p className="text-xs text-[var(--synapse-text-dim)] mt-2 text-center px-4">
                                    After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="synapse-source-item">
                                    <div className="synapse-source-icon synapse-source-icon-doc">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-[var(--synapse-text-primary)]">Kernel Concurrency Notes</div>
                                        <div className="text-[10px] text-[var(--synapse-text-dim)] uppercase tracking-wider">Just now</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add Note Button */}
                    <div className="pt-4 border-t border-[var(--synapse-border-subtle)] mt-6">
                        <button className="synapse-button bg-[var(--synapse-bg-primary)] hover:bg-[var(--synapse-panel-hover)] rounded-full px-6 py-2 border border-[var(--synapse-border-medium)] flex items-center justify-center gap-2 mx-auto text-xs font-medium uppercase tracking-wider shadow-lg">
                            <Plus size={16} />
                            <span>Add Note</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudioPanel;
