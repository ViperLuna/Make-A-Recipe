import { useEffect, useState } from 'react'
import {
  getMusicVolume,
  setMusicVolume,
  isMusicMuted,
  setMusicMuted,
  getSfxVolume,
  setSfxVolume,
  isSfxMuted,
  setSfxMuted,
  getCurrentMusicName,
  hasPreviousTrack,
  skipToNextTrack,
  playPreviousTrack,
} from '../game/audio'

export default function SettingsPanel({ onClose }) {
  const [musicVolume, setMusicVolumeState] = useState(getMusicVolume)
  const [musicMuted, setMusicMutedState] = useState(isMusicMuted)
  const [sfxVolume, setSfxVolumeState] = useState(getSfxVolume)
  const [sfxMuted, setSfxMutedState] = useState(isSfxMuted)
  const [nowPlaying, setNowPlaying] = useState(getCurrentMusicName)
  const [canGoBack, setCanGoBack] = useState(hasPreviousTrack)

  // audio.js's playback state lives outside React (module-level, driven by
  // its own timers) - poll it while the panel's open rather than wiring up
  // a bespoke subscription just for a "now playing" label.
  useEffect(() => {
    const id = setInterval(() => {
      setNowPlaying(getCurrentMusicName())
      setCanGoBack(hasPreviousTrack())
    }, 500)
    return () => clearInterval(id)
  }, [])

  function handleMusicVolume(e) {
    const value = Number(e.target.value) / 100
    setMusicVolume(value)
    setMusicVolumeState(value)
  }

  function handleSfxVolume(e) {
    const value = Number(e.target.value) / 100
    setSfxVolume(value)
    setSfxVolumeState(value)
  }

  function toggleMusicMuted() {
    setMusicMuted(!musicMuted)
    setMusicMutedState(!musicMuted)
  }

  function toggleSfxMuted() {
    setSfxMuted(!sfxMuted)
    setSfxMutedState(!sfxMuted)
  }

  function handleSkip() {
    skipToNextTrack()
    setNowPlaying(getCurrentMusicName())
    setCanGoBack(hasPreviousTrack())
  }

  function handlePrevious() {
    playPreviousTrack()
    setNowPlaying(getCurrentMusicName())
    setCanGoBack(hasPreviousTrack())
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="settings-row">
          <label htmlFor="music-volume">Music volume</label>
          <input
            id="music-volume"
            type="range"
            min="0"
            max="100"
            value={Math.round(musicVolume * 100)}
            onChange={handleMusicVolume}
          />
          <button onClick={toggleMusicMuted}>{musicMuted ? 'Unmute' : 'Mute'}</button>
        </div>

        <div className="settings-row">
          <label htmlFor="sfx-volume">SFX volume</label>
          <input
            id="sfx-volume"
            type="range"
            min="0"
            max="100"
            value={Math.round(sfxVolume * 100)}
            onChange={handleSfxVolume}
          />
          <button onClick={toggleSfxMuted}>{sfxMuted ? 'Unmute' : 'Mute'}</button>
        </div>

        <div className="settings-now-playing">
          <p className="hint">Now playing: {nowPlaying ?? 'nothing yet'}</p>
          <div className="settings-transport">
            <button
              className={!canGoBack ? 'disabled-look' : ''}
              onClick={handlePrevious}
              aria-disabled={!canGoBack}
            >
              Previous
            </button>
            <button onClick={handleSkip}>Skip</button>
          </div>
        </div>
      </div>
    </div>
  )
}
