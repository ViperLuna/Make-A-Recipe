import { useEffect, useState } from 'react'
import { getMittShopStock } from '../game/shop'
import { TIER_INDEX } from '../game/economy'
import { formatMoney } from '../game/format'

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
        {stock.map((mitt) => {
          const isEquipped = mitt.tier === equippedMittTier
          const isDowngrade = equippedMittTier != null && TIER_INDEX[mitt.tier] < TIER_INDEX[equippedMittTier]
          return (
            <li key={mitt.tier} style={{ borderColor: TIER_COLORS[mitt.tier] }}>
              <span className="shop-item-name" style={{ color: TIER_COLORS[mitt.tier] }}>
                {mitt.name.toUpperCase()}
              </span>
              <span className="shop-item-detail">
                {formatMoney(mitt.price)} - +{(luckData.mittRedBonus[mitt.tier] * 100).toFixed(0)}% red chance
              </span>
              <button
                className={cash < mitt.price || isEquipped || isDowngrade ? 'disabled-look' : ''}
                onClick={() => onEquip(mitt)}
                aria-disabled={cash < mitt.price || isEquipped || isDowngrade}
              >
                {isEquipped ? 'Equipped' : isDowngrade ? 'Downgrade' : 'Buy & Equip'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
