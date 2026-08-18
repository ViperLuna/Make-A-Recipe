import { useEffect, useRef, useState } from 'react'
import { pullIngredient } from '../game/economy'
import { formatMoney } from '../game/format'

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
function SpinnerBox({ ingredientsData, leverData, redBonus, trigger, onResult }) {
  const [display, setDisplay] = useState(null)

  useEffect(() => {
    if (trigger === 0) return
    const realResult = pullIngredient(ingredientsData, leverData.basePullChance, redBonus)
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
      setDisplay(pullIngredient(ingredientsData, leverData.basePullChance, redBonus))
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

export default function Lever({
  ingredientsData,
  leverData,
  mechanismCount,
  redBonus = 0,
  onResult,
  pulledResults,
  cash,
  onBuy,
  inventoryFull = false,
}) {
  const [trigger, setTrigger] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [autoPull, setAutoPull] = useState(false)
  const [autoPullThreshold, setAutoPullThreshold] = useState('')
  // Counts real results in for the in-flight trigger, so "spinning" clears
  // only once every box has actually reported - not on a guessed timer. A
  // second independent timer here used to drift out of sync with each
  // SpinnerBox's own animation (which can overshoot by up to its slowest
  // flicker interval), letting a held-down pull sneak in and cancel the
  // in-flight result before it ever reported.
  const resultsInRef = useRef(0)

  function pull() {
    if (spinning) return
    setSpinning(true)
    resultsInRef.current = 0
    setTrigger((t) => t + 1)
  }

  function handleBoxResult(i, result) {
    onResult(i, result)
    resultsInRef.current += 1
    if (resultsInRef.current >= mechanismCount) setSpinning(false)
  }

  // Auto Pull: once a spin settles, keeps pulling on its own - unless a
  // landed result meets the stop condition, in which case it waits instead
  // of pulling again. With the threshold field blank, the stop condition is
  // "any landed result is affordable right now"; with a number in it, the
  // condition is "any landed result's price is at least that number", so the
  // player can let it run past cheap stuff and only stop for something big.
  // Buying the offending result (or overwriting it with a manual pull)
  // changes pulledResults, which re-runs this effect and lets it resume.
  useEffect(() => {
    if (!autoPull || spinning) return
    const threshold = autoPullThreshold.trim() === '' ? null : Number(autoPullThreshold)
    const shouldWait = pulledResults.some((item) => {
      if (!item) return false
      return threshold != null ? item.price >= threshold : cash >= item.price
    })
    if (shouldWait) return
    pull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPull, spinning, pulledResults, cash, autoPullThreshold])

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
          <div className="lever-slot" key={i}>
            <SpinnerBox
              ingredientsData={ingredientsData}
              leverData={leverData}
              redBonus={redBonus}
              trigger={trigger}
              onResult={(result) => handleBoxResult(i, result)}
            />
            <div className="lever-buy-slot">
              {pulledResults[i] && (
                <button onClick={() => onBuy(i)} disabled={cash < pulledResults[i].price || inventoryFull}>
                  {inventoryFull ? 'Inventory full' : `Buy for ${formatMoney(pulledResults[i].price)}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="lever-controls">
        <button onClick={pull} disabled={spinning}>
          {spinning ? 'Pulling...' : 'Pull Lever'}
        </button>
        <button
          className={`auto-pull-toggle${autoPull ? ' active' : ''}`}
          onClick={() => setAutoPull((o) => !o)}
        >
          Auto Pull: {autoPull ? 'On' : 'Off'}
        </button>
        {autoPull && (
          <input
            type="number"
            className="auto-pull-threshold"
            placeholder="Stop at price..."
            min="0"
            value={autoPullThreshold}
            onChange={(e) => setAutoPullThreshold(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}
