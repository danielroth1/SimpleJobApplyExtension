import React, { useState } from 'react'

export default function ModalPrompt({ title, placeholder, onSubmit, onCancel }: { title: string, placeholder?: string, onSubmit: (value: string)=>void, onCancel: ()=>void }) {
  const [value, setValue] = useState('')
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h4>{title}</h4>
        <input autoFocus placeholder={placeholder} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') onSubmit(value) }} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={()=> onSubmit(value)}>Add</button>
        </div>
      </div>
    </div>
  )
}
