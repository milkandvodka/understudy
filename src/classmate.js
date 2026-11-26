export const SAMPLE_SUBJECTS = [
  { name: 'Data Structures', attended: 36, total: 40 },
  { name: 'Operating Systems', attended: 25, total: 40 },
  { name: 'DBMS', attended: 30, total: 40 },
  { name: 'Computer Networks', attended: 33, total: 38 },
  { name: 'Discrete Maths', attended: 27, total: 39 },
]

// Integer math so "exactly 75%" never drifts. slack > 0 means classes to spare, < 0 means classes owed.
export function attendanceStatus(attended, total, targetPct = 75) {
  if (total === 0) return { percent: 100, canSkip: 0, mustAttend: 0 }
  const slack = 100 * attended - targetPct * total
  return {
    percent: Math.round((1000 * attended) / total) / 10,
    canSkip: Math.max(0, Math.floor(slack / targetPct)),
    mustAttend: Math.max(0, Math.ceil(-slack / (100 - targetPct))),
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLL = /^[A-Za-z0-9]{5,12}$/

export function validateSignup({ name = '', email = '', roll = '' }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter your name.'
  if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email.'
  if (!ROLL.test(roll.trim())) errors.roll = 'Roll number is 5–12 letters or digits.'
  return { ok: Object.keys(errors).length === 0, errors }
}
