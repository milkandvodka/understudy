import flagsmith from '@flagsmith/flagsmith'
import { FLAG_KEY, VARIANT, EVENT, getVisitorId, assignArm } from './experiment.js'
import { SAMPLE_SUBJECTS, attendanceStatus, validateSignup } from './classmate.js'

const $ = id => document.getElementById(id)

// Events buffer for ~10 s; flush right away so visitors who leave quickly still count.
const flush = () => { try { flagsmith.flushEvents().catch(() => {}) } catch {} }

let storage = null
try { storage = window.localStorage } catch {}
const visitorId = getVisitorId(storage)

// getExperimentFlag records the exposure, so it only runs if Flagsmith answered in time.
// Slow or down: show control and stay out of the experiment.
const { arm, fallback } = await assignArm({
  init: () => flagsmith.init({ environmentID: import.meta.env.VITE_FLAGSMITH_ENV_ID, identity: visitorId, enableEvents: true }),
  getFlag: () => {
    const flag = flagsmith.getExperimentFlag(FLAG_KEY)
    flush()
    return flag
  },
  timeoutMs: 4000,
})
document.body.dataset.fallback = String(fallback)
document.body.dataset.arm = arm

function reveal(section) {
  section.hidden = false
  section.querySelector('[tabindex="-1"]')?.focus()
}

function button(label, onClick) {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = label
  b.addEventListener('click', () => { b.hidden = true; onClick() }) // one step at a time, same in both arms
  return b
}

if (arm === VARIANT) {
  $('subjects').innerHTML = SAMPLE_SUBJECTS.map(({ name, attended, total }) => {
    const s = attendanceStatus(attended, total)
    return `<tr class="${s.mustAttend ? 'low' : ''}">
      <th scope="row">${name}</th>
      <td><span class="bar" style="--p:${s.percent}%" aria-hidden="true"></span>${s.percent}%</td>
      <td>${s.canSkip}</td>
      <td>${s.mustAttend}</td>
    </tr>`
  }).join('')
  $('cta').append(button('Try it with sample data', () => reveal($('preview'))))
  $('preview').append(button('Make this yours — create your account', () => reveal($('signup'))))
} else {
  $('cta').append(button('Create your account', () => reveal($('signup'))))
}

$('signup-form').addEventListener('submit', event => {
  event.preventDefault()
  const form = event.currentTarget
  const { ok, errors } = validateSignup(Object.fromEntries(new FormData(form)))
  for (const field of ['name', 'email', 'roll']) {
    form.elements.namedItem(field).setAttribute('aria-invalid', errors[field] ? 'true' : 'false')
    $(`${field}-error`).textContent = errors[field] ?? ''
  }
  if (!ok) return
  form.reset() // nothing typed is kept or sent
  $('signup').hidden = true
  reveal($('success'))
  try { flagsmith.trackEvent(EVENT) } catch {}
  flush()
})
