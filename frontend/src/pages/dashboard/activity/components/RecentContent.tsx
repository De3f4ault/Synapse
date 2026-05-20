/**
 * RecentContent - Recent files and notes
 * 
 * Displays:
 * - Recently accessed documents
 * - Recent notes
 * - Quick access actions
 */

import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NeumorphicCard, NeumorphicButton } from "@/components/neumorphic";
import type { DocumentResponse, NoteResponse } from "@/api/generated";
import { cn } from "@/lib/utils";

interface RecentContentProps {
    documents: DocumentResponse[];
    notes: NoteResponse[];
    className?: string;
}

export function RecentContent({ documents, notes, className }: RecentContentProps) {
    const navigate = useNavigate();

    // For now, just take the first 3 of each
    const recentDocs = documents.slice(0, 3);
    const recentNotes = notes.slice(0, 3);

    return (
        <NeumorphicCard className={cn("p-6 flex flex-col", className)}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border rounded-lg flex items-center justify-center text-info">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Recent Knowledge</h3>
                        <p className="text-xs text-muted-foreground">Recently accessed</p>
                    </div>
                </div>
                <NeumorphicButton
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate("/documents")}
                >
                    <Plus className="h-4 w-4" />
                </NeumorphicButton>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pr-2">
                {/* Documents Section */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                        Documents
                    </p>
                    {recentDocs.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic pl-1">
                            No documents yet.
                        </p>
                    ) : (
                        recentDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                                onClick={() => navigate(`/documents`)}
                            >
                                <div className="h-8 w-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center shrink-0 text-info">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">
                                        {doc.filename}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                        {doc.page_count
                                            ? `${doc.page_count} pages`
                                            : `${doc.word_count || 0} words`}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Notes Section */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                        Notes
                    </p>
                    {recentNotes.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic pl-1">No notes yet.</p>
                    ) : (
                        recentNotes.map((note) => (
                            <div
                                key={note.id}
                                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                            >
                                <div className="h-8 w-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center shrink-0 text-warning">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">
                                        {note.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">Note</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </NeumorphicCard>
    );
}
