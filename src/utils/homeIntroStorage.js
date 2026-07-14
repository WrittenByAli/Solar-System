const INTRO_KEY_PREFIX = 'sa-home-intro-seen'

export function getHomeIntroKey({ isGuest, clerkId }) {
  if (isGuest) return 'guest'
  if (clerkId) return clerkId
  return null
}

function storageKey(introKey) {
  return `${INTRO_KEY_PREFIX}:${introKey}`
}

export function hasSeenHomeIntro(introKey) {
  if (!introKey) return true
  try {
    return localStorage.getItem(storageKey(introKey)) === '1'
  } catch {
    return true
  }
}

export function markHomeIntroSeen(introKey) {
  if (!introKey) return
  try {
    localStorage.setItem(storageKey(introKey), '1')
  } catch { /* storage unavailable */ }
}

export function clearHomeIntroSeen(introKey) {
  if (!introKey) return
  try {
    localStorage.removeItem(storageKey(introKey))
  } catch { /* storage unavailable */ }
}
