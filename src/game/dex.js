// Stable identity for a combo, independent of pull/cook order - same key the
// Lifetime dex is keyed by. Reuses toComboEntries' canonical sort.
export function comboKeyOf(comboEntries) {
  return comboEntries.map((e) => `${e.ingredientIndex}x${e.count}`).join(',')
}
