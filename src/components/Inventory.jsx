import { useEffect, useState } from 'react'
import { formatMoney } from '../game/format'
import { SORT_FIELDS, sortInventory } from '../game/inventorySort'

const PAGE_SIZE = 100

export default function Inventory({
  inventory,
  maxInventory,
  selectedStove,
  canAddToSelected,
  hoveredInventoryIndex,
  onHoverIndex,
  onAdd,
}) {
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState('purchased')
  const [sortDir, setSortDir] = useState('asc')

  const sorted = sortInventory(inventory, sortField, sortDir)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  // If the array shrinks enough (adding a batch to a stove, etc.) that the
  // current page no longer exists, snap back to the last valid one instead
  // of showing an empty page while the pager still claims more exist.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1))
  }, [totalPages])

  // Re-anchor to page 1 whenever the sort itself changes - landing on a
  // stale page number after resorting would show unrelated items.
  useEffect(() => {
    setPage(0)
  }, [sortField, sortDir])

  const pageEntries = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="inventory">
      <h3>
        Inventory ({inventory.length}/{maxInventory}
        {inventory.length >= maxInventory ? ' - FULL' : ''})
      </h3>
      {!selectedStove && <p className="hint">Select a stove above to add ingredients to it.</p>}
      {inventory.length === 0 && <p>Nothing yet - pull the lever and buy something.</p>}

      {inventory.length > 0 && (
        <div className="inventory-sort">
          <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
            {SORT_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <button onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
            {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Prev
          </button>
          <span>
            {page * PAGE_SIZE + 1}-{Math.min(sorted.length, (page + 1) * PAGE_SIZE)} of {sorted.length}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            Next
          </button>
        </div>
      )}

      <ul>
        {pageEntries.map(({ item, index }) => (
          <li
            key={index}
            className={hoveredInventoryIndex === index ? 'hovered' : ''}
            onMouseEnter={() => onHoverIndex(index)}
            onMouseLeave={() => onHoverIndex((idx) => (idx === index ? null : idx))}
          >
            {item.name} ({formatMoney(item.price)})
            {selectedStove && (
              <button onClick={() => onAdd(index)} disabled={!canAddToSelected}>
                Add
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
