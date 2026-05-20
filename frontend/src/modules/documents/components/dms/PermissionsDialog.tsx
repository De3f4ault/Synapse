/**
 * PermissionsDialog — Set document owner and view/change permissions
 *
 * Exact port of Paperless-ngx permissions-dialog.component.ts (102 lines):
 *   - Owner select dropdown (L69)
 *   - View permissions: multi-user select (L70-76)
 *   - Change permissions: multi-user select (L77-80)
 *   - Merge toggle: merge vs replace (L63, L86-88)
 *   - Hint text changes based on merge mode (L84-88)
 *
 * Backend API (shares.py):
 *   GET   /api/documents/{id}/permissions  → current ACL
 *   PUT   /api/documents/{id}/permissions  → replace ACL
 *   PATCH /api/documents/{id}/permissions  → merge ACL
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Shield,
  X,
  Users,
  User as UserIcon,
  Loader2,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types (matching backend schemas/permission.py)
// ============================================================================

interface PermissionEntry {
  users: number[];
}

interface PermissionsSet {
  view: PermissionEntry;
  change: PermissionEntry;
}

interface DocumentPermissionResponse {
  document_id: number;
  owner_id: number | null;
  permissions: PermissionsSet;
}

interface SimpleUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

// ============================================================================
// Props
// ============================================================================

interface PermissionsDialogProps {
  documentId: number;
  documentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

function useDocumentPermissions(documentId: number, enabled: boolean) {
  return useQuery<DocumentPermissionResponse>({
    queryKey: ["documentPermissions", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`);
      return res.json();
    },
    enabled,
  });
}

function useSetPermissions(documentId: number) {
  const qc = useQueryClient();
  return useMutation<DocumentPermissionResponse, Error, { permissions: PermissionsSet; merge: boolean }>({
    mutationFn: async ({ permissions, merge }) => {
      const method = merge ? "PATCH" : "PUT";
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(permissions),
      });
      if (!res.ok) throw new Error(`Failed to set permissions (${res.status})`);
      return res.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(["documentPermissions", documentId], data);
    },
  });
}

// ============================================================================
// Component
// ============================================================================

export function PermissionsDialog({
  documentId,
  documentName,
  isOpen,
  onClose,
}: PermissionsDialogProps) {
  const [viewUsers, setViewUsers] = useState<string>("");
  const [changeUsers, setChangeUsers] = useState<string>("");
  const [merge, setMerge] = useState(true);

  const { data: perms, isLoading } = useDocumentPermissions(documentId, isOpen);
  const setPermsMutation = useSetPermissions(documentId);

  // Populate form from current permissions
  useEffect(() => {
    if (perms) {
      setViewUsers(perms.permissions.view.users.join(", "));
      setChangeUsers(perms.permissions.change.users.join(", "));
    }
  }, [perms]);

  const parseUserIds = (str: string): number[] =>
    str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n));

  // Paperless confirm (L95-99)
  const handleSave = async () => {
    await setPermsMutation.mutateAsync({
      permissions: {
        view: { users: parseUserIds(viewUsers) },
        change: { users: parseUserIds(changeUsers) },
      },
      merge,
    });
    onClose();
  };

  // Paperless hint (L84-88)
  const hint = merge
    ? "Existing permissions will be merged with these settings."
    : "All existing permissions will be replaced.";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "relative z-10 w-full max-w-md mx-4",
          "bg-card/95 backdrop-blur-xl border border-border rounded-2xl",
          "shadow-2xl shadow-black/40"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-foreground">
              {documentName
                ? `Permissions — ${documentName}`
                : "Set permissions"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading permissions...
            </div>
          ) : (
            <>
              {/* Owner display */}
              {perms?.owner_id && (
                <div className="flex items-center gap-2">
                  <UserIcon size={13} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Owner:</span>
                  <span className="text-xs text-foreground/70">
                    User #{perms.owner_id}
                  </span>
                </div>
              )}

              {/* View permissions */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                  <Users size={11} />
                  View permissions (user IDs)
                </label>
                <input
                  type="text"
                  value={viewUsers}
                  onChange={(e) => setViewUsers(e.target.value)}
                  placeholder="e.g. 1, 2, 3"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm bg-muted/30",
                    "border border-border text-foreground/70 placeholder-muted-foreground",
                    "focus:outline-none focus:ring-1 focus:ring-primary/50"
                  )}
                />
              </div>

              {/* Change permissions */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                  <Shield size={11} />
                  Edit permissions (user IDs)
                </label>
                <input
                  type="text"
                  value={changeUsers}
                  onChange={(e) => setChangeUsers(e.target.value)}
                  placeholder="e.g. 1, 2"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm bg-muted/30",
                    "border border-border text-foreground/70 placeholder-muted-foreground",
                    "focus:outline-none focus:ring-1 focus:ring-primary/50"
                  )}
                />
              </div>

              {/* Merge toggle — matching Paperless L63 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={() => setMerge(!merge)}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors",
                    merge ? "bg-primary" : "bg-foreground/10"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                      merge ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
                <span className="text-xs text-foreground/80">
                  Merge with existing
                </span>
              </label>

              {/* Hint — matching Paperless L84-88 */}
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/[0.05] border border-blue-500/10">
                <Info size={12} className="text-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">{hint}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={setPermsMutation.isPending || isLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {setPermsMutation.isPending ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <Shield size={13} className="mr-1.5" />
            )}
            Save permissions
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
