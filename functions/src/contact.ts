export const MAX_BODY_BYTES = 32 * 1024
export type Contact = { name: string; email: string; message: string }
type FieldErrors = Partial<Record<keyof Contact, string>>
// Use the reader surface shared by Node and DOM streams (their full types differ).
type RequestLike = {
  method: string
  headers: Pick<Headers, 'get' | 'has'>
  body: { getReader(): {
    read(): Promise<{ done?: boolean; value?: Uint8Array }>
    cancel(): Promise<void>
    releaseLock(): void
  } } | null
}
export type ContactResult = { status: number; headers: Record<string, string>; jsonBody: Record<string, unknown> }
type Dependencies = {
  verify: (token: string) => Promise<boolean>
  save: (contact: Contact) => Promise<void>
  report: (code: 'verification_unavailable' | 'storage_unavailable') => void
}

class PayloadTooLarge extends Error {}

async function readJson(request: RequestLike): Promise<unknown> {
  const length = request.headers.get('content-length')
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY_BYTES) throw new PayloadTooLarge()
  // Count actual bytes too: Content-Length can be missing or misleading.
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value) continue
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new PayloadTooLarge()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))
}

function reply(status: number, code: string, extra: Record<string, unknown> = {}): ContactResult {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    jsonBody: { code, ...extra },
  }
}

export async function handleContact(request: RequestLike, deps: Dependencies): Promise<ContactResult> {
  if (request.method !== 'POST') return { ...reply(405, 'method_not_allowed'), headers: { ...reply(405, '').headers, Allow: 'POST' } }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415, 'json_required')
  if (request.headers.has('content-encoding') && request.headers.get('content-encoding') !== 'identity') return reply(415, 'encoding_not_supported')
  let input: unknown
  try { input = await readJson(request) } catch (error) {
    return reply(error instanceof PayloadTooLarge ? 413 : 400, error instanceof PayloadTooLarge ? 'request_too_large' : 'invalid_json')
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, 'invalid_request')
  const body = input as Record<string, unknown>
  if (Object.keys(body).some(key => !['name', 'email', 'message', 'website', 'turnstileToken'].includes(key))) return reply(400, 'invalid_request')
  // Honeypot: reject without writing, logging, or spending a Siteverify call.
  if (typeof body.website !== 'string' || body.website !== '') return reply(400, 'verification_failed')
  const contact: Contact = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim() : '',
    message: typeof body.message === 'string' ? body.message.trim() : '',
  }
  const errors: FieldErrors = {}
  if (!contact.name || contact.name.length > 100 || /[\u0000-\u001f\u007f]/.test(contact.name)) errors.name = 'Enter your name (1–100 characters).'
  if (contact.email.length > 254 || !/^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(contact.email)) errors.email = 'Enter a valid email address (up to 254 characters).'
  if (!contact.message || contact.message.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(contact.message)) errors.message = 'Enter a message (1–5,000 characters).'
  if (Object.keys(errors).length) return reply(400, 'validation_failed', { errors })
  if (typeof body.turnstileToken !== 'string' || !body.turnstileToken || body.turnstileToken.length > 2048) return reply(400, 'verification_failed')
  try {
    if (!await deps.verify(body.turnstileToken)) return reply(400, 'verification_failed')
  } catch {
    deps.report('verification_unavailable')
    return reply(503, 'temporarily_unavailable')
  }
  try { await deps.save(contact) } catch {
    deps.report('storage_unavailable')
    return reply(503, 'temporarily_unavailable')
  }
  return reply(201, 'sent')
}
