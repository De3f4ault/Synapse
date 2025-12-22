/**
 * Text Selection & Manipulation Utilities
 * Handles text formatting in textareas
 *
 * File: frontend/src/pages/notes/utils/textSelection.ts
 */

interface TextAreaSelection {
  text: string;
  start: number;
  end: number;
}

/**
 * Get current selection from textarea
 */
export function getTextAreaSelection(
  element: HTMLTextAreaElement,
): TextAreaSelection {
  return {
    text: element.value.substring(element.selectionStart, element.selectionEnd),
    start: element.selectionStart,
    end: element.selectionEnd,
  };
}

/**
 * Insert text at cursor position
 */
export function insertTextAtCursor(
  element: HTMLTextAreaElement,
  insertText: string,
  selectInserted: boolean = false,
): void {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const value = element.value;

  const newValue =
    value.substring(0, start) + insertText + value.substring(end);
  element.value = newValue;

  // Set cursor position
  if (selectInserted) {
    element.selectionStart = start;
    element.selectionEnd = start + insertText.length;
  } else {
    element.selectionStart = element.selectionEnd = start + insertText.length;
  }

  // Trigger input event for React
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Wrap selected text with markdown syntax
 */
export function wrapSelection(
  element: HTMLTextAreaElement,
  before: string,
  after: string = before,
): void {
  const selection = getTextAreaSelection(element);
  const value = element.value;

  if (selection.text) {
    // Text is selected - wrap it
    const wrapped = `${before}${selection.text}${after}`;
    const newValue =
      value.substring(0, selection.start) +
      wrapped +
      value.substring(selection.end);

    element.value = newValue;
    element.selectionStart = selection.start + before.length;
    element.selectionEnd = selection.end + before.length;
  } else {
    // No selection - insert wrapper with cursor inside
    const placeholder = "text";
    const wrapped = `${before}${placeholder}${after}`;
    const newValue =
      value.substring(0, selection.start) +
      wrapped +
      value.substring(selection.start);

    element.value = newValue;
    element.selectionStart = selection.start + before.length;
    element.selectionEnd = selection.start + before.length + placeholder.length;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.focus();
}

/**
 * Apply markdown formatting
 */
export const markdownFormatters = {
  bold: (element: HTMLTextAreaElement) => wrapSelection(element, "**"),
  italic: (element: HTMLTextAreaElement) => wrapSelection(element, "_"),
  code: (element: HTMLTextAreaElement) => wrapSelection(element, "`"),

  codeBlock: (element: HTMLTextAreaElement) => {
    wrapSelection(element, "```\n", "\n```");
  },

  heading: (element: HTMLTextAreaElement, level: number = 2) => {
    const selection = getTextAreaSelection(element);
    const hashes = "#".repeat(level);

    if (selection.text) {
      const lines = selection.text.split("\n");
      const formatted = lines
        .map((line) => (line.trim() ? `${hashes} ${line}` : line))
        .join("\n");

      const value = element.value;
      element.value =
        value.substring(0, selection.start) +
        formatted +
        value.substring(selection.end);

      element.selectionStart = selection.start;
      element.selectionEnd = selection.start + formatted.length;
    } else {
      insertTextAtCursor(element, `${hashes} `, false);
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.focus();
  },

  list: (element: HTMLTextAreaElement, ordered: boolean = false) => {
    const selection = getTextAreaSelection(element);
    const value = element.value;

    if (selection.text) {
      const lines = selection.text.split("\n");
      const formatted = lines
        .map((line, idx) => {
          if (!line.trim()) return line;
          return ordered ? `${idx + 1}. ${line}` : `- ${line}`;
        })
        .join("\n");

      element.value =
        value.substring(0, selection.start) +
        formatted +
        value.substring(selection.end);

      element.selectionStart = selection.start;
      element.selectionEnd = selection.start + formatted.length;
    } else {
      const prefix = ordered ? "1. " : "- ";
      insertTextAtCursor(element, prefix, false);
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.focus();
  },

  link: (element: HTMLTextAreaElement) => {
    const selection = getTextAreaSelection(element);

    if (selection.text) {
      wrapSelection(element, "[", "](url)");
    } else {
      insertTextAtCursor(element, "[link text](url)", true);
    }
  },
};

/**
 * Get line at cursor position
 */
export function getCurrentLine(element: HTMLTextAreaElement): {
  text: string;
  start: number;
  end: number;
} {
  const value = element.value;
  const cursorPos = element.selectionStart;

  // Find line start
  let lineStart = cursorPos;
  while (lineStart > 0 && value[lineStart - 1] !== "\n") {
    lineStart--;
  }

  // Find line end
  let lineEnd = cursorPos;
  while (lineEnd < value.length && value[lineEnd] !== "\n") {
    lineEnd++;
  }

  return {
    text: value.substring(lineStart, lineEnd),
    start: lineStart,
    end: lineEnd,
  };
}

/**
 * Replace current line
 */
export function replaceCurrentLine(
  element: HTMLTextAreaElement,
  newText: string,
): void {
  const line = getCurrentLine(element);
  const value = element.value;

  element.value =
    value.substring(0, line.start) + newText + value.substring(line.end);

  element.selectionStart = element.selectionEnd = line.start + newText.length;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
