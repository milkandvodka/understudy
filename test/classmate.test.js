import { it, expect } from 'vitest'
import { attendanceStatus, validateSignup } from '../src/classmate.js'

it('computes skippable and must-attend classes against 75%', () => {
  expect(attendanceStatus(30, 40)).toEqual({ percent: 75, canSkip: 0, mustAttend: 0 })
  expect(attendanceStatus(36, 40)).toEqual({ percent: 90, canSkip: 8, mustAttend: 0 })   // 36/48 = 75%
  expect(attendanceStatus(25, 40)).toEqual({ percent: 62.5, canSkip: 0, mustAttend: 20 }) // 45/60 = 75%
  expect(attendanceStatus(0, 0)).toEqual({ percent: 100, canSkip: 0, mustAttend: 0 })
})

it('validates the signup form field by field', () => {
  expect(validateSignup({ name: 'Asha', email: 'asha@college.edu', roll: '2105123' })).toEqual({ ok: true, errors: {} })
  const bad = validateSignup({ name: '   ', email: 'asha@college', roll: '21O5123' })
  expect(bad.ok).toBe(false)
  expect(Object.keys(bad.errors).sort()).toEqual(['email', 'name', 'roll'])
})
