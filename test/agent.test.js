import { it, expect, vi } from 'vitest'
import { MODEL, OLLAMA_URL, chooseAction } from '../understudy/agent.js'

it('personas run only on DeepSeek V4.1 Flash via Ollama Cloud', () => {
  expect(MODEL).toBe('deepseek-v4.1-flash:cloud')
  expect(OLLAMA_URL).toBe('https://ollama.com/api/chat')
})

// Found in wave 1: a brief network drop ("fetch failed") ended sessions instead of being retried.
it('retries the model call when the network drops', async () => {
  vi.useFakeTimers()
  const reply = { ok: true, json: async () => ({ message: { content: '{"action":"leave","reason":"bye"}' } }) }
  const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(reply)
  vi.stubGlobal('fetch', fetchMock)
  try {
    const pending = chooseAction({ apiKey: 'k', persona: { description: 'd', arrivedFrom: 'a' }, snapshot: { text: '', elements: [] }, history: [] })
    await vi.advanceTimersByTimeAsync(5000)
    await expect(pending).resolves.toMatchObject({ action: 'leave' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  } finally {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  }
})
