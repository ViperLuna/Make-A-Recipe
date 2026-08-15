import { formatMoney } from '../game/format'

export default function StoveGrid({
  gridSlots,
  stoveGridData,
  cash,
  selectedStoveId,
  onSelect,
  onUnlock,
  onStartCooking,
  onServe,
  onRemove,
  onRemoveStove,
  wordMap,
  wordLists,
  StoveComponent,
}) {
  return (
    <div className="stoves">
      {gridSlots.map((slot) => {
        if (!slot.unlocked) {
          const cost = stoveGridData.slots[slot.id]?.cost ?? 0
          return (
            <div key={slot.id} className="stove-card locked">
              <h3>Locked</h3>
              <button onClick={() => onUnlock(slot.id)} disabled={cash < cost}>
                Unlock for {formatMoney(cost)}
              </button>
            </div>
          )
        }

        if (!slot.stove) {
          return (
            <div key={slot.id} className="stove-card empty-grid-slot">
              <h3>Empty</h3>
              <p className="hint">Buy a stove from the shop to fill this slot.</p>
            </div>
          )
        }

        return (
          <StoveComponent
            key={slot.id}
            stove={{ ...slot.stove, id: slot.id }}
            selected={slot.id === selectedStoveId}
            onSelect={onSelect}
            onStartCooking={onStartCooking}
            onServe={onServe}
            onRemove={onRemove}
            onRemoveStove={onRemoveStove}
            wordMap={wordMap}
            wordLists={wordLists}
          />
        )
      })}
    </div>
  )
}
