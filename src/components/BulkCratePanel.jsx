import { formatMoney } from '../game/format'

export default function BulkCratePanel({ cratesData, cash, inventoryCount, maxInventory, onBuy }) {
  return (
    <div className="shop">
      <p className="hint">
        Pay upfront for a crate of random pulls, sight unseen, straight to your inventory. Bigger
        crates cost more per pull but are far safer bets - the 50-crate is the real gamble.
      </p>
      <ul className="shop-stock">
        {cratesData.crates.map((crate) => {
          const wouldOverflow = inventoryCount + crate.pullCount > maxInventory
          const disabled = cash < crate.price || wouldOverflow
          return (
            <li key={crate.id}>
              <span className="shop-item-name">{crate.name}</span>
              <span className="shop-item-detail">
                {crate.pullCount} pulls - {formatMoney(crate.price)}
              </span>
              <button onClick={() => onBuy(crate)} disabled={disabled}>
                {wouldOverflow ? 'Not enough inventory space' : `Buy for ${formatMoney(crate.price)}`}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
