import { useEffect, useMemo, useState } from 'react'
import { useGameData } from './game/useGameData'
import { totalCookSeconds } from './game/economy'
import { buildIngredientWordMap } from './game/naming'
import { rollMutation } from './game/mutations'
import { loadState, saveState } from './game/save'
import Lever from './components/Lever'
import Stove from './components/Stove'
import StoveGrid from './components/StoveGrid'
import StoveShop from './components/StoveShop'
import './App.css'

const STARTING_CASH = 25

// Must match public/data/lever.json's mechanismSlots keys (slot1..slot3).
const TOTAL_MECHANISM_SLOTS = 3
const INITIAL_MECHANISM_SLOTS = Array.from({ length: TOTAL_MECHANISM_SLOTS }, (_, i) => i === 0)

// Must match public/data/stove-grid.json's totalSlots.
const TOTAL_GRID_SLOTS = 10

const INITIAL_GRID_SLOTS = Array.from({ length: TOTAL_GRID_SLOTS }, (_, i) => ({
  id: i,
  unlocked: i === 0,
  stove:
    i === 0
      ? { name: 'Basic Stove', tier: 'white', maxSlots: 1, contents: [], cookCompleteAt: null, mutation: null }
      : null,
}))

// Pre-grid saves stored a flat `stoves` array instead of `gridSlots`. Convert
// old saves forward so existing progress (cash, cooking state, etc.) survives
// this schema change instead of crashing on load.
function migrateOldStoves(oldStoves) {
  const slots = Array.from({ length: TOTAL_GRID_SLOTS }, (_, i) => ({ id: i, unlocked: false, stove: null }))
  for (const s of oldStoves) {
    if (s.id < TOTAL_GRID_SLOTS) {
      slots[s.id] = {
        id: s.id,
        unlocked: true,
        stove: {
          name: s.name,
          tier: s.tier,
          maxSlots: s.maxSlots,
          contents: s.contents,
          cookCompleteAt: s.cookCompleteAt,
          mutation: s.mutation ?? null,
        },
      }
    }
  }
  return slots
}

