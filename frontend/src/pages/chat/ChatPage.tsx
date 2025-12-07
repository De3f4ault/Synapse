/**
 * ChatPage - Exact NotebookLM Replica
 * Pixel-perfect three-panel layout matching Google's NotebookLM
 *
 * Location: frontend/src/pages/chat/ChatPage.tsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Backend Integration Hooks
import { useChatSession } from './hooks/useChatSession';
import { useChatStreaming } from './hooks/useChatStreaming';
import { useChatMessages } from './hooks/useChatMessages';
import { useFileUpload } from './hooks/useFileUpload';

// API Hooks
import { useQuery } from '@tanstack/react-query';
import { listDocumentsApiV1DocumentsGet } from '@/api/generated/services.gen';
import type { DocumentResponse } from '@/api/generated/types.gen';

// Components
import { SourcesPanel, Source } from './components/panels/SourcesPanel';
import { StudioPanel } from './components/panels/StudioPanel';
import { NotebookHeader } from './components/notebook/NotebookHeader';
import { ChatContainer } from './components/main-area/ChatContainer';
import { ChatInput } from './components/main-area/ChatInput';
import { AddSourceModal } from './components/modals/AddSourceModal';
import { WelcomeScreen } from './components/main-area/WelcomeScreen';

// Styles
import './styles/notebooklm-theme.css';
import './styles/scrollbar.css';
import './styles/glass.css';
import './styles/animations.css';
import './styles/markdown.css';

export const ChatPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const numericSessionId = sessionId ? parseInt(sessionId) : undefined;

    // Backend Data Hooks
    const { data: session, isLoading: sessionLoading } = useChatSession(numericSessionId);
    const { data: messages, isLoading: messagesLoading } = useChatMessages(numericSessionId);

    // Documents Query
    const { data: documents, isLoading: documentsLoading } = useQuery<DocumentResponse[]>({
        queryKey: ['documents'],
        queryFn: async () => {
            const response = await listDocumentsApiV1DocumentsGet({});
            return Array.isArray(response) ? response : (response as any).items || [];
        },
        staleTime: 1000 * 60 * 5,
    });

    // WebSocket Streaming
    const {
        isStreaming,
        connectionState,
        isConnected,
    } = useChatStreaming({
        sessionId: numericSessionId,
        autoConnect: !!numericSessionId,
    });

    // File Upload Hook
    const {
        uploadFile,
        isUploading,
    } = useFileUpload();

    // UI State
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);

    // Transform documents to sources format
    const sources: Source[] = useMemo(() => {
        if (!documents) return [];

        return documents
        .filter(doc => selectedDocumentIds.includes(doc.id))
        .map(doc => ({
            id: doc.id,
            title: doc.title || doc.filename,
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

    // Load document context from session metadata
    useEffect(() => {
        if (session?.metadata && typeof session.metadata === 'object') {
            const metadata = session.metadata as any;
            if (metadata.document_ids && Array.isArray(metadata.document_ids)) {
                setSelectedDocumentIds(metadata.document_ids);
            }
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

            await queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success(`${files.length} file(s) uploaded successfully`);

            const newDocs = await queryClient.getQueryData<DocumentResponse[]>(['documents']);
            if (newDocs) {
                const newDocIds = newDocs.map(doc => doc.id);
                setSelectedDocumentIds(newDocIds);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload files');
        }
    }, [uploadFile, queryClient]);

    const handleBack = useCallback(() => {
        navigate('/chat');
    }, [navigate]);

    const handlePromptClick = useCallback((prompt: string) => {
        toast.info('Feature coming soon');
    }, []);

    // Computed values
    const isActiveSession = !!sessionId;
    const hasMessages = messages && messages.length > 0;
    const isLoading = sessionLoading || messagesLoading || documentsLoading;

    return (
        <div className="flex flex-col h-screen bg-[var(--notebook-canvas)] text-[var(--text-primary)] overflow-hidden">
        {/* Header - Only show in active session */}
        {isActiveSession && (
            <NotebookHeader
            title={session?.title || 'Untitled notebook'}
            onBack={handleBack}
            />
        )}

        {/* Main Workspace - Three Panel Layout - ABSOLUTE POSITIONING */}
        <div className="absolute inset-0 flex gap-4 p-4" style={{ top: isActiveSession ? '64px' : '0' }}>

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
            className="panel-toggle"
            title="Open Sources"
            aria-label="Open sources panel"
            >
            <ChevronRight size={20} />
            </button>
            </div>
        )}

        {/* CENTER PANEL: CHAT */}
        <main className="flex-1 flex flex-col notebook-panel min-w-0 overflow-hidden">
        {/* Chat Header */}
        <div className="panel-header">
        <div className="flex items-center gap-2">
        <span className="panel-header-title">Chat</span>
        {/* Connection Indicator */}
        {isActiveSession && isConnected && (
            <div className="w-2 h-2 rounded-full bg-[var(--notebook-primary)]" />
        )}
        </div>
        <div className="flex items-center gap-1">
        {!leftPanelOpen && (
            <button
            onClick={() => setLeftPanelOpen(true)}
            className="icon-button"
            title="Show sources"
            aria-label="Show sources panel"
            >
            <Menu size={20} />
            </button>
        )}
        {!rightPanelOpen && (
            <button
            onClick={() => setRightPanelOpen(true)}
            className="icon-button"
            title="Show studio"
            aria-label="Show studio panel"
            >
            <Menu size={20} />
            </button>
        )}
        <button className="icon-button">
        <MoreVertical size={20} />
        </button>
        </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
            <div className="empty-state h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--notebook-primary)]" />
            </div>
        ) : !hasMessages && sources.length === 0 ? (
            <WelcomeScreen
            onAddSource={handleAddSource}
            onPromptClick={handlePromptClick}
            />
        ) : (
            <ChatContainer hasMessages={hasMessages} />
        )}
        </div>

        {/* Input Area - Bottom fixed */}
        {(sources.length > 0 || isActiveSession) && (
            <div className="p-4 border-t border-[var(--border-subtle)]">
            <ChatInput
            sessionId={numericSessionId}
            sourceCount={sources.length}
            />
            </div>
        )}

        {/* Bottom Info Bar */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-tertiary)]">
        {sources.length} source{sources.length !== 1 ? 's' : ''}
        </span>
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
        NotebookLM can be inaccurate, please double check its responses.
        </div>
        </div>
        </main>

        {/* RIGHT PANEL: STUDIO */}
        {rightPanelOpen && (
            <StudioPanel
            isOpen={rightPanelOpen}
            onClose={() => setRightPanelOpen(false)}
            hasMessages={hasMessages || false}
            />
        )}

        {/* Collapsed Right Indicator */}
        {!rightPanelOpen && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50">
            <button
            onClick={() => setRightPanelOpen(true)}
            className="panel-toggle"
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
            <div className="fixed bottom-4 right-4 z-50 notebook-panel p-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--notebook-primary)]" />
            <span className="text-sm">Uploading files...</span>
            </div>
            </div>
        )}
        </div>
    );
};

function getDocumentType(filename: string): 'pdf' | 'doc' | 'txt' | 'url' {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'doc';
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') return 'txt';
    if (filename.startsWith('http')) return 'url';

    return 'txt';
}

export default ChatPage;
