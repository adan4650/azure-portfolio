import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { app } from '@azure/functions'

test('registered HTTP routes avoid reserved host templates and retain the public API paths', async t => {
  const registrations = []
  t.mock.method(app, 'setup', () => () => {}, { getter: true })
  t.mock.method(app, 'http', (name, options) => registrations.push({ name, ...options }))
  await import('../dist/index.js')
  const host = JSON.parse(readFileSync(new URL('../host.json', import.meta.url)))
  const prefix = host.extensions.http.routePrefix
  const endpoints = registrations.map(({ name, route, methods }) => {
    // Azure validates the template before applying host.json's route prefix.
    assert.doesNotMatch(route.replace(/^\/+|\/+$/g, ''), /^(admin|runtime)/i, `Reserved route template for ${name}`)
    return { name, path: '/' + [prefix, route].filter(Boolean).join('/'), methods }
  })
  assert.deepEqual(endpoints, [
    { name: 'contact', path: '/api/contact', methods: ['POST'] },
    { name: 'account', path: '/api/account', methods: ['GET'] },
    { name: 'submissions', path: '/api/admin/submissions', methods: ['GET'] },
  ])
})
