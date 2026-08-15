import { mulberry32 } from './rng'

const ROTATION_MS = 5 * 60 * 1000

// Clock-aligned 5-minute rotation: everyone (well, just this one save, but the
// logic is the same) sees the same stock for the whole window, reseeded each
// time the window rolls over. Deterministic from the bucket number alone.
export function getShopStock(stovesData, stoveShopData, now = Date.now()) {
  const bucket = Math.floor(now / ROTATION_MS)
  const rand = mulberry32(bucket)
  const nextRotationAt = (bucket + 1) * ROTATION_MS

  const stock = stovesData.stoves
    .map((stove) => {
      const chance = stoveShopData.tierAppearanceChance[stove.tier]
      const available = chance === 'always in stock' ? true : rand() < chance
      if (!available) return null
      const [min, max] = stoveShopData.tierQuantityRange[stove.tier]
      const quantity = min + Math.floor(rand() * (max - min + 1))
      return { stove, quantity }
    })
    .filter(Boolean)

  return { stock, nextRotationAt }
}
