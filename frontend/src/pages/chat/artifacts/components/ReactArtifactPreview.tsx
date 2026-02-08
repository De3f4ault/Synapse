/**
 * ReactArtifactPreview - Live React component preview using Sandpack.
 *
 * Features:
 * - Live preview with real-time updates
 * - Error boundary with "Try fixing with AI" action
 * - Dark/light theme support
 * - Responsive sizing
 */

import { useCallback, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";
import {
  AlertCircle,
  RefreshCw,
  Wand2,
  Code,
  Eye,
  Maximize2,
} from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import type { ArtifactBlock } from "../types";

interface ReactArtifactPreviewProps {
  artifact: ArtifactBlock;
  onFixWithAI?: (code: string, error: string) => void;
  showEditor?: boolean;
  height?: string | number;
}

/**
 * Error display component with "Try fixing with AI" action.
 */
function ErrorOverlay({
  error,
  onRetry,
  onFixWithAI,
}: {
  error: string;
  onRetry: () => void;
  onFixWithAI?: () => void;
}) {
  return (
    <div className="sandpack-error-overlay">
      <div className="error-content">
        <AlertCircle className="error-icon" size={24} />
        <h3>Runtime Error</h3>
        <pre className="error-message">{error}</pre>
        <div className="error-actions">
          <button onClick={onRetry} className="retry-btn">
            <RefreshCw size={16} />
            Retry
          </button>
          {onFixWithAI && (
            <button onClick={onFixWithAI} className="fix-btn">
              <Wand2 size={16} />
              Try fixing with AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Internal component that has access to Sandpack context.
 */
function SandpackInner({
  onFixWithAI,
  showEditor,
}: {
  onFixWithAI?: (code: string, error: string) => void;
  showEditor: boolean;
}) {
  const { sandpack } = useSandpack();
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "code" | "split">(
    showEditor ? "split" : "preview"
  );

  const handleReset = useCallback(() => {
    sandpack.resetAllFiles();
    setRuntimeError(null);
  }, [sandpack]);

  const handleFixWithAI = useCallback(() => {
    if (onFixWithAI && runtimeError) {
      const activeFile = sandpack.activeFile;
      const code = sandpack.files[activeFile]?.code || "";
      onFixWithAI(code, runtimeError);
    }
  }, [onFixWithAI, runtimeError, sandpack]);

  return (
    <div className="sandpack-inner">
      <div className="sandpack-toolbar">
        <div className="view-toggles">
          <button
            onClick={() => setViewMode("preview")}
            className={viewMode === "preview" ? "active" : ""}
            title="Preview only"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={viewMode === "code" ? "active" : ""}
            title="Code only"
          >
            <Code size={16} />
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={viewMode === "split" ? "active" : ""}
            title="Split view"
          >
            <Maximize2 size={16} />
          </button>
        </div>
        <button onClick={handleReset} className="reset-btn" title="Reset code">
          <RefreshCw size={14} />
        </button>
      </div>

      <SandpackLayout>
        {(viewMode === "code" || viewMode === "split") && (
          <SandpackCodeEditor
            showTabs
            showLineNumbers
            showInlineErrors
            wrapContent
            closableTabs={false}
          />
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
          />
        )}
      </SandpackLayout>

      {runtimeError && (
        <ErrorOverlay
          error={runtimeError}
          onRetry={handleReset}
          onFixWithAI={onFixWithAI ? handleFixWithAI : undefined}
        />
      )}
    </div>
  );
}

/**
 * Main ReactArtifactPreview component.
 *
 * Wraps Sandpack provider with appropriate configuration for React components.
 */
export function ReactArtifactPreview({
  artifact,
  onFixWithAI,
  showEditor = false,
  height = 400,
}: ReactArtifactPreviewProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Parse the artifact content into Sandpack file format
  const files: Record<string, string> = {
    "/App.tsx": artifact.content,
    "/index.tsx": `
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
`,
  };

  // Check if content already has an export default
  const hasDefaultExport =
    artifact.content.includes("export default") ||
    artifact.content.includes("export { default }");

  if (!hasDefaultExport) {
    // Wrap in a basic component if no export
    files["/App.tsx"] = `
import React from "react";

export default function App() {
  return (
    <>
      ${artifact.content}
    </>
  );
}
`;
  }

  return (
    <div
      className="react-artifact-preview"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <SandpackProvider
        template="react-ts"
        theme={isDark ? "dark" : "light"}
        files={files}
        options={{
          recompileMode: "delayed",
          recompileDelay: 300,
          autorun: true,
          autoReload: true,
        }}
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
            "date-fns": "latest",
          },
        }}
      >
        <SandpackInner onFixWithAI={onFixWithAI} showEditor={showEditor} />
      </SandpackProvider>
    </div>
  );
}

export default ReactArtifactPreview;
