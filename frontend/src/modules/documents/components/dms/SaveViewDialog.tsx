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
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground/70">
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
              className="bg-foreground/5 border-border"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground/80">
                Show on dashboard
              </Label>
              <Switch
                checked={showOnDashboard}
                onCheckedChange={setShowOnDashboard}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground/80">
                Show in sidebar
              </Label>
              <Switch
                checked={showInSidebar}
                onCheckedChange={setShowInSidebar}
              />
            </div>
          </div>

          {/* Preview info */}
          <div className="rounded-md bg-muted/30 border border-border p-2.5 text-xs text-muted-foreground">
            <p>
              <span className="text-muted-foreground">Filters:</span>{" "}
              {currentState.filterRules.length} active
            </p>
            <p>
              <span className="text-muted-foreground">Sort:</span>{" "}
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
              className="bg-primary hover:bg-primary/80"
            >
              {isSaving ? "Saving…" : existingName ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
