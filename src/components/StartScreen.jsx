import { unlockAudio } from '../game/audio'

// Gates the game behind a click so autoplay-restricted audio (background
// music, lever SFX) has the user gesture it needs to unlock before anything
// tries to play.
export default function StartScreen({ onStart }) {
  function handleStart() {
    unlockAudio()
    onStart()
  }

  return (
    <div className="start-screen">
      <img
        src={`${import.meta.env.BASE_URL}logo.webp`}
        alt="Make A Recipe"
        className="logo"
        draggable="false"
      />
      <button className="start-button" onClick={handleStart}>
        Start
      </button>
    </div>
  )
}
