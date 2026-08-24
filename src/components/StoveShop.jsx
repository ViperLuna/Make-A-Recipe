import { useEffect, useState } from 'react'
import { getShopStock, ROTATION_MS } from '../game/shop'
import { formatMoney } from '../game/format'

const TIER_COLORS = {
  white: '#e8e8e8',
  green: '#3ecf3e',
  blue: '#3e8ef5',
  purple: '#a24ef0',
  orange: '#f5923e',
  red: '#f53e3e',
}

export default function StoveShop({
  shopData,
  stovesData,
  cash,
  hasEmptyUnlockedSlot,
  onBuy,
  purchasedThisRotation,
  purchasedBucket,
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { stock, nextRotationAt } = getShopStock(stovesData, shopData, now)
  const secondsLeft = Math.max(0, Math.round((nextRotationAt - now) / 1000))
  // If the rotation has silently moved on since the last purchase, the
  // stored counts belong to a bucket that no longer exists - treat this
  // window as untouched rather than carrying stale counts into it.
  const currentBucket = Math.floor(now / ROTATION_MS)
  const purchased = currentBucket === purchasedBucket ? purchasedThisRotation : {}

  return (
    <div className="shop">
      <p className="shop-timer">Next restock in {secondsLeft}s</p>
      {!hasEmptyUnlockedSlot && (
        <p className="hint">All your unlocked slots are full - unlock or free one up to buy.</p>
      )}
      <ul className="shop-stock">
        {stock.map(({ stove, quantity }) => {
          const remaining = quantity - (purchased[stove.name] ?? 0)
          return (
            <li key={stove.name} style={{ borderColor: TIER_COLORS[stove.tier] }}>
              <span className="shop-item-name" style={{ color: TIER_COLORS[stove.tier] }}>
                {stove.name.toUpperCase()}
              </span>
              <span className="shop-item-detail">
                {stove.slotCount} slot{stove.slotCount > 1 ? 's' : ''} - {formatMoney(stove.price)} - x
                {Math.max(0, remaining)} in stock
              </span>
              <button
                className={cash < stove.price || !hasEmptyUnlockedSlot || remaining <= 0 ? 'disabled-look' : ''}
                onClick={() => onBuy(stove)}
                aria-disabled={cash < stove.price || !hasEmptyUnlockedSlot || remaining <= 0}
              >
                {remaining <= 0 ? 'Sold out' : 'Buy'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
