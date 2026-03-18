/**
 * ShareLinksDialog — Modal for managing document share links
 *
 * Exact port of Paperless-ngx share-links-dialog.component.ts (168 lines):
 *   - Expiration dropdown: 1/7/30/Never (L24-29)
 *   - Archive vs Original version toggle (L44-54)
 *   - Link list with: copy, native share, days remaining, delete
 *   - Auto-copy on create (L152-154)
 *
 * Backend API (shares.py):
 *   GET    /api/documents/{docId}/share-links
 *   POST   /api/share-links
 *   DELETE /api/share-links/{slug}
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Share2,
  ExternalLink,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import {
  useDocumentShareLinks,
  useCreateShareLink,
  useRevokeShareLink,
  getShareUrl,
  getDaysRemaining,
  EXPIRATION_OPTIONS,
} from "../../hooks/useShareLinks";
import type { ShareLink } from "../../hooks/useShareLinks";

// ============================================================================
// Props
// ============================================================================

interface ShareLinksDialogProps {
  documentId: number;
  hasArchiveVersion?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ShareLinksDialog({
  documentId,
  hasArchiveVersion = true,
  isOpen,
  onClose,
}: ShareLinksDialogProps) {
  const [expirationDays, setExpirationDays] = useState<number | null>(7);
  const [useArchiveVersion, setUseArchiveVersion] = useState(hasArchiveVersion);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: links = [], isLoading } = useDocumentShareLinks(
    isOpen ? documentId : null
  );
  const createMutation = useCreateShareLink();
  const revokeMutation = useRevokeShareLink();

  // Matching Paperless copy() L105-113
  const copyLink = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(link.slug));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement("input");
      input.value = getShareUrl(link.slug);
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  // Matching Paperless canShare() + share() L115-123
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const nativeShare = (link: ShareLink) => {
    navigator.share({ url: getShareUrl(link.slug) });
  };

  // Matching Paperless createLink() L136-162 — auto-copy on success
  const handleCreate = async () => {
    const result = await createMutation.mutateAsync({
      document_id: documentId,
      file_version: useArchiveVersion ? "archive" : "original",
      expires_in_days: expirationDays,
    });
    // Auto-copy (matching Paperless L152-154)
    setTimeout(() => copyLink(result), 100);
  };

  const handleDelete = async (link: ShareLink) => {
    await revokeMutation.mutateAsync({
      slug: link.slug,
      documentId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={cn(
          "relative z-10 w-full max-w-lg mx-4",
          "bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl",
          "shadow-2xl shadow-black/40"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <Link2 size={18} className="text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Share Links</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Create section */}
        <div className="px-5 py-4 border-b border-white/[0.05] space-y-3">
          <div className="flex items-center gap-3">
            {/* Expiration dropdown — matching Paperless L24-29 */}
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
                Expires in
              </label>
              <select
                value={expirationDays ?? "never"}
                onChange={(e) =>
                  setExpirationDays(
                    e.target.value === "never" ? null : Number(e.target.value)
                  )
                }
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04]",
                  "border border-white/10 text-slate-200",
                  "focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                )}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option
                    key={opt.label}
                    value={opt.value ?? "never"}
                    className="bg-slate-800"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Archive/Original toggle — matching Paperless L44-54 */}
            {hasArchiveVersion && (
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
                  Version
                </label>
                <select
                  value={useArchiveVersion ? "archive" : "original"}
                  onChange={(e) =>
                    setUseArchiveVersion(e.target.value === "archive")
                  }
                  className={cn(
                    "w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04]",
                    "border border-white/10 text-slate-200",
                    "focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  )}
                >
                  <option value="archive" className="bg-slate-800">Archive</option>
                  <option value="original" className="bg-slate-800">Original</option>
                </select>
              </div>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            size="sm"
          >
            {createMutation.isPending ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Link2 size={14} className="mr-1.5" />
            )}
            Create link
          </Button>
        </div>

        {/* Links list */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Loading...
            </div>
          ) : links.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No share links yet
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {links.map((link: ShareLink) => {
                const daysLeft = getDaysRemaining(link.expiration);
                const isCopied = copiedId === link.id;

                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-2.5 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <ExternalLink size={14} className="text-slate-500 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 font-mono truncate">
                        /share/{link.slug}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">
                          {link.file_version}
                        </span>
                        {daysLeft && (
                          <>
                            <span className="text-[10px] text-slate-600">·</span>
                            <span className={cn(
                              "text-[10px] flex items-center gap-0.5",
                              daysLeft === "Expired" ? "text-red-400" : "text-slate-500"
                            )}>
                              <Clock size={9} />
                              {daysLeft}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyLink(link)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Copy link"
                      >
                        {isCopied ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>

                      {canNativeShare && (
                        <button
                          onClick={() => nativeShare(link)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Share"
                        >
                          <Share2 size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(link)}
                        disabled={revokeMutation.isPending}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Revoke link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.05]">
          <p className="text-[10px] text-slate-600">
            Anyone with the link can view this document without signing in.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
