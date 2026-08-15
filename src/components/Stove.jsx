import { useEffect, useState } from 'react'
import { comboValue } from '../game/economy'
import { nameDish, toComboEntries } from '../game/naming'

export default function Stove({
  stove,
  selected,
  onSelect,
  onStartCooking,
  onServe,
  onRemove,
  wordMap,
  wordLists,
}) {
  const [remaining, setRemaining] = useState(null)

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

  const value = isDone ? comboValue(stove.contents.map((i) => i.price)) : null
  const dishName = isDone
    ? nameDish(toComboEntries(stove.contents.map((i) => i.index)), wordMap, wordLists)
    : null

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
          <p className="dish-name">{dishName}</p>
          <p>Ready! Sell for ${value.toFixed(2)}</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onServe(stove.id, value)
            }}
          >
            Serve & Sell
          </button>
        </div>
      )}
    </div>
  )
}
