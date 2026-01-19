import { ViewMode } from "@/modules/notes/types";
import { FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocMeta } from "@/modules/notes/engine/blocksuiteStore";
import { formatDistanceToNow } from "date-fns";

interface DocsExplorerProps {
  viewMode: ViewMode;
  docs: DocMeta[];
  onNoteClick: (id: string) => void;
}

export function DocsExplorer({ viewMode, docs, onNoteClick }: DocsExplorerProps) {

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col">
        {/* List Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-medium text-zinc-500 border-b border-white/5">
          <div className="col-span-6">Title</div>
          <div className="col-span-3">Date</div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-1"></div>
        </div>
        {/* List Items */}
        {docs.map(doc => (
          <div 
            key={doc.id} 
            onClick={() => onNoteClick(doc.id)}
            className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className="col-span-6 flex items-center gap-3">
              <FileText size={16} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-sm text-zinc-200 font-medium truncate">{doc.title || "Untitled"}</span>
                <span className="text-xs text-zinc-600 line-clamp-1">{doc.preview || "No preview"}</span>
              </div>
            </div>
            <div className="col-span-3 text-sm text-zinc-500">
               {doc.updatedDate ? formatDistanceToNow(doc.updatedDate, { addSuffix: true }) : '-'}
            </div>
            <div className="col-span-2 flex items-center gap-2 flex-wrap">
              {doc.tags?.length ? doc.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 border border-white/5">
                  {tag}
                </span>
              )) : <span className="text-zinc-600 text-xs">-</span>}
            </div>
            <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100">
              <button className="p-1 hover:bg-white/10 rounded">
                <MoreHorizontal size={16} className="text-zinc-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid / Masonry View (Simplified to Grid for now match AFFiNE basic grid)
  return (
    <div className={cn(
      "grid gap-4 p-6",
      viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "columns-2 md:columns-3"
    )}>
      {docs.map(doc => (
        <div 
            key={doc.id} 
            onClick={() => onNoteClick(doc.id)}
            className="group flex flex-col p-4 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-white/10 transition-all cursor-pointer shadow-sm hover:shadow-md h-48 relative overflow-hidden"
        >
          <div className="flex-1 flex items-center justify-center mb-4 bg-zinc-950/30 rounded-lg border border-white/5">
             {/* Thumbnail placeholder - could be clearer */}
             <div className="flex flex-col items-center gap-2">
                 <FileText className="text-zinc-700 mb-1" size={24} />
                 <span className="text-[10px] text-zinc-600">Preview</span>
             </div>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-200 mb-1 line-clamp-2">{doc.title || "Untitled"}</div>
              <div className="text-xs text-zinc-500">
                {doc.updatedDate ? formatDistanceToNow(doc.updatedDate, { addSuffix: true }) : ''}
              </div>
            </div>
          </div>
           <button className="absolute top-2 right-2 p-1.5 hover:bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal size={16} className="text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}
