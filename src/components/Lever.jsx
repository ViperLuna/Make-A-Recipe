import { useEffect, useRef, useState } from 'react'
import { pullIngredient } from '../game/economy'
import { formatMoney } from '../game/format'
import { playSfx } from '../game/audio'

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
function SpinnerBox({ ingredientsData, leverData, redBonus, trigger, resetSignal, onResult, isPrimary }) {
  const [display, setDisplay] = useState(null)
  const prevTriggerRef = useRef(trigger)

  useEffect(() => {
    // Rebirth bumps resetSignal without bumping trigger. Cleanup from the
    // previous run (below) has already cancelled any in-flight timeout at
    // this point, so just bail out here instead of starting a fresh spin -
    // otherwise a spin left running across a rebirth would eventually report
    // a result computed from stale pre-rebirth data (old redBonus, etc.)
    // straight into the just-reset pulledResults.
    const isNewTrigger = trigger !== prevTriggerRef.current
    prevTriggerRef.current = trigger
    if (!isNewTrigger) {
      setDisplay(null)
      return
    }
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
        if (isPrimary) playSfx('reelTick')
        // Same deliberate rule as before: only fires on completion, so a result
        // from a previous spin stays buyable for the full duration of this one.
        onResult(realResult)
        return
      }
      const progress = elapsed / totalMs
      const interval = startMs + (endMs - startMs) * progress
      setDisplay(pullIngredient(ingredientsData, leverData.basePullChance, redBonus))
      if (isPrimary) playSfx('reelTick')
      timeoutId = setTimeout(tick, interval)
    }
    tick()
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, resetSignal])

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
  totalMechanismSlots,
  mechanismSlotsData,
  onUnlockMechanism,
  redBonus = 0,
  onResult,
  pulledResults,
  cash,
  onBuy,
  onAutoBuy,
  inventoryFull = false,
  resetSignal,
  // Auto Pull/Auto Buy toggles and their input fields are rendered in
  // Settings now (see SettingsPanel) - the state lives in App.jsx and is
  // only read here. The effects that actually drive pulling/buying stay in
  // this component, since they need pull()/spinning, which are intrinsically
  // local to its own spin-animation state.
  autoPull,
  autoPullThreshold,
  autoBuy,
  autoBuyMin,
  autoBuyMax,
}) {
  const [trigger, setTrigger] = useState(0)
  const [spinning, setSpinning] = useState(false)
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
  // of pulling again. A result always has to be affordable to trigger a
  // pause (no point stopping for something you can't buy anyway); with a
  // number in the threshold field, it additionally has to be priced at
  // least that high, so the player can let it run past cheap-but-affordable
  // stuff and only stop for something big. Buying the offending result (or
  // overwriting it with a manual pull) changes pulledResults, which re-runs
  // this effect and lets it resume.
  useEffect(() => {
    if (!autoPull || spinning) return
    const threshold = autoPullThreshold.trim() === '' ? null : Number(autoPullThreshold)
    const shouldWait = pulledResults.some((item) => {
      if (!item || cash < item.price) return false
      return threshold != null ? item.price >= threshold : true
    })
    if (shouldWait) return
    pull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPull, spinning, pulledResults, cash, autoPullThreshold])

  // Auto Buy: whenever a pulled result sits there matching the [min, max]
  // price range (either side blank means no bound on that side; both blank
  // buys anything affordable), buys it automatically - working left to
  // right across the reels with a single running cash total, same as the R
  // hotkey's buy-all (see buyAllPulled in App.jsx). No per-reel range: one
  // pair of thresholds covers every reel.
  useEffect(() => {
    if (!autoBuy) return
    const min = autoBuyMin.trim() === '' ? null : Number(autoBuyMin)
    const max = autoBuyMax.trim() === '' ? null : Number(autoBuyMax)
    onAutoBuy(min, max)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBuy, pulledResults, cash, autoBuyMin, autoBuyMax])

  // Rebirth (resetSignal = rebirthCount) can land mid-spin. Un-stick the
  // button immediately rather than waiting for the (now possibly-orphaned)
  // spin to report - the boxes themselves independently cancel their own
  // stale timers off the same signal (see SpinnerBox). The Auto Pull/Auto
  // Buy threshold fields reset alongside everything else rebirth wipes, in
  // doRebirth (App.jsx), since that's where their state actually lives now.
  useEffect(() => {
    setSpinning(false)
    resultsInRef.current = 0
  }, [resetSignal])

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
        {Array.from({ length: totalMechanismSlots }).map((_, i) => {
          if (i >= mechanismCount) {
            // Not unlocked yet. Only the very next slot in line has a real
            // price - the ones after it stay a plain "Locked" (no price,
            // nothing to click through to) until their predecessor is
            // bought, matching onUnlockMechanism's own in-order guard.
            const isNext = i === mechanismCount
            const cost = mechanismSlotsData[`slot${i + 1}`]?.cost ?? 0
            return (
              <div className="lever-slot" key={i}>
                <div className="lever-box locked-box" />
                <div className="lever-buy-slot">
                  <button
                    className={!isNext || cash < cost ? 'disabled-look' : ''}
                    onClick={() => onUnlockMechanism(i)}
                    aria-disabled={!isNext || cash < cost}
                  >
                    {isNext ? `Unlock for ${formatMoney(cost)}` : 'Locked'}
                  </button>
                </div>
              </div>
            )
          }
          return (
            <div className="lever-slot" key={i}>
              <SpinnerBox
                ingredientsData={ingredientsData}
                leverData={leverData}
                redBonus={redBonus}
                trigger={trigger}
                resetSignal={resetSignal}
                onResult={(result) => handleBoxResult(i, result)}
                isPrimary={i === 0}
              />
              <div className="lever-buy-slot">
                {pulledResults[i] && (
                  <button
                    className={cash < pulledResults[i].price || inventoryFull ? 'disabled-look' : ''}
                    onClick={() => onBuy(i)}
                    aria-disabled={cash < pulledResults[i].price || inventoryFull}
                  >
                    {inventoryFull ? 'Inventory full' : `Buy for ${formatMoney(pulledResults[i].price)}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="lever-controls">
        <button className={spinning ? 'disabled-look' : ''} onClick={pull} aria-disabled={spinning}>
          {spinning ? 'Pulling...' : 'Pull Lever'}
        </button>
      </div>
    </div>
  )
}
