/**
 * DocumentsHub — Main DMS hub (Paperless-ngx style)
 *
 * Replaces the old grid/list toggle with the full DMS experience:
 * - FilterEditor toolbar (correspondent, type, tags, path, text search)
 * - 3 display modes: Table, Small Cards, Large Cards
 * - Document detail panel (right side)
 * - Saved view sidebar integration
 * - Selection state + bulk actions
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PanelRightIcon, ChevronDown, FileText } from "lucide-react";
import { EmptyState } from "@/shared/ui";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import type { EnhancedDocument } from "../core/types";
import type { FolderTreeNode } from "../core/folders";
import { useThumbnails } from "../hooks/useThumbnails";


import { toast } from "sonner";

// DMS Components (Sprint 1 + 2)
import { FilterEditor } from "./dms/FilterEditor";
import { ViewModeToggle } from "./dms/ViewModeToggle";
import { DisplayFieldPicker } from "./dms/DisplayFieldPicker";
import { DocumentCardLarge } from "./dms/DocumentCardLarge";
import { DocumentCardSmall } from "./dms/DocumentCardSmall";
import { DocumentTable, type TableDocument } from "./dms/DocumentTable";
import { DocumentDetailPanel } from "./dms/DocumentDetailPanel";
import { SaveViewDialog } from "./dms/SaveViewDialog";
import { BulkEditor } from "./dms/BulkEditor";

// DMS Hooks
import { useCorrespondents, useDocumentTypes, useTags, useStoragePaths } from "../hooks/useTaxonomy";
import { useCreateSavedView } from "../hooks/useSavedViews";
import { useBulkEdit } from "@/api/hooks/useBulkEdit";

// DMS Types
import {
  DisplayMode,
  DisplayField,
  DEFAULT_DISPLAY_FIELDS,
  type FilterRule,
  type FilterRuleType,
  type Correspondent,
  type DocumentType,
  type Tag,
  type ListViewState,
} from "../core/types/dms";

// Paperless-ngx sidebar
import { DMSSidebar } from "./dms/DMSSidebar";

// ============================================================================
// Props
// ============================================================================

interface DocumentsHubProps {
  documents: EnhancedDocument[];
  folders?: FolderTreeNode[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onUpload: () => void;
  onCreateFolder?: () => void;
  onDocumentClick?: (doc: EnhancedDocument) => void;
  onFolderClick?: (folder: FolderTreeNode) => void;
  onFolderDoubleClick?: (folder: FolderTreeNode) => void;
  onContextMenu?: (doc: EnhancedDocument, event: React.MouseEvent) => void;
  onRenameFolder?: (folder: FolderTreeNode) => void;
  onDeleteFolder?: (folder: FolderTreeNode) => void;
  onRefresh?: () => void;
  onSelectAll?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/** Map EnhancedDocument → DMS card/table props */
function toTableDoc(
  doc: EnhancedDocument,
  correspondents: Correspondent[],
  docTypes: DocumentType[],
  allTags: Tag[]
): TableDocument {
  return {
    id: typeof doc.id === "string" ? parseInt(doc.id) : doc.id,
    title: doc.title || doc.filename,
    created: doc.created_at,
    added: doc.created_at,
    correspondent: doc.correspondent_id
      ? correspondents.find((c) => c.id === doc.correspondent_id) || null
      : null,
    documentType: doc.document_type_id
      ? docTypes.find((dt) => dt.id === doc.document_type_id) || null
      : null,
    tags: (doc.tag_ids || [])
      .map((tid: number) => allTags.find((t) => t.id === tid))
      .filter(Boolean) as Tag[],
    asn: doc.archive_serial_number ?? null,
    notesCount: doc.notes_count || 0,
  };
}

// ============================================================================
// Component
// ============================================================================

