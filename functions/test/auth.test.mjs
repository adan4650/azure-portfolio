import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handleAccount } from '../dist/account.js'
import { handleSubmissions } from '../dist/inbox.js'
import { listSubmissions } from '../dist/storage.js'

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64')
const ownerUserId = 'test-owner'
const member = { identityProvider: 'aad', userId: 'test-member', userDetails: 'member@example.com', userRoles: ['anonymous', 'authenticated'] }
const admin = { ...member, userId: ownerUserId, userDetails: 'owner@example.com', userRoles: [...member.userRoles, 'site_admin'] }
const cursor = encode({ nextPartitionKey: 'inbox', nextRowKey: '9999999999999_test' })
const submission = { id: 'row-test', name: 'Test Visitor', email: 'visitor@example.com', message: 'TEST ONLY', submittedAt: '2026-11-19T20:00:00.000Z', status: 'new' }
function request(principal, path = '/api/admin/submissions', method = 'GET') {
  return new Request(`https://portfolio.example${path}`, {
    method, headers: principal === undefined ? {} : { 'x-ms-client-principal': typeof principal === 'string' ? principal : encode(principal) },
  })
}
function dependencies(overrides = {}) {
  const calls = { reads: [], reports: [] }
  return { calls, deps: {
    ownerUserId,
    list: async token => { calls.reads.push(token); return { submissions: [submission], nextCursor: cursor } },
    report: code => calls.reports.push(code),
    ...overrides,
  } }
}

// These header fixtures test the handler, not Azure's linked-provider boundary.
test('anonymous and malformed identities fail closed before storage', async () => {
  const identities = [undefined, '!!!', 'e30', encode(null), encode([]), encode('user'), 'a'.repeat(16385),
    { ...admin, identityProvider: 'github' }, { ...member, userId: '' }, { ...member, userDetails: {} },
    { ...member, userRoles: ['site_admin'] }, { ...member, userRoles: 'authenticated' }, { ...member, userRoles: ['authenticated', {}] }]
  for (const identity of identities) {
    const { calls, deps } = dependencies()
    assert.equal(handleAccount(request(identity, '/api/account'), ownerUserId).status, 401)
    const result = await handleSubmissions(request(identity), deps)
    assert.equal(result.status, 401)
    assert.equal(result.headers['Cache-Control'], 'no-store')
    assert.deepEqual(calls.reads, [])
  }
})

test('only the configured owner can read the inbox, including when custom roles fluctuate', async () => {
  assert.deepEqual(handleAccount(request(member, '/api/account'), ownerUserId).jsonBody, {
    code: 'account', user: { id: member.userId, details: member.userDetails, isAdmin: false },
  })
  for (const roles of [admin.userRoles, member.userRoles, admin.userRoles, member.userRoles]) {
    const principal = { ...admin, userRoles: roles }
    assert.equal(handleAccount(request(principal, '/api/account'), ownerUserId).jsonBody.user.isAdmin, true)
    const { calls, deps } = dependencies()
    assert.equal((await handleSubmissions(request(principal), deps)).status, 200)
    assert.equal(calls.reads.length, 1)
  }
  for (const principal of [member, { ...member, userRoles: admin.userRoles }, { ...member, userDetails: admin.userDetails },
    { ...member, userId: ownerUserId.toUpperCase() }, { ...member, userRoles: [...member.userRoles, 'owner'] }]) {
    const { calls, deps } = dependencies()
    assert.equal(handleAccount(request(principal, '/api/account'), ownerUserId).jsonBody.user.isAdmin, false)
    const result = await handleSubmissions(request(principal, '/api/admin/submissions?cursor=bad'), deps)
    assert.equal(result.status, 403)
    assert.equal(result.jsonBody.code, 'forbidden')
    assert.deepEqual(calls.reads, [])
  }
})

test('admin page is non-cacheable and forwards only validated paging state', async () => {
  const { calls, deps } = dependencies()
  const result = await handleSubmissions(request(admin, `/api/admin/submissions?${new URLSearchParams({ cursor })}`), deps)
  assert.equal(result.status, 200)
  assert.equal(result.headers['Cache-Control'], 'no-store')
  assert.deepEqual(result.jsonBody, { code: 'submissions', submissions: [submission], nextCursor: cursor, pageSize: 20 })
  assert.deepEqual(calls.reads, [cursor])
})

test('malformed, oversized, duplicate and filter-like queries never reach storage', async () => {
  const queries = ['cursor=', 'cursor=!', `cursor=${'a'.repeat(4097)}`, `cursor=${cursor}&cursor=${cursor}`, 'filter=other', 'pageSize=1000',
    ...[null, [], {}, { nextPartitionKey: 1 }, { nextPartitionKey: 'inbox', filter: 'true' }, { nextPartitionKey: 'inbox', nextRowKey: {} }].map(value => new URLSearchParams({ cursor: encode(value) }).toString())]
  for (const query of queries) {
    const { calls, deps } = dependencies()
    assert.equal((await handleSubmissions(request(admin, `/api/admin/submissions?${query}`), deps)).status, 400)
    assert.deepEqual(calls.reads, [])
  }
})

