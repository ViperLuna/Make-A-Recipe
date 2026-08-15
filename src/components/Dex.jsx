export default function Dex({ dex, onClose }) {
  const entries = Object.values(dex).sort(
    (a, b) => a.ingredientCount - b.ingredientCount || a.name.localeCompare(b.name)
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal dex-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Dex ({entries.length} discovered)</h3>
          <button onClick={onClose}>Close</button>
        </div>
        {entries.length === 0 && <p className="hint">Nothing discovered yet - go cook something.</p>}
        <ul className="dex-list">
          {entries.map((entry, i) => (
            <li key={i}>
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
