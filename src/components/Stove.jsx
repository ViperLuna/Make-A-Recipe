import { useEffect, useState } from 'react'
import { computeReadyDish } from '../game/dish'
import { formatMoney } from '../game/format'

export default function Stove({
  stove,
  selected,
  onSelect,
  onStartCooking,
  onServe,
  onRemove,
  onRemoveStove,
  wordMap,
  wordLists,
  sellMultiplier = 1,
}) {
  const [remaining, setRemaining] = useState(null)
  const [confirmingRemoveStove, setConfirmingRemoveStove] = useState(false)

  useEffect(() => {
    if (!stove.cookCompleteAt) {
      setRemaining(null)
      return
    }
    const id = setInterval(() => {
      setRemaining(Math.max(0, stove.cookCompleteAt - Date.now()))
    }, 100)
    return () => clearInterval(id)
  }, [stove.cookCompleteAt])

  const isCooking = stove.cookCompleteAt && remaining > 0
  const isDone = stove.cookCompleteAt && remaining === 0
  const isEditable = !stove.cookCompleteAt
  const isFillable = isEditable && stove.contents.length < stove.maxSlots
  const canStart = isEditable && stove.contents.length > 0

  // Drop the confirmation state if the player clicks away to another stove.
  useEffect(() => {
    if (!selected) setConfirmingRemoveStove(false)
  }, [selected])

  const ready = isDone ? computeReadyDish(stove, wordMap, wordLists, sellMultiplier) : null
  const comboEntries = ready?.comboEntries ?? null
  const value = ready?.value ?? null
  const dishName = ready?.dishName ?? null

  return (
    <div
      className={`stove-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(stove.id)}
    >
      <h3>{stove.name}</h3>
      <p className="slots">
        {stove.contents.length}/{stove.maxSlots} slots
      </p>
      <ul className="stove-contents">
        {stove.contents.map((item, i) => (
          <li key={i}>
            {item.name}
            {isEditable && (
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(stove.id, i)
                }}
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {isFillable &&
          Array.from({ length: stove.maxSlots - stove.contents.length }).map((_, i) => (
            <li key={`empty-${i}`} className="empty-slot">
              empty
            </li>
          ))}
      </ul>

      {isCooking && <p>Cooking... {(remaining / 1000).toFixed(1)}s left</p>}

      {canStart && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStartCooking(stove.id)
          }}
        >
          Cook
        </button>
      )}

      {isDone && (
        <div>
          {stove.mutation && (
            <p className="mutation-tag">
              {stove.mutation.name} ({stove.mutation.priceMultiplier}x)
            </p>
          )}
          <p className="dish-name">{dishName}</p>
          <p>Ready! Sell for {formatMoney(value)}</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onServe(stove.id, value, {
                dishName,
                comboEntries,
                ingredientNames: stove.contents.map((i) => i.name),
                mutation: stove.mutation,
              })
            }}
          >
            Serve & Sell
          </button>
        </div>
      )}

      {selected && isEditable && (
        <div className="remove-stove-section">
          {!confirmingRemoveStove ? (
            <button
              className="remove-stove-btn"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmingRemoveStove(true)
              }}
            >
              Remove Stove
            </button>
          ) : (
            <>
              <p className="confirm-text">Remove this stove?</p>
              <button
                className="confirm-remove-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveStove(stove.id)
                }}
              >
                Yes, remove it
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmingRemoveStove(false)
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
