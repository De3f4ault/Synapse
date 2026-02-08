/**
 * Artifact Store - Zustand state for artifact UI
 *
 * INVARIANT: Single source of truth for artifact panel state.
 * INVARIANT: No API calls - pure UI state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ArtifactBlock } from '@/shared/rendering/schema';

interface ArtifactState {
    // Active artifact details
    activeArtifact: ArtifactBlock | null;
    activeArtifactId: string | null;
    
    // Panel visibility
    isPanelOpen: boolean;
    panelWidth: number;
    
    // Editing state
    isEditing: boolean;
    editContent: string | null;
    
    // Actions
    openArtifact: (artifact: ArtifactBlock) => void;
    closePanel: () => void;
    togglePanel: () => void;
    setPanelWidth: (width: number) => void;
    startEditing: () => void;
    stopEditing: () => void;
    setEditContent: (content: string) => void;
    reset: () => void;
}

const DEFAULT_PANEL_WIDTH = 480;

export const useArtifactStore = create<ArtifactState>()(
    devtools(
        (set, get) => ({
            // Initial state
            activeArtifact: null,
            activeArtifactId: null,
            isPanelOpen: false,
            panelWidth: DEFAULT_PANEL_WIDTH,
            isEditing: false,
            editContent: null,

            // Open an artifact in the panel
            openArtifact: (artifact) => {
                set({
                    activeArtifact: artifact,
                    activeArtifactId: artifact.artifactId,
                    isPanelOpen: true,
                    isEditing: false,
                    editContent: null,
                });
            },

            // Close the panel
            closePanel: () => {
                set({
                    isPanelOpen: false,
                    isEditing: false,
                    editContent: null,
                });
            },

            // Toggle panel visibility
            togglePanel: () => {
                const { isPanelOpen } = get();
                set({ isPanelOpen: !isPanelOpen });
            },

            // Set panel width (for resizing)
            setPanelWidth: (width) => {
                set({ panelWidth: Math.max(320, Math.min(800, width)) });
            },

            // Start editing the active artifact
            startEditing: () => {
                const { activeArtifact } = get();
                set({
                    isEditing: true,
                    editContent: activeArtifact?.content || null,
                });
            },

            // Stop editing
            stopEditing: () => {
                set({
                    isEditing: false,
                    editContent: null,
                });
            },

            // Update edit content
            setEditContent: (content) => {
                set({ editContent: content });
            },

            // Reset all state
            reset: () => {
                set({
                    activeArtifact: null,
                    activeArtifactId: null,
                    isPanelOpen: false,
                    panelWidth: DEFAULT_PANEL_WIDTH,
                    isEditing: false,
                    editContent: null,
                });
            },
        }),
        { name: 'artifact-store' }
    )
);
