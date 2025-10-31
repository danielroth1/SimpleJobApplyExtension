import React, { useMemo, useState } from 'react'
import { useAppState } from '@/state/AppStateContext'
import ParagraphItem from './ParagraphItem'

export default function ParagraphGroups() {
  const { state, actions } = useAppState()
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  return (
    <div className="panel">
      <h3>Paragraphs</h3>
      <div className="content">
        <div className="groups">
          {state.groups.map((g, i) => (
            <div
              key={g.id}
              className="group"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === i) return
                actions.reorderGroups(dragIndex, i)
                setDragIndex(null)
              }}
            >
              <div className="drag-handle" title="Drag to reorder">⠿</div>
              {/* One drag icon per grouped container */}
              {g.paragraphs.map((p, pj) => (
                <ParagraphItem key={p.id} groupId={g.id} paragraph={p} colorIndex={state.groups.slice(0,i).reduce((acc, g0)=> acc + g0.paragraphs.length, 0) + pj} />
              ))}
            </div>
          ))}
        </div>
        <div>
          <button className="add-group" onClick={actions.addGroup}>+ Add Paragraph</button>
        </div>
      </div>
    </div>
  )
}