function App() {
  const { data, error } = useGameData()
  const [cash, setCash] = useState(STARTING_CASH)
  const [mechanismSlots, setMechanismSlots] = useState(INITIAL_MECHANISM_SLOTS)
  const [pulledResults, setPulledResults] = useState(Array(TOTAL_MECHANISM_SLOTS).fill(null))
  const [inventory, setInventory] = useState([])
  const [gridSlots, setGridSlots] = useState(INITIAL_GRID_SLOTS)
  const [selectedStoveId, setSelectedStoveId] = useState(null)
  const [saveLoaded, setSaveLoaded] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)

  // Load any existing save once on startup, before anything can overwrite it.
  useEffect(() => {
    loadState()
      .then((saved) => {
        if (saved) {
          setCash(saved.cash)
          setInventory(saved.inventory)
          setGridSlots(saved.gridSlots ?? migrateOldStoves(saved.stoves ?? []))
          // Pre-mechanism-slot saves won't have this field - default to just slot 1 unlocked.
          setMechanismSlots(saved.mechanismSlots ?? INITIAL_MECHANISM_SLOTS)
        }
      })
      .finally(() => setSaveLoaded(true))
  }, [])

  // Persist on every change, once the initial load attempt has finished
  // (guards against saving the default state over a real save on first render).
  useEffect(() => {
    if (!saveLoaded) return
    saveState({ cash, inventory, gridSlots, mechanismSlots })
  }, [saveLoaded, cash, inventory, gridSlots, mechanismSlots])

  // Built once: each ingredient's permanent naming word, from the deterministic seed.
  const wordMap = useMemo(() => {
    if (!data) return null
    return buildIngredientWordMap(data.ingredients.ingredients.length, data.dishWordLists.descriptors)
  }, [data])

  if (error) return <p>Failed to load game data: {error.message}</p>
  if (!data || !saveLoaded) return <p>Loading...</p>

  const occupiedSlot = gridSlots.find((s) => s.id === selectedStoveId && s.stove) ?? null
  const selectedStove = occupiedSlot?.stove ?? null
  const canAddToSelected =
    selectedStove && !selectedStove.cookCompleteAt && selectedStove.contents.length < selectedStove.maxSlots

  function handlePullResult(index, result) {
    setPulledResults((prev) => prev.map((r, i) => (i === index ? result : r)))
  }

  function buyPulledAt(index) {
    const item = pulledResults[index]
    if (!item || cash < item.price) return
    setCash((c) => c - item.price)
    setInventory((inv) => [...inv, item])
    setPulledResults((prev) => prev.map((r, i) => (i === index ? null : r)))
  }

  function unlockMechanism(index) {
    const unlockedCount = mechanismSlots.filter(Boolean).length
    if (index !== unlockedCount) return // must unlock in order
    const cost = data.lever.mechanismSlots[`slot${index + 1}`]?.cost
    if (cost == null || cash < cost) return
    setCash((c) => c - cost)
    setMechanismSlots((prev) => prev.map((u, i) => (i === index ? true : u)))
  }

  function addToSelectedStove(inventoryIndex) {
    if (!canAddToSelected) return
    const item = inventory[inventoryIndex]
    setInventory((inv) => inv.filter((_, i) => i !== inventoryIndex))
    setGridSlots((prev) =>
      prev.map((s) =>
        s.id === selectedStoveId ? { ...s, stove: { ...s.stove, contents: [...s.stove.contents, item] } } : s
      )
    )
  }

  function removeFromStove(stoveId, contentIndex) {
    const slot = gridSlots.find((s) => s.id === stoveId)
    if (!slot?.stove || slot.stove.cookCompleteAt) return
    const item = slot.stove.contents[contentIndex]
    setInventory((inv) => [...inv, item])
    setGridSlots((prev) =>
      prev.map((s) =>
        s.id === stoveId
          ? { ...s, stove: { ...s.stove, contents: s.stove.contents.filter((_, i) => i !== contentIndex) } }
          : s
      )
    )
  }

  function startCooking(stoveId) {
    setGridSlots((prev) =>
      prev.map((s) => {
        if (s.id !== stoveId || !s.stove || s.stove.contents.length === 0 || s.stove.cookCompleteAt) return s
        const seconds = totalCookSeconds(
          s.stove.contents.map((i) => i.tier),
          s.stove.tier
        )
        const mutation = rollMutation(data.mutationOdds, data.mutations)
        return { ...s, stove: { ...s.stove, cookCompleteAt: Date.now() + seconds * 1000, mutation } }
      })
    )
  }

  function serveStove(stoveId, value) {
    setCash((c) => c + value)
    setGridSlots((prev) =>
      prev.map((s) =>
        s.id === stoveId
          ? { ...s, stove: { ...s.stove, contents: [], cookCompleteAt: null, mutation: null } }
          : s
      )
    )
  }

  function removeStove(stoveId) {
    const slot = gridSlots.find((s) => s.id === stoveId)
    if (!slot?.stove || slot.stove.cookCompleteAt) return
    if (slot.stove.contents.length > 0) {
      setInventory((inv) => [...inv, ...slot.stove.contents])
    }
    setGridSlots((prev) => prev.map((s) => (s.id === stoveId ? { ...s, stove: null } : s)))
    setSelectedStoveId((id) => (id === stoveId ? null : id))
  }

  function unlockSlot(slotId) {
    const cost = data.stoveGrid.slots[slotId]?.cost
    if (cost == null || cash < cost) return
    setCash((c) => c - cost)
    setGridSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, unlocked: true } : s)))
  }

  function buyStove(stoveDef) {
    if (cash < stoveDef.price) return
    const target = gridSlots.find((s) => s.unlocked && !s.stove)
    if (!target) return
    setCash((c) => c - stoveDef.price)
    setGridSlots((prev) =>
      prev.map((s) =>
        s.id === target.id
          ? {
              ...s,
              stove: {
                name: stoveDef.name,
                tier: stoveDef.tier,
                maxSlots: stoveDef.slotCount,
                contents: [],
                cookCompleteAt: null,
                mutation: null,
              },
            }
          : s
      )
    )
  }

  const hasEmptyUnlockedSlot = gridSlots.some((s) => s.unlocked && !s.stove)

  return (
    <div className="game">
      <h1>Make A Recipe</h1>
      <p className="cash">${cash.toFixed(2)}</p>

      <Lever
        ingredientsData={data.ingredients}
        leverData={data.lever}
        mechanismCount={mechanismSlots.filter(Boolean).length}
        onResult={handlePullResult}
      />

      <div className="pulled-actions">
        {pulledResults.map(
          (result, i) =>
            mechanismSlots[i] &&
            result && (
              <button key={i} onClick={() => buyPulledAt(i)} disabled={cash < result.price}>
                Buy {result.name} for ${result.price}
              </button>
            )
        )}
        {(() => {
          const nextIndex = mechanismSlots.filter(Boolean).length
          if (nextIndex >= TOTAL_MECHANISM_SLOTS) return null
          const cost = data.lever.mechanismSlots[`slot${nextIndex + 1}`]?.cost ?? 0
          return (
            <button onClick={() => unlockMechanism(nextIndex)} disabled={cash < cost}>
              Unlock lever mechanism {nextIndex + 1} for ${cost.toLocaleString()}
            </button>
          )
        })()}
      </div>

      <button className="shop-toggle" onClick={() => setShopOpen((o) => !o)}>
        {shopOpen ? 'Close Stove Shop' : 'Open Stove Shop'}
      </button>

      {shopOpen && (
        <StoveShop
          shopData={data.stoveShop}
          stovesData={data.stoves}
          cash={cash}
          hasEmptyUnlockedSlot={hasEmptyUnlockedSlot}
          onBuy={buyStove}
        />
      )}

      <StoveGrid
        gridSlots={gridSlots}
        stoveGridData={data.stoveGrid}
        cash={cash}
        selectedStoveId={selectedStoveId}
        onSelect={setSelectedStoveId}
        onUnlock={unlockSlot}
        onStartCooking={startCooking}
        onServe={serveStove}
        onRemove={removeFromStove}
        onRemoveStove={removeStove}
        wordMap={wordMap}
        wordLists={data.dishWordLists}
        StoveComponent={Stove}
      />

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
