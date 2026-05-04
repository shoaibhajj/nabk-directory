"use client";
/**
 * TiptapEditor — Rich text editor for Arabic/RTL content.
 *
 * Features:
 * - RTL direction by default
 * - Arabic-friendly toolbar: Bold, Italic, Underline, lists, headings
 * - Outputs Tiptap JSON stored as a string in a hidden <input>
 * - Works as a drop-in replacement for <textarea> in Server Action forms
 *
 * Usage:
 *   <TiptapEditor name="introTextAr" defaultValue={existingJsonString} />
 *   The form will receive the Tiptap JSON string via formData.get("introTextAr")
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextDirection from "@tiptap/extension-text-style";
import { useEffect, useRef } from "react";

interface Props {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  minHeight?: number;
}

export function TiptapEditor({
  name,
  defaultValue,
  placeholder = "اكتب هنا...",
  minHeight = 150,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse defaultValue: may be Tiptap JSON string or plain text
  const parseDefault = () => {
    if (!defaultValue) return undefined;
    try {
      return JSON.parse(defaultValue);
    } catch {
      // plain text — wrap in a Tiptap paragraph node
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: defaultValue }] }],
      };
    }
  };

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextDirection],
    content: parseDefault(),
    editorProps: {
      attributes: {
        dir: "rtl",
        class:
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm leading-relaxed",
        "data-placeholder": placeholder,
      },
    },
    onUpdate({ editor }) {
      if (inputRef.current) {
        inputRef.current.value = JSON.stringify(editor.getJSON());
      }
    },
  });

  // Sync initial value to hidden input
  useEffect(() => {
    if (editor && inputRef.current) {
      inputRef.current.value = JSON.stringify(editor.getJSON());
    }
  }, [editor]);

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Toolbar */}
      {editor && (
        <div
          className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1"
          dir="ltr"
        >
          <ToolbarBtn
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="جريء"
          >
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="مائل"
          >
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="تحت خط"
          >
            <u>U</u>
          </ToolbarBtn>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarBtn
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="عنوان"
          >
            H2
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="عنوان فرعي"
          >
            H3
          </ToolbarBtn>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarBtn
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="قائمة"
          >
            •—
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="قائمة مرقمة"
          >
            1.
          </ToolbarBtn>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarBtn
            active={false}
            onClick={() => editor.chain().focus().undo().run()}
            title="تراجع"
          >
            ↩
          </ToolbarBtn>
          <ToolbarBtn
            active={false}
            onClick={() => editor.chain().focus().redo().run()}
            title="إعادة"
          >
            ↪
          </ToolbarBtn>
        </div>
      )}

      {/* Editor area */}
      <div style={{ minHeight }} dir="rtl">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden input carries the JSON value to the Server Action */}
      <input ref={inputRef} type="hidden" name={name} />
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-accent text-white"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
