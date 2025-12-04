import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';

// ==================== AUTH PAGES ====================
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// ==================== MAIN PAGES ====================
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

// ==================== FLASHCARDS ====================
import { DecksPage } from '@/pages/flashcards/DecksPage';
import { DeckDetailPage } from '@/pages/flashcards/DeckDetailPage';
import { ReviewPage } from '@/pages/flashcards/ReviewPage';
import { CreateDeckPage } from '@/pages/flashcards/CreateDeckPage';
import { CreateCardPage } from '@/pages/flashcards/CreateCardPage';
import { EditCardPage } from '@/pages/flashcards/EditCardPage';

// ==================== NOTES ====================
import { NotesPage } from '@/pages/notes/NotesPage';
import { NoteDetailPage } from '@/pages/notes/NoteDetailPage';

// ==================== DOCUMENTS ====================
import { DocumentsPage } from '@/pages/documents/DocumentsPage';

// ==================== QUIZZES ====================
import { QuizzesPage } from '@/pages/quizzes/QuizzesPage';
import { QuizTakePage } from '@/pages/quizzes/QuizTakePage';

// ==================== STUDY ====================
import { StudyPage } from '@/pages/study/StudyPage';

// ==================== CHAT ====================
import { ChatPage } from '@/pages/chat/ChatPage';

// ==================== ANALYTICS ====================
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';

// ==================== ERROR PAGES ====================
import { NotFoundPage } from '@/pages/NotFoundPage';

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
        <Outlet />
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
 * Main Application Router
 *
 * Route Structure:
 * - Public: /auth/*
 * - Protected: All other routes
 *
 * All protected routes are wrapped in AppShell for consistent layout
 */
 export function Router() {
     return (
         <BrowserRouter>
         <Routes>
         {/* ==================== AUTH ROUTES ==================== */}
         <Route element={<AuthRoute />}>
         <Route path="/auth/login" element={<LoginPage />} />
         <Route path="/auth/register" element={<RegisterPage />} />
         </Route>

         {/* ==================== PROTECTED ROUTES ==================== */}
         <Route element={<ProtectedRoute />}>
         {/* Root redirect */}
         <Route path="/" element={<Navigate to="/dashboard" replace />} />

         {/* Dashboard */}
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

         {/* ========== ANALYTICS ========== */}
         <Route path="/analytics" element={<AnalyticsPage />} />
         </Route>

         {/* ==================== 404 FALLBACK ==================== */}
         <Route path="*" element={<NotFoundPage />} />
         </Routes>
         </BrowserRouter>
     );
 }
