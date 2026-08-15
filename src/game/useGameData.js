import { useEffect, useState } from 'react'

const FILES = [
  'ingredients',
  'stoves',
  'stove-grid',
  'stove-shop',
  'lever',
  'dish-word-lists',
  'dish-value',
  'mutations',
  'mutation-odds',
  'luck',
  'mitts',
  'potions',
  'rebirth',
]

// Loads every game-balance JSON file from public/data/ at runtime, so tuning a
// number later never requires a rebuild - just edit the file.
export function useGameData() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      FILES.map((name) =>
        fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
          if (!r.ok) throw new Error(`Failed to load ${name}.json (${r.status})`)
          return r.json()
        })
      )
    )
      .then((results) => {
        if (cancelled) return
        const byName = {}
        FILES.forEach((name, i) => {
          byName[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = results[i]
        })
        setData(byName)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, error }
}
