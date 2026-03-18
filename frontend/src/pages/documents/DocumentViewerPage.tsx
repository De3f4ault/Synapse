/**
 * DocumentViewerPage — Routed page for /documents/:documentId.
 *
 * Enhanced with Sprint 5-7 components:
 *   - DocumentNavigation (prev/next)
 *   - DocumentNotes (sidebar tab)
 *   - DocumentHistory (sidebar tab)
 *   - CustomFieldDisplay (sidebar section)
 *   - ShareLinksDialog (toolbar action → modal)
 *   - PermissionsDialog (toolbar action → modal)
 *   - PDFEditor (toolbar action → modal)
 *   - EmailDocumentDialog (toolbar action → modal)
 *   - useOpenDocuments (track as open doc)
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Share2, Shield, FileEdit, Mail, StickyNote, Clock, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { DocumentViewer } from "./viewer/components/DocumentViewer";
import type { EnhancedDocument } from "./core/engine/types";

// Sprint 5-7 components
import { DocumentNavigation } from "@/modules/documents/components/dms/DocumentNavigation";
import { DocumentNotes } from "@/modules/documents/components/dms/DocumentNotes";
import { DocumentHistory } from "@/modules/documents/components/dms/DocumentHistory";
import { ShareLinksDialog } from "@/modules/documents/components/dms/ShareLinksDialog";
import { PermissionsDialog } from "@/modules/documents/components/dms/PermissionsDialog";
import { PDFEditor } from "@/modules/documents/components/dms/PDFEditor";
import { EmailDocumentDialog } from "@/modules/documents/components/dms/EmailDocumentDialog";
import { useOpenDocuments } from "@/modules/documents/hooks/useOpenDocuments";

// ============================================================================
// Sidebar tab type
// ============================================================================

type SidebarTab = "notes" | "history";

// ============================================================================
// Component
// ============================================================================

export function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [doc, setDoc] = useState<EnhancedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sidebar
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("notes");
  const [showSidebar, setShowSidebar] = useState(true);

  // Modals
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showPDFEditor, setShowPDFEditor] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // Open documents tracking
  const { openDocument } = useOpenDocuments();

  const docIdNum = documentId ? Number(documentId) : 0;

  // Fetch document
  useEffect(() => {
    if (!documentId || !token) return;

    setLoading(true);
    setError(null);

    fetch(`/api/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const enhanced: EnhancedDocument = {
          ...data,
          type: data.file_type || data.type || data.filename?.split(".").pop() || "unknown",
          size: formatSize(data.file_size || 0),
          sector: data.sector || "Uncategorized",
          reading_progress: data.reading_progress || 0,
          processing_status: data.processing_status || data.status || "pending",
          content_text: data.content_text || "",
        };
        setDoc(enhanced);

        // Track in open documents
        openDocument({
          id: enhanced.id,
          title: enhanced.filename || `Document ${enhanced.id}`,
          filename: enhanced.filename || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [documentId, token]);

  // Stub document IDs list for prev/next nav (would come from list context)
  const documentIds = useMemo(() => [docIdNum], [docIdNum]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm mb-4">{error || "Document not found"}</p>
          <button
            onClick={() => navigate("/documents")}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const isPDF = doc.type?.toLowerCase() === "pdf";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] bg-black/30 shrink-0">
        <button
          onClick={() => navigate("/documents")}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Back to documents"
        >
          <ArrowLeft size={16} />
        </button>

        <span className="text-sm text-white font-medium truncate flex-1 mx-2">
          {doc.filename}
        </span>

        {/* Prev/Next navigation */}
        <DocumentNavigation
          currentDocId={docIdNum}
          documentIds={documentIds}
          onNavigate={(id) => navigate(`/documents/${id}`)}
        />

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Action buttons */}
        <ToolbarButton icon={Share2} label="Share" onClick={() => setShowShareLinks(true)} />
        <ToolbarButton icon={Shield} label="Permissions" onClick={() => setShowPermissions(true)} />
        {isPDF && (
          <ToolbarButton icon={FileEdit} label="Edit PDF" onClick={() => setShowPDFEditor(true)} />
        )}
        <ToolbarButton icon={Mail} label="Email" onClick={() => setShowEmail(true)} />

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Sidebar toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={`p-1.5 rounded-lg transition-colors ${
            showSidebar ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Toggle sidebar"
        >
          <StickyNote size={16} />
        </button>
      </div>

      {/* ── Content + Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document viewer */}
        <div className="flex-1 overflow-hidden">
          <DocumentViewer doc={doc} onClose={() => navigate("/documents")} />
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 shrink-0 border-l border-white/[0.05] bg-black/20 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-white/[0.04]">
              <SidebarTabButton
                active={sidebarTab === "notes"}
                icon={StickyNote}
                label="Notes"
                onClick={() => setSidebarTab("notes")}
              />
              <SidebarTabButton
                active={sidebarTab === "history"}
                icon={Clock}
                label="History"
                onClick={() => setSidebarTab("history")}
              />
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarTab === "notes" && (
                <DocumentNotes documentId={docIdNum} />
              )}
              {sidebarTab === "history" && (
                <DocumentHistory documentId={docIdNum} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <ShareLinksDialog
        documentId={docIdNum}
        isOpen={showShareLinks}
        onClose={() => setShowShareLinks(false)}
      />
      <PermissionsDialog
        documentId={docIdNum}
        documentName={doc.filename}
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
      {isPDF && (
        <PDFEditor
          documentId={docIdNum}
          totalPages={1}
          isOpen={showPDFEditor}
          onClose={() => setShowPDFEditor(false)}
          onSave={() => setShowPDFEditor(false)}
        />
      )}
      <EmailDocumentDialog
        documentIds={[docIdNum]}
        isOpen={showEmail}
        onClose={() => setShowEmail(false)}
      />
    </div>
  );
}

// ============================================================================
// Helper components
// ============================================================================

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      title={label}
    >
      <Icon size={15} />
    </button>
  );
}

function SidebarTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof StickyNote;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
        active
          ? "text-cyan-400 border-b-2 border-cyan-400"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
