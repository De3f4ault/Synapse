/**
 * DMSSidebar — Paperless-ngx style sidebar navigation
 *
 * Replaces the old Google Drive folder tree sidebar with Paperless-style
 * MANAGE + ADMINISTRATION sections.
 *
 * Layout:
 *   Dashboard
 *   Documents
 *   ─ MANAGE ─
 *   Correspondents | Tags | Document Types | Storage Paths
 *   Custom Fields | Saved Views | Workflows | Mail
 *   Trash
 *   ─ ADMINISTRATION ─
 *   Settings | File Tasks | Logs
 */

import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Tags as TagsIcon,
  FileType,
  FolderTree,
  Columns3,
  Bookmark,
  Workflow,
  Mail,
  Trash2,
  Settings,
  ListTodo,
  ScrollText,
  ChevronLeft,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedViewSidebar } from "./SavedViewSidebar";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DMSSidebarProps {
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onUpload?: () => void;
  savedViews?: any[];
  activeSavedViewId?: number | null;
  onSavedViewClick?: (view: any) => void;
  /** Open documents for "OPEN DOCUMENTS" section */
  openDocuments?: Array<{ id: number; title: string }>;
  onOpenDocumentClick?: (id: number) => void;
  onCloseAllDocuments?: () => void;
}

// ─── Navigation items ─────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  /** Whether the route is implemented */
  implemented?: boolean;
}

const primaryItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", implemented: true },
  { id: "documents", label: "Documents", icon: FileText, path: "/documents", implemented: true },
];

const manageItems: NavItem[] = [
  { id: "correspondents", label: "Correspondents", icon: Users, path: "/documents/correspondents" },
  { id: "tags", label: "Tags", icon: TagsIcon, path: "/documents/tags" },
  { id: "document-types", label: "Document Types", icon: FileType, path: "/documents/types" },
  { id: "storage-paths", label: "Storage Paths", icon: FolderTree, path: "/documents/storage-paths" },
  { id: "custom-fields", label: "Custom Fields", icon: Columns3, path: "/documents/custom-fields" },
  { id: "saved-views", label: "Saved Views", icon: Bookmark, path: "/documents/saved-views" },
  { id: "workflows", label: "Workflows", icon: Workflow, path: "/documents/workflows" },
  { id: "mail", label: "Mail", icon: Mail, path: "/documents/mail" },
];

const trashItem: NavItem = {
  id: "trash",
  label: "Trash",
  icon: Trash2,
  path: "/documents/trash",
  implemented: true,
};

