import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';
// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
// Dashboard
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
// Flashcards
import { DecksPage } from '@/pages/flashcards/DecksPage';
import { DeckDetailPage } from '@/pages/flashcards/DeckDetailPage';
import { ReviewPage } from '@/pages/flashcards/ReviewPage';
import { CreateDeckPage } from '@/pages/flashcards/CreateDeckPage';
import { CreateCardPage } from '@/pages/flashcards/CreateCardPage';
import { EditCardPage } from '@/pages/flashcards/EditCardPage';
// Study
import { StudyPage } from '@/pages/study/StudyPage';
// Notes
import { NotesPage } from '@/pages/notes/NotesPage';
import { NoteDetailPage } from '@/pages/notes/NoteDetailPage';
// Documents
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
// Quizzes
import { QuizzesPage } from '@/pages/quizzes/QuizzesPage';
import { QuizTakePage } from '@/pages/quizzes/QuizTakePage';
// Chat
import { ChatPage } from '@/pages/chat/ChatPage';
// Analytics
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
// 404
import { NotFoundPage } from '@/pages/NotFoundPage';

/* -----------------------------------------------------
 * PROTECTED ROUTE (Final)
 * Wraps content with AppShell — no sidebar logic required
 * ---------------------------------------------------- */
function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }
    return (
        <AppShell>
        <Outlet />
        </AppShell>
    );
}

/* -----------------------------------------------------
 * AUTH ROUTE
 * Prevents access to login/register when logged in
 * ---------------------------------------------------- */
function AuthRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
}

/* -----------------------------------------------------
 * MAIN ROUTER (FINAL VERSION WITH FLASHCARD CRUD)
 * ---------------------------------------------------- */
export function Router() {
    return (
        <BrowserRouter>
        <Routes>
        {/* Auth routes */}
        <Route element={<AuthRoute />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes (wrapped in AppShell) */}
        <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Flashcards */}
        <Route path="/flashcards" element={<DecksPage />} />
        <Route path="/flashcards/create" element={<CreateDeckPage />} />
        <Route path="/flashcards/:deckId" element={<DeckDetailPage />} />
        <Route path="/flashcards/:deckId/review" element={<ReviewPage />} />
        <Route path="/flashcards/:deckId/cards/new" element={<CreateCardPage />} />
        <Route path="/flashcards/:deckId/cards/:cardId/edit" element={<EditCardPage />} />
        <Route path="/flashcards/review" element={<ReviewPage />} />

        {/* Study */}
        <Route path="/study" element={<StudyPage />} />

        {/* Notes */}
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/:noteId" element={<NoteDetailPage />} />

        {/* Documents */}
        <Route path="/documents" element={<DocumentsPage />} />

        {/* Quizzes */}
        <Route path="/quizzes" element={<QuizzesPage />} />
        <Route path="/quizzes/:quizId/take" element={<QuizTakePage />} />

        {/* Chat */}
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:sessionId" element={<ChatPage />} />

        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
    );
}
