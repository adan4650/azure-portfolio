import { afterEach, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/auth/AuthContext'
import AccountPage from '../src/pages/AccountPage'
import AdminInboxPage from '../src/pages/AdminInboxPage'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const message = { id: 'test-one', name: 'Test Visitor', email: 'visitor@example.com', message: 'TEST ONLY: a project question.', submittedAt: '2026-11-19T20:00:00.000Z', status: 'new' }
const account = (isAdmin = false) => ({ code: 'account', user: { id: 'test-user', details: 'member@example.com', isAdmin } })
const page = (messages = [message], nextCursor: string | null = null) => Response.json({ code: 'submissions', submissions: messages, nextCursor, pageSize: 20 })
function renderPage(inbox = false) {
  render(<MemoryRouter><AuthProvider>{inbox ? <AdminInboxPage /> : <AccountPage />}</AuthProvider></MemoryRouter>)
}
function mockSession(isAdmin: boolean, inbox: (url: string) => Response | Promise<Response> = () => page()) {
  const fetcher = vi.fn(async (url: string) => {
    if (url === '/api/account') return Response.json(account(isAdmin))
    if (url === '/.auth/me') return Response.json({ clientPrincipal: { userId: 'test-user', claims: [{ typ: 'name', val: 'Test Member' }] } })
    return inbox(url)
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

test('anonymous account offers Microsoft sign-in without querying submissions', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
  vi.stubGlobal('fetch', fetcher)
  renderPage()
  expect((await screen.findByRole('link', { name: 'Sign in with Microsoft' })).getAttribute('href')).toBe('/.auth/login/aad?post_login_redirect_uri=/account')
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/api/account'])
})

test('member sees their name and sign-out but cannot load private messages', async () => {
  const fetcher = mockSession(false)
  renderPage(true)
  await screen.findByText('Test Member')
  await screen.findByText('Your account does not have access to submissions.')
  expect(screen.getByRole('link', { name: 'Sign out' }).getAttribute('href')).toBe('/.auth/logout?post_logout_redirect_uri=/')
  expect(fetcher.mock.calls.some(call => call[0].startsWith('/api/admin'))).toBe(false)
})

test('an unrecognized or HTML account response fails closed and supports retry', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
  vi.stubGlobal('fetch', fetcher)
  renderPage()
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByRole('link', { name: 'Sign in with Microsoft' })
  expect(fetcher).toHaveBeenCalledTimes(2)
})

test('account uses verified API details if display claims belong to another user', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/api/account' ? Response.json(account()) : Response.json({
    clientPrincipal: { userId: 'someone-else', claims: [{ typ: 'name', val: 'Wrong Display Name' }] },
  })))
  renderPage()
  await screen.findByRole('heading', { name: 'member@example.com' })
  expect(screen.queryByText('Wrong Display Name')).toBeNull()
})

test('admin pages use encoded continuation tokens and never persist message contents', async () => {
  const cursor = 'eyJuZXh0UGFydGl0aW9uS2V5IjoiaW5ib3gifQ=='
  const nextMessage = { ...message, id: 'test-two', message: 'TEST ONLY: older message.' }
  const fetcher = mockSession(true, url => url.includes('?') ? page([nextMessage]) : page([message], cursor))
  renderPage(true)
  await screen.findByText(message.message)
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText(nextMessage.message)
  expect(screen.queryByText(message.message)).toBeNull()
  expect(fetcher.mock.calls.map(call => call[0])).toContain(`/api/admin/submissions?${new URLSearchParams({ cursor })}`)
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
  await screen.findByText(message.message)
  expect(localStorage.length).toBe(0)
  expect(sessionStorage.length).toBe(0)
})

test('message markup is displayed as text', async () => {
  const hostileText = '<img src=x onerror="alert(1)"><script>bad()</script>'
  mockSession(true, () => page([{ ...message, message: hostileText }]))
  renderPage(true)
  await screen.findByText(hostileText)
  expect(document.querySelector('.inbox-message img')).toBeNull()
  expect(document.querySelector('.inbox-message script')).toBeNull()
})

test.each([401, 403])('inbox response %s clears previously displayed private content', async status => {
  let allowed = true
  mockSession(true, () => allowed ? page() : new Response(null, { status }))
  renderPage(true)
  await screen.findByText(message.message)
  allowed = false
  await userEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }))
  await screen.findByText('Inbox access unavailable')
  expect(screen.queryByText(message.message)).toBeNull()
  expect(screen.queryByText(message.email)).toBeNull()
})

test('network failure offers retry without a false empty-inbox state', async () => {
  let offline = true
  mockSession(true, () => { if (offline) throw new TypeError('offline'); return page([]) })
  renderPage(true)
  await screen.findByText('We couldn’t load this page')
  expect(screen.queryByText('No messages yet')).toBeNull()
  offline = false
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('No messages yet')
})

test('returning to a session rechecks roles and removes messages after revocation', async () => {
  let isAdmin = true
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/account') return Response.json(account(isAdmin))
    if (url === '/.auth/me') return Response.json({ clientPrincipal: null })
    return page()
  }))
  renderPage(true)
  await screen.findByText(message.message)
  isAdmin = false
  act(() => { window.dispatchEvent(new Event('focus')) })
  await screen.findByText('Your account does not have access to submissions.')
  await waitFor(() => expect(screen.queryByText(message.message)).toBeNull())
})
