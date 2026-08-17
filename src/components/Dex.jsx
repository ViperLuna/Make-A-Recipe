import { useState } from 'react'
import { formatNumber } from '../game/format'

const PAGE_SIZE = 1000

export default function Dex({ dex, totalPossible, onClose }) {
  const [page, setPage] = useState(0)

  const entries = Object.values(dex).sort(
    (a, b) => a.ingredientCount - b.ingredientCount || a.name.localeCompare(b.name)
  )
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal dex-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            Dex ({entries.length} / {formatNumber(totalPossible)} discovered)
          </h3>
          <button onClick={onClose}>Close</button>
        </div>
        {entries.length === 0 && <p className="hint">Nothing discovered yet - go cook something.</p>}

        {totalPages > 1 && (
          <div className="pager">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              Prev
            </button>
            <span>
              {page * PAGE_SIZE + 1}-{Math.min(entries.length, (page + 1) * PAGE_SIZE)} of {entries.length}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next
            </button>
          </div>
        )}

        <ul className="dex-list">
          {pageEntries.map((entry, i) => (
            <li key={page * PAGE_SIZE + i}>
              <span className="dex-name">{entry.name}</span>
              <span className="dex-ingredients">{entry.ingredientNames.join(', ')}</span>
              {entry.mutationsSeen.length > 0 && (
                <span className="dex-mutations">{entry.mutationsSeen.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
