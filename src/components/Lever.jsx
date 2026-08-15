import { useEffect, useRef, useState } from 'react'
import { pullIngredient } from '../game/economy'

const TIER_COLORS = {
  white: '#e8e8e8',
  green: '#3ecf3e',
  blue: '#3e8ef5',
  purple: '#a24ef0',
  orange: '#f5923e',
  red: '#f53e3e',
}

export default function Lever({ ingredientsData, leverData, onResult }) {
  const [spinning, setSpinning] = useState(false)
  const [display, setDisplay] = useState(null)
  const timeoutRef = useRef(null)

  function pull() {
    if (spinning) return
    setSpinning(true)

    const realResult = pullIngredient(ingredientsData, leverData.basePullChance)
    const { startMs, endMs } = leverData.spinAnimation.flickerIntervalRange
    const totalMs = leverData.spinAnimation.baseDurationSeconds * 1000

    const startTime = performance.now()

    function tick() {
      const elapsed = performance.now() - startTime
      if (elapsed >= totalMs) {
        setDisplay(realResult)
        setSpinning(false)
        // Deliberately only fires when the spin actually finishes: if the player
        // pulls again before buying the current result, that old result (and its
        // Buy button) stays live for the full duration of the new spin, giving
        // them a window to still buy it before this call overwrites it. Keep
        // this - it's an intentional kept "glitch," not a bug to fix.
        onResult(realResult)
        return
      }
      const progress = elapsed / totalMs
      const interval = startMs + (endMs - startMs) * progress
      const filler = pullIngredient(ingredientsData, leverData.basePullChance)
      setDisplay(filler)
      timeoutRef.current = setTimeout(tick, interval)
    }
    tick()
  }

  // Spacebar pulls the lever too, matching the button.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code === 'Space') {
        e.preventDefault()
        pull()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [spinning])

  return (
    <div className="lever">
      <div
        className="lever-box"
        style={{ borderColor: display ? TIER_COLORS[display.tier] : '#888' }}
      >
        <span
          className="lever-word"
          style={{ color: display ? TIER_COLORS[display.tier] : '#888' }}
        >
          {display ? display.name.toUpperCase() : '???'}
        </span>
      </div>
      <button onClick={pull} disabled={spinning}>
        {spinning ? 'Pulling...' : 'Pull Lever'}
      </button>
    </div>
  )
}
