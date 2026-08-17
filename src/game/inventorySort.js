export const SORT_FIELDS = [
  { id: 'purchased', label: 'Last item purchased' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'price', label: 'Price' },
]

// Returns [{ item, index }] - index is the item's position in the *original*
// inventory array, preserved through sorting so callers (Add-to-stove,
// hover-to-add) can still act on the real underlying item regardless of
// what order it's displayed in.
export function sortInventory(inventory, field, direction) {
  const indexed = inventory.map((item, index) => ({ item, index }))
  const compare =
    field === 'alphabetical'
      ? (a, b) => a.item.name.localeCompare(b.item.name)
      : field === 'price'
        ? (a, b) => a.item.price - b.item.price
        : (a, b) => a.index - b.index // 'purchased' - natural array order is purchase order
  indexed.sort(compare)
  if (direction === 'desc') indexed.reverse()
  return indexed
}
