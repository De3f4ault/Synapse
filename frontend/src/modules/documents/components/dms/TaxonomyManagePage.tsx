/**
 * TaxonomyManagePage — Generic page component for taxonomy CRUD
 *
 * Composes TaxonomyTable + TaxonomyEditDialog for a specific taxonomy kind.
 * Used by the 4 manage routes (correspondents, document_types, tags, storage_paths).
 */

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { TaxonomyTable, type TaxonomyItem } from "./TaxonomyTable";
import {
  TaxonomyEditDialog,
  type TaxonomyKind,
  type TaxonomyFormData,
} from "./TaxonomyEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================================================
// Types
// ============================================================================

interface TaxonomyManagePageProps<T extends TaxonomyItem> {
  kind: TaxonomyKind;
  title: string;
  items: T[];
  isLoading?: boolean;
  /** Extra column for the table */
  extraColumn?: { label: string; render: (item: T) => React.ReactNode };
  /** CRUD operations */
  onCreate: (data: TaxonomyFormData) => Promise<void>;
  onUpdate: (id: number, data: TaxonomyFormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isCreating?: boolean;
  isUpdating?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function TaxonomyManagePage<T extends TaxonomyItem>({
  kind,
  title,
  items,
  isLoading = false,
  extraColumn,
  onCreate,
  onUpdate,
  onDelete,
  isCreating = false,
  isUpdating = false,
}: TaxonomyManagePageProps<T>) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);

  // Create new
  const handleCreate = useCallback(() => {
    setEditingItem(null);
    setEditDialogOpen(true);
  }, []);

  // Edit
  const handleEdit = useCallback((item: T) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(
    async (data: TaxonomyFormData) => {
      try {
        if (editingItem) {
          await onUpdate(editingItem.id, data);
          toast.success(`${title.slice(0, -1)} updated`);
        } else {
          await onCreate(data);
          toast.success(`${title.slice(0, -1)} created`);
        }
        setEditDialogOpen(false);
        setEditingItem(null);
      } catch {
        toast.error("Operation failed");
      }
    },
    [editingItem, onCreate, onUpdate, title]
  );

  // Delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteItem) return;
    try {
      await onDelete(deleteItem.id);
      toast.success(`${deleteItem.name} deleted`);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteItem(null);
    }
  }, [deleteItem, onDelete]);

  // Bulk delete
  const handleBulkDelete = useCallback(
    async (items: T[]) => {
      const confirmed = confirm(
        `Delete ${items.length} items? Documents will have their assignments removed.`
      );
      if (!confirmed) return;

      try {
        await Promise.all(items.map((i) => onDelete(i.id)));
        toast.success(`${items.length} items deleted`);
      } catch {
        toast.error("Some deletions failed");
      }
    },
    [onDelete]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-[1200px] mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {items.length} item{items.length !== 1 ? "s" : ""} configured
        </p>
      </div>

      <TaxonomyTable
        items={items}
        title={title}
        isLoading={isLoading}
        extraColumn={extraColumn}
        onEdit={handleEdit}
        onDelete={(item) => setDeleteItem(item)}
        onBulkDelete={handleBulkDelete}
        onCreate={handleCreate}
      />

      {/* Edit/Create dialog */}
      <TaxonomyEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        kind={kind}
        initial={editingItem ? {
          name: editingItem.name,
          match: editingItem.match,
          matching_algorithm: editingItem.matching_algorithm,
          is_insensitive: editingItem.is_insensitive,
          color: editingItem.color,
          is_inbox_tag: editingItem.is_inbox_tag,
          path: editingItem.path,
        } : null}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground/70">
              Delete "{deleteItem?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem?.document_count ? (
                <>
                  This item is assigned to{" "}
                  <strong>{deleteItem.document_count}</strong> document
                  {deleteItem.document_count !== 1 ? "s" : ""}. They will have
                  this assignment removed.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
