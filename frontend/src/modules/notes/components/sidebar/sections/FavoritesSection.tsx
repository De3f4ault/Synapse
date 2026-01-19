import { useState } from "react";
import { FileText, Loader2, Star } from "lucide-react";
import { useFavorites } from "@/modules/notes/core";
import { SidebarMenuItem } from "../SidebarMenuItem";
import { cn } from "@/lib/utils";

export function FavoritesSection() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: favorites, isLoading } = useFavorites();

  return (
    <div className="mb-4">
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between px-3 py-1 group/header cursor-pointer",
          "text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span>Favorites</span>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-zinc-600" />}
      </div>

      {/* List */}
      {!isCollapsed && (
        <div className="mt-1 flex flex-col gap-0.5">
          {isLoading ? (
            // Skeleton / Loading state handled by header spinner for minimal intrusion
            null
          ) : !favorites || favorites.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-600 italic">
              No favorites yet
            </div>
          ) : (
            favorites.map((note) => (
              <SidebarMenuItem 
                key={note.id} 
                icon={<FileText size={14} />} 
                label={note.title || "Untitled"} 
                to={`/notes/${note.id}`}
                postfix={
                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
