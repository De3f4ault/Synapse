import React, { Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { RouteContextProvider } from "@/platform/audio";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";

// ==================== LAZY LOADED PAGES ====================

// Auth
const LoginPage = React.lazy(() =>
  import("@/pages/auth/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = React.lazy(() =>
  import("@/pages/auth/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);

// Main
const DashboardPage = React.lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);

// Flashcards
const FlashcardsPage = React.lazy(() =>
  import("@/pages/flashcards/FlashcardsPage").then((module) => ({
    default: module.FlashcardsPage,
  })),
);
const DeckDetailPage = React.lazy(() =>
  import("@/pages/flashcards/DeckDetailPage").then((module) => ({
    default: module.DeckDetailPage,
  })),
);
const ReviewPage = React.lazy(() =>
  import("@/pages/flashcards/ReviewPage").then((module) => ({
    default: module.ReviewPage,
  })),
);
const CreateDeckPage = React.lazy(() =>
  import("@/pages/flashcards/CreateDeckPage").then((module) => ({
    default: module.CreateDeckPage,
  })),
);
const CreateCardPage = React.lazy(() =>
  import("@/pages/flashcards/CreateCardPage").then((module) => ({
    default: module.CreateCardPage,
  })),
);
const EditCardPage = React.lazy(() =>
  import("@/pages/flashcards/EditCardPage").then((module) => ({
    default: module.EditCardPage,
  })),
);
const AIDesignPage = React.lazy(() =>
  import("@/pages/flashcards/ai-design/AIDesignPage").then((module) => ({
    default: module.AIDesignPage,
  })),
);

// Notes — new shell architecture
const NotesLayout = React.lazy(() =>
  import("@/modules/notes/layout/NotesLayout").then((module) => ({
    default: module.NotesLayout,
  }))
);
const NotesHubPage = React.lazy(() =>
  import("@/modules/notes/features/hub/pages/NotesHubPage").then((module) => ({
    default: module.NotesHubPage,
  }))
);
const UnifiedNotePage = React.lazy(() =>
  import("@/modules/notes/pages/UnifiedNotePage").then((module) => ({
    default: module.UnifiedNotePage,
  }))
);
const JournalsPage = React.lazy(() =>
  import("@/modules/notes/features/journals/JournalsPage").then((module) => ({
    default: module.JournalsPage,
  }))
);

// Documents
const DocumentsPage = React.lazy(() =>
  import("@/pages/documents/DocumentsPage").then((module) => ({
    default: module.DocumentsPage,
  })),
);
const DocumentViewerPage = React.lazy(() =>
  import("@/pages/documents/DocumentViewerPage").then((module) => ({
    default: module.DocumentViewerPage,
  })),
);
const TrashPage = React.lazy(() =>
  import("@/modules/documents/components/dms/TrashPage").then((module) => ({
    default: module.TrashPage,
  })),
);
const SettingsPage = React.lazy(() =>
  import("@/modules/documents/components/dms/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

// Quizzes
const QuizzesPage = React.lazy(() =>
  import("@/pages/quizzes/QuizzesPage").then((module) => ({
    default: module.QuizzesPage,
  })),
);
const QuizTakePage = React.lazy(() =>
  import("@/pages/quizzes/QuizTakePage").then((module) => ({
    default: module.QuizTakePage,
  })),
);

// Study
const StudyPage = React.lazy(() =>
  import("@/pages/study/StudyPage").then((module) => ({
    default: module.StudyPage,
  })),
);
const StudySessionPage = React.lazy(() =>
  import("@/pages/study/StudySessionPage").then((module) => ({
    default: module.StudySessionPage,
  })),
);

// Chat
const ChatPage = React.lazy(() =>
  import("@/pages/chat/ChatPage").then((module) => ({
    default: module.ChatPage,
  })),
);

// Knowledge Graph
const KnowledgeGraphPage = React.lazy(() =>
  import("@/pages/knowledge/KnowledgeGraphPage").then((module) => ({
    default: module.KnowledgeGraphPage,
  })),
);

// Error
const NotFoundPage = React.lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

// Admin Dashboard (god's-eye, full-screen, no AppShell)
const AdminDashboard = React.lazy(() =>
  import("@/pages/admin/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  }))
);

// Notes Layout
// const NotesLayout = React.lazy(() =>
//   import("@/pages/notes/NotesLayout").then((module) => ({
//     default: module.NotesLayout,
//   })),
// );

// const AllDocsPage = React.lazy(() =>
//   import("@/pages/notes/AllDocsPage").then((module) => ({
//     default: module.AllDocsPage,
//   })),
// );

/**
 * ProtectedRoute Component
 * Wraps authenticated routes with:
 * - AppShell layout (header, sidebar, content area)
 * - RouteContextProvider (audio context based on current route)
 * - ErrorBoundary (module-level error handling)
 * Redirects to login if not authenticated
 */
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <AppShell>
      <RouteContextProvider>
        <ErrorBoundary level="module">
          <Outlet />
        </ErrorBoundary>
      </RouteContextProvider>
    </AppShell>
  );
}

/**
 * ImmersiveRoute Component
 * For full-screen experiences (like BlockSuite editor) without AppShell header.
 * Provides authentication but no layout wrapper.
 */
function ImmersiveRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <ErrorBoundary level="module">
      <Outlet />
    </ErrorBoundary>
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
  return (
    <Navigate to={isAuthenticated ? "/dashboard" : "/auth/login"} replace />
  );
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
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/create" element={<CreateDeckPage />} />
            <Route path="/flashcards/:deckId" element={<DeckDetailPage />} />
            {/* ReviewPage moved to ImmersiveRoute for full-screen experience */}
            <Route
              path="/flashcards/:deckId/cards/new"
              element={<CreateCardPage />}
            />
            <Route
              path="/flashcards/:deckId/cards/:cardId/edit"
              element={<EditCardPage />}
            />

            {/* ========== NOTES (Synapse Hub — Dual-Face Shell) ========== */}
            <Route element={<NotesLayout />}>
              <Route path="/notes" element={<NotesHubPage />} />
              <Route path="/notes/journals" element={<JournalsPage />} />
              <Route path="/notes/:noteId" element={<UnifiedNotePage />} />
            </Route>

            {/* ========== DOCUMENTS (Omni-Kinetic) ========== */}
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/trash" element={<TrashPage />} />
            <Route path="/documents/:documentId" element={<DocumentViewerPage />} />

            {/* ========== SETTINGS ========== */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* ========== QUIZZES (Protocol: Crucible) ========== */}
            <Route path="/quizzes" element={<QuizzesPage />} />
            {/* QuizTakePage moved to ImmersiveRoute for full-screen experience */}

            {/* ========== STUDY (Unified Hub) ========== */}
            <Route path="/study" element={<StudyPage />} />

            {/* ========== CHAT (Oracle) ========== */}
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />

            {/* ========== KNOWLEDGE GRAPH ========== */}
            <Route path="/knowledge" element={<KnowledgeGraphPage />} />

            {/* ========== ANALYTICS (Redirects to Dashboard) ========== */}
            {/* Analytics is now integrated into the dashboard as tabs */}
            <Route
              path="/analytics"
              element={<Navigate to="/dashboard" replace />}
            />
          </Route>

          {/* ==================== IMMERSIVE ROUTES ==================== */}
          {/* Full-screen experiences without AppShell header */}
          <Route element={<ImmersiveRoute />}>
            {/* Notes moved to ProtectedRoute with NotesLayout shell */}
            {/* Journals - Moved to NotesLayout */}
            {/* Flashcard study sessions - full immersive experience */}
            <Route path="/flashcards/:deckId/review" element={<ReviewPage />} />
            <Route path="/flashcards/review" element={<ReviewPage />} />
            {/* AI Card Designer - full immersive conversation experience */}
            <Route path="/flashcards/ai-design" element={<AIDesignPage />} />
            <Route path="/flashcards/:deckId/ai-design" element={<AIDesignPage />} />
            {/* Quiz sessions - full immersive experience */}
            <Route path="/quizzes/:quizId/take" element={<QuizTakePage />} />
            {/* Unified Study sessions - full immersive experience */}
            <Route path="/study/session" element={<StudySessionPage />} />
          </Route>

          {/* ==================== ADMIN DASHBOARD ==================== */}
          {/* Completely outside AppShell — full-screen dark layout */}
          {/* Double-gated: AdminAuthGuard checks isAuthenticated + is_admin */}
          <Route element={<AdminAuthGuard />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* ==================== 404 FALLBACK ==================== */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
