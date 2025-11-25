/**
 * Code syntax highlighting configuration
 * Supports Prism.js with custom themes
 */

/**
 * Supported programming languages
 */
export const SUPPORTED_LANGUAGES = {
  // Web
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'React JSX',
  tsx: 'React TSX',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',

  // Backend
  python: 'Python',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',

  // Data & Config
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  graphql: 'GraphQL',

  // Shell
  bash: 'Bash',
  shell: 'Shell',
  powershell: 'PowerShell',

  // Markup
  markdown: 'Markdown',
  latex: 'LaTeX',

  // Other
  plaintext: 'Plain Text',
  text: 'Text',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Detect language from code content (heuristic)
 */
export const detectLanguage = (code: string): SupportedLanguage => {
  const trimmed = code.trim();

  // JSON detection
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) &&
    (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not JSON
    }
    }

    // HTML detection
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return 'html';
    }

    // Python detection
    if (/^(import|from|def|class|if __name__)/m.test(trimmed)) {
      return 'python';
    }

    // JavaScript/TypeScript detection
    if (/^(import|export|const|let|var|function|class)/m.test(trimmed)) {
      if (/:\s*\w+/.test(trimmed)) {
        return 'typescript';
      }
      return 'javascript';
    }

    // SQL detection
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/im.test(trimmed)) {
      return 'sql';
    }

    // Shell detection
    if (/^(#!/bin/bash|#!/bin/sh|echo|cd|ls|pwd)/m.test(trimmed)) {
      return 'bash';
    }

    return 'plaintext';
};

/**
 * Normalize language name (handle aliases)
 */
export const normalizeLanguage = (language: string): SupportedLanguage => {
  const normalized = language.toLowerCase().trim();

  // Handle common aliases
  const aliases: Record<string, SupportedLanguage> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    yml: 'yaml',
    cs: 'csharp',
    'c++': 'cpp',
    rb: 'ruby',
    md: 'markdown',
  };

  return aliases[normalized] || (normalized as SupportedLanguage) || 'plaintext';
};

/**
 * Get language display name
 */
export const getLanguageDisplayName = (language: string): string => {
  const normalized = normalizeLanguage(language);
  return SUPPORTED_LANGUAGES[normalized] || language;
};

/**
 * Check if language is supported
 */
export const isLanguageSupported = (language: string): boolean => {
  const normalized = normalizeLanguage(language);
  return normalized in SUPPORTED_LANGUAGES;
};

/**
 * Get file extension for language
 */
export const getFileExtension = (language: SupportedLanguage): string => {
  const extensions: Record<SupportedLanguage, string> = {
    javascript: 'js',
    typescript: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
    scss: 'scss',
    python: 'py',
    java: 'java',
    csharp: 'cs',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    json: 'json',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    graphql: 'graphql',
    bash: 'sh',
    shell: 'sh',
    powershell: 'ps1',
    markdown: 'md',
    latex: 'tex',
    plaintext: 'txt',
    text: 'txt',
  };

  return extensions[language] || 'txt';
};

/**
 * Custom Prism theme colors (DeepSeek-inspired)
 */
export const SYNTAX_THEME = {
  background: '#1D1E22',
  text: '#E5E7EB',
  comment: '#6B7280',
  keyword: '#5685FE',
  function: '#60A5FA',
  string: '#34D399',
  number: '#F59E0B',
  operator: '#E5E7EB',
  punctuation: '#9CA3AF',
  className: '#A78BFA',
  tag: '#F472B6',
  attribute: '#FCD34D',
  boolean: '#FB923C',
  constant: '#F472B6',
  variable: '#E5E7EB',
  selector: '#60A5FA',
  property: '#34D399',
  important: '#EF4444',
  deleted: '#EF4444',
  inserted: '#10B981',
} as const;

/**
 * Get syntax highlighter configuration
 */
export const getSyntaxHighlighterConfig = () => ({
  theme: {
    'code[class*="language-"]': {
      color: SYNTAX_THEME.text,
      background: SYNTAX_THEME.background,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '0.875rem',
      lineHeight: '1.5',
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      MozTabSize: '4',
      OTabSize: '4',
      tabSize: '4',
      WebkitHyphens: 'none',
      MozHyphens: 'none',
      msHyphens: 'none',
      hyphens: 'none',
    },
    'pre[class*="language-"]': {
      color: SYNTAX_THEME.text,
      background: SYNTAX_THEME.background,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '0.875rem',
      lineHeight: '1.5',
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      padding: '1rem',
      margin: '0',
      overflow: 'auto',
    },
    comment: { color: SYNTAX_THEME.comment },
    prolog: { color: SYNTAX_THEME.comment },
    doctype: { color: SYNTAX_THEME.comment },
    cdata: { color: SYNTAX_THEME.comment },
    punctuation: { color: SYNTAX_THEME.punctuation },
    property: { color: SYNTAX_THEME.property },
    tag: { color: SYNTAX_THEME.tag },
    boolean: { color: SYNTAX_THEME.boolean },
    number: { color: SYNTAX_THEME.number },
    constant: { color: SYNTAX_THEME.constant },
    symbol: { color: SYNTAX_THEME.constant },
    deleted: { color: SYNTAX_THEME.deleted },
    selector: { color: SYNTAX_THEME.selector },
    'attr-name': { color: SYNTAX_THEME.attribute },
    string: { color: SYNTAX_THEME.string },
    char: { color: SYNTAX_THEME.string },
    builtin: { color: SYNTAX_THEME.function },
    inserted: { color: SYNTAX_THEME.inserted },
    operator: { color: SYNTAX_THEME.operator },
    entity: { color: SYNTAX_THEME.operator },
    url: { color: SYNTAX_THEME.string },
    '.language-css .token.string': { color: SYNTAX_THEME.string },
    '.style .token.string': { color: SYNTAX_THEME.string },
    variable: { color: SYNTAX_THEME.variable },
    atrule: { color: SYNTAX_THEME.keyword },
    'attr-value': { color: SYNTAX_THEME.string },
    function: { color: SYNTAX_THEME.function },
    'class-name': { color: SYNTAX_THEME.className },
    keyword: { color: SYNTAX_THEME.keyword },
    regex: { color: SYNTAX_THEME.string },
    important: { color: SYNTAX_THEME.important, fontWeight: 'bold' },
    bold: { fontWeight: 'bold' },
    italic: { fontStyle: 'italic' },
  },
  showLineNumbers: true,
  wrapLines: true,
});

/**
 * Format code for display (add indentation, trim)
 */
export const formatCode = (code: string): string => {
  return code
  .trim()
  .split('\n')
  .map(line => line.trimEnd())
  .join('\n');
};

/**
 * Highlight specific lines in code
 */
export const getHighlightedLines = (highlightString: string): number[] => {
  // Parse highlight string like "1-3,5,7-9"
  if (!highlightString) return [];

  const lines: number[] = [];
  const parts = highlightString.split(',');

  parts.forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        lines.push(i);
      }
    } else {
      lines.push(Number(part));
    }
  });

  return lines;
};
