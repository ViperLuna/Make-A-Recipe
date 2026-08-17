import { useEffect, useMemo, useState } from 'react'
import { useGameData } from './game/useGameData'
import { totalCookSeconds } from './game/economy'
import { buildIngredientWordMap } from './game/naming'
import { rollMutation } from './game/mutations'
import { loadState, saveState } from './game/save'
import { comboKeyOf, totalPossibleCombos } from './game/dex'
import { formatMoney } from './game/format'
import { rebirthCost, sellValueMultiplier } from './game/rebirth'
import { computeReadyDish } from './game/dish'
import Lever from './components/Lever'
import Stove from './components/Stove'
import StoveGrid from './components/StoveGrid'
import StoveShop from './components/StoveShop'
import MittShop from './components/MittShop'
import PotionShop from './components/PotionShop'
import Dex from './components/Dex'
import DiscoveryPopup from './components/DiscoveryPopup'
import RebirthPanel from './components/RebirthPanel'
import ActivePotions from './components/ActivePotions'
import './App.css'

const STARTING_CASH = 25

// Must match public/data/lever.json's mechanismSlots keys (slot1..slot3).
const TOTAL_MECHANISM_SLOTS = 3
const INITIAL_MECHANISM_SLOTS = Array.from({ length: TOTAL_MECHANISM_SLOTS }, (_, i) => i === 0)

// Must match public/data/stove-grid.json's totalSlots.
const TOTAL_GRID_SLOTS = 10

// Number-row hotkeys 1-9,0 map to grid slots 0-9.
const DIGIT_TO_SLOT = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
  Digit0: 9,
}

