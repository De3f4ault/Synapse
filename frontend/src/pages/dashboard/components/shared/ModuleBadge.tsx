/**
 * ModuleBadge
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  BookOpen,
  Zap,
  MessageSquare,
  ClipboardList,
  LucideIcon,
} from "lucide-react";

// ---------- Types ----------
export type ModuleType =
  | "documents"
  | "notes"
  | "flashcards"
  | "chat"
  | "quizzes";

interface ModuleBadgeProps {
  type?: ModuleType;
  moduleType?: ModuleType; // Backwards compatibility
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

// ---------- Icons ----------
const MODULE_ICONS: Record<ModuleType, LucideIcon> = {
  documents: FileText,
  notes: BookOpen,
  flashcards: Zap,
  chat: MessageSquare,
  quizzes: ClipboardList,
};

// ---------- Neon Colors ----------
function getNeonColors(type: ModuleType) {
  switch (type) {
    case "flashcards":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
      };
    case "documents":
      return {
        bg: "bg-cyan-500/10",
        text: "text-cyan-400",
        border: "border-cyan-500/20",
      };
    case "notes":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
      };
    case "chat":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
      };
    case "quizzes":
      return {
        bg: "bg-red-500/10",
        text: "text-red-400",
        border: "border-red-500/20",
      };
    default:
      return {
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
      };
  }
}

// ---------- Size Classes ----------
const SIZE_CLASSES = {
  sm: { text: "text-[9px]", height: "h-4", padding: "px-1.5", icon: "w-2 h-2" },
  md: { text: "text-xs", height: "h-5", padding: "px-2", icon: "w-3 h-3" },
  lg: { text: "text-sm", height: "h-6", padding: "px-3", icon: "w-4 h-4" },
};

// ---------- Main Component ----------
export function ModuleBadge({
  type,
  moduleType,
  className,
  showIcon = true,
  size = "sm",
}: ModuleBadgeProps) {
  // Accept either prop
  const actualType = type || moduleType || "flashcards";
  const safeType: ModuleType =
    actualType in MODULE_ICONS ? actualType : "flashcards";

  const Icon = MODULE_ICONS[safeType];
  const colors = getNeonColors(safeType);
  const sizeCfg = SIZE_CLASSES[size];

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 rounded-md border font-mono font-bold uppercase tracking-wider",
        colors.bg,
        colors.text,
        colors.border,
        sizeCfg.text,
        sizeCfg.height,
        sizeCfg.padding,
        className,
      )}
    >
      {showIcon && <Icon className={sizeCfg.icon} />}
      <span>{safeType}</span>
    </Badge>
  );
}

// ---------- ModuleDot ----------
export function ModuleDot({
  type,
  moduleType,
  className,
}: {
  type?: ModuleType;
  moduleType?: ModuleType;
  className?: string;
}) {
  const actualType = type || moduleType || "flashcards";
  const safeType: ModuleType =
    actualType in MODULE_ICONS ? actualType : "flashcards";

  const colors = getNeonColors(safeType);

  return (
    <div
      className={cn(
        "h-1.5 w-1.5 rounded-full shadow-[0_0_6px]",
        colors.text.replace("text-", "bg-"),
        className,
      )}
    />
  );
}
