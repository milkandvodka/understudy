// npm run understudy -- --sessions 20 --url https://… [--concurrency 3] [--headed]
import { parseArgs } from 'node:util'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { runSession } from './agent.js'
import { summarize } from './actions.js'

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

const model = process.env.LLM_MODEL || 'kimi-k2.6'
const total = Number(values.sessions)
const personas = JSON.parse(readFileSync(new URL('./personas.json', import.meta.url), 'utf8'))
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const file = `runs/${runId}.jsonl`
mkdirSync('runs', { recursive: true })

// slowMo makes headed runs watchable for the demo video.
const browser = await chromium.launch({ headless: !values.headed, slowMo: values.headed ? 300 : 0 })
const results = []
let next = 0

async function worker() {
  while (next < total) {
    const n = next++
    const persona = personas[Math.floor(Math.random() * personas.length)]
    const startedAt = new Date().toISOString()
    let result
    try {
      result = await runSession({ browser, url, persona, apiKey, model })
    } catch (e) {
      result = { personaId: persona.id, arm: null, outcome: 'error', leaveReason: e.message, steps: [] }
    }
    const line = { runId, n, startedAt, model, url, ...result }
    appendFileSync(file, JSON.stringify(line) + '\n')
    results.push(line)
    console.log(`#${n + 1}/${total}  ${line.personaId.padEnd(18)} ${String(line.arm).padEnd(14)} ${line.outcome}${line.leaveReason ? `: ${line.leaveReason}` : ''}`)
  }
}

await Promise.all(Array.from({ length: Number(values.concurrency) }, worker))
await browser.close()

const { arms } = summarize(results)
console.log(`\nRun ${runId} → ${file}`)
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
