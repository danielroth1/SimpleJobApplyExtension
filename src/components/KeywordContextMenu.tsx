import React, { useState, useEffect, useRef } from 'react'
import { KeywordWithOptions } from '@/state/types'

interface KeywordContextMenuProps {
  keyword: KeywordWithOptions
  position: { x: number; y: number }
  onClose: () => void
  onUpdate: (updates: Partial<KeywordWithOptions>) => void
  onDelete: () => void
  color?: string
}

export default function KeywordContextMenu({ 
  keyword, 
  position, 
  onClose, 
  onUpdate, 
  onDelete,
  color 
}: KeywordContextMenuProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(keyword.text)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== keyword.text) {
      onUpdate({ text: editText.trim() })
    }
    setIsEditing(false)
    onClose()
  }

  // Calculate menu position to keep it within viewport
  const [adjustedPosition, setAdjustedPosition] = React.useState(position)
  
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let { x, y } = position
      
      // Adjust horizontal position if menu would overflow right edge
      if (x + menuRect.width > viewportWidth - 10) {
        x = viewportWidth - menuRect.width - 10
      }
      
      // Adjust vertical position if menu would overflow bottom edge
      if (y + menuRect.height > viewportHeight - 10) {
        y = viewportHeight - menuRect.height - 10
      }
      
      // Ensure menu doesn't go off left edge
      if (x < 10) {
        x = 10
      }
      
      // Ensure menu doesn't go off top edge
      if (y < 10) {
        y = 10
      }
      
      setAdjustedPosition({ x, y })
    }
  }, [position])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: adjustedPosition.y,
        left: adjustedPosition.x,
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: 10000,
        minWidth: '200px',
        padding: '4px 0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <div style={{ padding: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit()
              } else if (e.key === 'Escape') {
                setIsEditing(false)
                onClose()
              }
            }}
            onBlur={handleSaveEdit}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          />
        </div>
      ) : (
        <>
          <div
            onClick={() => setIsEditing(true)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>✏️</span>
            <span>Edit</span>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          
          <div
            onClick={() => {
              onUpdate({ matchWholeWord: !keyword.matchWholeWord })
              onClose()
            }}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <input
              type="checkbox"
              checked={keyword.matchWholeWord}
              onChange={() => {}}
              style={{ pointerEvents: 'none' }}
            />
            <span>🔤 Whole word</span>
          </div>
          
          <div
            onClick={() => {
              onUpdate({ matchCase: !keyword.matchCase })
              onClose()
            }}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <input
              type="checkbox"
              checked={keyword.matchCase}
              onChange={() => {}}
              style={{ pointerEvents: 'none' }}
            />
            <span>🔠 Case sensitive</span>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          
          <div
            onClick={() => {
              onDelete()
              onClose()
            }}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#e74c3c',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>🗑️</span>
            <span>Delete</span>
          </div>
        </>
      )}
    </div>
  )
}
