import { useEffect } from 'react'

// Auto-dismisses after 5s, or on OK, or on Enter.
export default function DiscoveryPopup({ popup, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 5000)
    return () => clearTimeout(id)
  }, [popup, onClose])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Enter') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
