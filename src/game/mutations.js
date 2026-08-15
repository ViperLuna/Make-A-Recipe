// Two-stage roll from mutation-odds.json. No luck bonuses applied yet - core loop only.
// Returns null for a plain (unmutated) dish, or { name, priceMultiplier }.
export function rollMutation(mutationOddsData, mutationsData, rand = Math.random) {
  const willMutate = rand() < mutationOddsData.stage1_willItMutate.chance
  if (!willMutate) return null

  const weights = mutationOddsData.stage2_whichMutation.baseWeights
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = rand() * total
  let chosenKey = entries[entries.length - 1][0]
  for (const [key, weight] of entries) {
    roll -= weight
    if (roll <= 0) {
      chosenKey = key
      break
    }
  }

  const mutation = mutationsData.mutations.find(
    (m) => m.name.toLowerCase() === chosenKey.toLowerCase()
  )
  return mutation ? { name: mutation.name, priceMultiplier: mutation.priceMultiplier } : null
}
