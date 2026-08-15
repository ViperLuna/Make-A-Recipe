import { seededShuffle, hashString } from './rng'

const SEED = 1

// Each ingredient (by its stable index in ingredients.json) gets exactly one
// descriptor word forever, via a seeded shuffle. Deterministic, collision-free,
// and stable even if more ingredients are appended later (existing indices keep
// their word as long as new ingredients are only ever added at the end).
export function buildIngredientWordMap(ingredientCount, descriptors) {
  const shuffled = seededShuffle(descriptors, SEED)
  const map = []
  for (let i = 0; i < ingredientCount; i++) {
    map.push(shuffled[i % shuffled.length])
  }
  return map
}

// comboEntries: array of { ingredientIndex, count } for the ingredients in a dish,
// already sorted by ingredientIndex (so order is canonical regardless of pull order).
export function nameDish(comboEntries, wordMap, wordLists) {
  const parts = comboEntries.map(({ ingredientIndex, count }) => {
    const word = wordMap[ingredientIndex]
    if (count === 2) return `Double-${word}`
    if (count === 3) return `Triple-${word}`
    if (count === 4) return `Quadruple-${word}`
    return word
  })

  const comboKey = comboEntries.map((e) => `${e.ingredientIndex}x${e.count}`).join(',')
  const suffixIndex = hashString(comboKey) % wordLists.suffixes.length
  const suffix = wordLists.suffixes[suffixIndex]

  return `${parts.join(' ')} ${suffix}`
}

// Builds the canonical comboEntries list from a flat list of ingredient indices
// (with repeats allowed), e.g. [3, 7, 3] -> [{ingredientIndex:3,count:2}, {ingredientIndex:7,count:1}]
export function toComboEntries(ingredientIndices) {
  const counts = new Map()
  for (const idx of ingredientIndices) {
    counts.set(idx, (counts.get(idx) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ingredientIndex, count]) => ({ ingredientIndex, count }))
}
