/**
 * FileIcon — Unified file type icon with Square UI's color system.
 *
 * 7 categories × 3 sizes. Each type gets a unique color + tinted background.
 * Uses the hex-suffix `15` trick (8% opacity) for backgrounds.
 */

import {
  Image,
  Video,
  FileText,
  Archive,
  Music,
  Code,
  File,
} from "lucide-react";

// ─── Type categorization ─────────────────────────────────────────────────────

export type FileCategory =
  | "image"
  | "video"
  | "document"
  | "archive"
  | "audio"
  | "code"
  | "other";

const EXTENSION_TO_CATEGORY: Record<string, FileCategory> = {
  // Images
  jpg: "image", jpeg: "image", png: "image", gif: "image",
  webp: "image", tiff: "image", tif: "image", bmp: "image",
  svg: "image", ico: "image", fig: "image", sketch: "image",
  ai: "image", psd: "image",
  // Videos
  mp4: "video", avi: "video", mkv: "video", mov: "video",
  webm: "video", flv: "video", wmv: "video",
  // Documents
  pdf: "document", docx: "document", doc: "document", txt: "document",
  md: "document", epub: "document", xlsx: "document", csv: "document",
  pptx: "document", odt: "document", rtf: "document",
  // Archives
  zip: "archive", tar: "archive", gz: "archive", "7z": "archive",
  rar: "archive", bz2: "archive", xz: "archive",
  // Audio
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio",
  ogg: "audio", wma: "audio", m4a: "audio",
  // Code
  py: "code", js: "code", ts: "code", tsx: "code", jsx: "code",
  html: "code", css: "code", sql: "code", json: "code",
  yaml: "code", yml: "code", sh: "code", c: "code", cpp: "code",
  java: "code", go: "code", rs: "code",
};

export function getFileCategory(extension: string): FileCategory {
  return EXTENSION_TO_CATEGORY[extension.toLowerCase().replace(".", "")] || "other";
}

// ─── Color config ────────────────────────────────────────────────────────────

const ICON_CONFIG: Record<FileCategory, { icon: React.ElementType; color: string }> = {
  image:    { icon: Image,    color: "#8B5CF6" },
  video:    { icon: Video,    color: "#EC4899" },
  document: { icon: FileText, color: "#F59E0B" },
  archive:  { icon: Archive,  color: "#10B981" },
  audio:    { icon: Music,    color: "#06B6D4" },
  code:     { icon: Code,     color: "#6366F1" },
  other:    { icon: File,     color: "#6B7280" },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface FileIconProps {
  /** File extension (e.g. "pdf") or category name */
  type: string;
  /** sm=32px  md=40px  lg=48px */
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

const ICON_SIZES = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export function FileIcon({ type, size = "md" }: FileIconProps) {
  const category = getFileCategory(type);
  const config = ICON_CONFIG[category];
  const Icon = config.icon;

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-lg flex items-center justify-center shrink-0`}
      style={{ backgroundColor: `${config.color}15` }}
    >
      <Icon
        className={ICON_SIZES[size]}
        style={{ color: config.color }}
      />
    </div>
  );
}

/** Get the color for a given file extension */
export function getFileColor(extension: string): string {
  const category = getFileCategory(extension);
  return ICON_CONFIG[category].color;
}
