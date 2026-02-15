/**
 * DocumentViewerPage — Routed page for /documents/:documentId.
 *
 * Fetches the document by ID and renders the immersive DocumentViewer.
 * Simple wrapper — all viewer logic lives in DocumentViewer.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { DocumentViewer } from "./viewer/components/DocumentViewer";
import type { EnhancedDocument } from "./core/engine/types";

export function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [doc, setDoc] = useState<EnhancedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [documentId, token]);

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

  return (
    <DocumentViewer doc={doc} onClose={() => navigate("/documents")} />
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
