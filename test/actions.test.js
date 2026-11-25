import { it, expect } from 'vitest'
import { normalizeAction, summarize, decide, parseActionText } from '../understudy/actions.js'

it('extracts the JSON action from fenced or chatty replies', () => {
  expect(parseActionText('{"action":"leave","reason":"meh"}')).toMatchObject({ action: 'leave' })
  expect(parseActionText('```json\n{"action":"click","target":2}\n```')).toMatchObject({ action: 'click', target: 2 })
  expect(parseActionText('Sure! Here you go: {"action":"type","target":1,"text":"Asha"} hope that helps')).toMatchObject({ text: 'Asha' })
  expect(parseActionText('I would leave.')).toBeNull()
  expect(parseActionText('{"action": "click", ')).toBeNull()
})

const els = [{ id: 0, kind: 'button' }, { id: 1, kind: 'text' }]

it('normalizes valid actions and rejects bad ones', () => {
  expect(normalizeAction({ action: 'click', target: 0 }, els)).toEqual({ kind: 'click', id: 0 })
  expect(normalizeAction({ action: 'type', target: 1, text: 'Asha' }, els)).toEqual({ kind: 'type', id: 1, text: 'Asha' })
  expect(normalizeAction({ action: 'leave', reason: 'too many fields' }, els)).toEqual({ kind: 'leave', reason: 'too many fields' })
  expect(normalizeAction({ action: 'leave', reason: null }, els)).toEqual({ kind: 'leave', reason: 'no reason given' })
  expect(normalizeAction({ action: 'click', target: 9 }, els).kind).toBe('invalid')
  expect(normalizeAction({ action: 'type', target: 0, text: 'x' }, els).kind).toBe('invalid')
  expect(normalizeAction(null, els)).toEqual({ kind: 'invalid', why: 'unparseable' })
})

it('summarizes per arm and per persona', () => {
  const s = summarize([
    { arm: 'signup_first', personaId: 'privacy-guarded', outcome: 'signed_up' },
    { arm: 'signup_first', personaId: 'privacy-guarded', outcome: 'left', leaveReason: 'asked for roll number' },
    { arm: 'preview_first', personaId: 'idle-scroller', outcome: 'error' },
  ])
  expect(s.arms.signup_first).toMatchObject({ sessions: 2, signedUp: 1, rate: 0.5 })
  expect(s.arms.signup_first.leaveReasons).toEqual(['asked for roll number'])
  expect(s.arms.preview_first).toMatchObject({ sessions: 1, signedUp: 0, rate: 0, outcomes: { error: 1 } })
  expect(s.byPersona['privacy-guarded'].signup_first).toEqual({ sessions: 2, signedUp: 1 })
})

it('applies the pre-registered decision rule at its boundaries', () => {
  expect(decide(0.97).verdict).toBe('ship_variant')
  expect(decide(0.95).verdict).toBe('inconclusive')
  expect(decide(0.5).verdict).toBe('inconclusive')
  expect(decide(0.03).verdict).toBe('keep_control')
})
