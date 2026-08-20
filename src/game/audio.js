const STORAGE_KEYS = {
  musicVolume: 'mar-audio-music-volume',
  sfxVolume: 'mar-audio-sfx-volume',
  musicMuted: 'mar-audio-music-muted',
  sfxMuted: 'mar-audio-sfx-muted',
}

const DEFAULT_FADE_MS = 1200
const SFX_POOL_SIZE = 4

// Fill these in as tracks/sounds are added under public/audio/ - keys are
// whatever name callers pass to playMusic/playSfx, values are paths relative
// to BASE_URL (same convention as the logo in App.jsx/StartScreen.jsx).
export const MUSIC = {}
export const SFX = {
  reelTick: 'audio/reel-tick.mp3',
}

function readNumber(key, fallback) {
  const n = Number(localStorage.getItem(key))
  return Number.isFinite(n) && localStorage.getItem(key) !== null ? n : fallback
}

function readBool(key, fallback) {
  const raw = localStorage.getItem(key)
  return raw === null ? fallback : raw === 'true'
}

function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`
}

let musicVolume = readNumber(STORAGE_KEYS.musicVolume, 0.5)
let sfxVolume = readNumber(STORAGE_KEYS.sfxVolume, 0.7)
let musicMuted = readBool(STORAGE_KEYS.musicMuted, false)
let sfxMuted = readBool(STORAGE_KEYS.sfxMuted, false)

let unlocked = false
let currentMusic = null // { name, audio }
const sfxPools = new Map() // name -> { elements: HTMLAudioElement[], next: number }

// Browsers refuse to start any audio before a user gesture. Call this from
// inside the gesture handler itself (see StartScreen) - priming each element
// with a muted play+pause right there is what lets later programmatic
// play() calls succeed on strict mobile browsers, not just an unlock flag.
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  for (const path of [...Object.values(MUSIC), ...Object.values(SFX)]) {
    const audio = new Audio(assetUrl(path))
    audio.volume = 0
    audio.play().then(() => audio.pause()).catch(() => {})
  }
}

function fadeVolume(audio, target, durationMs, onDone) {
  if (durationMs <= 0) {
    audio.volume = target
    onDone?.()
    return
  }
  const start = audio.volume
  const startTime = performance.now()
  function step() {
    const t = Math.min(1, (performance.now() - startTime) / durationMs)
    audio.volume = start + (target - start) * t
    if (t < 1) requestAnimationFrame(step)
    else onDone?.()
  }
  requestAnimationFrame(step)
}

// Crossfades into the named track if it isn't already playing: ramps the
// incoming track up while ramping any outgoing one down, so they overlap
// instead of cutting.
export function playMusic(name, { loop = true, fadeMs = DEFAULT_FADE_MS } = {}) {
  const path = MUSIC[name]
  if (!path || currentMusic?.name === name) return

  const incoming = new Audio(assetUrl(path))
  incoming.loop = loop
  incoming.volume = 0
  incoming.play().catch(() => {})

  const outgoing = currentMusic
  currentMusic = { name, audio: incoming }
  fadeVolume(incoming, musicMuted ? 0 : musicVolume, fadeMs)
  if (outgoing) fadeVolume(outgoing.audio, 0, fadeMs, () => outgoing.audio.pause())
}

export function stopMusic({ fadeMs = DEFAULT_FADE_MS } = {}) {
  if (!currentMusic) return
  const { audio } = currentMusic
  currentMusic = null
  fadeVolume(audio, 0, fadeMs, () => audio.pause())
}

// A small round-robin pool per sound lets the same SFX retrigger rapidly
// (e.g. every lever tick) without cutting itself off mid-playback.
function getPool(name) {
  let pool = sfxPools.get(name)
  if (pool) return pool
  const path = SFX[name]
  if (!path) return null
  pool = {
    elements: Array.from({ length: SFX_POOL_SIZE }, () => new Audio(assetUrl(path))),
    next: 0,
  }
  sfxPools.set(name, pool)
  return pool
}

export function playSfx(name) {
  if (sfxMuted) return
  const pool = getPool(name)
  if (!pool) return
  const audio = pool.elements[pool.next]
  pool.next = (pool.next + 1) % pool.elements.length
  audio.currentTime = 0
  audio.volume = sfxVolume
  audio.play().catch(() => {})
}

export function getMusicVolume() {
  return musicVolume
}

export function setMusicVolume(volume) {
  musicVolume = Math.min(1, Math.max(0, volume))
  localStorage.setItem(STORAGE_KEYS.musicVolume, String(musicVolume))
  if (currentMusic && !musicMuted) currentMusic.audio.volume = musicVolume
}

export function isMusicMuted() {
  return musicMuted
}

export function setMusicMuted(muted) {
  musicMuted = muted
  localStorage.setItem(STORAGE_KEYS.musicMuted, String(muted))
  if (currentMusic) currentMusic.audio.volume = muted ? 0 : musicVolume
}

export function getSfxVolume() {
  return sfxVolume
}

export function setSfxVolume(volume) {
  sfxVolume = Math.min(1, Math.max(0, volume))
  localStorage.setItem(STORAGE_KEYS.sfxVolume, String(sfxVolume))
}

export function isSfxMuted() {
  return sfxMuted
}

export function setSfxMuted(muted) {
  sfxMuted = muted
  localStorage.setItem(STORAGE_KEYS.sfxMuted, String(muted))
}
