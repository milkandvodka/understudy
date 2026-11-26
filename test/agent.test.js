import { it, expect } from 'vitest'
import { MODEL, OLLAMA_URL } from '../understudy/agent.js'

it('personas run only on DeepSeek V4.1 Flash via Ollama Cloud', () => {
  expect(MODEL).toBe('deepseek-v4.1-flash:cloud')
  expect(OLLAMA_URL).toBe('https://ollama.com/api/chat')
})
