import React from 'react';
import { NeumorphicCard, NeumorphicButton } from '@/components/neumorphic';
import { FileText, Plus } from 'lucide-react';
import type { DocumentResponse, NoteResponse } from '@/api/generated';
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
        <NeumorphicCard className="col-span-2 lg:col-span-2 p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-blue-400">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Recent Knowledge</h3>
                        <p className="text-xs text-slate-500">Recently accessed</p>
                    </div>
                </div>
                <NeumorphicButton
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate('/documents')}
                >
                    <Plus className="h-4 w-4" />
                </NeumorphicButton>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pr-2">
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Documents</p>
                    {recentDocs.length === 0 ? (
                        <p className="text-sm text-slate-500 italic pl-1">No documents yet.</p>
                    ) : (
                        recentDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                                onClick={() => navigate(`/documents`)}
                            >
                                <div className="h-8 w-8 rounded-lg nm-inset flex items-center justify-center shrink-0 text-blue-400">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300 truncate group-hover:text-white transition-colors">
                                        {doc.filename}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        {doc.page_count ? `${doc.page_count} pages` : `${doc.word_count || 0} words`}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Notes</p>
                    {recentNotes.length === 0 ? (
                        <p className="text-sm text-slate-500 italic pl-1">No notes yet.</p>
                    ) : (
                        recentNotes.map((note) => (
                            <div
                                key={note.id}
                                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                            >
                                <div className="h-8 w-8 rounded-lg nm-inset flex items-center justify-center shrink-0 text-amber-400">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300 truncate group-hover:text-white transition-colors">
                                        {note.title}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        Note
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </NeumorphicCard>
    );
};
