import { useEffect, useState } from 'react'
import { ingredientCookSeconds, comboValue } from '../game/economy'

export default function Stove({ ingredient, onServe }) {
  const [remaining, setRemaining] = useState(null)
  const [completeAt, setCompleteAt] = useState(null)

  useEffect(() => {
    if (!ingredient) {
      setCompleteAt(null)
      setRemaining(null)
      return
    }
    const seconds = ingredientCookSeconds(ingredient.tier, 'white')
    const target = Date.now() + seconds * 1000
    setCompleteAt(target)
  }, [ingredient])

  useEffect(() => {
    if (!completeAt) return
    const id = setInterval(() => {
      const left = Math.max(0, completeAt - Date.now())
      setRemaining(left)
    }, 100)
    return () => clearInterval(id)
  }, [completeAt])

  const done = ingredient && remaining === 0

  return (
    <div className="stove">
      <h3>Basic Stove</h3>
      {!ingredient && <p>Empty - cook something from your inventory</p>}
      {ingredient && !done && (
        <p>
          Cooking {ingredient.name}... {(remaining / 1000).toFixed(1)}s left
        </p>
      )}
      {done && (
        <div>
          <p>{ingredient.name} is ready! Sell for ${comboValue([ingredient.price]).toFixed(2)}</p>
          <button onClick={() => onServe(comboValue([ingredient.price]))}>Serve & Sell</button>
        </div>
      )}
    </div>
  )
}
