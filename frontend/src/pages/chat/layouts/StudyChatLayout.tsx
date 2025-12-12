import { forwardRef, useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu, MoreVertical, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChatInterface, ChatInterfaceHandle } from '@/modules/chat/components/ChatInterface';
import { SourcesPanel, Source } from '../components/panels/SourcesPanel';
import { StudioPanel } from '../components/panels/StudioPanel';
import { WelcomeScreen } from '../components/main-area/WelcomeScreen';
import { AddSourceModal } from '../components/modals/AddSourceModal';
import { DocumentsService } from '@/api/generated';
import type { DocumentResponse } from '@/api/generated';
import { useFileUpload } from '../hooks/useFileUpload';
import { useChatSession } from '../hooks/useChatSession';
import { ModeSwitcher } from '../components/ModeSwitcher';

/**
 * StudyChatLayout - 3-Panel NotebookLM Style
 * 
 * Advanced study mode with sources and studio panels
 * Features:
 * - Sources panel (left) - document management
 * - Chat interface (center) - main conversation
 * - Studio panel (right) - AI tools and insights
 */

interface StudyChatLayoutProps {
    sessionId: number;
    chatRef: React.RefObject<ChatInterfaceHandle>;
    mode: 'normal' | 'study';
    onModeChange: (mode: 'normal' | 'study') => void;
}

function getDocumentType(filename: string): 'pdf' | 'doc' | 'txt' | 'url' {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'doc';
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') return 'txt';
    if (filename.startsWith('http')) return 'url';
    return 'txt';
}

export const StudyChatLayout = forwardRef<HTMLDivElement, StudyChatLayoutProps>(
    ({ sessionId, chatRef, mode, onModeChange }, ref) => {
        const { data: session } = useChatSession(sessionId);
        const [leftPanelOpen, setLeftPanelOpen] = useState(true);
        const [rightPanelOpen, setRightPanelOpen] = useState(true);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);

        // Documents Query
        const { data: documents, isLoading: documentsLoading } = useQuery<DocumentResponse[]>({
            queryKey: ['documents'],
            queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(),
            staleTime: 1000 * 60 * 5,
        });

        // File Upload Hook
        const { uploadFile, isUploading } = useFileUpload();

        // Transform documents to sources format
        const sources: Source[] = useMemo(() => {
            if (!documents) return [];
            return documents
                .filter(doc => selectedDocumentIds.includes(doc.id))
                .map(doc => ({
                    id: doc.id,
                    title: doc.filename,
                    type: getDocumentType(doc.filename),
                    document_id: doc.id,
                }));
        }, [documents, selectedDocumentIds]);

        // Auto-select all documents initially
        useEffect(() => {
            if (documents && documents.length > 0 && selectedDocumentIds.length === 0) {
                const allDocIds = documents.map(doc => doc.id);
                setSelectedDocumentIds(allDocIds);
            }
        }, [documents, selectedDocumentIds.length]);

        // Load document context from session
        useEffect(() => {
            if (session?.document_id) {
                setSelectedDocumentIds([session.document_id]);
            }
        }, [session]);

        // Handlers
        const handleAddSource = useCallback(() => {
            setIsModalOpen(true);
        }, []);

        const handleRemoveSource = useCallback((id: number) => {
            setSelectedDocumentIds(prev => prev.filter(docId => docId !== id));
            toast.success('Source removed');
        }, []);

        const handleUploadSource = useCallback(async (files: File[]) => {
            setIsModalOpen(false);
            try {
                const uploadPromises = files.map(file => uploadFile(file));
                await Promise.all(uploadPromises);
                toast.success(`${files.length} file(s) uploaded successfully`);
            } catch (error: any) {
                toast.error(error.message || 'Failed to upload files');
            }
        }, [uploadFile]);

        const handlePromptClick = useCallback((prompt: string) => {
            if (chatRef.current) {
                chatRef.current.sendMessage(prompt);
            }
        }, [chatRef]);

        return (
            <div ref={ref} className="h-screen flex flex-col bg-[var(--synapse-bg-primary)] text-[var(--synapse-text-primary)] overflow-hidden">
                {/* Main Workspace - Three Panel Layout */}
                <div className="absolute inset-0 flex gap-4 p-4">
                    {/* LEFT PANEL: SOURCES */}
                    {leftPanelOpen && (
                        <SourcesPanel
                            isOpen={leftPanelOpen}
                            onClose={() => setLeftPanelOpen(false)}
                            sources={sources}
                            onAddSource={handleAddSource}
                            onRemoveSource={handleRemoveSource}
                            isLoading={documentsLoading}
                        />
                    )}

                    {/* Collapsed Left Indicator */}
                    {!leftPanelOpen && (
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50">
                            <button
                                onClick={() => setLeftPanelOpen(true)}
                                className="synapse-panel-toggle"
                                title="Open Sources"
                                aria-label="Open sources panel"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* CENTER PANEL: CHAT */}
                    <main className="flex-1 flex flex-col synapse-panel min-w-0 overflow-hidden relative">
                        {/* Chat Header */}
                        <div className="synapse-panel-header relative pr-32"> {/* Added padding for ModeSwitcher */}
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-[var(--synapse-cyan)]" />
                                <span className="synapse-panel-title">Synapse Chat</span>
                            </div>

                            {/* Center Panel Mode Switcher */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
                                <ModeSwitcher mode={mode} onModeChange={onModeChange} />
                            </div>

                            <div className="flex items-center gap-1 mr-32"> {/* Shift controls left if needed */}
                                {!leftPanelOpen && (
                                    <button
                                        onClick={() => setLeftPanelOpen(true)}
                                        className="synapse-icon-button"
                                        title="Show sources"
                                        aria-label="Show sources panel"
                                    >
                                        <Menu size={20} />
                                    </button>
                                )}
                                {!rightPanelOpen && (
                                    <button
                                        onClick={() => setRightPanelOpen(true)}
                                        className="synapse-icon-button"
                                        title="Show studio"
                                        aria-label="Show studio panel"
                                    >
                                        <Menu size={20} />
                                    </button>
                                )}
                                <button className="synapse-icon-button">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Interface */}
                        <div className="flex-1 overflow-hidden">
                            <ChatInterface
                                ref={chatRef}
                                sessionId={sessionId}
                                className="h-full"
                                emptyStateComponent={
                                    sources.length === 0 ? (
                                        <WelcomeScreen
                                            onAddSource={handleAddSource}
                                            onPromptClick={handlePromptClick}
                                        />
                                    ) : undefined
                                }
                            />
                        </div>
                    </main>

                    {/* RIGHT PANEL: STUDIO */}
                    {rightPanelOpen && (
                        <StudioPanel
                            isOpen={rightPanelOpen}
                            onClose={() => setRightPanelOpen(false)}
                            hasMessages={session ? session.message_count > 0 : false}
                        />
                    )}

                    {/* Collapsed Right Indicator */}
                    {!rightPanelOpen && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50">
                            <button
                                onClick={() => setRightPanelOpen(true)}
                                className="synapse-panel-toggle"
                                title="Open Studio"
                                aria-label="Open studio panel"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Add Source Modal */}
                <AddSourceModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpload={handleUploadSource}
                />

                {/* Upload Progress */}
                {isUploading && (
                    <div className="fixed bottom-4 right-4 z-50 synapse-panel p-4 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--synapse-cyan)]" />
                            <span className="text-sm">Uploading files...</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

StudyChatLayout.displayName = 'StudyChatLayout';
