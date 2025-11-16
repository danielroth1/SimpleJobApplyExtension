import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Extension } from '@tiptap/core'

// Custom extension for font size
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  showToolbar?: boolean
  className?: string
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder, 
  showToolbar = true,
  className = ''
}: RichTextEditorProps) {
  const [fontSizeSelected, setFontSizeSelected] = useState<number>(14)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
      }),
      Extension.create({
        name: 'customKeyboardShortcuts',
        addKeyboardShortcuts() {
          return {
            'Mod-k': () => {
              // Trigger link insertion
              const previousUrl = this.editor.getAttributes('link').href
              const url = window.prompt('URL', previousUrl)
              
              if (url === null) return true
              
              if (url === '') {
                this.editor.chain().focus().extendMarkRange('link').unsetLink().run()
                return true
              }
              
              this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
              return true
            },
          }
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Update editor content when it changes externally
  useEffect(() => {
    if (editor && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Update font size dropdown when selection changes
  useEffect(() => {
    if (!editor) return
    
    const handler = () => {
      if (!editor.isFocused) return
      const { fontSize } = editor.getAttributes('textStyle')
      if (fontSize) {
        const px = parseInt(fontSize, 10)
        if (!isNaN(px)) {
          const allowed = [12, 14, 16, 18, 20, 24]
          let closest = allowed[0]
          let minDiff = Math.abs(px - closest)
          for (const s of allowed) {
            const diff = Math.abs(px - s)
            if (diff < minDiff) {
              closest = s
              minDiff = diff
            }
          }
          setFontSizeSelected(closest)
        }
      }
    }
    
    editor.on('selectionUpdate', handler)
    return () => {
      editor.off('selectionUpdate', handler)
    }
  }, [editor])

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return
    const px = parseInt(e.target.value, 10)
    if (!isNaN(px)) {
      editor.chain().focus().setFontSize(`${px}px`).run()
      setFontSizeSelected(px)
    }
  }

  const handleInsertLink = () => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    
    if (url === null) return
    
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const toolbarButtonStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '14px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    cursor: 'pointer',
    minWidth: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`rte-container ${className}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {showToolbar && (
        <div
          className="d-flex flex-wrap align-items-center gap-1 px-1 py-1"
          style={{
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }} 
            title="Bold (Ctrl+B)"
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            <strong>B</strong>
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }} 
            title="Italic (Ctrl+I)"
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            <em>I</em>
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }} 
            title="Underline (Ctrl+U)"
            className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            <u>U</u>
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }} 
            title="Strikethrough (Ctrl+Shift+X)"
            className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            <s>S</s>
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
          <select 
            value={String(fontSizeSelected)}
            onChange={handleFontSize}
            title="Font size"
            style={{
              ...toolbarButtonStyle,
              minWidth: '60px',
            }}
          >
            {[12, 14, 16, 18, 20, 24].map(sz => (
              <option key={sz} value={sz}>{sz}</option>
            ))}
          </select>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
          <button 
            onMouseDown={(e) => { e.preventDefault(); handleInsertLink() }} 
            title="Insert/Edit link (Ctrl+K)"
            className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            🔗
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }} 
            title="Align left"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            ⬅️
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }} 
            title="Align center"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            ↔️
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }} 
            title="Align right"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            ➡️
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run() }} 
            title="Justify"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            ↕️
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }} 
            title="Bullet list"
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            •
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }} 
            title="Numbered list"
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            style={toolbarButtonStyle}
          >
            #
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
          <button 
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().clearNodes().unsetAllMarks().run() }} 
            title="Clear formatting"
            className="toolbar-btn"
            style={toolbarButtonStyle}
          >
            🗑️
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="tiptap" />
    </div>
  )
}
