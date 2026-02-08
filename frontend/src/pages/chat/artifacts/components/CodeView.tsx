/**
 * CodeView - Syntax-highlighted code display component
 *
 * Uses prism-react-renderer for beautiful syntax highlighting
 * with a custom dark theme inspired by Claude/VSCode.
 */

import { Highlight } from "prism-react-renderer";
import "./CodeView.css";

// Custom dark theme - Claude/VSCode inspired
const customTheme = {
  plain: {
    color: "#c9d1d9",
    backgroundColor: "#0d1117",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#8b949e", fontStyle: "italic" as const },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["string", "attr-value"],
      style: { color: "#a5d6ff" },
    },
    {
      types: ["punctuation", "operator"],
      style: { color: "#c9d1d9" },
    },
    {
      types: ["entity", "url", "symbol", "number", "boolean", "variable", "constant", "property", "regex", "inserted"],
      style: { color: "#79c0ff" },
    },
    {
      types: ["atrule", "keyword", "attr-name", "selector"],
      style: { color: "#ff7b72" },
    },
    {
      types: ["function", "deleted", "tag"],
      style: { color: "#d2a8ff" },
    },
    {
      types: ["function-variable"],
      style: { color: "#d2a8ff" },
    },
    {
      types: ["tag", "selector", "keyword"],
      style: { color: "#ff7b72" },
    },
    {
      types: ["builtin", "char"],
      style: { color: "#ffa657" },
    },
    {
      types: ["class-name"],
      style: { color: "#ffa657" },
    },
  ],
};

interface CodeViewProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export function CodeView({ code, language = "typescript", showLineNumbers = true }: CodeViewProps) {
  // Map common language aliases
  const prismLanguage = language === "shell" ? "bash" : language;

  return (
    <div className="code-view-container">
      <Highlight theme={customTheme} code={code.trim()} language={prismLanguage as any}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`code-view-pre ${className}`} style={style}>
            <code className="code-view-code">
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="code-line">
                  {showLineNumbers && (
                    <span className="line-number">{i + 1}</span>
                  )}
                  <span className="line-content">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export default CodeView;
