import { useRef, useState } from 'react'
import { buildExportFile, parseImportFile } from '../game/saveExport'

export default function BackupPanel({ saveSnapshot, onImport, onClose }) {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [pendingImport, setPendingImport] = useState(null)

  async function handleExport() {
    try {
      const fileText = await buildExportFile(saveSnapshot)
      const blob = new Blob([fileText], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `make-a-recipe-save-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus({ kind: 'success', text: 'Save exported.' })
    } catch {
      setStatus({ kind: 'error', text: 'Export failed - try again.' })
    }
  }

  async function handleFileChosen(e) {
    const file = e.target.files[0]
    e.target.value = '' // lets the same file be re-chosen later if import is cancelled
    if (!file) return
    try {
      const text = await file.text()
      const parsed = await parseImportFile(text)
      setPendingImport(parsed)
      setStatus(null)
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  function confirmImport() {
    onImport(pendingImport)
    setPendingImport(null)
    setStatus({ kind: 'success', text: 'Save imported.' })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal backup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Backup Save</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <p className="hint">
          Your save only lives in this browser. Export a backup file before clearing site data,
          switching browsers, or moving to a new device, then import it here to restore.
        </p>

        <button onClick={handleExport}>Export Save</button>

        <button onClick={() => fileInputRef.current?.click()}>Import Save</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChosen}
          style={{ display: 'none' }}
        />

        {pendingImport && (
          <div className="backup-confirm">
            <p className="confirm-text">This will replace your current save. Are you sure?</p>
            <button className="confirm-remove-btn" onClick={confirmImport}>
              Yes, import
            </button>
            <button onClick={() => setPendingImport(null)}>Cancel</button>
          </div>
        )}

        {status && <p className={status.kind === 'error' ? 'confirm-text' : 'hint'}>{status.text}</p>}
      </div>
    </div>
  )
}
