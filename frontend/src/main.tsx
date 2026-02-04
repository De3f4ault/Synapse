// StrictMode removed for tldraw compatibility (causes duplicate selection registration)
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import "./styles/synapse-theme.css"; // Global Synapse Theme
import "./styles/glass.css";
import "./styles/animations.css";
import "./styles/scrollbar.css";
import "./styles/markdown.css";
import "./styles/neumorphic.css"; // Neumorphic Design System
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

