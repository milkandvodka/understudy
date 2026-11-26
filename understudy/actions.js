// Pure helpers: parse what the model said, check it against the page, and tally results.
import rule from './decision.json' with { type: 'json' }

// Models wrap JSON in fences or chatter. Take the outermost {...}; anything unparseable is null.
// ponytail: first-{ to last-} slice; a reply with stray braces after the JSON becomes an invalid step, which the session tolerates.
export function parseActionText(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export function normalizeAction(raw, elements) {
  if (!raw || typeof raw !== 'object') return { kind: 'invalid', why: 'unparseable' }
  if (raw.action === 'leave') return { kind: 'leave', reason: raw.reason || 'no reason given' }
  const id = raw.target == null ? NaN : Number(raw.target)
  const el = elements.find(e => e.id === id)
  if (raw.action !== 'click' && raw.action !== 'type') return { kind: 'invalid', why: `unknown action ${raw.action}` }
  if (!el) return { kind: 'invalid', why: `no element ${raw.target}` }
  if (raw.action === 'click') return { kind: 'click', id }
  if (el.kind !== 'text') return { kind: 'invalid', why: `element ${id} is not a text field` }
  if (typeof raw.text !== 'string') return { kind: 'invalid', why: 'nothing to type' }
  return { kind: 'type', id, text: raw.text }
}

const OUTCOMES = ['signed_up', 'left', 'max_steps', 'error']

export function summarize(sessions) {
  const arms = {}
  const byPersona = {}
  for (const s of sessions) {
    const a = (arms[s.arm] ??= { sessions: 0, signedUp: 0, rate: 0, outcomes: Object.fromEntries(OUTCOMES.map(o => [o, 0])), leaveReasons: [] })
    const p = ((byPersona[s.personaId] ??= {})[s.arm] ??= { sessions: 0, signedUp: 0 })
    a.sessions++
    p.sessions++
    a.outcomes[s.outcome] = (a.outcomes[s.outcome] ?? 0) + 1
    if (s.outcome === 'signed_up') { a.signedUp++; p.signedUp++ }
    if (s.outcome === 'left' && s.leaveReason) a.leaveReasons.push(s.leaveReason)
  }
  for (const a of Object.values(arms)) a.rate = a.sessions ? a.signedUp / a.sessions : 0
  return { arms, byPersona }
}

const pct = x => `${Math.round(x * 1000) / 10}%`

// The pre-registered rule (decision.json), applied to Flagsmith's chance that preview_first beats control.
export function decide(chance, r = rule) {
  // The number is copied by hand from the dashboard: refuse anything that is not a probability rather than call it inconclusive.
  if (typeof chance !== 'number' || !Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new TypeError(`decide() needs a probability between 0 and 1, got ${JSON.stringify(chance)}`)
  }
  if (chance > r.shipVariantAbove) {
    return { verdict: 'ship_variant', reason: `${pct(chance)} chance preview_first beats control, above the pre-registered ${pct(r.shipVariantAbove)}` }
  }
  if (chance < r.keepControlBelow) {
    return { verdict: 'keep_control', reason: `${pct(chance)} chance preview_first beats control, below the pre-registered ${pct(r.keepControlBelow)}` }
  }
  return { verdict: 'inconclusive', reason: `${pct(chance)} is between ${pct(r.keepControlBelow)} and ${pct(r.shipVariantAbove)}: keep control and re-test on real traffic` }
}

// Stops a run when the setup is broken (bad key, outage): each extra session would add a junk exposure in Flagsmith.
export function makeStreakBreaker(limit) {
  let streak = 0
  return { record: outcome => (streak = outcome === 'error' ? streak + 1 : 0) >= limit }
}

// Personas invent realistic emails; never publish them in transcripts.
const EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g
export const redactText = text => (typeof text === 'string' ? text.replace(EMAIL, '[email]') : text)
