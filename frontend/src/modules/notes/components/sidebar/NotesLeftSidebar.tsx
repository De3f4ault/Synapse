import { useState } from "react";
import { useLocation } from "react-router-dom";
import { 
  Search, 
  FileText, 
  Calendar, 
  Settings, 
  Folder, 
  Download,
  Trash,
  ChevronLeft,
  ChevronsLeft,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarMenuItem } from "./SidebarMenuItem";
import { FavoritesSection } from "./sections/FavoritesSection";

export function NotesLeftSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const width = 248; // Fixed width for now
  const [isOrganizeCollapsed, setIsOrganizeCollapsed] = useState(false);

  return (
    <div 
      className={cn(
        "group/sidebar relative flex flex-col border-r border-white/5 bg-[#0a0a0a] transition-all duration-300 ease-in-out",
        collapsed ? "w-[52px]" : `w-[${width}px]`
      )}
      style={{ width: collapsed ? 52 : width }}
    >
      {/* Workspace Selector (Top) */}
      <div className="flex items-center h-[52px] px-3 border-b border-white/5">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer w-full">
          <div className="h-5 w-5 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
            SY
          </div>
          {!collapsed && (
            <span className="flex-1 text-sm font-medium truncate text-zinc-200">
              Synapse Workspace
            </span>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-col gap-0.5 px-2 py-3">
        {/* Quick Search */}
        <SidebarMenuItem 
          icon={<Search size={16} />} 
          label={!collapsed ? "Quick Search" : ""}
          className={cn(collapsed && "justify-center px-0")}
          onClick={() => { /* Open Command Palette */ }}
        />
        
        {/* All Docs */}
        <SidebarMenuItem 
          icon={<FileText size={16} />} 
          label={!collapsed ? "All Docs" : ""}
          to="/notes"
          active={location.pathname === "/notes" || location.pathname === "/notes/all"}
          className={cn(collapsed && "justify-center px-0")}
        />

        {/* Journals */}
        <SidebarMenuItem 
          icon={<Calendar size={16} />} 
          label={!collapsed ? "Journals" : ""}
          to="/journals"
          className={cn(collapsed && "justify-center px-0")}
        />

        {/* Intelligence (Placeholder) */}
        <SidebarMenuItem 
          icon={<Sparkles size={16} />} 
          label={!collapsed ? "Intelligence" : ""}
          className={cn(collapsed && "justify-center px-0")}
        />

        {/* Settings */}
        <SidebarMenuItem 
          icon={<Settings size={16} />} 
          label={!collapsed ? "Settings" : ""}
          className={cn(collapsed && "justify-center px-0")}
        />
      </div>

      {/* Scrollable Content (Favorites, Folders, Tags) */}
      {!collapsed && (
        <ScrollArea className="flex-1 px-2">
          {/* Favorites */}
          <FavoritesSection />

          {/* Organize */}
          <div className="mb-4">
             <div 
              className="flex items-center px-3 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-300 cursor-pointer"
              onClick={() => setIsOrganizeCollapsed(!isOrganizeCollapsed)}
            >
              <span>Organize</span>
            </div>
             {!isOrganizeCollapsed && (
              <div className="mt-1 flex flex-col gap-0.5">
                <SidebarMenuItem 
                  icon={<Folder size={14} />} 
                  label="First Folder" 
                  to="/notes/folder/1"
                  collapsed={true}
                  onCollapsedChange={() => {}}
                />
              </div>
            )}
          </div>

           {/* Tags */}
           <div className="mb-4">
             <div className="flex items-center px-3 py-1 text-xs font-semibold text-zinc-500">
              <span>Tags</span>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-0.5 px-2 py-3 border-t border-white/5">
        <SidebarMenuItem 
          icon={<Trash size={16} />} 
          label={!collapsed ? "Trash" : ""}
          className={cn(collapsed && "justify-center px-0")}
        />
        <SidebarMenuItem 
          icon={<Download size={16} />} 
          label={!collapsed ? "Import" : ""}
          className={cn(collapsed && "justify-center px-0")}
        />
      </div>

      {/* Collapse Toggle */}
      <div 
        className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-50 cursor-col-resize"
      >
        <Button
          variant="secondary" 
          size="sm"
          className="h-6 w-6 rounded-full p-0 shadow-md border border-white/10 bg-zinc-900"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronsLeft className="h-3 w-3 rotate-180" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
