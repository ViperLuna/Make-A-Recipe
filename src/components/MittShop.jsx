import { useEffect, useState } from 'react'
import { getMittShopStock } from '../game/shop'

const TIER_COLORS = {
  white: '#e8e8e8',
  green: '#3ecf3e',
  blue: '#3e8ef5',
  purple: '#a24ef0',
  orange: '#f5923e',
  red: '#f53e3e',
}

export default function MittShop({ mittsData, shopData, luckData, cash, equippedMittTier, onEquip }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { stock, nextRotationAt } = getMittShopStock(mittsData, shopData, now)
  const secondsLeft = Math.max(0, Math.round((nextRotationAt - now) / 1000))

  return (
    <div className="shop">
      <p className="shop-timer">Next restock in {secondsLeft}s</p>
      {equippedMittTier && (
        <p className="hint">
          Currently equipped: <strong style={{ color: TIER_COLORS[equippedMittTier] }}>{equippedMittTier}</strong>
        </p>
      )}
      <ul className="shop-stock">
        {stock.map((mitt) => (
          <li key={mitt.tier} style={{ borderColor: TIER_COLORS[mitt.tier] }}>
            <span className="shop-item-name" style={{ color: TIER_COLORS[mitt.tier] }}>
              {mitt.name.toUpperCase()}
            </span>
            <span className="shop-item-detail">
              ${mitt.price.toLocaleString()} - +{(luckData.mittRedBonus[mitt.tier] * 100).toFixed(0)}% red chance
            </span>
            <button
              onClick={() => onEquip(mitt)}
              disabled={cash < mitt.price || mitt.tier === equippedMittTier}
            >
              {mitt.tier === equippedMittTier ? 'Equipped' : 'Buy & Equip'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