const adminItems: NavItem[] = [
  { id: "settings", label: "Settings", icon: Settings, path: "/documents/settings" },
  { id: "file-tasks", label: "File Tasks", icon: ListTodo, path: "/documents/tasks" },
  { id: "logs", label: "Logs", icon: ScrollText, path: "/documents/logs" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DMSSidebar({
  className,
  collapsed = false,
  onCollapsedChange,
  onUpload,
  savedViews = [],
  activeSavedViewId,
  onSavedViewClick,
  openDocuments = [],
  onOpenDocumentClick,
  onCloseAllDocuments,
}: DMSSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem("dmsSidebarCollapsed");
    if (saved && onCollapsedChange) {
      onCollapsedChange(JSON.parse(saved));
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    const next = !collapsed;
    localStorage.setItem("dmsSidebarCollapsed", JSON.stringify(next));
    onCollapsedChange?.(next);
  }, [collapsed, onCollapsedChange]);

  const handleNavClick = useCallback((item: NavItem) => {
    if (item.implemented) {
      navigate(item.path);
    } else {
      toast.info(`${item.label} — coming soon`, {
        description: "This feature is not yet available",
      });
    }
  }, [navigate]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={cn(
        "flex flex-col h-full bg-[#0a1a0a]/80 backdrop-blur-xl border-r border-emerald-900/30",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-[15.5rem]",
        className
      )}
    >
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-emerald-900/20">
        {!collapsed && (
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <FileText size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-200 tracking-tight">
              Documents
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "h-7 w-7 text-slate-500 hover:text-slate-300 hover:bg-white/5",
            collapsed && "mx-auto"
          )}
        >
          <ChevronLeft
            size={16}
            className={cn(
              "transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* ─── Scrollable Nav ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
        {/* Primary */}
        <div className="px-2 space-y-0.5">
          {primaryItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={isActive(item.path)}
              collapsed={collapsed}
              onClick={() => handleNavClick(item)}
            />
          ))}
        </div>

        {/* Open Documents */}
        {openDocuments.length > 0 && !collapsed && (
          <div className="mt-4 px-2">
            <SectionHeader label="OPEN DOCUMENTS" />
            <div className="space-y-0.5">
              {openDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onOpenDocumentClick?.(doc.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-emerald-300 hover:bg-emerald-900/20 transition-colors truncate"
                >
                  <FileText size={13} className="shrink-0 text-emerald-500" />
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
              <button
                onClick={onCloseAllDocuments}
                className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <X size={11} />
                Close all
              </button>
            </div>
          </div>
        )}

        {/* MANAGE section */}
        <div className="mt-4 px-2">
          {!collapsed && <SectionHeader label="MANAGE" />}
          {collapsed && <div className="h-px bg-emerald-900/30 mx-2 my-2" />}
          <div className="space-y-0.5">
            {manageItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={isActive(item.path)}
                collapsed={collapsed}
                onClick={() => handleNavClick(item)}
              />
            ))}
          </div>
        </div>

        {/* Saved Views (inline in MANAGE section) */}
        {!collapsed && savedViews.length > 0 && (
          <div className="px-2 mt-1">
            <SavedViewSidebar
              views={savedViews}
              activeViewId={activeSavedViewId}
              onViewClick={(view) => onSavedViewClick?.(view)}
              className=""
            />
          </div>
        )}

        {/* Trash */}
        <div className="mt-2 px-2">
          <NavButton
            item={trashItem}
            active={isActive(trashItem.path)}
            collapsed={collapsed}
            onClick={() => handleNavClick(trashItem)}
          />
        </div>

        {/* ADMINISTRATION section */}
        <div className="mt-4 px-2">
          {!collapsed && <SectionHeader label="ADMINISTRATION" />}
          {collapsed && <div className="h-px bg-emerald-900/30 mx-2 my-2" />}
          <div className="space-y-0.5">
            {adminItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={isActive(item.path)}
                collapsed={collapsed}
                onClick={() => handleNavClick(item)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <div className="p-2 border-t border-emerald-900/20">
        {/* Upload button */}
        <Button
          variant="ghost"
          onClick={onUpload}
          className={cn(
            "w-full flex items-center gap-2 text-sm font-medium",
            "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300",
            "border border-emerald-800/30 rounded-lg transition-colors",
            collapsed ? "justify-center p-2" : "justify-start px-3 py-2"
          )}
        >
          <Upload size={16} />
          {!collapsed && <span>Upload</span>}
        </Button>
      </div>
    </nav>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 select-none">
      {label}
    </div>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group w-full flex items-center gap-2.5 rounded-md transition-all duration-150",
        collapsed ? "justify-center p-2.5" : "px-3 py-[7px]",
        active
          ? "bg-emerald-600/15 text-emerald-300 border-l-[3px] border-emerald-400"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-l-[3px] border-transparent"
      )}
    >
      <Icon
        size={collapsed ? 18 : 15}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"
        )}
      />
      {!collapsed && (
        <span
          className={cn(
            "text-[13px] font-medium truncate transition-colors",
            active ? "text-emerald-200" : "text-slate-400 group-hover:text-slate-200"
          )}
        >
          {item.label}
        </span>
      )}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400">
          {item.badge}
        </span>
      )}
    </button>
  );
}
