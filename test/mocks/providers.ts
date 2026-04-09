import { vi } from 'vitest'

export const mockGeminiSuccess = () =>
  vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: Buffer.from('fake-image').toString('base64'),
                  },
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )

export const mockGeminiFail = () =>
  vi.fn().mockResolvedValue(new Response('boom', { status: 500 }))
