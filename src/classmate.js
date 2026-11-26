const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLL = /^[A-Za-z0-9]{5,12}$/

export function validateSignup({ name = '', email = '', roll = '' }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter your name.'
  if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email.'
  if (!ROLL.test(roll.trim())) errors.roll = 'Roll number is 5–12 letters or digits.'
  return { ok: Object.keys(errors).length === 0, errors }
}
