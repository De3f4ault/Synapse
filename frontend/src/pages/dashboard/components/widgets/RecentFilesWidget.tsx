import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';
import type { DocumentResponse, NoteResponse } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RecentFilesWidgetProps {
    documents: DocumentResponse[];
    notes: NoteResponse[];
}

export const RecentFilesWidget: React.FC<RecentFilesWidgetProps> = ({ documents, notes }) => {
    const navigate = useNavigate();

    // Combine and sort by date (mocking date as it might not be in the list response)
    // For now, just take the first 5 of each
    const recentDocs = documents.slice(0, 3);
    const recentNotes = notes.slice(0, 3);

    return (
        <Card className="col-span-2 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Recent Knowledge
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate('/documents')}>
                    <Plus className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
                    {recentDocs.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No documents yet.</p>
                    ) : (
                        recentDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/documents`)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {doc.filename}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.page_count ? `${doc.page_count} pages` : `${doc.word_count || 0} words`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
                    {recentNotes.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No notes yet.</p>
                    ) : (
                        recentNotes.map((note) => (
                            <div
                                key={note.id}
                                className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-8 w-8 rounded bg-yellow-500/10 flex items-center justify-center shrink-0">
                                        <FileText className="h-4 w-4 text-yellow-500" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {note.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Note
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
