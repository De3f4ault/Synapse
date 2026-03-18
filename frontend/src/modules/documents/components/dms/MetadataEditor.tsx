/**
 * MetadataEditor — Editable document metadata fields
 *
 * Title, created date, ASN, technical info.
 * Part of the DocumentDetailPanel.
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Hash, FileText, Clock } from "lucide-react";

interface MetadataEditorProps {
  title: string;
  created?: string;
  added?: string;
  modified?: string;
  asn?: number | null;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: string;
  pageCount?: number;
  onChange: (field: string, value: string | number | null) => void;
  readOnly?: boolean;
  className?: string;
}

export function MetadataEditor({
  title,
  created,
  added,
  modified,
  asn,
  originalFilename,
  mimeType,
  fileSize,
  pageCount,
  onChange,
  readOnly = false,
  className,
}: MetadataEditorProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localAsn, setLocalAsn] = useState(asn?.toString() || "");
  const [localCreated, setLocalCreated] = useState(created?.slice(0, 10) || "");

  // Sync when external data changes
  useEffect(() => setLocalTitle(title), [title]);
  useEffect(() => setLocalAsn(asn?.toString() || ""), [asn]);
  useEffect(() => setLocalCreated(created?.slice(0, 10) || ""), [created]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText size={12} /> Title
        </Label>
        <Input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={() => onChange("title", localTitle)}
          disabled={readOnly}
          className="bg-white/5 border-white/10 focus:border-cyan-500/50"
        />
      </div>

      {/* Created date */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar size={12} /> Created
        </Label>
        <Input
          type="date"
          value={localCreated}
          onChange={(e) => setLocalCreated(e.target.value)}
          onBlur={() => onChange("created", localCreated)}
          disabled={readOnly}
          className="bg-white/5 border-white/10 focus:border-cyan-500/50"
        />
      </div>

      {/* ASN */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Hash size={12} /> Archive Serial Number
        </Label>
        <Input
          type="number"
          value={localAsn}
          onChange={(e) => setLocalAsn(e.target.value)}
          onBlur={() =>
            onChange("archive_serial_number", localAsn ? parseInt(localAsn) : null)
          }
          placeholder="Auto-assign"
          disabled={readOnly}
          className="bg-white/5 border-white/10 focus:border-cyan-500/50"
        />
      </div>

      {/* Read-only technical metadata */}
      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock size={12} /> Details
        </p>
        <div className="grid grid-cols-2 gap-y-1.5 text-xs">
          {originalFilename && (
            <>
              <span className="text-muted-foreground">Original</span>
              <span className="text-slate-300 truncate" title={originalFilename}>
                {originalFilename}
              </span>
            </>
          )}
          {mimeType && (
            <>
              <span className="text-muted-foreground">MIME</span>
              <span className="text-slate-400 font-mono text-[10px]">{mimeType}</span>
            </>
          )}
          {fileSize && (
            <>
              <span className="text-muted-foreground">Size</span>
              <span className="text-slate-400">{fileSize}</span>
            </>
          )}
          {pageCount !== undefined && pageCount > 0 && (
            <>
              <span className="text-muted-foreground">Pages</span>
              <span className="text-slate-400">{pageCount}</span>
            </>
          )}
          {added && (
            <>
              <span className="text-muted-foreground">Added</span>
              <span className="text-slate-400">
                {new Date(added).toLocaleDateString()}
              </span>
            </>
          )}
          {modified && (
            <>
              <span className="text-muted-foreground">Modified</span>
              <span className="text-slate-400">
                {new Date(modified).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
