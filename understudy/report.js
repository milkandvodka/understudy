// npm run report: Flagsmith's numbers (results/flagsmith.json) + Understudy's transcripts → REPORT.md,
// with the pre-registered decision rule applied in code.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { summarize, decide } from './actions.js'
import rule from './decision.json' with { type: 'json' }

const fs = JSON.parse(readFileSync('results/flagsmith.json', 'utf8'))
const sessions = readdirSync('runs')
  .filter(f => f.endsWith('.jsonl'))
  .flatMap(f => readFileSync(`runs/${f}`, 'utf8').trim().split('\n').map(line => JSON.parse(line)))
  .filter(s => s.startedAt >= fs.launchedAt && s.url?.includes('github.io'))

const enrolled = sessions.filter(s => s.arm && !s.fallback)
const all = summarize(enrolled)
const acted = summarize(enrolled.filter(s => s.outcome !== 'error'))
const verdict = decide(fs.chanceVariantBeatsControl, rule)
const pct = x => `${(x * 100).toFixed(1)}%`
// Flagsmith shows small chances as a bound ("< 1%"); print it as shown and use the bound for the rule.
const chanceText = fs.chanceDisplayed ?? pct(fs.chanceVariantBeatsControl)
const arms = ['signup_first', 'preview_first']

const lines = [
  `# Rehearsal report: experiment ${fs.experimentId}`,
  '',
  `Flagsmith numbers as of ${fs.asOf}. Understudy sessions since ${fs.launchedAt}: ${sessions.length} (${enrolled.length} enrolled).`,
  '',
  '## Flagsmith (Bayesian engine)',
  '',
  '| Variant | Exposures | Conversions | Rate |',
  '|---|---|---|---|',
  ...arms.map(a => `| ${a} | ${fs.arms[a].exposures} | ${fs.arms[a].conversions} | ${pct(fs.arms[a].conversions / fs.arms[a].exposures)} |`),
  '',
  `Lift of preview_first vs control: **${pct(fs.lift)}**, 95% credible interval [${pct(fs.interval95[0])}, ${pct(fs.interval95[1])}]. Chance preview_first beats control: **${chanceText}**.`,
  '',
  '## Decision (pre-registered rule, applied in code)',
  '',
  `\`understudy/decision.json\`: ship preview_first above ${pct(rule.shipVariantAbove)}, keep control below ${pct(rule.keepControlBelow)}, otherwise inconclusive.`,
  '',
  `**Verdict: ${verdict.verdict}.** Flagsmith gives preview_first a ${chanceText} chance of beating control (rule: ship above ${pct(rule.shipVariantAbove)}, keep control below ${pct(rule.keepControlBelow)}).`,
  '',
  '## Does Flagsmith agree with the transcripts?',
  '',
  '| Variant | Understudy sessions | Flagsmith exposures | Understudy sign-ups | Flagsmith conversions |',
  '|---|---|---|---|---|',
  ...arms.map(a => `| ${a} | ${all.arms[a]?.sessions ?? 0} | ${fs.arms[a].exposures} | ${all.arms[a]?.signedUp ?? 0} | ${fs.arms[a].conversions} |`),
  '',
  `Sessions that ended in an error (the persona never acted, usually a network drop) still count as exposures in Flagsmith: ${arms.map(a => `${a} ${all.arms[a]?.outcomes.error ?? 0}`).join(', ')}. Excluding them, the sign-up rates are ${arms.map(a => `${a} ${pct(acted.arms[a]?.rate ?? 0)}`).join(', ')}.`,
  '',
  '## Who each version helped or hurt (directional, small cells)',
  '',
  '| Persona | signup_first | preview_first |',
  '|---|---|---|',
  ...Object.entries(all.byPersona).sort().map(([p, byArm]) =>
    `| ${p} | ${arms.map(a => (byArm[a] ? `${byArm[a].signedUp}/${byArm[a].sessions}` : '–')).join(' | ')} |`),
  '',
  '## Why personas left',
  '',
  ...arms.flatMap(a => [`**${a}**`, '', ...(all.arms[a]?.leaveReasons ?? []).slice(0, 6).map(r => `- ${r}`), '']),
]

writeFileSync('REPORT.md', lines.join('\n'))
console.log(lines.join('\n'))
