import React from 'react';
import { Atom } from 'lucide-react';

export const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 bg-[var(--synapse-bg-primary)] flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-[var(--synapse-border-subtle)] border-t-[var(--synapse-cyan)] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Atom className="w-6 h-6 text-[var(--synapse-cyan)] animate-pulse" />
                    </div>
                </div>
                <div className="text-[var(--synapse-text-secondary)] text-sm font-mono tracking-widest animate-pulse">
                    LOADING
                </div>
            </div>
        </div>
    );
};
