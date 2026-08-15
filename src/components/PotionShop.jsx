import { useEffect, useState } from 'react'
import { formatMoney } from '../game/format'

function PotionList({ title, potions, activePotion, cash, onBuy }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remainingMs = activePotion ? Math.max(0, activePotion.expiresAt - now) : 0
  const isActive = activePotion && remainingMs > 0

  return (
    <div className="potion-list">
      <h4>{title}</h4>
      {isActive && (
        <p className="hint">
          Active: rank {activePotion.rank} - {Math.ceil(remainingMs / 1000)}s left
        </p>
      )}
      <ul className="shop-stock">
        {potions.map((p) => (
          <li key={p.rank}>
            <span className="shop-item-name">{p.name}</span>
            <span className="shop-item-detail">
              {formatMoney(p.price)} - {p.durationMinutes.toFixed(2)} min -{' '}
              {p.redBonus != null ? `+${(p.redBonus * 100).toFixed(0)}% red` : `${p.cookSpeedMultiplier}x speed`}
            </span>
            <button onClick={() => onBuy(p)} disabled={cash < p.price}>
              Buy
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PotionShop({ potionsData, activePotions, cash, onBuyLuck, onBuySpeed }) {
  return (
    <div className="shop">
      <PotionList
        title="Luck Potions"
        potions={potionsData.luckPotions}
        activePotion={activePotions.luck}
        cash={cash}
        onBuy={onBuyLuck}
      />
      <PotionList
        title="Speed Potions"
        potions={potionsData.speedPotions}
        activePotion={activePotions.speed}
        cash={cash}
        onBuy={onBuySpeed}
      />
    </div>
  )
}
