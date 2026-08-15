import { useEffect, useState } from 'react'
import { pullIngredient } from '../game/economy'

const TIER_COLORS = {
  white: '#e8e8e8',
  green: '#3ecf3e',
  blue: '#3e8ef5',
  purple: '#a24ef0',
  orange: '#f5923e',
  red: '#f53e3e',
}

// One independent spinner. All boxes share the same trigger and duration (so
// they start and finish together), but each rolls its own real result and its
// own filler frames - genuinely independent outcomes, not copies of each other.
function SpinnerBox({ ingredientsData, leverData, trigger, onResult }) {
  const [display, setDisplay] = useState(null)

  useEffect(() => {
    if (trigger === 0) return
    const realResult = pullIngredient(ingredientsData, leverData.basePullChance)
    const { startMs, endMs } = leverData.spinAnimation.flickerIntervalRange
    const totalMs = leverData.spinAnimation.baseDurationSeconds * 1000
    const startTime = performance.now()
    let timeoutId

    function tick() {
      const elapsed = performance.now() - startTime
      if (elapsed >= totalMs) {
        setDisplay(realResult)
        // Same deliberate rule as before: only fires on completion, so a result
        // from a previous spin stays buyable for the full duration of this one.
        onResult(realResult)
        return
      }
      const progress = elapsed / totalMs
      const interval = startMs + (endMs - startMs) * progress
      setDisplay(pullIngredient(ingredientsData, leverData.basePullChance))
      timeoutId = setTimeout(tick, interval)
    }
    tick()
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  return (
    <div className="lever-box" style={{ borderColor: display ? TIER_COLORS[display.tier] : '#888' }}>
      <span className="lever-word" style={{ color: display ? TIER_COLORS[display.tier] : '#888' }}>
        {display ? display.name.toUpperCase() : '???'}
      </span>
    </div>
  )
}

export default function Lever({ ingredientsData, leverData, mechanismCount, onResult }) {
  const [trigger, setTrigger] = useState(0)
  const [spinning, setSpinning] = useState(false)

  function pull() {
    if (spinning) return
    setSpinning(true)
    setTrigger((t) => t + 1)
    setTimeout(() => setSpinning(false), leverData.spinAnimation.baseDurationSeconds * 1000)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning])

  return (
    <div className="lever">
      <div className="lever-boxes">
        {Array.from({ length: mechanismCount }).map((_, i) => (
          <SpinnerBox
            key={i}
            ingredientsData={ingredientsData}
            leverData={leverData}
            trigger={trigger}
            onResult={(result) => onResult(i, result)}
          />
        ))}
      </div>
      <button onClick={pull} disabled={spinning}>
        {spinning ? 'Pulling...' : 'Pull Lever'}
      </button>
    </div>
  )
}
