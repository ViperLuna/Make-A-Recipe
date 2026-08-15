import { mulberry32 } from './rng'

const ROTATION_MS = 5 * 60 * 1000

function rotationRand(now) {
  const bucket = Math.floor(now / ROTATION_MS)
  return { rand: mulberry32(bucket), nextRotationAt: (bucket + 1) * ROTATION_MS }
}

// Clock-aligned 5-minute rotation: everyone (well, just this one save, but the
// logic is the same) sees the same stock for the whole window, reseeded each
// time the window rolls over. Deterministic from the bucket number alone.
export function getShopStock(stovesData, stoveShopData, now = Date.now()) {
  const { rand, nextRotationAt } = rotationRand(now)

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

// Same rotation window as the stove shop, but mitts are a single permanent
// item per tier (not something you'd ever want multiple of), so there's no
// quantity concept here - just available or not this window.
export function getMittShopStock(mittsData, stoveShopData, now = Date.now()) {
  const { rand, nextRotationAt } = rotationRand(now)

  const stock = mittsData.mitts.filter((mitt) => {
    const chance = stoveShopData.tierAppearanceChance[mitt.tier]
    return chance === 'always in stock' ? true : rand() < chance
  })

  return { stock, nextRotationAt }
}
