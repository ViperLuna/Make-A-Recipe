import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { computeReadyDish } from '../game/dish'
import { formatMoney } from '../game/format'
import { playSfx } from '../game/audio'

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

  // useLayoutEffect, not useEffect: a plain effect runs after the browser
  // has already painted, so the render where cookCompleteAt just became
  // truthy but remaining hadn't been reseeded yet (still null, coerced to 0
  // in the progress-bar math) got painted as a real frame - a brief full-bar
  // flash - before the correction landed on the next one. Layout effects run
  // synchronously before paint, so that stale frame is never shown at all.
  useLayoutEffect(() => {
    if (!stove.cookCompleteAt) {
      setRemaining(null)
      return
    }
    setRemaining(Math.max(0, stove.cookCompleteAt - Date.now()))
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

  // Only computable when cookStartedAt was actually recorded (a save from
  // before this field existed, resumed mid-cook, won't have it) - in that
  // case just skip the bar entirely rather than guess a start time and show
  // a misleading fill amount.
  const totalCookMs = stove.cookStartedAt ? stove.cookCompleteAt - stove.cookStartedAt : null
  const showProgress = stove.cookCompleteAt && totalCookMs > 0
  const progress = isDone ? 1 : showProgress ? Math.min(1, (totalCookMs - remaining) / totalCookMs) : 0

  // Only rings for a completion witnessed live (isCooking observed before
  // isDone) - otherwise reloading the page onto an already-finished stove
  // (cookCompleteAt restored from a save, remaining computed as 0 on the
  // very first tick) would ring the bell for something that finished while
  // nobody was watching.
  const wasDoneRef = useRef(false)
  const sawCookingRef = useRef(false)
  useEffect(() => {
    sawCookingRef.current = false
    wasDoneRef.current = false
  }, [stove.cookCompleteAt])
  useEffect(() => {
    if (isCooking) sawCookingRef.current = true
    if (isDone && !wasDoneRef.current && sawCookingRef.current) playSfx('timerBell')
    wasDoneRef.current = isDone
  }, [isCooking, isDone])

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

      {showProgress && (
        <div className="cook-progress">
          <div className="cook-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

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
            Sell for {formatMoney(value)}
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
