import { pullIngredient } from './economy'

// A crate is just N independent lever pulls, sight-unseen - same odds, same
// luck bonus, just bought blind instead of one at a time. No affordability
// bias here (cash is null, chance is 0) - you've already paid for the crate
// up front, so biasing its contents toward what you can afford doesn't mean
// anything the way it does for a live lever pull.
export function rollCrate(count, ingredientsData, basePullChance, redBonus = 0, rand = Math.random) {
  const items = []
  for (let i = 0; i < count; i++) {
    items.push(pullIngredient(ingredientsData, basePullChance, redBonus, null, 0, rand))
  }
  return items
}
