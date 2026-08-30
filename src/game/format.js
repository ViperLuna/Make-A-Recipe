// Standard short-scale suffixes, matching the ones already used when this
// game's price curves were designed (Qa=quadrillion, Qi=quintillion, etc).
const SUFFIXES = [
  { value: 1e33, suffix: 'Dc' },
  { value: 1e30, suffix: 'No' },
  { value: 1e27, suffix: 'Oc' },
  { value: 1e24, suffix: 'Sp' },
  { value: 1e21, suffix: 'Sx' },
  { value: 1e18, suffix: 'Qi' },
  { value: 1e15, suffix: 'Qa' },
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
]

export function formatMoney(n) {
  const abs = Math.abs(n)
  if (abs < 1000) return `$${n.toFixed(2)}`
  for (const { value, suffix } of SUFFIXES) {
    // No decimals once a suffix kicks in - "$100K" instead of "$100.00K".
    // Keeps suffixed prices shorter, which matters on tight mobile buttons
    // like the lever mechanism unlock ones.
    if (abs >= value) return `$${(n / value).toFixed(0)}${suffix}`
  }
  return `$${n.toFixed(2)}`
}

// Same short-scale suffixes as formatMoney, but for plain counts (no $, no
// forced decimals below 1000).
export function formatNumber(n) {
  const abs = Math.abs(n)
  if (abs < 1000) return `${n}`
  for (const { value, suffix } of SUFFIXES) {
    if (abs >= value) return `${(n / value).toFixed(2)}${suffix}`
  }
  return `${n}`
}
