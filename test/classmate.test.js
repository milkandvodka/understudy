import { it, expect } from 'vitest'
import { validateSignup } from '../src/classmate.js'

it('validates the signup form field by field', () => {
  expect(validateSignup({ name: 'Asha', email: 'asha@college.edu', roll: '2105123' })).toEqual({ ok: true, errors: {} })
  const bad = validateSignup({ name: '   ', email: 'asha@college', roll: '21#05' })
  expect(bad.ok).toBe(false)
  expect(Object.keys(bad.errors).sort()).toEqual(['email', 'name', 'roll'])
})

// Found by a persona in the pilot: real roll numbers often contain letters.
it('accepts alphanumeric roll numbers', () => {
  expect(validateSignup({ name: 'Priya', email: 'priya@college.edu', roll: '22CS1047' }).ok).toBe(true)
  expect(validateSignup({ name: 'Priya', email: 'priya@college.edu', roll: ' 21BCE0042 ' }).ok).toBe(true)
  expect(validateSignup({ name: 'Priya', email: 'priya@college.edu', roll: '123' }).ok).toBe(false)
})
