'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Heading } from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  Minus,
} from 'lucide-react';

interface BlogEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function BlogEditor({ content, onChange, placeholder = 'Write your blog post...' }: BlogEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable StarterKit heading - configured separately below
        paragraph: {
          HTMLAttributes: {
            class: 'mb-4', // Add spacing between paragraphs
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'my-4 pl-6',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'my-4 pl-6',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'mb-3 leading-relaxed',
          },
        },
      }),
      // Custom heading configuration with per-level font sizes
      Heading.configure({
        levels: [1, 2, 3, 4],
      }).extend({
        renderHTML({ node, HTMLAttributes }) {
          const level = node.attrs.level;

          // Map heading levels to Tailwind classes with explicit sizes
          const sizeClasses = {
            1: 'text-4xl font-bold leading-tight mt-12 mb-6',
            2: 'text-3xl font-bold leading-tight mt-12 mb-6',
            3: 'text-2xl font-semibold leading-snug mt-10 mb-5',
            4: 'text-xl font-semibold mt-8 mb-4',
          };

          return [
            `h${level}`,
            {
              ...HTMLAttributes,
              class: sizeClasses[level as keyof typeof sizeClasses] || '',
            },
            0,
          ];
        },
      }),
      TextStyle,
      Typography,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
      handlePaste: (view, event, slice) => {
        // Let Tiptap handle paste with all extensions enabled
        return false;
      },
    },
  });

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg flex flex-col">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 sticky top-0 z-10">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="h-6 w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
          title="Large Heading"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
          title="Medium Heading"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
          title="Small Heading"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <div className="h-6 w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="h-6 w-px bg-gray-300 mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={addLink}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      <div className="overflow-y-auto max-h-[500px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}