import { EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { useTiptapNote } from '../hooks/useTiptapNote';
import type { Note } from '../../../domain/note.types';
import './tiptap.editor.css';
import './tiptap-ai-bubble.css';
import { TiptapAIBubbleMenu } from './TiptapAIBubbleMenu';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, Highlighter,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Save,
} from 'lucide-react';
import type React from 'react';

interface TiptapEditorProps {
  note: Note;
  readOnly?: boolean;
  /** Plain-text summary of current canvas elements — used for AI context */
  canvasSummary?: string;
}

function ToolbarBtn({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`tiptap-toolbar-btn${active ? ' tiptap-toolbar-btn--active' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() { return <div className="tiptap-bubble-divider" />; }

export function TiptapEditor({ note, readOnly = false, canvasSummary = '' }: TiptapEditorProps) {
  const { editor, isSaving, saveError, isCheckpointing, hasUnsavedChanges, checkpoint, wordCount, charCount } = useTiptapNote(note);
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({ display: 'none' });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Custom bubble menu — positions itself on selection
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to || editor.state.selection.empty) {
        setBubbleStyle({ display: 'none' });
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const wRect = wrapper.getBoundingClientRect();

      setBubbleStyle({
        display: 'flex',
        position: 'absolute',
        top: rect.top - wRect.top - 48,
        left: Math.max(0, rect.left - wRect.left + rect.width / 2 - 160),
        zIndex: 100,
      });
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev ?? '');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="tiptap-wrapper" ref={wrapperRef}>

      {/* Fixed toolbar */}
      <div className="tiptap-fixed-toolbar">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Link"><Link2 size={14}/></ToolbarBtn>
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 size={14}/></ToolbarBtn>
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task list"><CheckSquare size={14}/></ToolbarBtn>
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote size={14}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider"><Minus size={14}/></ToolbarBtn>
        <div style={{ flex: 1 }} />
        <button
          onClick={checkpoint}
          disabled={isCheckpointing || !hasUnsavedChanges}
          title="Save checkpoint (Ctrl+S)"
          className={`tiptap-checkpoint-btn${hasUnsavedChanges ? ' tiptap-checkpoint-btn--dirty' : ''}`}
        >
          {isCheckpointing ? (
            <span className="tiptap-checkpoint-saving">Saving…</span>
          ) : (
            <>
              {hasUnsavedChanges && <span className="tiptap-unsaved-dot" />}
              <Save size={13} />
              <span>Save</span>
            </>
          )}
        </button>
      </div>

      {/* Floating bubble on selection */}
      <div className="tiptap-bubble-menu" style={bubbleStyle}>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={13}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={13}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline size={13}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike"><Strikethrough size={13}/></ToolbarBtn>
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={13}/></ToolbarBtn>
        <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Link"><Link2 size={13}/></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code size={13}/></ToolbarBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="tiptap-editor" />

      {/* AI Bubble Menu — appears on text selection */}
      <TiptapAIBubbleMenu
        editor={editor}
        noteText={note.content_text ?? ''}
        canvasSummary={canvasSummary}
      />

      {/* Status bar */}
      <div className="tiptap-statusbar">
        <span className={`tiptap-save-indicator ${saveError ? 'error' : isSaving ? 'saving' : 'saved'}`}>
          {saveError ? '⚠ Save failed' : isSaving ? 'Autosaving...' : 'Autosaved'}
        </span>
        <span className="tiptap-wordcount">{wordCount} words · {charCount} chars</span>
      </div>
    </div>
  );
}
