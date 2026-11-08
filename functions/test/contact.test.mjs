import test from 'node:test'
import assert from 'node:assert/strict'
import { handleContact, MAX_BODY_BYTES } from '../dist/contact.js'
import { verifyTurnstile } from '../dist/turnstile.js'
import { submissionEntity } from '../dist/storage.js'

const valid = { name: 'Test Visitor', email: 'visitor@example.com', message: 'TEST ONLY: portfolio walkthrough.', website: '', turnstileToken: 'test-token' }
const request = (body = valid, headers = {}) => new Request('https://portfolio.example/api/contact', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
})
function dependencies(overrides = {}) {
  const calls = { saved: [], verified: [], reported: [] }
  return { calls, deps: {
    verify: async token => { calls.verified.push(token); return true },
    save: async value => { calls.saved.push(value) },
    report: code => { calls.reported.push(code) },
    ...overrides,
  } }
}

test('anonymous valid submission succeeds only after a durable save; stores no token or honeypot', async () => {
  const { calls, deps } = dependencies()
  const response = await handleContact(request({ ...valid, name: '  Test Visitor  ' }), deps)
  assert.equal(response.status, 201)
  assert.equal(response.jsonBody.code, 'sent')
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.deepEqual(calls.saved, [{ name: valid.name, email: valid.email, message: valid.message }])
})
test('a pending write cannot produce an early success', async () => {
  let complete
  const write = new Promise(resolve => { complete = resolve })
  const { deps } = dependencies({ save: () => write })
  let settled = false
  const result = handleContact(request(), deps).then(value => { settled = true; return value })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(settled, false)
  complete()
  assert.equal((await result).status, 201)
})
test('malformed JSON and non-objects are rejected before verification', async () => {
  for (const body of ['{', 'null', '[]', '"string"']) {
    const { calls, deps } = dependencies()
    assert.equal((await handleContact(request(body), deps)).status, 400)
    assert.equal(calls.verified.length, 0)
    assert.equal(calls.saved.length, 0)
  }
})
test('field type, blank, length, email and control character checks are server-side', async () => {
  for (const patch of [{ name: {} }, { name: ' ' }, { name: 'a'.repeat(101) }, { name: 'A\nB' }, { email: 'a@b' }, { email: 'a'.repeat(255) }, { message: null }, { message: ' ' }, { message: 'x'.repeat(5001) }, { message: '\u0000' }]) {
    const { calls, deps } = dependencies()
    const response = await handleContact(request({ ...valid, ...patch }), deps)
    assert.equal(response.status, 400)
    assert.equal(response.jsonBody.code, 'validation_failed')
    assert.equal(calls.verified.length, 0)
    assert.equal(calls.saved.length, 0)
  }
})
test('honeypot, missing token and oversized token never reach storage', async () => {
  for (const patch of [{ website: 'spam' }, { website: null }, { turnstileToken: '' }, { turnstileToken: 'x'.repeat(2049) }]) {
    const { calls, deps } = dependencies()
    assert.equal((await handleContact(request({ ...valid, ...patch }), deps)).status, 400)
    assert.equal(calls.verified.length, 0)
    assert.equal(calls.saved.length, 0)
  }
})
test('unknown fields cannot supply keys, roles or status', async () => {
  const { calls, deps } = dependencies()
  assert.equal((await handleContact(request({ ...valid, partitionKey: 'admin', userRoles: ['site_admin'] }), deps)).status, 400)
  assert.equal(calls.saved.length, 0)
})
test('rejects unsupported media type, encoding and method', async () => {
  const { deps } = dependencies()
  assert.equal((await handleContact(request(valid, { 'Content-Type': 'text/plain' }), deps)).status, 415)
  assert.equal((await handleContact(request(valid, { 'Content-Encoding': 'gzip' }), deps)).status, 415)
  assert.equal((await handleContact(new Request('https://portfolio.example/api/contact'), deps)).status, 405)
})
test('byte limit works for missing, dishonest and oversized Content-Length', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }, { 'Content-Length': String(MAX_BODY_BYTES + 1) }]) {
    const { calls, deps } = dependencies()
    assert.equal((await handleContact(request('x'.repeat(MAX_BODY_BYTES + 1), headers), deps)).status, 413)
    assert.equal(calls.saved.length, 0)
  }
  const { deps } = dependencies()
  assert.equal((await handleContact(request('😀'.repeat(9000)), deps)).status, 413)
})
test('chunked body stops reading at the limit', async () => {
  let cancelled = false
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(17000)) },
    cancel() { cancelled = true },
  })
  const { deps } = dependencies()
  const response = await handleContact({ method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }), body: stream }, deps)
  assert.equal(response.status, 413)
  assert.equal(cancelled, true)
})
test('invalid verification prevents the write', async () => {
  const { calls, deps } = dependencies({ verify: async () => false })
  assert.equal((await handleContact(request(), deps)).jsonBody.code, 'verification_failed')
  assert.equal(calls.saved.length, 0)
})
test('upstream failure produces retry status and logs no submitted data or exception', async () => {
  for (const stage of ['verify', 'save']) {
    const { calls, deps } = dependencies({ [stage]: async () => { throw new Error(JSON.stringify(valid)) } })
    const response = await handleContact(request(), deps)
    assert.equal(response.status, 503)
    assert.deepEqual(calls.reported, [stage === 'verify' ? 'verification_unavailable' : 'storage_unavailable'])
    assert.equal(JSON.stringify(response).includes(valid.email), false)
  }
})
test('Turnstile requires success, exact hostname and contact action', async () => {
  const env = { TURNSTILE_SECRET_KEY: 'secret', TURNSTILE_HOSTNAMES: 'portfolio.example' }
  for (const [result, expected] of [
    [{ success: true, hostname: 'portfolio.example', action: 'contact' }, true],
    [{ success: false, hostname: 'portfolio.example', action: 'contact' }, false],
    [{ success: true, hostname: 'evil.example', action: 'contact' }, false],
    [{ success: true, hostname: 'portfolio.example.evil.example', action: 'contact' }, false],
    [{ success: true, hostname: 'portfolio.example', action: 'login' }, false],
    [{ success: true }, false],
  ]) {
    assert.equal(await verifyTurnstile('token', env, async () => Response.json(result)), expected)
  }
  await assert.rejects(verifyTurnstile('token', {}))
  await assert.rejects(verifyTurnstile('token', env, async () => new Response('', { status: 503 })))
})
test('keys order newest first and retain uniqueness for same-time submissions', () => {
  const contact = { name: valid.name, email: valid.email, message: valid.message }
  const old = submissionEntity(contact, new Date('2026-11-01'), 'old')
  const recent = submissionEntity(contact, new Date('2026-11-08'), 'recent')
  const other = submissionEntity(contact, new Date('2026-11-08'), 'other')
  assert.equal(old.partitionKey, 'inbox')
  assert.ok(recent.rowKey < old.rowKey)
  assert.notEqual(recent.rowKey, other.rowKey)
})
