/**
 * Platform Initialization
 *
 * INVARIANT: All modules register here during app startup.
 * INVARIANT: This runs BEFORE any component renders.
 *
 * Import and call initPlatform() in main.tsx or App.tsx.
 */

// import { initNotesModule } from "@/modules/notes/core/platformRegistration";
import { initDocumentsModule } from "@/modules/documents/core/platformRegistration";
import { initFlashcardsModule } from "@/pages/flashcards/core/platformRegistration";
import { initQuizzesModule } from "@/modules/quizzes/core/platformRegistration";
import { initGraphIntelligenceProvider } from "@/modules/graph/core/intelligence";

let initialized = false;

/**
 * Initialize the platform with all modules.
 * Safe to call multiple times (idempotent).
 */
export function initPlatform(): void {
    if (initialized) {
        return;
    }

    // Register modules
    // initNotesModule();
    initDocumentsModule();
    initFlashcardsModule();
    initQuizzesModule();

    // Initialize Graph as intelligence provider
    initGraphIntelligenceProvider();

    initialized = true;

    if (process.env.NODE_ENV === "development") {
        console.debug("[Platform] Initialized with all modules");
    }
}

/**
 * Check if platform is initialized (for debugging).
 */
export function isPlatformInitialized(): boolean {
    return initialized;
}
