import { useEffect, useState } from 'react'

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function ActivePotions({ activePotions, potionsData }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const luck = activePotions.luck && activePotions.luck.expiresAt > now ? activePotions.luck : null
  const speed = activePotions.speed && activePotions.speed.expiresAt > now ? activePotions.speed : null

  if (!luck && !speed) return null

  return (
    <div className="active-potions">
      {luck && (
        <span className="active-potion">
          {potionsData.luckPotions[luck.rank - 1].name}: {formatRemaining(luck.expiresAt - now)}
        </span>
      )}
      {speed && (
        <span className="active-potion">
          {potionsData.speedPotions[speed.rank - 1].name}: {formatRemaining(speed.expiresAt - now)}
        </span>
      )}
    </div>
  )
}
