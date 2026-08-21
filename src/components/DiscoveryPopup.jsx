import { useEffect } from 'react'
import { playSfx } from '../game/audio'

// Auto-dismisses after 5s, or on OK, or on Enter. Both effects key off
// `popup` alone, not `onClose` - onClose is a fresh inline closure on every
// App render, and this component stays mounted (never unmounts) across
// back-to-back discoveries, so including it would replay the sound and
// restart the timer on any unrelated App re-render while the toast is up.
export default function DiscoveryPopup({ popup, onClose }) {
  useEffect(() => {
    playSfx('discovery')
    const id = setTimeout(onClose, 5000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Enter') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup])

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
