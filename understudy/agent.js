// One persona, one fresh browser (a new visitor), one action at a time.
// All Flagsmith traffic comes from the page itself; Understudy never talks to Flagsmith.
import { STORAGE_KEY, AGENT_PREFIX } from '../src/experiment.js'
import { parseActionText, normalizeAction } from './actions.js'

export const SYSTEM_PROMPT = `You are role-playing a real college student browsing a website on your phone. Stay in character as the persona you are given. Act the way this person really would: real people skim, hesitate, get bored or suspicious, and often leave without finishing anything. You are never required to sign up. If you choose to fill in a form, invent plausible details that fit your persona. Each turn you see the page text and its numbered interactive elements. Choose exactly one next action: click an element, type into a text field, or leave the site. Keep "thought" to one short sentence in your persona's voice. Reply with only a JSON object and nothing else: {"thought": string, "action": "click" | "type" | "leave", "target": element number or null, "text": text to type or null, "reason": why you are leaving, or null}`

// Ollama Cloud by default; OLLAMA_HOST=http://localhost:11434 runs the personas on a local model instead.
const OLLAMA_URL = `${process.env.OLLAMA_HOST ?? 'https://ollama.com'}/api/chat`
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Runs inside the page: number every visible control so the model can point at it.
function snapshotPage() {
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
  const kindOf = el => {
    if (el.tagName === 'A') return 'link'
    if (el.tagName === 'SELECT') return 'select'
    if (el.tagName === 'TEXTAREA') return 'text'
    if (el.tagName === 'INPUT' && !['button', 'submit', 'checkbox', 'radio'].includes(el.type)) return 'text'
    return 'button'
  }
  const labelOf = el =>
    (el.id && document.querySelector(`label[for="${el.id}"]`)?.innerText) ||
    el.getAttribute('aria-label') || el.innerText || el.placeholder || el.name || ''
  document.querySelectorAll('[data-us]').forEach(el => el.removeAttribute('data-us'))
  const elements = [...document.querySelectorAll('button, a[href], input, select, textarea')]
    .filter(visible)
    .map((el, id) => {
      el.setAttribute('data-us', String(id))
      return { id, kind: kindOf(el), label: labelOf(el).trim().replace(/\s+/g, ' '), value: el.value ?? '' }
    })
  return { text: (document.querySelector('main')?.innerText ?? '').slice(0, 4000), elements }
}

function userMessage(persona, snapshot, history) {
  const done = history.length ? history.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Nothing yet — you just opened the page.'
  const elements = snapshot.elements
    .map(e => `[${e.id}] ${e.kind} "${e.label}"${e.kind === 'text' ? ` value="${e.value}"` : ''}`)
    .join('\n')
  return `Persona: ${persona.description}
How you got here: ${persona.arrivedFrom}

What you've done so far:
${done}

Page text:
${snapshot.text}

Interactive elements:
${elements}`
}

export async function chooseAction({ apiKey, model, persona, snapshot, history }) {
  const body = JSON.stringify({
    model,
    stream: false,
    think: false,
    options: { temperature: 0.8 },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage(persona, snapshot, history) },
    ],
  })
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(90_000),
    })
    if (res.ok) return parseActionText((await res.json()).message?.content ?? '')
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(5000); continue }
    throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
}

export async function runSession({ browser, url, persona, apiKey, model, maxSteps = 12 }) {
  const started = Date.now()
  const sessionId = crypto.randomUUID()
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  // Pre-seed the visitor id so agent identities are recognisable in Flagsmith (us-<sessionId>).
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, AGENT_PREFIX + sessionId])
  const page = await context.newPage()
  const steps = []
  const history = []
  let arm = null
  let outcome = null
  let leaveReason = null
  let invalidStreak = 0
  try {
    await page.goto(url)
    await page.waitForSelector('body[data-arm]', { timeout: 8000 })
    arm = await page.getAttribute('body', 'data-arm')
    for (let i = 0; i < maxSteps && !outcome; i++) {
      const snapshot = await page.evaluate(snapshotPage)
      const raw = await chooseAction({ apiKey, model, persona, snapshot, history })
      let action = normalizeAction(raw, snapshot.elements)
      const el = snapshot.elements.find(e => e.id === action.id)
      if (action.kind === 'click' || action.kind === 'type') {
        try {
          const target = page.locator(`[data-us="${action.id}"]`)
          if (action.kind === 'click') await target.click({ timeout: 5000 })
          else await target.fill(action.text, { timeout: 5000 })
        } catch (e) {
          action = { kind: 'invalid', why: `could not ${action.kind}: ${e.message.split('\n')[0]}` }
        }
      }
      steps.push({ thought: raw?.thought ?? null, action: action.kind, label: el?.label ?? null, text: action.text ?? null, why: action.why ?? action.reason ?? null })
      if (action.kind === 'invalid') {
        if (++invalidStreak >= 3) { outcome = 'error'; leaveReason = `3 invalid actions in a row (last: ${action.why})` }
        continue
      }
      invalidStreak = 0
      if (action.kind === 'leave') { outcome = 'left'; leaveReason = action.reason; break }
      history.push(action.kind === 'click' ? `Tapped "${el.label}"` : `Typed "${action.text}" into "${el.label}"`)
      if (await page.locator('#success').isVisible()) outcome = 'signed_up'
    }
    outcome ??= 'max_steps'
  } catch (e) {
    outcome = 'error'
    leaveReason = e.message.split('\n')[0]
  } finally {
    // Let the page's flushed Flagsmith events leave before the visitor "closes the tab".
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await context.close()
  }
  return { sessionId, personaId: persona.id, arm, outcome, leaveReason, steps, ms: Date.now() - started }
}
