/**
 * TaxonomyEditDialog — Shared create/edit dialog for taxonomy items
 *
 * Handles correspondents, document types, tags, and storage paths
 * with conditional fields (color for tags, path for storage paths).
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MatchingAlgorithmPicker } from "./MatchingAlgorithmPicker";
import { ColorPicker } from "./ColorPicker";
import { MatchingAlgorithm } from "../../core/types/dms";

// ============================================================================
// Types
// ============================================================================

export type TaxonomyKind = "correspondent" | "documentType" | "tag" | "storagePath";

export interface TaxonomyFormData {
  name: string;
  match: string;
  matching_algorithm: MatchingAlgorithm;
  is_insensitive: boolean;
  // Tag-specific
  color?: string;
  is_inbox_tag?: boolean;
  // StoragePath-specific
  path?: string;
}

interface TaxonomyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: TaxonomyKind;
  /** Existing item to edit (null = create new) */
  initial?: Partial<TaxonomyFormData> | null;
  onSave: (data: TaxonomyFormData) => void;
  isSaving?: boolean;
}

const KIND_LABELS: Record<TaxonomyKind, string> = {
  correspondent: "Correspondent",
  documentType: "Document Type",
  tag: "Tag",
  storagePath: "Storage Path",
};

// ============================================================================
// Component
// ============================================================================

export function TaxonomyEditDialog({
  open,
  onOpenChange,
  kind,
  initial,
  onSave,
  isSaving = false,
}: TaxonomyEditDialogProps) {
  const isEditing = !!initial?.name;
  const label = KIND_LABELS[kind];

  const [form, setForm] = useState<TaxonomyFormData>({
    name: "",
    match: "",
    matching_algorithm: MatchingAlgorithm.AUTO,
    is_insensitive: true,
    color: "#3498db",
    is_inbox_tag: false,
    path: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        match: initial?.match || "",
        matching_algorithm: initial?.matching_algorithm ?? MatchingAlgorithm.AUTO,
        is_insensitive: initial?.is_insensitive ?? true,
        color: initial?.color || "#3498db",
        is_inbox_tag: initial?.is_inbox_tag || false,
        path: initial?.path || "",
      });
    }
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const update = <K extends keyof TaxonomyFormData>(
    key: K,
    value: TaxonomyFormData[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-slate-200">
            {isEditing ? `Edit ${label}` : `Create ${label}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={`New ${label.toLowerCase()}`}
              autoFocus
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Matching algorithm */}
          <MatchingAlgorithmPicker
            algorithm={form.matching_algorithm}
            onAlgorithmChange={(a) => update("matching_algorithm", a)}
            match={form.match}
            onMatchChange={(m) => update("match", m)}
            isInsensitive={form.is_insensitive}
            onInsensitiveChange={(i) => update("is_insensitive", i)}
          />

          {/* Tag-specific: color + inbox */}
          {kind === "tag" && (
            <>
              <ColorPicker
                value={form.color || "#3498db"}
                onChange={(c) => update("color", c)}
              />
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-300">
                  Inbox tag
                  <span className="block text-[11px] text-slate-500 font-normal">
                    Documents with this tag need attention
                  </span>
                </Label>
                <Switch
                  checked={form.is_inbox_tag || false}
                  onCheckedChange={(v) => update("is_inbox_tag", v)}
                />
              </div>
            </>
          )}

          {/* StoragePath-specific: path template */}
          {kind === "storagePath" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Path template
              </Label>
              <Input
                value={form.path || ""}
                onChange={(e) => update("path", e.target.value)}
                placeholder="{correspondent}/{title}"
                className="bg-white/5 border-white/10 font-mono text-sm"
              />
              <p className="text-[11px] text-slate-500">
                Variables: {"{correspondent}"}, {"{document_type}"},{" "}
                {"{title}"}, {"{created}"}, {"{created_year}"},{" "}
                {"{added}"}, {"{asn}"}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.name.trim() || isSaving}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isSaving ? "Saving…" : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
