import React, { useState, useRef, useCallback } from 'react'
import { useAppState } from '@/state/AppStateContext'
import ParagraphItem from './ParagraphItem'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

export default function ParagraphGroups({ isCoverLetterVisible = false }: { isCoverLetterVisible?: boolean }) {
  const { state, actions } = useAppState()
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const updateInsertionIndexFromEvent = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const children = Array.from(containerRef.current.querySelectorAll('.paragraph-item')) as HTMLElement[]
    if (children.length === 0) { setInsertionIndex(0); return }
    
    const mouseY = e.clientY
    const threshold = 20 // pixels from edge to trigger insertion
    
    // Check position before first item
    const firstRect = children[0].getBoundingClientRect()
    if (mouseY < firstRect.top + threshold) {
      setInsertionIndex(0)
      return
    }
    
    // Check gaps between items - exclude checking after last item
    for (let i = 0; i < children.length - 1; i++) {
      const rect = children[i].getBoundingClientRect()
      const nextRect = children[i + 1].getBoundingClientRect()
      
      // Check bottom of current item
      if (mouseY > rect.bottom - threshold && mouseY < rect.bottom + threshold) {
        setInsertionIndex(i + 1)
        return
      }
      
      // Check gap between current and next
      if (mouseY > rect.bottom && mouseY < nextRect.top) {
        setInsertionIndex(i + 1)
        return
      }
    }
    
    setInsertionIndex(null)
  }, [])

  const handleClickInsertion = useCallback(() => {
    if (insertionIndex == null) return
    actions.addParagraphAt(insertionIndex)
    setInsertionIndex(null)
  }, [insertionIndex, actions])
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const oldIndex = state.paragraphs.findIndex(p => p.id === active.id)
    const newIndex = state.paragraphs.findIndex(p => p.id === over.id)
    
    if (oldIndex !== -1 && newIndex !== -1) {
      actions.reorderParagraphs(oldIndex, newIndex)
    }
  }

  const handleCollapseAll = () => {
    state.paragraphs.forEach(p => {
      if (!p.collapsed) {
        actions.updateParagraph(p.id, { collapsed: true })
      }
    })
  }

  const handleExpandAll = () => {
    state.paragraphs.forEach(p => {
      if (p.collapsed) {
        actions.updateParagraph(p.id, { collapsed: false })
      }
    })
  }

  const allCollapsed = state.paragraphs.every(p => p.collapsed)
  const allExpanded = state.paragraphs.every(p => !p.collapsed)

  // Filter paragraphs based on search text
  const filteredParagraphs = searchText.trim() 
    ? state.paragraphs.filter(p => 
        p.keywords.some(kw => kw.text.toLowerCase().includes(searchText.toLowerCase()))
      )
    : state.paragraphs

  return (
    <div className="content">
      {/* Top bar with search and collapse/expand all button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
        paddingBottom: '8px',
        marginLeft: '4px',
        borderBottom: '1px solid var(--border)'
      }}>

        <button 
          className="btn btn-outline-secondary btn-sm" 
          onClick={allExpanded ? handleCollapseAll : handleExpandAll}
          title={allExpanded ? 'Collapse all paragraphs' : 'Expand all paragraphs'}
        >
          {allExpanded ? '▲ Collapse All' : '▼ Expand All'}
        </button>
        
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Trigger filter (already automatic via state)
              } else if (e.key === 'Escape') {
                setSearchText('')
              }
            }}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '13px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--input-bg)',
              color: 'var(--text)',
            }}
          />
          <button 
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              // Search button - filter is automatic, but can clear if clicked when has text
              if (searchText.trim()) {
                // Already filtering, clicking again clears
                setSearchText('')
              }
            }}
            title={searchText.trim() ? 'Clear search' : 'Filter paragraphs by keyword'}
          >
            {searchText.trim() ? '✕' : '🔍'}
          </button>
        </div>
        
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredParagraphs.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={containerRef}
            onMouseMove={updateInsertionIndexFromEvent}
            onMouseLeave={() => setInsertionIndex(null)}
            onClick={(e) => {
              // Click on insertion line adds paragraph
              if ((e.target as HTMLElement).classList.contains('insertion-line') || (e.target as HTMLElement).classList.contains('insertion-plus')) {
                handleClickInsertion()
              }
            }}
            style={{ position: 'relative' }}
          >
            {filteredParagraphs.map((p, i) => {
              // Find original index for color assignment
              const originalIndex = state.paragraphs.findIndex(orig => orig.id === p.id)
              return (
                <React.Fragment key={p.id}>
                  {/* Insertion line before this item */}
                  {insertionIndex === i && (
                    <div 
                      className="insertion-line" 
                      style={{ 
                        position: 'absolute', 
                        transform: 'translateY(-7px)', /* compensate gap between paragraphs */
                        left: 0, 
                        right: 0,
                        height: '3px', 
                        background: state.darkMode ? 'hsl(210 100% 60%)' : 'hsl(210 100% 50%)', 
                        zIndex: 100,
                        top: i === 0 ? '4px' : 'undefined',
                        pointerEvents: 'none'
                      }}
                    >
                      <div 
                        className="insertion-plus" 
                        style={{ 
                          position: 'absolute', 
                          top: '50%', 
                          left: '50%', 
                          transform: 'translate(-50%, -50%)', 
                          width: 26, 
                          height: 26, 
                          borderRadius: '50%', 
                          background: state.darkMode ? 'hsl(210 100% 60%)' : 'hsl(210 100% 50%)', 
                          color: 'white',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: 20, 
                          cursor: 'pointer',
                          pointerEvents: 'all',
                          fontWeight: 'bold',
                          lineHeight: '1'
                        }}
                      >⊕</div>
                    </div>
                  )}
                  <ParagraphItem 
                    paragraph={p} 
                    colorIndex={originalIndex}
                    isCoverLetterVisible={isCoverLetterVisible}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
      <div className="align-items-center mx-auto justify-content-center text-center" style={{ marginBottom: '20px' }}>
        <button className="btn btn-outline-secondary" onClick={actions.addParagraph}>+ Add Paragraph</button>
      </div>
    </div>
  )
}
