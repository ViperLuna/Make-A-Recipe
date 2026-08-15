import { useEffect, useState } from 'react'
import { comboValue } from '../game/economy'

export default function Stove({ stove, selected, onSelect, onStartCooking, onServe }) {
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
  const isFillable = !stove.cookCompleteAt && stove.contents.length < stove.maxSlots
  const canStart = !stove.cookCompleteAt && stove.contents.length > 0

  const value = isDone ? comboValue(stove.contents.map((i) => i.price)) : null

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
          <li key={i}>{item.name}</li>
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
          Start Cooking
        </button>
      )}

      {isDone && (
        <div>
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
