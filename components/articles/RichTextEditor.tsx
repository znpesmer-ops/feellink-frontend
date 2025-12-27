'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Strike from '@tiptap/extension-strike'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Link as LinkIcon, 
  Undo, 
  Redo 
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import LinkModal from '@/components/ui/LinkModal'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder = 'Yazının içeriğini buraya yaz...' }: RichTextEditorProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    immediatelyRender: false, // SSR hydration mismatch'lerini önlemek için
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3], // Sadece H2 ve H3
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Strike,
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
    },
  })

  // Value değiştiğinde editor'ı güncelle (dışarıdan gelen değerler için)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  const handleOpenLinkModal = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href || ''
    setLinkUrl(previousUrl)
    setIsLinkModalOpen(true)
  }, [editor])

  const handleLinkSubmit = useCallback((url: string) => {
    if (!editor) return

    if (url.trim() === '') {
      // Link'i kaldır
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // Link'i ekle veya güncelle
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent focus-within:ring-2 focus-within:ring-[#ff7b00] transition-all">
      {/* Toolbar - Minimal, tek satır */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        {/* Metin Stilleri */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Kalın (Ctrl+B)"
          >
            <Bold size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="İtalik (Ctrl+I)"
          >
            <Italic size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('strike') ? 'bg-gray-200 dark:bg-gray-700' : ''
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Üstü çizili"
          >
            <Strikethrough size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Başlıklar */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Başlık 2"
          >
            <Heading2 size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Başlık 3"
          >
            <Heading3 size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Listeler */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Madde işaretli liste"
          >
            <List size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Numaralı liste"
          >
            <ListOrdered size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Hizalama */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Sola hizala"
          >
            <AlignLeft size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Ortala"
          >
            <AlignCenter size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Sağa hizala"
          >
            <AlignRight size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Link */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleOpenLinkModal}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Link ekle/düzenle"
          >
            <LinkIcon size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Geri al (Ctrl+Z)"
          >
            <Undo size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="İleri al (Ctrl+Y)"
          >
            <Redo size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative min-h-[300px] max-h-[600px] overflow-y-auto">
        <EditorContent 
          editor={editor}
          className="focus:outline-none"
        />
      </div>

      {/* Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        initialUrl={linkUrl}
        onClose={() => {
          setIsLinkModalOpen(false)
          setLinkUrl('')
          // Editor'a focus geri ver
          editor?.commands.focus()
        }}
        onSubmit={handleLinkSubmit}
        title={linkUrl ? 'Link Düzenle' : 'Link Ekle'}
      />
    </div>
  )
}

