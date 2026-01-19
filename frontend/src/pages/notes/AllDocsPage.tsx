import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ViewMode } from "@/modules/notes/types";
import { AllDocsHeader } from "@/modules/notes/components/all-docs/AllDocsHeader";
import { DocsExplorer } from "@/modules/notes/components/all-docs/DocsExplorer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceDocs } from "@/modules/notes/engine/useWorkspaceDocs";

export function AllDocsPage() {
  const navigate = useNavigate();
  const { docs, isLoading, createDoc } = useWorkspaceDocs();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreatePage = () => {
    const newId = createDoc();
    navigate(`/notes/${newId}`);
  };

  const handleOpenDoc = (id: string) => {
    navigate(`/notes/${id}`);
  };

  const filteredDocs = useMemo(() => {
    if (!docs) return [];
    if (!searchQuery) return docs;
    const lower = searchQuery.toLowerCase();
    return docs.filter(doc => 
       doc.title?.toLowerCase().includes(lower) || 
       doc.preview?.toLowerCase().includes(lower)
    );
  }, [docs, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="shrink-0">
        <AllDocsHeader 
          viewMode={viewMode} 
          onViewModeChange={setViewMode}
          onCreatePage={handleCreatePage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
         <ScrollArea className="h-full w-full">
            {isLoading ? (
                <div className="flex items-center justify-center h-64 text-zinc-500">
                    Loading docs...
                </div>
            ) : (
                <DocsExplorer 
                    viewMode={viewMode} 
                    docs={filteredDocs} 
                    onNoteClick={handleOpenDoc}
                />
            )}
         </ScrollArea>
      </div>
    </div>
  );
}

export default AllDocsPage;
