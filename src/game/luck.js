// Adds `bonus` to the red-tier weight, taken proportionally from the other
// tiers so the whole table still sums to 1. Same reallocation rule used for
// both the lever's tier odds and (later) mutation odds - one mechanism, two
// tables.
export function applyRedBonus(weights, bonus) {
  if (bonus <= 0) return weights
  const others = Object.keys(weights).filter((k) => k !== 'red')
  const othersTotal = others.reduce((sum, k) => sum + weights[k], 0)
  const result = { ...weights, red: weights.red + bonus }
  if (othersTotal <= 0) return result
  const shrink = Math.max(0, othersTotal - bonus) / othersTotal
  for (const k of others) result[k] = weights[k] * shrink
  return result
}
