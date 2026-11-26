// npm run understudy -- --sessions 20 --url https://… [--concurrency 3] [--headed]
import { parseArgs } from 'node:util'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { runSession, preflight, MODEL } from './agent.js'
import { summarize, makeStreakBreaker } from './actions.js'

const { values } = parseArgs({
  options: {
    sessions: { type: 'string', default: '20' },
    url: { type: 'string' },
    concurrency: { type: 'string', default: '3' },
    headed: { type: 'boolean', default: false },
  },
})

const url = values.url ?? process.env.TARGET_URL
if (!url) { console.error('Pass --url'); process.exit(1) }
const apiKey = process.env.OLLAMA_API_KEY
if (!apiKey) { console.error('Set OLLAMA_API_KEY in .env'); process.exit(1) }

const total = Number(values.sessions)
const personas = JSON.parse(readFileSync(new URL('./personas.json', import.meta.url), 'utf8'))
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const file = `runs/${runId}.jsonl`
mkdirSync('runs', { recursive: true })

try {
  await preflight(apiKey)
} catch (e) {
  console.error(`${e.message}
No sessions were run, so nothing reached Flagsmith.`)
  process.exit(1)
}

// slowMo makes headed runs watchable for the demo video.
const browser = await chromium.launch({ headless: !values.headed, slowMo: values.headed ? 300 : 0 })
const results = []
const breaker = makeStreakBreaker(3)
let next = 0

async function worker() {
  while (next < total) {
    const n = next++
    // Round-robin personas: equal mix per run. Flagsmith still randomises the arm per visitor.
    const persona = personas[n % personas.length]
    const startedAt = new Date().toISOString()
    let result
    try {
      // --headed: print each thought live, next to the visible browser (for demos)
      const onStep = values.headed ? s => console.log(`  [${persona.id}] ${s.thought ?? ''}  →  ${s.action}${s.label ? ` \"${s.label}\"` : ''}${s.text ? ` «${s.text}»` : ''}`) : undefined
      result = await runSession({ browser, url, persona, apiKey, onStep })
    } catch (e) {
      result = { personaId: persona.id, arm: null, outcome: 'error', leaveReason: e.message, steps: [] }
    }
    const line = { runId, n, startedAt, model: MODEL, url, ...result }
    appendFileSync(file, JSON.stringify(line) + '\n')
    results.push(line)
    console.log(`#${n + 1}/${total}  ${line.personaId.padEnd(18)} ${String(line.arm).padEnd(14)} ${line.outcome}${line.leaveReason ? `: ${line.leaveReason}` : ''}`)
    if (breaker.record(line.outcome) && next < total) {
      console.error('3 errors in a row: stopping the run so a broken setup does not keep adding exposures.')
      next = total
    }
  }
}

await Promise.all(Array.from({ length: Number(values.concurrency) }, worker))
await browser.close()

const { arms } = summarize(results)
console.log(`\nRun ${runId} → ${file}`)
const notEnrolled = results.filter(r => r.fallback).length
if (notEnrolled) console.log(`${notEnrolled} session(s) fell back to control because Flagsmith was slow. They are counted below but not enrolled in the experiment.`)
console.table(Object.fromEntries(Object.entries(arms).map(([arm, a]) => [arm, {
  sessions: a.sessions,
  signedUp: a.signedUp,
  rate: `${(a.rate * 100).toFixed(1)}%`,
  left: a.outcomes.left,
  maxSteps: a.outcomes.max_steps,
  errors: a.outcomes.error,
}])))
for (const [arm, a] of Object.entries(arms)) {
  if (!a.leaveReasons.length) continue
  console.log(`\nWhy personas left (${arm}):`)
  for (const reason of a.leaveReasons.slice(0, 5)) console.log(`  - ${reason}`)
}
