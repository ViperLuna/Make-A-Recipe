import { useEffect, useState } from 'react'
import { formatMoney } from '../game/format'

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
  const totalPages = Math.max(1, Math.ceil(inventory.length / PAGE_SIZE))

  // If the array shrinks enough (adding a batch to a stove, etc.) that the
  // current page no longer exists, snap back to the last valid one instead
  // of showing an empty page while the pager still claims more exist.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1))
  }, [totalPages])

  const pageItems = inventory.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="inventory">
      <h3>
        Inventory ({inventory.length}/{maxInventory}
        {inventory.length >= maxInventory ? ' - FULL' : ''})
      </h3>
      {!selectedStove && <p className="hint">Select a stove above to add ingredients to it.</p>}
      {inventory.length === 0 && <p>Nothing yet - pull the lever and buy something.</p>}

      {totalPages > 1 && (
        <div className="pager">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Prev
          </button>
          <span>
            {page * PAGE_SIZE + 1}-{Math.min(inventory.length, (page + 1) * PAGE_SIZE)} of {inventory.length}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            Next
          </button>
        </div>
      )}

      <ul>
        {pageItems.map((item, i) => {
          const absoluteIndex = page * PAGE_SIZE + i
          return (
            <li
              key={absoluteIndex}
              className={hoveredInventoryIndex === absoluteIndex ? 'hovered' : ''}
              onMouseEnter={() => onHoverIndex(absoluteIndex)}
              onMouseLeave={() => onHoverIndex((idx) => (idx === absoluteIndex ? null : idx))}
            >
              {item.name} ({formatMoney(item.price)})
              {selectedStove && (
                <button onClick={() => onAdd(absoluteIndex)} disabled={!canAddToSelected}>
                  Add
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
