// Backup file format: a small JSON envelope wrapping a base64 payload plus a
// SHA-256 checksum of that payload. Base64 stops someone from casually
// opening the file in a text editor and hand-editing a number; the checksum
// means a hand-edited (and re-encoded) payload gets rejected on import
// instead of silently loading. Neither is real security - the code that
// produces a valid checksum ships in this same JS bundle, so anyone who
// reads it could forge one - this only deters casual tampering/corruption,
// not a determined technical user (who already has full dev-tools access to
// this client-side game regardless).

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str)))
}

export async function buildExportFile(state) {
  const payload = encodeBase64(JSON.stringify(state))
  const checksum = await sha256Hex(payload)
  return JSON.stringify({ version: 1, checksum, payload }, null, 2)
}

export async function parseImportFile(fileText) {
  let envelope
  try {
    envelope = JSON.parse(fileText)
  } catch {
    throw new Error('Not a valid save file.')
  }
  if (!envelope || typeof envelope.payload !== 'string' || typeof envelope.checksum !== 'string') {
    throw new Error('Not a valid save file.')
  }
  const expectedChecksum = await sha256Hex(envelope.payload)
  if (expectedChecksum !== envelope.checksum) {
    throw new Error('This save file failed its integrity check - it may have been edited or corrupted.')
  }
  try {
    return JSON.parse(decodeBase64(envelope.payload))
  } catch {
    throw new Error('This save file is corrupted.')
  }
}
