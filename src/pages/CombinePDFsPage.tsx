import React, { useState, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'

interface PDFItem {
  id: string
  file: File
  previewUrl: string
}

export default function CombinePDFsPage() {
  const [pdfItems, setPdfItems] = useState<PDFItem[]>([])
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pdfId: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replacingPdfId, setReplacingPdfId] = useState<string | null>(null)

  // Generate preview for PDF
  const generatePreview = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        // For now, we'll use a placeholder. In a real implementation, 
        // you'd render the first page of the PDF to a canvas
        resolve(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    })
  }

  // Load PDF file
  const loadPDF = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    const previewUrl = await generatePreview(file)
    const newItem: PDFItem = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl
    }

    setPdfItems(prev => [...prev, newItem])
  }

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => loadPDF(file))
    }
    e.target.value = '' // Reset input
  }

  // Handle replace file input
  const handleReplaceFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0] && replacingPdfId) {
      replacePDF(replacingPdfId, files[0])
    }
    e.target.value = '' // Reset input
    setReplacingPdfId(null)
  }

  // Handle drag and drop for files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverIndex(null)

    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => loadPDF(file))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle drag and drop for reordering
  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleItemDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }

    setPdfItems(prev => {
      const newItems = [...prev]
      const [draggedItem] = newItems.splice(dragIndex, 1)
      newItems.splice(dropIndex, 0, draggedItem)
      return newItems
    })
    setDragOverIndex(null)
  }

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, pdfId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, pdfId })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const replacePDF = async (pdfId: string, newFile: File) => {
    if (newFile.type !== 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    const previewUrl = await generatePreview(newFile)
    setPdfItems(prev => prev.map(item => 
      item.id === pdfId ? { ...item, file: newFile, previewUrl } : item
    ))
    closeContextMenu()
  }

  const deletePDF = (pdfId: string) => {
    setPdfItems(prev => prev.filter(item => item.id !== pdfId))
    closeContextMenu()
  }

  // Combine PDFs
  const combinePDFs = async () => {
    if (pdfItems.length === 0) {
      alert('Please add at least one PDF')
      return
    }

    try {
      const mergedPdf = await PDFDocument.create()

      for (const item of pdfItems) {
        const arrayBuffer = await item.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      }

      const mergedPdfBytes = await mergedPdf.save()
      const blob = new Blob([mergedPdfBytes as unknown as BlobPart], { type: 'application/pdf' })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'combined.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error combining PDFs:', error)
      alert('Failed to combine PDFs. Please try again.')
    }
  }

  // Close context menu on click outside
  React.useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  return (
    <div className="combine-pdfs-page">
      <h2 className="page-title">Combine PDFs</h2>
      
      <div 
        className="pdf-drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {pdfItems.length === 0 && (
          <div className="drop-zone-placeholder">
            <span className="drop-zone-icon">📄</span>
            <p>Drag and drop PDF files here</p>
            <p className="drop-zone-hint">or click the button below to add files</p>
          </div>
        )}

        <div className="pdf-preview-list">
          {pdfItems.map((item, index) => (
            <div
              key={item.id}
              className={`pdf-preview-item ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleItemDragStart(e, index)}
              onDragOver={(e) => handleItemDragOver(e, index)}
              onDrop={(e) => handleItemDrop(e, index)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
              title={item.file.name}
            >
              <div className="pdf-preview-thumbnail">
                <span className="pdf-icon">📄</span>
              </div>
              <div className="pdf-preview-name">{item.file.name}</div>
            </div>
          ))}

          <button
            className="pdf-add-button"
            onClick={() => fileInputRef.current?.click()}
            title="Add PDF file"
          >
            <span className="pdf-add-icon">+</span>
            <span className="pdf-add-text">Load PDF</span>
          </button>
        </div>
      </div>

      <div className="combine-actions">
        <button
          className="btn btn-primary combine-btn"
          onClick={combinePDFs}
          disabled={pdfItems.length === 0}
          title="Combine all PDFs into a single file"
        >
          <span className="combine-icon">🔗</span>
          <span>Combine PDFs</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleReplaceFileInput}
        className="hidden"
      />

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              setReplacingPdfId(contextMenu.pdfId)
              replaceInputRef.current?.click()
            }}
            title="Replace this PDF with another file"
          >
            <span className="context-menu-icon">🔄</span>
            <span>Replace PDF</span>
          </button>
          <button
            className="context-menu-item delete"
            onClick={() => deletePDF(contextMenu.pdfId)}
            title="Remove this PDF from the list"
          >
            <span className="context-menu-icon">🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}
