import { useMemo } from "react";
import "tldraw/tldraw.css";
import { Tldraw } from "tldraw";
import { getAssetUrls } from "@tldraw/assets/selfHosted";
import { useWhiteboardNote } from "../hooks/useWhiteboardNote";
import { WhiteboardEditorProps } from "../types";

export function WhiteboardEditor({ note }: WhiteboardEditorProps) {
  // 1. Hook owns lifecycle and persistence
  const { handleMount, initialSnapshot, isSaving } = useWhiteboardNote(note);

  // 2. Official Asset Configuration (Self-Hosted)
  const assetUrls = useMemo(() => getAssetUrls({
    baseUrl: '/tldraw-assets'
  }), []);

  // 3. Render Phase
  return (
    <div className="relative h-full w-full group">
       {/* Saving Indicator (Subtle, matching Phase 3) */}
       <div className="absolute top-2 right-16 z-[200] pointer-events-none">
        <span className={`text-xs text-slate-400 transition-opacity duration-300 ${isSaving ? 'opacity-100' : 'opacity-0'}`}>
          Saving...
        </span>
      </div>

      {/* 
        3. Official View Component
        snapshot: Hydrates the store
        onMount: Binds persistence listeners
        assetUrls: Points to local /public/tldraw-assets
      */}
      <Tldraw
        persistenceKey={`note-${note.id}`}
        snapshot={initialSnapshot}
        onMount={handleMount}
        assetUrls={assetUrls}
      />
    </div>
  );
}