export const DocumentsHub = ({
  documents,
  folders: _folders = [],
  isLoading,
  searchQuery,
  onSearchChange: _onSearchChange,
  activeFilter: _activeFilter,
  onFilterChange: _onFilterChange,
  onUpload,
  onCreateFolder: _onCreateFolder,
  onDocumentClick: _onDocumentClick,
  onFolderClick: _onFolderClick,
  onFolderDoubleClick: _onFolderDoubleClick,
  onContextMenu: _onContextMenu,
  onRenameFolder: _onRenameFolder,
  onDeleteFolder: _onDeleteFolder,
  onRefresh: _onRefresh,
  onSelectAll: _onSelectAll,
  onPaste: _onPaste,
  canPaste: _canPaste = false,
}: DocumentsHubProps) => {
  // ── Sidebar state ──────────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // ── DMS state ──────────────────────────────────────────────────────────
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.LARGE_CARDS);
  const [displayFields, setDisplayFields] = useState<DisplayField[]>([...DEFAULT_DISPLAY_FIELDS]);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [sortField, setSortField] = useState("created");
  const [sortReverse, setSortReverse] = useState(true);
  const [detailDocId, setDetailDocId] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);

  // ── Selection state ────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(documents.map((d) => (typeof d.id === "string" ? parseInt(d.id) : d.id))));
  }, [documents]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Taxonomy (DMS data) ────────────────────────────────────────────────
  const { data: correspondents } = useCorrespondents();
  const { data: docTypes } = useDocumentTypes();
  const { data: tags } = useTags();
  const { data: storagePaths } = useStoragePaths();
  const createSavedView = useCreateSavedView();
  const bulkEdit = useBulkEdit();

  // ── Thumbnails ─────────────────────────────────────────────────────────
  const documentIds = documents.map((d) => d.id);
  const { data: thumbnails } = useThumbnails(documentIds);



  // ── Detail panel ───────────────────────────────────────────────────────
  const detailDoc = useMemo(() => {
    if (detailDocId === null) return null;
    return documents.find((d) => {
      const did = typeof d.id === "string" ? parseInt(d.id) : d.id;
      return did === detailDocId;
    }) || null;
  }, [detailDocId, documents]);

  const handleDocClick = useCallback(
    (doc: EnhancedDocument) => {
      const docId = typeof doc.id === "string" ? parseInt(doc.id) : doc.id;
      setDetailDocId(docId);
      setDetailPanelOpen(true);
      // Single click: open detail panel ONLY, do NOT navigate
    },
    []
  );

  // Double-click → navigate to full document viewer
  const handleDocDoubleClick = useCallback(
    (doc: EnhancedDocument) => {
      navigate(`/documents/${doc.id}`);
    },
    [navigate]
  );

  const handleDocClickById = useCallback(
    (id: number) => {
      const doc = documents.find((d) => {
        const did = typeof d.id === "string" ? parseInt(d.id) : d.id;
        return did === id;
      });
      if (doc) handleDocClick(doc);
    },
    [documents, handleDocClick]
  );

  // Navigation in detail panel
  const docIndex = useMemo(() => {
    if (detailDocId === null) return -1;
    return documents.findIndex((d) => {
      const did = typeof d.id === "string" ? parseInt(d.id) : d.id;
      return did === detailDocId;
    });
  }, [detailDocId, documents]);

  const goToPrev = useCallback(() => {
    if (docIndex > 0) {
      const prevDoc = documents[docIndex - 1];
      if (prevDoc) {
        const id = typeof prevDoc.id === "string" ? parseInt(prevDoc.id) : prevDoc.id;
        setDetailDocId(id);
      }
    }
  }, [docIndex, documents]);

  const goToNext = useCallback(() => {
    if (docIndex < documents.length - 1) {
      const nextDoc = documents[docIndex + 1];
      if (nextDoc) {
        const id = typeof nextDoc.id === "string" ? parseInt(nextDoc.id) : nextDoc.id;
        setDetailDocId(id);
      }
    }
  }, [docIndex, documents]);

  // ── Filter handlers ────────────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (rules: FilterRule[]) => {
      setFilterRules(rules);
      setSelectedIds(new Set());
    },
    []
  );

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortReverse((r) => !r);
        return prev;
      }
      setSortReverse(false);
      return field;
    });
  }, []);

  // ── Sidebar state persistence ──────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("documentsSidebarCollapsed");
    if (saved) setSidebarCollapsed(JSON.parse(saved));
    const savedMode = localStorage.getItem("dmsDisplayMode");
    if (savedMode && Object.values(DisplayMode).includes(savedMode as DisplayMode)) {
      setDisplayMode(savedMode as DisplayMode);
    }
  }, []);

  // ── Top toolbar sort handler ───────────────────────────────────────────
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    localStorage.setItem("dmsDisplayMode", mode);
  }, []);


  // ── Table data ─────────────────────────────────────────────────────────
  const tableDocuments = useMemo(
    () => documents.map((d) => toTableDoc(d, correspondents, docTypes, tags)),
    [documents, correspondents, docTypes, tags]
  );

  // ── Current view state (for save dialog) ───────────────────────────────
  const currentViewState: ListViewState = {
    currentPage: 1,
    sortField,
    sortReverse,
    filterRules,
    displayMode,
    displayFields,
  };

  // ── Filter chip click handlers ─────────────────────────────────────────
  const addCorrespondentFilter = useCallback((id: number) => {
    setFilterRules((prev) => [
      ...prev.filter((r) => r.rule_type !== (6 as FilterRuleType)),
      { rule_type: 6 as FilterRuleType, value: String(id) },
    ]);
  }, []);

  const addDocTypeFilter = useCallback((id: number) => {
    setFilterRules((prev) => [
      ...prev.filter((r) => r.rule_type !== (13 as FilterRuleType)),
      { rule_type: 13 as FilterRuleType, value: String(id) },
    ]);
  }, []);

  const addTagFilter = useCallback((id: number) => {
    setFilterRules((prev) => [
      ...prev.filter((r) => r.rule_type !== (11 as FilterRuleType)),
      { rule_type: 11 as FilterRuleType, value: String(id) },
    ]);
  }, []);

  return (
    <div className="fixed inset-0 min-h-screen flex flex-col pt-16 bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DMS Sidebar (Paperless-ngx style) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <DMSSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onUpload={onUpload}
          className="hidden lg:flex"
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* Main Content Area */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 flex flex-col overflow-hidden relative z-0"
        >

          {/* ─── DMS Filter Toolbar ─────────────────────────────────── */}
          <div className="shrink-0 px-8 pt-6 pb-2 pl-16 lg:pl-8">
            <div className="max-w-[1600px] mx-auto space-y-3">
              {/* Title row with view controls */}
                <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Documents
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {documents.length} document{documents.length !== 1 ? "s" : ""}
                    {filterRules.length > 0 && " (filtered)"}
                    {filterRules.length > 0 && (
                      <button
                        onClick={() => setFilterRules([])}
                        className="ml-2 text-accent-olive hover:text-accent-olive/80 transition-colors"
                      >
                        ×Reset filters
                      </button>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Select buttons */}
                  <span className="text-xs text-muted-foreground mr-1">Select:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="text-xs h-7 px-2 border-accent-olive/30 text-foreground/80 hover:bg-accent-olive/10"
                  >
                    Page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="text-xs h-7 px-2 border-accent-olive/30 text-foreground/80 hover:bg-accent-olive/10"
                  >
                    All
                  </Button>

                  <div className="w-px h-5 bg-foreground/10 mx-1" />

                  {/* Show dropdown */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2 border-accent-olive/30 text-foreground/80 hover:bg-accent-olive/10 gap-1"
                  >
                    Show <ChevronDown size={12} />
                  </Button>

                  {/* Display mode toggle */}
                  <ViewModeToggle
                    mode={displayMode}
                    onChange={handleDisplayModeChange}
                  />

                  {/* Sort dropdown */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort(sortField)}
                    className="text-xs h-7 px-2 border-accent-olive/30 text-foreground/80 hover:bg-accent-olive/10 gap-1"
                  >
                    Sort <ChevronDown size={12} />
                  </Button>

                  {/* Views dropdown */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveViewOpen(true)}
                    className="text-xs h-7 px-2 border-accent-olive/30 text-foreground/80 hover:bg-accent-olive/10 gap-1"
                  >
                    Views <ChevronDown size={12} />
                  </Button>

                  {/* Column picker (table mode only) */}
                  {displayMode === DisplayMode.TABLE && (
                    <DisplayFieldPicker
                      activeFields={displayFields}
                      onChange={setDisplayFields}
                    />
                  )}

                  {/* Detail panel toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailPanelOpen(!detailPanelOpen)}
                    className={cn(
                      "h-7 w-7 p-0",
                      detailPanelOpen && "bg-accent-olive/10 text-accent-olive"
                    )}
                    title="Toggle detail panel"
                  >
                    <PanelRightIcon size={14} />
                  </Button>
                </div>
              </div>

              {/* Filter toolbar OR Bulk editor */}
              {selectedIds.size > 0 ? (
                <BulkEditor
                  selectionCount={selectedIds.size}
                  onDeselectAll={selectNone}
                  correspondents={correspondents}
                  documentTypes={docTypes}
                  tags={tags}
                  storagePaths={storagePaths}
                  onSetCorrespondent={(id) => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "set_correspondent", parameters: { correspondent: id } },
                      { onSuccess: () => toast.success(id ? "Correspondent set" : "Correspondent removed"), onError: (e: Error) => toast.error(e.message) }
                    );
                  }}
                  onSetDocumentType={(id) => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "set_document_type", parameters: { document_type: id } },
                      { onSuccess: () => toast.success(id ? "Type set" : "Type removed"), onError: (e: Error) => toast.error(e.message) }
                    );
                  }}
                  onAddTags={(ids) => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "add_tag", parameters: { tag: ids[0] } },
                      { onSuccess: () => toast.success(`${ids.length} tag(s) added`), onError: (e: Error) => toast.error(e.message) }
                    );
                  }}
                  onRemoveTags={(ids) => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "remove_tag", parameters: { tag: ids[0] } },
                      { onSuccess: () => toast.success(`${ids.length} tag(s) removed`), onError: (e: Error) => toast.error(e.message) }
                    );
                  }}
                  onSetStoragePath={(id) => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "set_storage_path", parameters: { storage_path: id } },
                      { onSuccess: () => toast.success(id ? "Path set" : "Path removed"), onError: (e: Error) => toast.error(e.message) }
                    );
                  }}
                  onDelete={() => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "delete", parameters: {} },
                      { onSuccess: () => { toast.success(`${selectedIds.size} document(s) deleted`); selectNone(); }, onError: (e: Error) => toast.error(e.message) }
                    );
                  }}
                  onDownload={() => toast.info("Bulk download — TODO")}
                  onMerge={selectedIds.size > 1 ? () => {
                    bulkEdit.mutate(
                      { documents: [...selectedIds], method: "merge", parameters: {} },
                      { onSuccess: () => { toast.success("Documents merged"); selectNone(); }, onError: (e: Error) => toast.error(e.message) }
                    );
                  } : undefined}
                />
              ) : (
                <FilterEditor
                  filterRules={filterRules}
                  onFilterRulesChange={handleFilterChange}
                  correspondents={correspondents}
                  documentTypes={docTypes}
                  tags={tags}
                  storagePaths={storagePaths}
                />
              )}
            </div>
          </div>

          {/* ─── Content Area ─────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {/* Document list/grid/table */}
            <div className="flex-1 overflow-y-auto p-8 pt-2 pb-32">
              <div className="max-w-[1600px] mx-auto">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        displayMode === DisplayMode.TABLE
                          ? "space-y-2"
                          : "grid gap-4",
                        displayMode === DisplayMode.LARGE_CARDS &&
                          "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
                        displayMode === DisplayMode.SMALL_CARDS &&
                          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      )}
                    >
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-xl bg-foreground/5 animate-pulse",
                            displayMode === DisplayMode.LARGE_CARDS && "h-[250px]",
                            displayMode === DisplayMode.SMALL_CARDS && "h-16",
                            displayMode === DisplayMode.TABLE && "h-12"
                          )}
                        />
                      ))}
                    </motion.div>
                  ) : documents.length > 0 ? (
                    <motion.div
                      key={displayMode}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* ── Table Mode ────────────────────────────── */}
                      {displayMode === DisplayMode.TABLE && (
                        <DocumentTable
                          documents={tableDocuments}
                          displayFields={displayFields}
                          sortField={sortField}
                          sortReverse={sortReverse}
                          onSort={handleSort}
                          selectedIds={selectedIds}
                          onToggleSelect={toggleSelect}
                          onSelectAll={selectAll}
                          onSelectNone={selectNone}
                          isAllSelected={
                            selectedIds.size > 0 &&
                            selectedIds.size === documents.length
                          }
                          onDocumentClick={handleDocClickById}
                          onCorrespondentClick={addCorrespondentFilter}
                          onDocumentTypeClick={addDocTypeFilter}
                          onTagClick={addTagFilter}
                        />
                      )}

                      {/* ── Large Cards Mode ──────────────────────── */}
                      {displayMode === DisplayMode.LARGE_CARDS && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                          {documents.map((doc) => {
                            const docId = typeof doc.id === "string" ? parseInt(doc.id) : doc.id;
                            const tDoc = toTableDoc(doc, correspondents, docTypes, tags);
                            const thumbUrl = thumbnails?.[doc.id] || doc.thumbnail_url;
                            return (
                              <DocumentCardLarge
                                key={docId}
                                id={docId}
                                title={tDoc.title}
                                thumbnailUrl={thumbUrl}
                                created={tDoc.created}
                                correspondent={tDoc.correspondent}
                                documentType={tDoc.documentType}
                                tags={tDoc.tags}
                                asn={tDoc.asn}
                                notesCount={tDoc.notesCount}
                                selected={selectedIds.has(docId)}
                                onSelect={toggleSelect}
                                onClick={() => handleDocClick(doc)}
                                onDoubleClick={() => handleDocDoubleClick(doc)}
                                onCorrespondentClick={addCorrespondentFilter}
                                onDocumentTypeClick={addDocTypeFilter}
                                onTagClick={addTagFilter}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* ── Small Cards Mode ──────────────────────── */}
                      {displayMode === DisplayMode.SMALL_CARDS && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {documents.map((doc) => {
                            const docId = typeof doc.id === "string" ? parseInt(doc.id) : doc.id;
                            const tDoc = toTableDoc(doc, correspondents, docTypes, tags);
                            const thumbUrl = thumbnails?.[doc.id] || doc.thumbnail_url;
                            return (
                              <DocumentCardSmall
                                key={docId}
                                id={docId}
                                title={tDoc.title}
                                thumbnailUrl={thumbUrl}
                                created={tDoc.created}
                                correspondent={tDoc.correspondent}
                                documentType={tDoc.documentType}
                                tags={tDoc.tags}
                                asn={tDoc.asn}
                                notesCount={tDoc.notesCount}
                                selected={selectedIds.has(docId)}
                                onSelect={toggleSelect}
                                onClick={() => handleDocClick(doc)}
                                onDoubleClick={() => handleDocDoubleClick(doc)}
                                onCorrespondentClick={addCorrespondentFilter}
                                onDocumentTypeClick={addDocTypeFilter}
                                onTagClick={addTagFilter}
                              />
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-20"
                    >
                      <EmptyState
                        icon={FileText}
                        title="No documents found"
                        description={
                          filterRules.length > 0
                            ? "Try removing some filters"
                            : searchQuery
                              ? "Try adjusting your search terms"
                              : "Upload your first document to get started"
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ─── Detail Panel (right) ────────────────────────────── */}
            <AnimatePresence>
              {detailPanelOpen && detailDoc && (
                <motion.div
                  key="detail"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                  className="overflow-hidden shrink-0 border-l border-border"
                >
                  <DocumentDetailPanel
                    document={{
                      id: typeof detailDoc.id === "string" ? parseInt(detailDoc.id) : detailDoc.id,
                      title: detailDoc.title || detailDoc.filename,
                      created: detailDoc.created_at,
                      added: detailDoc.created_at,
                      correspondentId: detailDoc.correspondent_id || null,
                      documentTypeId: detailDoc.document_type_id || null,
                      tagIds: detailDoc.tag_ids || [],
                      storagePathId: detailDoc.storage_path_id || null,
                      asn: detailDoc.archive_serial_number ?? null,
                      originalFilename: detailDoc.filename,
                      mimeType: detailDoc.mime_type || detailDoc.file_type,
                      fileSize: detailDoc.size,
                      notes: [],
                    }}
                    correspondents={correspondents}
                    documentTypes={docTypes}
                    tags={tags}
                    storagePaths={storagePaths}
                    onSave={(_changes) => {
                      toast.success("Document updated");
                      // TODO: wire to mutation
                    }}
                    onAddNote={(_text) => toast.info("Note added")}
                    onDeleteNote={(_id) => toast.info("Note deleted")}
                    onClose={() => {
                      setDetailPanelOpen(false);
                      setDetailDocId(null);
                    }}
                    onPrevious={goToPrev}
                    onNext={goToNext}
                    hasPrevious={docIndex > 0}
                    hasNext={docIndex < documents.length - 1}
                    onDownload={() => toast.info("Download started")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>


      {/* Save View Dialog */}
      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        currentState={currentViewState}
        onSave={(view) => {
          createSavedView.mutateAsync(view).then(() => {
            toast.success(`View "${view.name}" saved`);
            setSaveViewOpen(false);
          });
        }}
        isSaving={createSavedView.isPending}
      />
    </div>
  );
};
