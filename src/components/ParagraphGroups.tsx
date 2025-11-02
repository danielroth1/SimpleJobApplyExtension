import React from 'react'
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

export default function ParagraphGroups() {
  const { state, actions } = useAppState()
  
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

  return (
    <div className="content">
      {/* Top bar with collapse/expand all button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
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
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={state.paragraphs.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {state.paragraphs.map((p, i) => (
              <ParagraphItem 
                key={p.id}
                paragraph={p} 
                colorIndex={i}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="align-items-center mx-auto justify-content-center text-center">
        <button className="btn btn-outline-secondary" onClick={actions.addParagraph}>+ Add Paragraph</button>
      </div>
    </div>
  )
}
