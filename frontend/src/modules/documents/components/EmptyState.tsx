/**
 * EmptyState — Per-view empty state component.
 *
 * Large centered icon + title + description.
 * Different messages for Starred, Recent, Archived, folder, search, etc.
 */

import {
  Star,
  Clock,
  Archive,
  Folder,
  Search,
  FileText,
  Upload,
} from "lucide-react";

type EmptyView = "starred" | "recent" | "archived" | "folder" | "search" | "default";

const EMPTY_CONFIGS: Record<EmptyView, {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}> = {
  starred: {
    icon: Star,
    title: "No starred files",
    description: "Star important files for quick access. Click the ★ icon on any file.",
    color: "#F59E0B",
  },
  recent: {
    icon: Clock,
    title: "No recent activity",
    description: "Files you upload or edit will appear here.",
    color: "#8B5CF6",
  },
  archived: {
    icon: Archive,
    title: "No archived files",
    description: "Archived files are moved out of your main view but not deleted.",
    color: "#6B7280",
  },
  folder: {
    icon: Folder,
    title: "This folder is empty",
    description: "Drag files here or upload new ones to get started.",
    color: "#10B981",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try different keywords or check the spelling.",
    color: "#06B6D4",
  },
  default: {
    icon: FileText,
    title: "No files yet",
    description: "Upload your first document to get started.",
    color: "#6366F1",
  },
};

interface EmptyStateProps {
  view?: EmptyView;
  /** Override the default title */
  title?: string;
  /** Override the default description */
  description?: string;
  /** Optional action button */
  action?: React.ReactNode;
}

export function EmptyState({ view = "default", title, description, action }: EmptyStateProps) {
  const config = EMPTY_CONFIGS[view];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div
        className="size-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: `${config.color}12` }}
      >
        <Icon className="size-8" style={{ color: config.color }} strokeWidth={1.5} />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground mb-1.5">
        {title || config.title}
      </h3>
      <p className="text-[13px] text-muted-foreground text-center max-w-[300px]">
        {description || config.description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
