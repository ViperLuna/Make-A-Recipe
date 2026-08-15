import { comboValue } from './economy'
import { nameDish, toComboEntries } from './naming'

// Shared by Stove.jsx (for rendering the "ready to sell" panel) and App.jsx
// (for the hotkey-triggered instant sell) so both compute the exact same
// value/name for a finished dish. Returns null if the stove isn't done cooking.
export function computeReadyDish(stove, wordMap, wordLists, sellMultiplier = 1) {
  if (!stove.cookCompleteAt || stove.cookCompleteAt > Date.now()) return null
  const comboEntries = toComboEntries(stove.contents.map((i) => i.index))
  const baseValue = comboValue(stove.contents.map((i) => i.price))
  const value = baseValue * (stove.mutation?.priceMultiplier ?? 1) * sellMultiplier
  const dishName = nameDish(comboEntries, wordMap, wordLists)
  return { comboEntries, value, dishName }
}