// Q, W, E buy the pulled ingredient from lever mechanism slots 0-2, left to right.
const LEVER_KEY_TO_SLOT = {
  KeyQ: 0,
  KeyW: 1,
  KeyE: 2,
}

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
  const [mittShopOpen, setMittShopOpen] = useState(false)
  const [equippedMittTier, setEquippedMittTier] = useState(null)
  const [potionShopOpen, setPotionShopOpen] = useState(false)
  const [activePotions, setActivePotions] = useState({ luck: null, speed: null })
  const [dexOpen, setDexOpen] = useState(false)
  // Lifetime dex - deliberately survives rebirth, unlike everything else it wipes.
  const [dex, setDex] = useState({})
  const [discoveryPopup, setDiscoveryPopup] = useState(null)
  const [rebirthCount, setRebirthCount] = useState(0)
  const [rebirthOpen, setRebirthOpen] = useState(false)
  const [hoveredInventoryIndex, setHoveredInventoryIndex] = useState(null)

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
          // Pre-dex saves won't have this field either - default to nothing discovered yet.
          setDex(saved.dex ?? {})
          // Pre-mitt saves won't have this field either - default to no mitt equipped.
          setEquippedMittTier(saved.equippedMittTier ?? null)
          // Pre-potion saves won't have this field either - default to none active.
          // (Active potions are meant to survive things like rebirth, so restoring
          // the raw expiresAt timestamp is correct even across a reload/restart.)
          setActivePotions(saved.activePotions ?? { luck: null, speed: null })
          // Pre-rebirth saves won't have this field either - default to no rebirths yet.
          setRebirthCount(saved.rebirthCount ?? 0)
        }
      })
      .finally(() => setSaveLoaded(true))
  }, [])

  // Persist on every change, once the initial load attempt has finished
  // (guards against saving the default state over a real save on first render).
  useEffect(() => {
    if (!saveLoaded) return
    saveState({
      cash,
      inventory,
      gridSlots,
      mechanismSlots,
      dex,
      equippedMittTier,
      activePotions,
      rebirthCount,
    })
  }, [
    saveLoaded,
    cash,
    inventory,
    gridSlots,
    mechanismSlots,
    dex,
    equippedMittTier,
    activePotions,
    rebirthCount,
  ])

  // Built once: each ingredient's permanent naming word, from the deterministic seed.
  const wordMap = useMemo(() => {
    if (!data) return null
    return buildIngredientWordMap(data.ingredients.ingredients.length, data.dishWordLists.descriptors)
  }, [data])

  // Total distinct dishes the game can ever produce, for the Dex's "x / total" header.
  const totalPossibleDishes = useMemo(() => {
    if (!data) return 0
    const maxComboSize = Math.max(...data.stoves.stoves.map((s) => s.slotCount))
    return totalPossibleCombos(data.ingredients.ingredients.length, maxComboSize)
  }, [data])

  // If the array shrinks (item added to a stove) while a now-invalid index is
  // still "hovered", drop it rather than let a stale index linger.
  useEffect(() => {
    if (hoveredInventoryIndex !== null && hoveredInventoryIndex >= inventory.length) {
      setHoveredInventoryIndex(null)
    }
  }, [inventory, hoveredInventoryIndex])

  // Number-row hotkeys 1-9,0 act on the matching stove slot: while hovering an
  // inventory item, they drop that ingredient into the stove; otherwise they
  // sell it if it's done cooking, start cooking it if it's holding ingredients
  // but idle, or just select it. A missing/locked slot, or an already-selected
  // stove, is a no-op either way.
  useEffect(() => {
    if (!data) return
    function handleKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const slotIndex = DIGIT_TO_SLOT[e.code]
      if (slotIndex === undefined) return
      const slot = gridSlots[slotIndex]
      if (!slot?.unlocked || !slot.stove) return

      if (hoveredInventoryIndex !== null) {
        addItemToStove(slot.id, hoveredInventoryIndex)
        return
      }

      const ready = computeReadyDish(
        slot.stove,
        wordMap,
        data.dishWordLists,
        sellValueMultiplier(rebirthCount, data.rebirth)
      )
      if (ready) {
        serveStove(slot.id, ready.value, {
          dishName: ready.dishName,
          comboEntries: ready.comboEntries,
          ingredientNames: slot.stove.contents.map((i) => i.name),
          mutation: slot.stove.mutation,
        })
      } else if (!slot.stove.cookCompleteAt && slot.stove.contents.length > 0) {
        startCooking(slot.id)
      } else {
        toggleSelectStove(slot.id)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, gridSlots, inventory, hoveredInventoryIndex, wordMap, rebirthCount, activePotions, dex])

  // Q, W, E buy the pulled ingredient from lever mechanism slots 0-2, left to
  // right - same effect as clicking that reel's own Buy button. R buys every
  // affordable pulled result at once.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'KeyR') {
        buyAllPulled()
        return
      }
      const slotIndex = LEVER_KEY_TO_SLOT[e.code]
      if (slotIndex === undefined) return
      buyPulledAt(slotIndex)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulledResults, cash])

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

  // Buys every affordable pulled result in one go. Runs its own affordability
  // check against a running total rather than calling buyPulledAt per slot,
  // since three back-to-back calls would each check against the same
  // not-yet-updated cash and could let you buy more than you can afford.
  function buyAllPulled() {
    let remainingCash = cash
    const boughtIndices = []
    const boughtItems = []
    pulledResults.forEach((item, i) => {
      if (item && remainingCash >= item.price) {
        remainingCash -= item.price
        boughtIndices.push(i)
        boughtItems.push(item)
      }
    })
    if (boughtItems.length === 0) return
    setCash(remainingCash)
    setInventory((inv) => [...inv, ...boughtItems])
    setPulledResults((prev) => prev.map((r, i) => (boughtIndices.includes(i) ? null : r)))
  }

  function buyMitt(mitt) {
    if (cash < mitt.price || mitt.tier === equippedMittTier) return
    setCash((c) => c - mitt.price)
    setEquippedMittTier(mitt.tier)
  }

  function buyLuckPotion(potion) {
    if (cash < potion.price) return
    setCash((c) => c - potion.price)
    setActivePotions((prev) => {
      const remainingMs = prev.luck && prev.luck.expiresAt > Date.now() ? prev.luck.expiresAt - Date.now() : 0
      return {
        ...prev,
        luck: { rank: potion.rank, expiresAt: Date.now() + potion.durationMinutes * 60000 + remainingMs },
      }
    })
  }

  function buySpeedPotion(potion) {
    if (cash < potion.price) return
    setCash((c) => c - potion.price)
    setActivePotions((prev) => {
      const remainingMs = prev.speed && prev.speed.expiresAt > Date.now() ? prev.speed.expiresAt - Date.now() : 0
      return {
        ...prev,
        speed: { rank: potion.rank, expiresAt: Date.now() + potion.durationMinutes * 60000 + remainingMs },
      }
    })
  }

  function unlockMechanism(index) {
    const unlockedCount = mechanismSlots.filter(Boolean).length
    if (index !== unlockedCount) return // must unlock in order
    const cost = data.lever.mechanismSlots[`slot${index + 1}`]?.cost
    if (cost == null || cash < cost) return
    setCash((c) => c - cost)
    setMechanismSlots((prev) => prev.map((u, i) => (i === index ? true : u)))
  }

  function addItemToStove(stoveId, inventoryIndex) {
    const slot = gridSlots.find((s) => s.id === stoveId)
    if (!slot?.unlocked || !slot.stove) return
    if (slot.stove.cookCompleteAt) return // cooking or already done - can't add
    if (slot.stove.contents.length >= slot.stove.maxSlots) return
    const item = inventory[inventoryIndex]
    if (!item) return
    setInventory((inv) => inv.filter((_, i) => i !== inventoryIndex))
    setGridSlots((prev) =>
      prev.map((s) => (s.id === stoveId ? { ...s, stove: { ...s.stove, contents: [...s.stove.contents, item] } } : s))
    )
  }

  function addToSelectedStove(inventoryIndex) {
    if (selectedStoveId == null) return
    addItemToStove(selectedStoveId, inventoryIndex)
  }

  // Selecting the already-selected stove deselects it instead - true for a
  // mouse click unconditionally, and for the hotkey whenever there's nothing
  // else for it to do (the sell/cook branches above take priority otherwise).
  function toggleSelectStove(stoveId) {
    setSelectedStoveId((id) => (id === stoveId ? null : stoveId))
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
    const speedPotion =
      activePotions.speed && activePotions.speed.expiresAt > Date.now() ? activePotions.speed : null
    const speedMultiplier = speedPotion
      ? data.potions.speedPotions[speedPotion.rank - 1].cookSpeedMultiplier
      : 1

    setGridSlots((prev) =>
      prev.map((s) => {
        if (s.id !== stoveId || !s.stove || s.stove.contents.length === 0 || s.stove.cookCompleteAt) return s
        const seconds =
          totalCookSeconds(
            s.stove.contents.map((i) => i.tier),
            s.stove.tier
          ) / speedMultiplier
        const mutation = rollMutation(data.mutationOdds, data.mutations)
        return { ...s, stove: { ...s.stove, cookCompleteAt: Date.now() + seconds * 1000, mutation } }
      })
    )
  }

  function serveStove(stoveId, value, dishInfo) {
    setCash((c) => c + value)
    setGridSlots((prev) =>
      prev.map((s) =>
        s.id === stoveId
          ? { ...s, stove: { ...s.stove, contents: [], cookCompleteAt: null, mutation: null } }
          : s
      )
    )

    const key = comboKeyOf(dishInfo.comboEntries)
    const existing = dex[key]
    const mutationName = dishInfo.mutation?.name ?? null

    if (!existing) {
      setDex((prev) => ({
        ...prev,
        [key]: {
          name: dishInfo.dishName,
          ingredientCount: dishInfo.comboEntries.reduce((n, e) => n + e.count, 0),
          ingredientNames: dishInfo.ingredientNames,
          mutationsSeen: mutationName ? [mutationName] : [],
        },
      }))
      setDiscoveryPopup({ kind: 'dish', name: dishInfo.dishName })
    } else if (mutationName && !existing.mutationsSeen.includes(mutationName)) {
      setDex((prev) => ({
        ...prev,
        [key]: { ...existing, mutationsSeen: [...existing.mutationsSeen, mutationName] },
      }))
      setDiscoveryPopup({ kind: 'mutation', name: mutationName, dishName: dishInfo.dishName })
    }
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

  function doRebirth() {
    const cost = rebirthCost(rebirthCount, data.rebirth)
    if (cash < cost) return
    setCash(STARTING_CASH)
    setInventory([])
    setGridSlots(INITIAL_GRID_SLOTS)
    setMechanismSlots(INITIAL_MECHANISM_SLOTS)
    setPulledResults(Array(TOTAL_MECHANISM_SLOTS).fill(null))
    setSelectedStoveId(null)
    setEquippedMittTier(null)
    setRebirthCount((n) => n + 1)
    setRebirthOpen(false)
  }

  const hasEmptyUnlockedSlot = gridSlots.some((s) => s.unlocked && !s.stove)
  const sellMultiplier = sellValueMultiplier(rebirthCount, data.rebirth)
  const mittBonus = equippedMittTier ? data.luck.mittRedBonus[equippedMittTier] : 0
  const activeLuckPotion =
    activePotions.luck && activePotions.luck.expiresAt > Date.now() ? activePotions.luck : null
  const potionBonus = activeLuckPotion ? data.potions.luckPotions[activeLuckPotion.rank - 1].redBonus : 0
  const redBonus = mittBonus + potionBonus

  return (
    <div className="game">
      <img
        src={`${import.meta.env.BASE_URL}logo.webp`}
        alt="Make A Recipe"
        className="logo"
        draggable="false"
      />
      <p className="cash">{formatMoney(cash)}</p>
      <ActivePotions activePotions={activePotions} potionsData={data.potions} />

      <Lever
        ingredientsData={data.ingredients}
        leverData={data.lever}
        mechanismCount={mechanismSlots.filter(Boolean).length}
        redBonus={redBonus}
        onResult={handlePullResult}
        pulledResults={pulledResults}
        cash={cash}
        onBuy={buyPulledAt}
      />

      <div className="pulled-actions">
        {(() => {
          const nextIndex = mechanismSlots.filter(Boolean).length
          if (nextIndex >= TOTAL_MECHANISM_SLOTS) return null
          const cost = data.lever.mechanismSlots[`slot${nextIndex + 1}`]?.cost ?? 0
          return (
            <button onClick={() => unlockMechanism(nextIndex)} disabled={cash < cost}>
              Unlock lever mechanism {nextIndex + 1} for {formatMoney(cost)}
            </button>
          )
        })()}
      </div>

      <div className="toolbar">
        <button onClick={() => setShopOpen((o) => !o)}>
          {shopOpen ? 'Close Stove Shop' : 'Open Stove Shop'}
        </button>
        <button onClick={() => setMittShopOpen((o) => !o)}>
          {mittShopOpen ? 'Close Mitt Shop' : 'Open Mitt Shop'}
        </button>
        <button onClick={() => setPotionShopOpen((o) => !o)}>
          {potionShopOpen ? 'Close Potion Shop' : 'Open Potion Shop'}
        </button>
        <button onClick={() => setDexOpen(true)}>Dex ({Object.keys(dex).length})</button>
        <button onClick={() => setRebirthOpen(true)}>Rebirth ({rebirthCount})</button>
      </div>

      {dexOpen && (
        <Dex dex={dex} totalPossible={totalPossibleDishes} onClose={() => setDexOpen(false)} />
      )}

      {rebirthOpen && (
        <RebirthPanel
          rebirthData={data.rebirth}
          rebirthCount={rebirthCount}
          cash={cash}
          onRebirth={doRebirth}
          onClose={() => setRebirthOpen(false)}
        />
      )}

      {discoveryPopup && (
        <DiscoveryPopup popup={discoveryPopup} onClose={() => setDiscoveryPopup(null)} />
      )}

      {shopOpen && (
        <StoveShop
          shopData={data.stoveShop}
          stovesData={data.stoves}
          cash={cash}
          hasEmptyUnlockedSlot={hasEmptyUnlockedSlot}
          onBuy={buyStove}
        />
      )}

      {mittShopOpen && (
        <MittShop
          mittsData={data.mitts}
          shopData={data.stoveShop}
          luckData={data.luck}
          cash={cash}
          equippedMittTier={equippedMittTier}
          onEquip={buyMitt}
        />
      )}

      {potionShopOpen && (
        <PotionShop
          potionsData={data.potions}
          activePotions={activePotions}
          cash={cash}
          onBuyLuck={buyLuckPotion}
          onBuySpeed={buySpeedPotion}
        />
      )}

      <StoveGrid
        gridSlots={gridSlots}
        stoveGridData={data.stoveGrid}
        cash={cash}
        selectedStoveId={selectedStoveId}
        onSelect={toggleSelectStove}
        onUnlock={unlockSlot}
        onStartCooking={startCooking}
        onServe={serveStove}
        onRemove={removeFromStove}
        onRemoveStove={removeStove}
        wordMap={wordMap}
        wordLists={data.dishWordLists}
        StoveComponent={Stove}
        sellMultiplier={sellMultiplier}
      />

      <div className="inventory">
        <h3>Inventory</h3>
        {!selectedStove && <p className="hint">Select a stove above to add ingredients to it.</p>}
        {inventory.length === 0 && <p>Nothing yet - pull the lever and buy something.</p>}
        <ul>
          {inventory.map((item, i) => (
            <li
              key={i}
              className={hoveredInventoryIndex === i ? 'hovered' : ''}
              onMouseEnter={() => setHoveredInventoryIndex(i)}
              onMouseLeave={() => setHoveredInventoryIndex((idx) => (idx === i ? null : idx))}
            >
              {item.name} ({formatMoney(item.price)})
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
