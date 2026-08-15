import { weightedPick } from './rng'
import { applyRedBonus } from './luck'

export const TIER_ORDER = ['white', 'green', 'blue', 'purple', 'orange', 'red']
export const TIER_INDEX = Object.fromEntries(TIER_ORDER.map((t, i) => [t, i]))

// Picks a random ingredient from ingredients.json, honoring lever.json's basePullChance
// tier weights, shifted toward red by redBonus (equipped mitt's mittRedBonus from luck.json).
// The returned object carries its stable array index (needed by naming.js's word map).
export function pullIngredient(ingredientsData, basePullChance, redBonus = 0, rand = Math.random) {
  // basePullChance also carries a "note" documentation string in the JSON file -
  // only pull actual tier weights out of it, never trust every key blindly.
  const baseWeights = Object.fromEntries(TIER_ORDER.map((t) => [t, basePullChance[t]]))
  const weights = applyRedBonus(baseWeights, redBonus)
  const tier = weightedPick(weights, rand)
  const pool = ingredientsData.ingredients
    .map((ing, index) => ({ ...ing, index }))
    .filter((ing) => ing.tier === tier)
  const choice = pool[Math.floor(rand() * pool.length)]
  return choice
}

// Cook time formula: baseSeconds * 2^(ingredientTier - stoveTier), from the design doc.
// A stove holds multiple slots; total time is the sum of each occupied slot's time.
export function ingredientCookSeconds(ingredientTier, stoveTier, baseSeconds = 5) {
  const delta = TIER_INDEX[ingredientTier] - TIER_INDEX[stoveTier]
  return baseSeconds * Math.pow(2, delta)
}

export function totalCookSeconds(ingredientTiers, stoveTier, baseSeconds = 5) {
  return ingredientTiers.reduce(
    (sum, tier) => sum + ingredientCookSeconds(tier, stoveTier, baseSeconds),
    0
  )
}

// Dish combo value formula from dish-value.json: sum(costs) * (1 + 0.15 * count).
export function comboValue(ingredientCosts) {
  const sum = ingredientCosts.reduce((a, b) => a + b, 0)
  const n = ingredientCosts.length
  return sum * (1 + 0.15 * n)
}
