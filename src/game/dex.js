// Stable identity for a combo, independent of pull/cook order - same key the
// Lifetime dex is keyed by. Reuses toComboEntries' canonical sort.
export function comboKeyOf(comboEntries) {
  return comboEntries.map((e) => `${e.ingredientIndex}x${e.count}`).join(',')
}

function nChooseK(n, k) {
  let result = 1
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return result
}

// Total number of distinct dishes the game can ever produce: multisets of
// size 1..maxComboSize drawn from ingredientCount ingredients (repeats
// allowed, order doesn't matter - same rules toComboEntries uses). Multiset
// count of size k from n items is C(n+k-1, k).
export function totalPossibleCombos(ingredientCount, maxComboSize) {
  let total = 0
  for (let k = 1; k <= maxComboSize; k++) {
    total += nChooseK(ingredientCount + k - 1, k)
  }
  return total
}
