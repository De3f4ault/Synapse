/**
 * NotificationDropdown — Bell icon with task notifications
 *
 * Shows recent document processing events (consumed, failed, etc.)
 * with unread count badge. Maps to existing task/notification system.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bell, Check, X, Loader2, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  type: "consumed" | "processing" | "failed" | "deleted" | "classification";
  title: string;
  detail?: string;
  timestamp: string;
  acknowledged: boolean;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
  className?: string;
}

const TYPE_CONFIG = {
  consumed: {
    icon: Check,
    iconClass: "text-emerald-400",
    label: "Consumed",
  },
  processing: {
    icon: Loader2,
    iconClass: "text-cyan-400 animate-spin",
    label: "Processing",
  },
  failed: {
    icon: AlertTriangle,
    iconClass: "text-red-400",
    label: "Failed",
  },
  deleted: {
    icon: X,
    iconClass: "text-slate-400",
    label: "Deleted",
  },
  classification: {
    icon: FileText,
    iconClass: "text-amber-400",
    label: "Classified",
  },
};

// ============================================================================
// Component
// ============================================================================

export function NotificationDropdown({
  notifications,
  onAcknowledge,
  onAcknowledgeAll,
  className,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.acknowledged).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-lg transition-colors",
            "hover:bg-white/5 text-slate-400 hover:text-white",
            unreadCount > 0 && "text-white",
            className
          )}
          title={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-[10px] font-bold text-black">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[360px] p-0 bg-card/95 backdrop-blur-2xl border-white/10"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAcknowledgeAll}
              className="text-xs text-cyan-400 hover:text-cyan-300 h-6"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Bell size={28} strokeWidth={1} className="mb-2 text-slate-600" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const config = TYPE_CONFIG[notification.type];
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] transition-colors",
                    !notification.acknowledged && "bg-cyan-500/[0.03]"
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    <Icon size={16} className={config.iconClass} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200 font-medium truncate">
                        {notification.title}
                      </span>
                      {!notification.acknowledged && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      )}
                    </div>
                    {notification.detail && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {notification.detail}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600 mt-1">
                      {formatRelativeTime(notification.timestamp)}
                    </p>
                  </div>

                  {/* Dismiss */}
                  {!notification.acknowledged && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcknowledge(notification.id);
                      }}
                      className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white shrink-0"
                      title="Mark as read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
