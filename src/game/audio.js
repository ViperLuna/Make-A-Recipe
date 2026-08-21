import reelTickUrl from '../assets/audio/reel-tick.mp3'
import timerBellUrl from '../assets/audio/timer-bell.mp3'
import stoveStartUrl from '../assets/audio/stove-start.mp3'
import sellChingUrl from '../assets/audio/sell-ching.mp3'
import discoveryUrl from '../assets/audio/discovery.mp3'

const STORAGE_KEYS = {
  musicVolume: 'mar-audio-music-volume',
  sfxVolume: 'mar-audio-sfx-volume',
  musicMuted: 'mar-audio-music-muted',
  sfxMuted: 'mar-audio-sfx-muted',
}

const DEFAULT_FADE_MS = 1200
const SFX_POOL_SIZE = 4

// Fill these in as tracks/sounds are added under src/assets/audio/ - import
// the file above and add it here under whatever name callers pass to
// playMusic/playSfx. Importing (rather than referencing public/) makes Vite
// fingerprint the filename on build, so swapping a clip's contents later
// always busts any cached copy instead of silently serving the old one.
export const MUSIC = {}
export const SFX = {
  reelTick: reelTickUrl,
  timerBell: timerBellUrl,
  stoveStart: stoveStartUrl,
  sellChing: sellChingUrl,
  discovery: discoveryUrl,
}

function readNumber(key, fallback) {
  const n = Number(localStorage.getItem(key))
  return Number.isFinite(n) && localStorage.getItem(key) !== null ? n : fallback
}

function readBool(key, fallback) {
  const raw = localStorage.getItem(key)
  return raw === null ? fallback : raw === 'true'
}

let musicVolume = readNumber(STORAGE_KEYS.musicVolume, 0.5)
let sfxVolume = readNumber(STORAGE_KEYS.sfxVolume, 0.7)
let musicMuted = readBool(STORAGE_KEYS.musicMuted, false)
let sfxMuted = readBool(STORAGE_KEYS.sfxMuted, false)

let unlocked = false
let currentMusic = null // { name, audio }
const sfxPools = new Map() // name -> { elements: HTMLAudioElement[], next: number }

// Browsers refuse to start any audio before a user gesture. Call this from
// inside the gesture handler itself (see StartScreen) - priming each SFX
// element with a muted play+pause right there is what lets its later
// programmatic play() calls succeed on strict mobile browsers, not just an
// unlock flag. Music is deliberately NOT primed here: with a music library
// that can grow to several tracks, priming every one up front would fetch
// all of them on the Start click regardless of whether they're ever played.
// Instead, startMusicPlaylist() is called from that same click - its first
// track's play() is itself inside the gesture, so it needs no separate
// priming, and every later track only fetches once its turn comes up.
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  for (const url of Object.values(SFX)) {
    const audio = new Audio(url)
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

// Starts `incoming` playing and ramps it up while ramping out whatever was
// playing before, so the two overlap instead of cutting. Shared by playMusic
// (an explicit single track) and the shuffled playlist below.
function crossfadeTo(name, incoming, fadeMs) {
  incoming.volume = 0
  incoming.play().catch(() => {})
  const outgoing = currentMusic
  currentMusic = { name, audio: incoming }
  fadeVolume(incoming, musicMuted ? 0 : musicVolume, fadeMs)
  if (outgoing) fadeVolume(outgoing.audio, 0, fadeMs, () => outgoing.audio.pause())
}

// Crossfades into the named track if it isn't already playing.
export function playMusic(name, { loop = true, fadeMs = DEFAULT_FADE_MS } = {}) {
  const url = MUSIC[name]
  if (!url || currentMusic?.name === name) return
  const incoming = new Audio(url)
  incoming.loop = loop
  crossfadeTo(name, incoming, fadeMs)
}

export function stopMusic({ fadeMs = DEFAULT_FADE_MS } = {}) {
  if (!currentMusic) return
  const { audio } = currentMusic
  currentMusic = null
  fadeVolume(audio, 0, fadeMs, () => audio.pause())
}

// Shuffled, no-repeat-within-a-cycle playlist across every track in MUSIC,
// crossfading from one into the next as each ends and reshuffling for a
// fresh order once the whole set has played. Call once, from the same
// user-gesture handler as unlockAudio() - see the comment there.
let playlistQueue = []
let playlistLastName = null

function refillPlaylistQueue() {
  const shuffled = Object.keys(MUSIC)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // Without this, a reshuffle could land the track that just finished right
  // back at the front, playing it again immediately across the boundary.
  if (playlistLastName && shuffled.length > 1 && shuffled[0] === playlistLastName) {
    ;[shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
  }
  playlistQueue = shuffled
}

// Crossfading into the next track needs to start a bit before this one
// actually ends, not after - so schedule it off the track's own duration
// once known, and only fall back to the (gapless-cut, no overlap) `ended`
// event if that duration is never available.
function scheduleNextPlaylistTrack(audio) {
  function schedule() {
    const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : null
    if (durationMs) {
      setTimeout(advancePlaylistTrack, Math.max(0, durationMs - DEFAULT_FADE_MS))
    } else {
      audio.addEventListener('ended', advancePlaylistTrack, { once: true })
    }
  }
  if (audio.readyState >= 1) schedule()
  else audio.addEventListener('loadedmetadata', schedule, { once: true })
}

function advancePlaylistTrack() {
  if (playlistQueue.length === 0) refillPlaylistQueue()
  const name = playlistQueue.shift()
  playlistLastName = name
  const incoming = new Audio(MUSIC[name])
  scheduleNextPlaylistTrack(incoming)
  crossfadeTo(name, incoming, DEFAULT_FADE_MS)
}

export function startMusicPlaylist() {
  if (Object.keys(MUSIC).length === 0) return
  refillPlaylistQueue()
  advancePlaylistTrack()
}

// A small round-robin pool per sound lets the same SFX retrigger rapidly
// (e.g. every lever tick) without cutting itself off mid-playback.
function getPool(name) {
  let pool = sfxPools.get(name)
  if (pool) return pool
  const url = SFX[name]
  if (!url) return null
  pool = {
    elements: Array.from({ length: SFX_POOL_SIZE }, () => new Audio(url)),
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
