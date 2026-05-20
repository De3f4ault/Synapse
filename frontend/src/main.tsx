// StrictMode removed to prevent double-mount side effects with canvas editors
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";       // Design system (imports tokens.css internally)
import "./styles/scrollbar.css";     // Warm scrollbar styles
import "./styles/markdown.css";      // Markdown rendering styles
import "./styles/chat.css";          // Chat interface styles
import "./styles/illustrations.css"; // Illustration system placeholders
import "./api/client"; // Initialize API client

// Graph Module Initialization
import {
  initGraphEventConsumer,
  initGraphHandlers,
  initLearningHandlers,
  initDocumentHandlers,
} from "@/modules/graph";

// Platform Initialization
import { initPlatform } from "@/shared/platform";

/**
 * Application Entry Point
 */

// Initialize Graph Module (must be before React tree mounts)
// Order: consumer → structural → learning → documents
const cleanupEventConsumer = initGraphEventConsumer();
const cleanupHandlers = initGraphHandlers();
const cleanupLearning = initLearningHandlers();
const cleanupDocuments = initDocumentHandlers();

// Initialize Platform (registers all modules)
initPlatform();

// Cleanup on HMR (Vite hot module replacement)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupDocuments();
    cleanupLearning();
    cleanupHandlers();
    cleanupEventConsumer();
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find root element");
}

createRoot(rootElement).render(
  <App />,
);

