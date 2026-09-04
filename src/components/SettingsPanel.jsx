import { useEffect, useRef, useState } from 'react'
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

export default function SettingsPanel({
  onClose,
  autoCook,
  onToggleAutoCook,
  autoPull,
  setAutoPull,
  autoPullThreshold,
  setAutoPullThreshold,
  autoBuy,
  setAutoBuy,
  autoBuyMin,
  setAutoBuyMin,
  autoBuyMax,
  setAutoBuyMax,
}) {
  const [musicVolume, setMusicVolumeState] = useState(getMusicVolume)
  const [musicMuted, setMusicMutedState] = useState(isMusicMuted)
  const [sfxVolume, setSfxVolumeState] = useState(getSfxVolume)
  const [sfxMuted, setSfxMutedState] = useState(isSfxMuted)
  const [nowPlaying, setNowPlaying] = useState(getCurrentMusicName)
  const [canGoBack, setCanGoBack] = useState(hasPreviousTrack)
  const autoBuyMaxRef = useRef(null)

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
          <label>Auto Cook</label>
          <button
            className={`auto-cook-toggle${autoCook ? ' active' : ''}`}
            onClick={onToggleAutoCook}
          >
            {autoCook ? 'On' : 'Off'}
          </button>
        </div>
        <p className="hint settings-auto-hint">
          Starts cooking automatically the instant a stove is full and idle.
        </p>

        <div className="settings-row settings-row-wrap">
          <label>Auto Pull</label>
          <button
            className={`auto-pull-toggle${autoPull ? ' active' : ''}`}
            onClick={() => setAutoPull((o) => !o)}
          >
            {autoPull ? 'On' : 'Off'}
          </button>
          {autoPull && (
            <input
              type="number"
              className="auto-pull-threshold"
              placeholder="Stop at price..."
              min="0"
              value={autoPullThreshold}
              onChange={(e) => setAutoPullThreshold(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur()
              }}
            />
          )}
        </div>
        <p className="hint settings-auto-hint">
          Keeps pulling on its own, stopping on an affordable result (optionally only one at or
          above the threshold price).
        </p>

        <div className="settings-row settings-row-wrap">
          <label>Auto Buy</label>
          <button
            className={`auto-buy-toggle${autoBuy ? ' active' : ''}`}
            onClick={() => setAutoBuy((o) => !o)}
          >
            {autoBuy ? 'On' : 'Off'}
          </button>
          {autoBuy && (
            <>
              <input
                type="number"
                className="auto-buy-threshold"
                placeholder="Min price..."
                min="0"
                value={autoBuyMin}
                onChange={(e) => setAutoBuyMin(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') autoBuyMaxRef.current?.focus()
                }}
              />
              <input
                ref={autoBuyMaxRef}
                type="number"
                className="auto-buy-threshold"
                placeholder="Max price..."
                min="0"
                value={autoBuyMax}
                onChange={(e) => setAutoBuyMax(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur()
                }}
              />
            </>
          )}
        </div>
        <p className="hint settings-auto-hint">
          Buys any pulled result inside the price range automatically, working left to right
          across the reels.
        </p>

        <hr className="settings-divider" />

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
