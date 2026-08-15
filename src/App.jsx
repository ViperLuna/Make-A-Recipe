import { useState } from 'react'
import { useGameData } from './game/useGameData'
import Lever from './components/Lever'
import Stove from './components/Stove'
import './App.css'

const STARTING_CASH = 25

function App() {
  const { data, error } = useGameData()
  const [cash, setCash] = useState(STARTING_CASH)
  const [pulled, setPulled] = useState(null)
  const [inventory, setInventory] = useState([])
  const [cooking, setCooking] = useState(null)

  if (error) return <p>Failed to load game data: {error.message}</p>
  if (!data) return <p>Loading...</p>

  function buyPulled() {
    if (!pulled || cash < pulled.price) return
    setCash((c) => c - pulled.price)
    setInventory((inv) => [...inv, pulled])
    setPulled(null)
  }

  function cookFromInventory(index) {
    if (cooking) return
    const item = inventory[index]
    setInventory((inv) => inv.filter((_, i) => i !== index))
    setCooking(item)
  }

  function serve(value) {
    setCash((c) => c + value)
    setCooking(null)
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

      <Stove ingredient={cooking} onServe={serve} />

      <div className="inventory">
        <h3>Inventory</h3>
        {inventory.length === 0 && <p>Nothing yet - pull the lever and buy something.</p>}
        <ul>
          {inventory.map((item, i) => (
            <li key={i}>
              {item.name} (${item.price})
              <button onClick={() => cookFromInventory(i)} disabled={!!cooking}>
                Cook
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
