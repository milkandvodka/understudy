import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Final review: roll numbers like 22CS1047 need letters, so phones must not get a digits-only keypad.
it('lets phone users type letters in the roll number', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const roll = html.match(/<input id="f-roll"[^>]*>/)[0]
  expect(roll).not.toMatch(/inputmode="numeric"/)
})
