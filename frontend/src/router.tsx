import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ==================== LAZY LOADED PAGES ====================

// Auth
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('@/pages/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));

// Main
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage').then(module => ({ default: module.DashboardPage })));

// Flashcards
const DecksPage = React.lazy(() => import('@/pages/flashcards/DecksPage').then(module => ({ default: module.DecksPage })));
const DeckDetailPage = React.lazy(() => import('@/pages/flashcards/DeckDetailPage').then(module => ({ default: module.DeckDetailPage })));
const ReviewPage = React.lazy(() => import('@/pages/flashcards/ReviewPage').then(module => ({ default: module.ReviewPage })));
const CreateDeckPage = React.lazy(() => import('@/pages/flashcards/CreateDeckPage').then(module => ({ default: module.CreateDeckPage })));
const CreateCardPage = React.lazy(() => import('@/pages/flashcards/CreateCardPage').then(module => ({ default: module.CreateCardPage })));
const EditCardPage = React.lazy(() => import('@/pages/flashcards/EditCardPage').then(module => ({ default: module.EditCardPage })));

// Notes
const NotesPage = React.lazy(() => import('@/pages/notes/NotesPage').then(module => ({ default: module.NotesPage })));
const NoteDetailPage = React.lazy(() => import('@/pages/notes/NoteDetailPage').then(module => ({ default: module.NoteDetailPage })));

// Documents
const DocumentsPage = React.lazy(() => import('@/pages/documents/DocumentsPage').then(module => ({ default: module.DocumentsPage })));

// Quizzes
const QuizzesPage = React.lazy(() => import('@/pages/quizzes/QuizzesPage').then(module => ({ default: module.QuizzesPage })));
const QuizTakePage = React.lazy(() => import('@/pages/quizzes/QuizTakePage').then(module => ({ default: module.QuizTakePage })));

// Study
const StudyPage = React.lazy(() => import('@/pages/study/StudyPage').then(module => ({ default: module.StudyPage })));

// Chat
const ChatPage = React.lazy(() => import('@/pages/chat/ChatPage').then(module => ({ default: module.ChatPage })));

// Knowledge Graph
const KnowledgeGraphPage = React.lazy(() => import('@/pages/knowledge/KnowledgeGraphPage').then(module => ({ default: module.KnowledgeGraphPage })));

// Error
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));

/**
 * ProtectedRoute Component
 * Wraps authenticated routes with AppShell layout
 * Redirects to login if not authenticated
 */
function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }

    return (
        <AppShell>
            <ErrorBoundary level="module">
                <Outlet />
            </ErrorBoundary>
        </AppShell>
    );
}

/**
 * AuthRoute Component
 * Prevents authenticated users from accessing auth pages
 * Redirects to dashboard if already logged in
 */
function AuthRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

/**
 * RootRedirect Component
 * Handles the root "/" path:
 * - Authenticated users -> Dashboard
 * - Unauthenticated users -> Login page
 */
function RootRedirect() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return <Navigate to={isAuthenticated ? "/dashboard" : "/auth/login"} replace />;
}

/**
 * Main Application Router
 *
 * Route Structure:
 * - Public: /auth/*
 * - Protected: All other routes
 *
 * All protected routes are wrapped in AppShell for consistent layout
 *
 * NOTE: Analytics is now integrated into Dashboard via tabs.
 * The /analytics route redirects to /dashboard for backward compatibility.
 */
export function Router() {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    {/* ==================== AUTH ROUTES ==================== */}
                    <Route element={<AuthRoute />}>
                        <Route path="/auth/login" element={<LoginPage />} />
                        <Route path="/auth/register" element={<RegisterPage />} />
                    </Route>

                    {/* ==================== ROOT REDIRECT ==================== */}
                    {/* Redirects to login (if unauthenticated) or dashboard (if authenticated) */}
                    <Route path="/" element={<RootRedirect />} />

                    {/* ==================== PROTECTED ROUTES ==================== */}
                    <Route element={<ProtectedRoute />}>
                        {/* Dashboard (includes analytics tabs) */}
                        <Route path="/dashboard" element={<DashboardPage />} />

                        {/* ========== FLASHCARDS (Mnemosyne Protocol) ========== */}
                        <Route path="/flashcards" element={<DecksPage />} />
                        <Route path="/flashcards/create" element={<CreateDeckPage />} />
                        <Route path="/flashcards/:deckId" element={<DeckDetailPage />} />
                        <Route path="/flashcards/:deckId/review" element={<ReviewPage />} />
                        <Route path="/flashcards/:deckId/cards/new" element={<CreateCardPage />} />
                        <Route path="/flashcards/:deckId/cards/:cardId/edit" element={<EditCardPage />} />
                        {/* Global review (all decks) */}
                        <Route path="/flashcards/review" element={<ReviewPage />} />

                        {/* ========== NOTES (Neural Codex) ========== */}
                        <Route path="/notes" element={<NotesPage />} />
                        <Route path="/notes/:noteId" element={<NoteDetailPage />} />

                        {/* ========== DOCUMENTS (Omni-Kinetic) ========== */}
                        <Route path="/documents" element={<DocumentsPage />} />

                        {/* ========== QUIZZES (Protocol: Crucible) ========== */}
                        <Route path="/quizzes" element={<QuizzesPage />} />
                        <Route path="/quizzes/:quizId/take" element={<QuizTakePage />} />

                        {/* ========== STUDY (Unified Hub) ========== */}
                        <Route path="/study" element={<StudyPage />} />

                        {/* ========== CHAT (Oracle) ========== */}
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/chat/:sessionId" element={<ChatPage />} />

                        {/* ========== KNOWLEDGE GRAPH ========== */}
                        <Route path="/knowledge" element={<KnowledgeGraphPage />} />

                        {/* ========== ANALYTICS (Redirects to Dashboard) ========== */}
                        {/* Analytics is now integrated into the dashboard as tabs */}
                        <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
                    </Route>

                    {/* ==================== 404 FALLBACK ==================== */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
