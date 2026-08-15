import { useState } from 'react'
import { rebirthCost, sellValueMultiplier } from '../game/rebirth'
import { formatMoney } from '../game/format'

export default function RebirthPanel({ rebirthData, rebirthCount, cash, onRebirth, onClose }) {
  const [confirming, setConfirming] = useState(false)
  const cost = rebirthCost(rebirthCount, rebirthData)
  const currentMult = sellValueMultiplier(rebirthCount, rebirthData)
  const nextMult = sellValueMultiplier(rebirthCount + 1, rebirthData)
  const canAfford = cash >= cost

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal rebirth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Rebirth</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <p>Rebirths so far: {rebirthCount}</p>
        <p>Current sell value multiplier: {currentMult.toFixed(2)}x</p>
        <p>Next rebirth cost: {formatMoney(cost)}</p>
        <p className="hint">
          Rebirthing wipes your cash, inventory, stove grid, lever mechanism slots, and equipped
          mitt back to a fresh game. Your Dex and any active potions are kept. In exchange, sell
          value permanently rises to {nextMult.toFixed(2)}x.
        </p>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!canAfford}>
            Rebirth for {formatMoney(cost)}
          </button>
        ) : (
          <>
            <p className="confirm-text">
              This resets almost everything. Are you sure?
            </p>
            <button
              className="confirm-remove-btn"
              onClick={() => {
                onRebirth()
                setConfirming(false)
              }}
            >
              Yes, rebirth
            </button>
            <button onClick={() => setConfirming(false)}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}