test('owner configuration changes revoke access before the next data read', async () => {
  const { calls, deps } = dependencies()
  assert.equal((await handleSubmissions(request(admin), deps)).status, 200)
  deps.ownerUserId = 'replacement-owner'
  assert.equal((await handleSubmissions(request(admin), deps)).status, 403)
  assert.equal(handleAccount(request(admin), deps.ownerUserId).jsonBody.user.isAdmin, false)
  assert.equal(calls.reads.length, 1)
})

test('missing or malformed owner configuration fails closed even for a site_admin principal', async () => {
  for (const configuredId of [undefined, '', ' ', '*', 'test-owner,test-member', 'owner@example.com', ' test-owner', 'x'.repeat(257)]) {
    const { calls, deps } = dependencies({ ownerUserId: configuredId })
    assert.equal(handleAccount(request(admin), configuredId).jsonBody.user.isAdmin, false)
    assert.equal((await handleSubmissions(request(admin), deps)).status, 503)
    assert.deepEqual(calls.reads, [])
  }
})

test('request-supplied owner settings and roles cannot change the configured owner', async () => {
  const { calls, deps } = dependencies()
  const req = request({ ...member, userRoles: admin.userRoles }, '/api/admin/submissions?INBOX_OWNER_USER_ID=test-member')
  req.headers.set('INBOX_OWNER_USER_ID', member.userId)
  req.headers.set('x-owner-user-id', member.userId)
  assert.equal((await handleSubmissions(req, deps)).status, 403)
  assert.deepEqual(calls.reads, [])
})

test('unsupported methods cannot trigger a query', async () => {
  const { calls, deps } = dependencies()
  const result = await handleSubmissions(request(admin, '/api/admin/submissions', 'POST'), deps)
  assert.equal(result.status, 405)
  assert.equal(result.headers.Allow, 'GET')
  assert.deepEqual(calls.reads, [])
})

test('storage failure emits only a fixed code, never exception text or message data', async () => {
  const { calls, deps } = dependencies({ list: async () => { throw new Error('Private visitor@example.com message') } })
  const result = await handleSubmissions(request(admin), deps)
  assert.equal(result.status, 503)
  assert.deepEqual(calls.reports, ['submissions_unavailable'])
  assert.deepEqual(result.jsonBody, { code: 'temporarily_unavailable' })
})

test('storage query is partition-fixed, bounded and projects only inbox fields', async () => {
  const { id, ...fields } = submission
  const page = [{ ...fields, rowKey: id, partitionKey: 'inbox', etag: 'private-storage-metadata' }]
  page.continuationToken = cursor
  let reads = 0
  const client = { listEntities: options => {
    assert.equal(options.queryOptions.filter, "PartitionKey eq 'inbox'")
    assert.deepEqual(options.queryOptions.select, ['RowKey', 'name', 'email', 'message', 'submittedAt', 'status'])
    assert.ok(options.abortSignal)
    return { byPage: paging => {
      assert.deepEqual(paging, { maxPageSize: 20, continuationToken: cursor })
      return { next: async () => { reads++; return { done: false, value: page } } }
    } }
  } }
  assert.deepEqual(await listSubmissions(cursor, client), { submissions: [submission], nextCursor: cursor })
  assert.equal(reads, 1)
})

test('an empty storage page preserves continuation; completion ends paging', async () => {
  const page = []
  page.continuationToken = cursor
  const client = result => ({ listEntities: () => ({ byPage: () => ({ next: async () => result }) }) })
  assert.deepEqual(await listSubmissions(undefined, client({ value: page, done: false })), { submissions: [], nextCursor: cursor })
  assert.deepEqual(await listSubmissions(undefined, client({ done: true })), { submissions: [], nextCursor: null })
})

test('SWA requires authentication before private APIs; the Function enforces owner access', () => {
  const config = JSON.parse(readFileSync(new URL('../../public/staticwebapp.config.json', import.meta.url)))
  const matching = path => config.routes.find(rule => rule.route.endsWith('*') ? path.startsWith(rule.route.slice(0, -1)) : path === rule.route)
  assert.deepEqual(matching('/api/account').allowedRoles, ['authenticated'])
  assert.deepEqual(matching('/api/admin/submissions').allowedRoles, ['authenticated'])
  assert.deepEqual(matching('/admin').allowedRoles, ['authenticated'])
  for (const path of ['/', '/videos', '/contact', '/account', '/api/contact', '/.auth/login/aad', '/.auth/login/aad/callback']) {
    assert.equal(matching(path)?.allowedRoles, undefined)
    assert.equal(matching(path)?.statusCode, undefined)
  }
  for (const path of ['/api/account', '/api/admin/submissions', '/admin', '/account', '/.auth/me']) assert.equal(matching(path).headers['Cache-Control'], 'no-store')
  assert.ok(config.navigationFallback.exclude.includes('/api/*'))
  assert.ok(config.navigationFallback.exclude.includes('/.auth/*'))
  assert.equal(config.responseOverrides?.['401'], undefined)
  assert.equal(config.auth, undefined)
  assert.equal(matching('/.auth/login/github').statusCode, 404)
})
