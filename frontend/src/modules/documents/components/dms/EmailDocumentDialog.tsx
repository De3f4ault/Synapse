/**
 * EmailDocumentDialog — Email one or more documents as attachments
 *
 * Ported from Paperless-ngx email-document-dialog.component.ts (80 lines):
 *   - Email address, subject, body fields
 *   - File version: archive or original
 *   - Supports single or multiple documents
 *   - Success toast on completion
 *
 * API contract:
 *   POST /api/documents/email/ → { document_ids, to, subject, body, file_version }
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Mail,
  X,
  Send,
  Loader2,
  Paperclip,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

interface EmailPayload {
  document_ids: number[];
  to: string;
  subject: string;
  body: string;
  file_version: "archive" | "original";
}

// ============================================================================
// Hook
// ============================================================================

function useEmailDocuments() {
  return useMutation<void, Error, EmailPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/documents/email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to send email (${res.status})`);
      }
    },
  });
}

// ============================================================================
// Props
// ============================================================================

interface EmailDocumentDialogProps {
  documentIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function EmailDocumentDialog({
  documentIds,
  isOpen,
  onClose,
  onSuccess,
}: EmailDocumentDialogProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fileVersion, setFileVersion] = useState<"archive" | "original">("archive");

  const emailMutation = useEmailDocuments();

  const handleSend = async () => {
    if (!to.trim()) return;
    await emailMutation.mutateAsync({
      document_ids: documentIds,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      file_version: fileVersion,
    });
    onSuccess?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "relative z-10 w-full max-w-lg mx-4",
          "bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl",
          "shadow-2xl shadow-black/40"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <Mail size={18} className="text-cyan-400" />
            <h2 className="text-base font-semibold text-white">
              Email document{documentIds.length > 1 ? "s" : ""}
            </h2>
            <span className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
              <Paperclip size={9} className="inline mr-1" />
              {documentIds.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* To */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
              To
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03]",
                "border border-white/10 text-slate-200 placeholder-slate-500",
                "focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              )}
              autoFocus
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Document(s) attached"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03]",
                "border border-white/10 text-slate-200 placeholder-slate-500",
                "focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              )}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional message..."
              rows={3}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03]",
                "border border-white/10 text-slate-200 placeholder-slate-500 resize-none",
                "focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              )}
            />
          </div>

          {/* File version */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
              Attachment version
            </label>
            <select
              value={fileVersion}
              onChange={(e) => setFileVersion(e.target.value as "archive" | "original")}
              className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/10 text-slate-200"
            >
              <option value="archive" className="bg-slate-800">Archive</option>
              <option value="original" className="bg-slate-800">Original</option>
            </select>
          </div>

          {/* Error */}
          {emailMutation.isError && (
            <p className="text-xs text-red-400">
              {emailMutation.error.message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.05]">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={emailMutation.isPending || !to.trim()}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {emailMutation.isPending ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <Send size={13} className="mr-1.5" />
            )}
            Send
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
