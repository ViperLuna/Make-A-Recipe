import { useMemo, useState } from 'react'
import { useGameData } from './game/useGameData'
import { totalCookSeconds } from './game/economy'
import { buildIngredientWordMap } from './game/naming'
import Lever from './components/Lever'
import Stove from './components/Stove'
import './App.css'

const STARTING_CASH = 25

const INITIAL_STOVES = [
  {
    id: 0,
    name: 'Basic Stove',
    tier: 'white',
    maxSlots: 1,
    contents: [],
    cookCompleteAt: null,
  },
]

function App() {
  const { data, error } = useGameData()
  const [cash, setCash] = useState(STARTING_CASH)
  const [pulled, setPulled] = useState(null)
  const [inventory, setInventory] = useState([])
  const [stoves, setStoves] = useState(INITIAL_STOVES)
  const [selectedStoveId, setSelectedStoveId] = useState(null)

  // Built once: each ingredient's permanent naming word, from the deterministic seed.
  const wordMap = useMemo(() => {
    if (!data) return null
    return buildIngredientWordMap(data.ingredients.ingredients.length, data.dishWordLists.descriptors)
  }, [data])

  if (error) return <p>Failed to load game data: {error.message}</p>
  if (!data) return <p>Loading...</p>

  const selectedStove = stoves.find((s) => s.id === selectedStoveId) ?? null
  const canAddToSelected =
    selectedStove && !selectedStove.cookCompleteAt && selectedStove.contents.length < selectedStove.maxSlots

  function buyPulled() {
    if (!pulled || cash < pulled.price) return
    setCash((c) => c - pulled.price)
    setInventory((inv) => [...inv, pulled])
    setPulled(null)
  }

  function addToSelectedStove(inventoryIndex) {
    if (!canAddToSelected) return
    const item = inventory[inventoryIndex]
    setInventory((inv) => inv.filter((_, i) => i !== inventoryIndex))
    setStoves((prev) =>
      prev.map((s) => (s.id === selectedStoveId ? { ...s, contents: [...s.contents, item] } : s))
    )
  }

  function removeFromStove(stoveId, contentIndex) {
    const stove = stoves.find((s) => s.id === stoveId)
    if (!stove || stove.cookCompleteAt) return
    const item = stove.contents[contentIndex]
    setInventory((inv) => [...inv, item])
    setStoves((prev) =>
      prev.map((s) =>
        s.id === stoveId ? { ...s, contents: s.contents.filter((_, i) => i !== contentIndex) } : s
      )
    )
  }

  function startCooking(stoveId) {
    setStoves((prev) =>
      prev.map((s) => {
        if (s.id !== stoveId || s.contents.length === 0 || s.cookCompleteAt) return s
        const seconds = totalCookSeconds(
          s.contents.map((i) => i.tier),
          s.tier
        )
        return { ...s, cookCompleteAt: Date.now() + seconds * 1000 }
      })
    )
  }

  function serveStove(stoveId, value) {
    setCash((c) => c + value)
    setStoves((prev) =>
      prev.map((s) => (s.id === stoveId ? { ...s, contents: [], cookCompleteAt: null } : s))
    )
  }

  return (
    <div className="game">
      <h1>Make A Recipe</h1>
      <p className="cash">${cash.toFixed(2)}</p>

      <Lever ingredientsData={data.ingredients} leverData={data.lever} onResult={setPulled} />

      {pulled && (
        <div className="pulled-actions">
          <button onClick={buyPulled} disabled={cash < pulled.price}>
            Buy for ${pulled.price}
          </button>
        </div>
      )}

      <div className="stoves">
        {stoves.map((stove) => (
          <Stove
            key={stove.id}
            stove={stove}
            selected={stove.id === selectedStoveId}
            onSelect={setSelectedStoveId}
            onStartCooking={startCooking}
            onServe={serveStove}
            onRemove={removeFromStove}
            wordMap={wordMap}
            wordLists={data.dishWordLists}
          />
        ))}
      </div>

      <div className="inventory">
        <h3>Inventory</h3>
        {!selectedStove && <p className="hint">Select a stove above to add ingredients to it.</p>}
        {inventory.length === 0 && <p>Nothing yet - pull the lever and buy something.</p>}
        <ul>
          {inventory.map((item, i) => (
            <li key={i}>
              {item.name} (${item.price})
              {selectedStove && (
                <button onClick={() => addToSelectedStove(i)} disabled={!canAddToSelected}>
                  Add
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
