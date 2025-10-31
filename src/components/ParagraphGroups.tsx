import React from 'react'
import { useAppState } from '@/state/AppStateContext'
import ParagraphItem from './ParagraphItem'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export default function ParagraphGroups() {
  const { state, actions } = useAppState()

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.source.index === result.destination.index) return
    actions.reorderParagraphs(result.source.index, result.destination.index)
  }

  return (
    <div className="content">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="paragraphs">
          {(provided) => (
            <div className="paragraphs-list" {...provided.droppableProps} ref={provided.innerRef}>
              {state.paragraphs.map((p, i) => (
                <Draggable key={p.id} draggableId={p.id} index={i}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`paragraph-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <ParagraphItem 
                        paragraph={p} 
                        colorIndex={i}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="add-paragraph-container">
        <button className="add-group" onClick={actions.addParagraph}>+ Add Paragraph</button>
      </div>
    </div>
  )
}
