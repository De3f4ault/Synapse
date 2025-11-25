import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Dashboard
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

// Flashcards
import { DecksPage } from '@/pages/flashcards/DecksPage';
import { DeckDetailPage } from '@/pages/flashcards/DeckDetailPage';
import { ReviewPage } from '@/pages/flashcards/ReviewPage';

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
 * PROTECTED ROUTE WRAPPER
 * Blocks pages unless authenticated
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
 * AUTH ROUTE WRAPPER
 * Blocks login/register if already logged in
 * ---------------------------------------------------- */
function AuthRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}


/* -----------------------------------------------------
 * MAIN ROUTER CONFIGURATION — FINAL FIXED VERSION
 * ---------------------------------------------------- */
export function Router() {
    return (
        <BrowserRouter>
        <Routes>

        {/* AUTH ROUTES */}
        <Route element={<AuthRoute />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Flashcards */}
        <Route path="/flashcards" element={<DecksPage />} />
        <Route path="/flashcards/:deckId" element={<DeckDetailPage />} />
        <Route path="/flashcards/:deckId/review" element={<ReviewPage />} />
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

        {/* CHAT — FINAL FIX ✔✔ */}
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:sessionId" element={<ChatPage />} />

        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        {/* 404 PAGE */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
    );
}
