import { pullIngredient } from './economy'

// A crate is just N independent lever pulls, sight-unseen - same odds, same
// luck bonus, just bought blind instead of one at a time.
export function rollCrate(count, ingredientsData, basePullChance, redBonus = 0, rand = Math.random) {
  const items = []
  for (let i = 0; i < count; i++) {
    items.push(pullIngredient(ingredientsData, basePullChance, redBonus, rand))
  }
  return items
}
