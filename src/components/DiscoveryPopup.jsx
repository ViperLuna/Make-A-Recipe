import { useEffect } from 'react'

// Auto-dismisses after 10s (per the discovery-popup design doc), or on OK.
export default function DiscoveryPopup({ popup, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 10000)
    return () => clearTimeout(id)
  }, [popup, onClose])

  return (
    <div className="discovery-popup">
      {popup.kind === 'dish' ? (
        <p>
          New Dish Discovered: <strong>{popup.name}</strong>
        </p>
      ) : (
        <p>
          New Mutation: <strong>{popup.name}</strong> on {popup.dishName}
        </p>
      )}
      <button onClick={onClose}>OK</button>
    </div>
  )
}
