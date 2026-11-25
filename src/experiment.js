// Everything the experiment depends on lives here, so it can be removed cleanly once it ends.
export const FLAG_KEY = 'onboarding_flow'
export const CONTROL = 'signup_first'
export const VARIANT = 'preview_first'
export const EVENT = 'signup_completed'
export const STORAGE_KEY = 'classmate_vid'
export const AGENT_PREFIX = 'us-'

// Anything unexpected (Flagsmith down, unknown value) falls back to control.
export const resolveVariant = flag => (flag?.value === VARIANT ? VARIANT : CONTROL)

// Stable anonymous id. Blocked or missing storage still gets an id, just not a remembered one.
export function getVisitorId(storage) {
  try {
    const existing = storage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    storage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

// Resolves to the promise's value, or to `fallback` on rejection or after `ms`. Never rejects.
export const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise(resolve => setTimeout(resolve, ms, fallback)),
  ])
