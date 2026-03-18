/**
 * SaveViewDialog — Save/create saved view modal
 *
 * Modeled after Paperless-ngx's save-view-config-dialog.
 * Creates a SavedView from the current filter/sort/display state.
 */

import { useState } from "react";
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
import { cn } from "@/lib/utils";
import type { SavedViewCreate, ListViewState } from "../../core/types/dms";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current view state to save */
  currentState: ListViewState;
  /** Called when user confirms save */
  onSave: (view: SavedViewCreate) => void;
  /** If editing an existing view, pre-fill name */
  existingName?: string;
  isSaving?: boolean;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  currentState,
  onSave,
  existingName,
  isSaving = false,
}: SaveViewDialogProps) {
  const [name, setName] = useState(existingName || "");
  const [showOnDashboard, setShowOnDashboard] = useState(true);
  const [showInSidebar, setShowInSidebar] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      show_on_dashboard: showOnDashboard,
      show_in_sidebar: showInSidebar,
      sort_field: currentState.sortField,
      sort_reverse: currentState.sortReverse,
      filter_rules: currentState.filterRules,
      page_size: currentState.pageSize,
      display_mode: currentState.displayMode,
      display_fields: currentState.displayFields,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-slate-200">
            {existingName ? "Update Saved View" : "Save Current View"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              View name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Invoices 2024"
              autoFocus
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-300">
                Show on dashboard
              </Label>
              <Switch
                checked={showOnDashboard}
                onCheckedChange={setShowOnDashboard}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-300">
                Show in sidebar
              </Label>
              <Switch
                checked={showInSidebar}
                onCheckedChange={setShowInSidebar}
              />
            </div>
          </div>

          {/* Preview info */}
          <div className="rounded-md bg-white/[0.03] border border-white/5 p-2.5 text-xs text-slate-400">
            <p>
              <span className="text-slate-500">Filters:</span>{" "}
              {currentState.filterRules.length} active
            </p>
            <p>
              <span className="text-slate-500">Sort:</span>{" "}
              {currentState.sortField}{" "}
              {currentState.sortReverse ? "↓" : "↑"}
            </p>
          </div>

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
              disabled={!name.trim() || isSaving}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isSaving ? "Saving…" : existingName ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
