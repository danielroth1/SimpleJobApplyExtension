import React, { useState, useRef, useMemo } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useAppState } from '../state/AppStateContext'
import { PDFItem } from '../state/types'

export default function CombinePDFsPage() {
  const { state, actions } = useAppState()
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pdfId: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replacingPdfId, setReplacingPdfId] = useState<string | null>(null)
  const [compressPopup, setCompressPopup] = useState<{ pdfId: string; } | null>(null)
  const [globalCompressPopup, setGlobalCompressPopup] = useState(false)
  
  // Image compression state
  const [imageCompressionEnabled, setImageCompressionEnabled] = useState(false)
  const [imageQuality, setImageQuality] = useState(0.8)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [maxHeight, setMaxHeight] = useState(1920)
  
  // PDF compression state
  const [pdfCompressionEnabled, setPdfCompressionEnabled] = useState(false)
  const [pdfCompressionLevel, setPdfCompressionLevel] = useState(2) // 0-3

  // Extract single image compression logic
  const compressSingleImage = async (
    dataUrl: string,
    quality: number,
    maxW: number,
    maxH: number
  ): Promise<string> => {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = dataUrl
    })

    let { width, height } = img
    if (width > maxW || height > maxH) {
      const ratio = Math.min(maxW / width, maxH / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')
    
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  }

  // Save compression settings for a single item
  const saveCompressionSettings = (pdfId: string) => {
    const item = state.pdfItems.find(p => p.id === pdfId)
    if (!item) return

    if (item.type === 'image') {
      actions.updatePdfItem(pdfId, {
        imageCompressionEnabled,
        imageQuality,
        maxWidth,
        maxHeight,
      })
    } else {
      actions.updatePdfItem(pdfId, {
        pdfCompressionEnabled,
        pdfCompressionLevel,
      })
    }
    setCompressPopup(null)
  }

  // Save global compression settings
  const saveGlobalCompressionSettings = () => {
    // Apply settings to all items
    state.pdfItems.forEach(item => {
      if (item.type === 'image' && imageCompressionEnabled) {
        actions.updatePdfItem(item.id, {
          imageCompressionEnabled: true,
          imageQuality,
          maxWidth,
          maxHeight,
        })
      } else if (item.type === 'pdf' && pdfCompressionEnabled) {
        actions.updatePdfItem(item.id, {
          pdfCompressionEnabled: true,
          pdfCompressionLevel,
        })
      }
    })
    setGlobalCompressPopup(false)
  }

  // Load PDF file
  const loadPDF = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      actions.addPdfItem(file.name, dataUrl, 'pdf')
    }
    reader.readAsDataURL(file)
  }

  // Load image file
  const loadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      actions.addPdfItem(file.name, dataUrl, 'image')
    }
    reader.readAsDataURL(file)
  }

  // Load file (PDF or image)
  const loadFile = async (file: File) => {
    if (file.type === 'application/pdf') {
      await loadPDF(file)
    } else if (file.type.startsWith('image/')) {
      await loadImage(file)
    } else {
      alert('Please select a PDF or image file (jpg, png, etc.)')
    }
  }

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => loadFile(file))
    }
    e.target.value = ''
  }

  // Handle replace file input
  const handleReplaceFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0] && replacingPdfId) {
      const file = files[0]
      const isPdf = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')
      
      if (!isPdf && !isImage) {
        alert('Please select a PDF or image file')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        actions.updatePdfItem(replacingPdfId, { 
          fileName: file.name, 
          dataUrl, 
          type: isPdf ? 'pdf' : 'image' 
        })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
    setReplacingPdfId(null)
  }

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverIndex(null)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => loadFile(file))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

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

    actions.reorderPdfItems(dragIndex, dropIndex)
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

  const deletePDF = (pdfId: string) => {
    actions.deletePdfItem(pdfId)
    closeContextMenu()
  }

  // Combine PDFs with compression
  const combinePDFs = async () => {
    if (state.pdfItems.length === 0) {
      alert('Please add at least one file')
      return
    }

    try {
      const mergedPdf = await PDFDocument.create()

      for (const item of state.pdfItems) {
        if (item.type === 'pdf') {
          let response = await fetch(item.dataUrl)
          let arrayBuffer = await response.arrayBuffer()
          
          // Note: PDF compression with compress-pdf requires Node.js/Ghostscript
          // For browser-based compression, we'd need a different solution
          // TODO: Implement browser-compatible PDF compression
          if (item.pdfCompressionEnabled && item.pdfCompressionLevel !== undefined) {
            console.warn('PDF compression not yet supported in browser environment')
          }
          
          const pdf = await PDFDocument.load(arrayBuffer)
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
          copiedPages.forEach((page) => mergedPdf.addPage(page))
        } else if (item.type === 'image') {
          let imageDataUrl = item.dataUrl
          
          // Apply image compression if enabled
          if (item.imageCompressionEnabled) {
            imageDataUrl = await compressSingleImage(
              item.dataUrl,
              item.imageQuality ?? 0.8,
              item.maxWidth ?? 1920,
              item.maxHeight ?? 1920
            )
          }
          
          const response = await fetch(imageDataUrl)
          const arrayBuffer = await response.arrayBuffer()
          
          let image
          if (imageDataUrl.startsWith('data:image/png')) {
            image = await mergedPdf.embedPng(arrayBuffer)
          } else if (imageDataUrl.startsWith('data:image/jpeg') || imageDataUrl.startsWith('data:image/jpg')) {
            image = await mergedPdf.embedJpg(arrayBuffer)
          } else {
            console.warn('Unsupported image type:', item.fileName)
            continue
          }
          
          const page = mergedPdf.addPage([image.width, image.height])
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          })
        }
      }

      const mergedPdfBytes = await mergedPdf.save()
      const blob = new Blob([mergedPdfBytes as unknown as BlobPart], { type: 'application/pdf' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'combined.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error combining files:', error)
      alert('Failed to combine files. Please try again.')
    }
  }

  // Close handlers
  React.useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // Compression popup components - memoized to prevent re-renders during slider interaction
  const ImageCompressionControls = useMemo(() => (
    <div style={{ marginBottom: 16 }}>
      {/* <h6 style={{ margin: 0, marginBottom: 8, color: 'var(--text)', fontSize: '14px', fontWeight: '600' }}>
        🖼️ Image Compression
      </h6> */}
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={imageCompressionEnabled}
            onChange={(e) => setImageCompressionEnabled(e.target.checked)}
          />
          <span>Apply image compression</span>
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, color: 'var(--text)', fontSize: '13px' }}>
          Quality: {Math.round(imageQuality * 100)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={imageQuality}
          onChange={(e) => setImageQuality(parseFloat(e.target.value))}
          style={{ width: '100%' }}
          disabled={!imageCompressionEnabled}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, color: 'var(--text)', fontSize: '13px' }}>
          Max Width: {maxWidth}px
        </label>
        <input
          type="range"
          min="480"
          max="3840"
          step="160"
          value={maxWidth}
          onChange={(e) => setMaxWidth(parseInt(e.target.value))}
          style={{ width: '100%' }}
          disabled={!imageCompressionEnabled}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, color: 'var(--text)', fontSize: '13px' }}>
          Max Height: {maxHeight}px
        </label>
        <input
          type="range"
          min="480"
          max="3840"
          step="160"
          value={maxHeight}
          onChange={(e) => setMaxHeight(parseInt(e.target.value))}
          style={{ width: '100%' }}
          disabled={!imageCompressionEnabled}
        />
      </div>
    </div>
  ), [imageCompressionEnabled, imageQuality, maxWidth, maxHeight])

  const PDFCompressionControls = useMemo(() => (
    <div style={{ marginBottom: 16 }}>
      <h6 style={{ margin: 0, marginBottom: 8, color: 'var(--text)', fontSize: '14px', fontWeight: '600' }}>
        📄 PDF Compression
      </h6>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pdfCompressionEnabled}
            onChange={(e) => setPdfCompressionEnabled(e.target.checked)}
          />
          <span>Apply PDF compression</span>
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, color: 'var(--text)', fontSize: '13px' }}>
          Compression Level: {['None', 'Low', 'Medium', 'High'][pdfCompressionLevel]}
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="1"
          value={pdfCompressionLevel}
          onChange={(e) => setPdfCompressionLevel(parseInt(e.target.value))}
          style={{ width: '100%' }}
          disabled={!pdfCompressionEnabled}
        />
      </div>
    </div>
  ), [pdfCompressionEnabled, pdfCompressionLevel])

  // Global compression popup (modal overlay like SiteRulesEditor) - memoized to prevent re-renders
  const GlobalCompressionPopup = useMemo(() => (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }} 
      onClick={() => setGlobalCompressPopup(false)}
    >
      <div 
        style={{
          background: 'var(--panel-bg)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '20px' }}>⚙️ Compression Options</h2>
          <button 
            onClick={() => setGlobalCompressPopup(false)} 
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text)',
              padding: '0',
              width: '32px',
              height: '32px',
            }}
          >×</button>
        </div>

        <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--muted)' }}>
          Configure compression settings for all files. Settings will be applied when you combine the files.
        </div>

        {ImageCompressionControls}
        
        <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
        
        {/* Not supported due to ghost script not available in browser */}
        {/* <PDFCompressionControls /> */}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            className="btn btn-primary"
            onClick={saveGlobalCompressionSettings}
            style={{ flex: 1 }}
          >
            Save Settings
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setGlobalCompressPopup(false)}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ), [ImageCompressionControls, saveGlobalCompressionSettings])

  return (
    <div className="combine-pdfs-page">
      <div 
        className="pdf-drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {state.pdfItems.length === 0 && (
          <div className="drop-zone-placeholder">
            <span className="drop-zone-icon">📄</span>
            <p>Drag and drop PDF or image files here</p>
            <p className="drop-zone-hint">or click the button below to add files</p>
          </div>
        )}

        <div className="pdf-preview-list">
          {state.pdfItems.map((item, index) => (
            <div
              key={item.id}
              className={`pdf-preview-item ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleItemDragStart(e, index)}
              onDragOver={(e) => handleItemDragOver(e, index)}
              onDrop={(e) => handleItemDrop(e, index)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
              title={item.fileName}
              style={{ position: 'relative' }}
            >
              <div className="pdf-preview-thumbnail">
                {item.type === 'image' ? (
                  <img src={item.dataUrl} alt={item.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <span className="pdf-icon" style={{ opacity: 0.3 }}>📄</span>
                )}
              </div>
              <div className="pdf-preview-name">{item.fileName}</div>
              {item.type === 'image' && (<button
                className="pdf-compress-button"
                onClick={(e) => {
                  e.stopPropagation()
                  // Load compression settings from item
                  if (item.type === 'image') {
                    setImageCompressionEnabled(item.imageCompressionEnabled ?? false)
                    setImageQuality(item.imageQuality ?? 0.8)
                    setMaxWidth(item.maxWidth ?? 1920)
                    setMaxHeight(item.maxHeight ?? 1920)
                  } else {
                    setPdfCompressionEnabled(item.pdfCompressionEnabled ?? false)
                    setPdfCompressionLevel(item.pdfCompressionLevel ?? 2)
                  }
                  setCompressPopup({ pdfId: item.id })
                }}
                title="Compression options"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  opacity: 0.8,
                }}
              >
                ⚙️
              </button>)}
            </div>
          ))}

          <button
            className="pdf-add-button"
            onClick={() => fileInputRef.current?.click()}
            title="Add PDF or image file"
          >
            <span className="pdf-add-icon">+</span>
            <span className="pdf-add-text">Add File</span>
          </button>
        </div>
      </div>

      <div className="combine-actions">
        <button
          className="btn btn-primary combine-btn"
          onClick={combinePDFs}
          disabled={state.pdfItems.length === 0}
          title="Combine all files into a single PDF"
        >
          <span className="combine-icon">🔗</span>
          <span>Combine to PDF</span>
        </button>
        
        <button
          className="btn btn-secondary combine-btn"
          onClick={() => {
            setImageCompressionEnabled(false)
            setImageQuality(0.8)
            setMaxWidth(1920)
            setMaxHeight(1920)
            setPdfCompressionEnabled(false)
            setPdfCompressionLevel(2)
            setGlobalCompressPopup(true)
          }}
          disabled={state.pdfItems.filter(item => item.type === 'image').length === 0}
          title="Compression options for all files"
          style={{ marginLeft: '8px' }}
        >
          <span className="combine-icon">⚙️</span>
          <span>Compression Options</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,image/*"
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
              closeContextMenu()
            }}
            title="Replace this file with another"
          >
            <span className="context-menu-icon">🔄</span>
            <span>Replace</span>
          </button>
          <button
            className="context-menu-item delete"
            onClick={() => deletePDF(contextMenu.pdfId)}
            title="Remove this file from the list"
          >
            <span className="context-menu-icon">🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}

      {compressPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }} 
          onClick={() => setCompressPopup(null)}
        >
          <div 
            style={{
              background: 'var(--panel-bg)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '18px' }}>⚙️ Compression Settings</h2>
              <button 
                onClick={() => setCompressPopup(null)} 
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                }}
              >×</button>
            </div>

            {ImageCompressionControls}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={() => saveCompressionSettings(compressPopup.pdfId)}
                style={{ flex: 1 }}
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setCompressPopup(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {globalCompressPopup && GlobalCompressionPopup}
    </div>
  )
}
