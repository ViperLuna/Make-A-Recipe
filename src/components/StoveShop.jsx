import { useEffect, useState } from 'react'
import { getShopStock } from '../game/shop'

const TIER_COLORS = {
  white: '#e8e8e8',
  green: '#3ecf3e',
  blue: '#3e8ef5',
  purple: '#a24ef0',
  orange: '#f5923e',
  red: '#f53e3e',
}

export default function StoveShop({ shopData, stovesData, cash, hasEmptyUnlockedSlot, onBuy }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { stock, nextRotationAt } = getShopStock(stovesData, shopData, now)
  const secondsLeft = Math.max(0, Math.round((nextRotationAt - now) / 1000))

  return (
    <div className="shop">
      <p className="shop-timer">Next restock in {secondsLeft}s</p>
      {!hasEmptyUnlockedSlot && (
        <p className="hint">All your unlocked slots are full - unlock or free one up to buy.</p>
      )}
      <ul className="shop-stock">
        {stock.map(({ stove, quantity }) => (
          <li key={stove.name} style={{ borderColor: TIER_COLORS[stove.tier] }}>
            <span className="shop-item-name" style={{ color: TIER_COLORS[stove.tier] }}>
              {stove.name.toUpperCase()}
            </span>
            <span className="shop-item-detail">
              {stove.slotCount} slot{stove.slotCount > 1 ? 's' : ''} - ${stove.price.toLocaleString()} - x{quantity}{' '}
              in stock
            </span>
            <button
              onClick={() => onBuy(stove)}
              disabled={cash < stove.price || !hasEmptyUnlockedSlot}
            >
              Buy
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
