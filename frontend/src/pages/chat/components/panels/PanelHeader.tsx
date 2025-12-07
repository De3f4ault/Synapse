/**
 * PanelHeader - Reusable header for all panels
 * Location: frontend/src/pages/chat/components/panels/PanelHeader.tsx
 */

import React from 'react';
import { X, LucideIcon } from 'lucide-react';

interface PanelHeaderProps {
    title: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    onClose?: () => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
    title,
    icon: Icon,
    actions,
    onClose
}) => (
    <div className="h-16 flex items-center justify-between px-6 flex-shrink-0 border-b border-white/5 backdrop-blur-md bg-[#1A1C20]/50 sticky top-0 z-20 rounded-t-[32px]">
    <div className="flex items-center gap-3">
    {Icon && <Icon size={16} className="text-[#A8C7FA]" />}
    <span className="text-sm font-medium text-white/90 tracking-wide">{title}</span>
    </div>
    <div className="flex items-center gap-1">
    {actions}
    {onClose && (
        <button
        onClick={onClose}
        className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
        aria-label="Close panel"
        >
        <X size={18} />
        </button>
    )}
    </div>
    </div>
);

export default PanelHeader;
