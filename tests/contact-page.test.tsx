import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContactPage from '../src/pages/ContactPage'

// Test only: exercise UI delivery states without loading a third-party challenge.
vi.mock('../src/components/Turnstile', () => ({
  default: ({ onToken }: { onToken: (token: string) => void }) => <button type="button" onClick={() => onToken('test-token')}>Test verification</button>,
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function fillForm() {
  const user = userEvent.setup()
  render(<MemoryRouter><ContactPage /></MemoryRouter>)
  await user.type(screen.getByLabelText('Name', { exact: true }), 'Test Visitor')
  await user.type(screen.getByLabelText('Email', { exact: true }), 'visitor@example.com')
  await user.type(screen.getByLabelText('Message', { exact: true }), 'TEST ONLY: a portfolio question.')
  await user.click(screen.getByRole('button', { name: 'Test verification' }))
  return user
}

test('successful durable receipt clears the draft', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ code: 'sent' }, { status: 201 }))
  vi.stubGlobal('fetch', fetcher)
  const user = await fillForm()
  await user.click(screen.getByRole('button', { name: 'Send message' }))
  await screen.findByText('Message received. Thanks for reaching out!')
  expect((screen.getByLabelText('Name', { exact: true }) as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Message', { exact: true }) as HTMLTextAreaElement).value).toBe('')
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe('/api/contact')
})

test.each(['network', 'storage', 'waf', 'html', 'unrecognized-success'])('%s failure retains the entire draft and offers retry', async failure => {
  const fetcher = vi.fn()
  if (failure === 'network') fetcher.mockRejectedValue(new TypeError('offline'))
  else if (failure === 'html') fetcher.mockResolvedValue(new Response('<html>Fallback</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
  else fetcher.mockResolvedValue(Response.json({ code: 'temporarily_unavailable' }, { status: failure === 'storage' ? 503 : failure === 'waf' ? 403 : 200 }))
  vi.stubGlobal('fetch', fetcher)
  const user = await fillForm()
  await user.click(screen.getByRole('button', { name: 'Send message' }))
  await screen.findByRole('button', { name: 'Try again' })
  expect((screen.getByLabelText('Name', { exact: true }) as HTMLInputElement).value).toBe('Test Visitor')
  expect((screen.getByLabelText('Email', { exact: true }) as HTMLInputElement).value).toBe('visitor@example.com')
  expect((screen.getByLabelText('Message', { exact: true }) as HTMLTextAreaElement).value).toBe('TEST ONLY: a portfolio question.')
  expect(screen.queryByText('Message received. Thanks for reaching out!')).toBeNull()
  expect((screen.getByRole('button', { name: 'Try again' }) as HTMLButtonElement).disabled).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Test verification' }))
  expect((screen.getByRole('button', { name: 'Try again' }) as HTMLButtonElement).disabled).toBe(false)
})

test('server validation is associated with its field and keeps the draft', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 'validation_failed', errors: { name: 'Enter your name (1–100 characters).' } }, { status: 400 })))
  const user = await fillForm()
  await user.click(screen.getByRole('button', { name: 'Send message' }))
  await screen.findByText('Check the highlighted fields. Your draft is still here.')
  expect(screen.getByLabelText('Name', { exact: true }).getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByLabelText('Name', { exact: true }).getAttribute('aria-describedby')).toBe('name-error')
})

test('sending prevents concurrent submissions and preserves content until receipt', async () => {
  let finish!: (value: Response) => void
  const fetcher = vi.fn().mockReturnValue(new Promise<Response>(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetcher)
  const user = await fillForm()
  await user.dblClick(screen.getByRole('button', { name: 'Send message' }))
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Sending…' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText('Name', { exact: true }) as HTMLInputElement).value).toBe('Test Visitor')
  finish(Response.json({ code: 'sent' }, { status: 201 }))
  await waitFor(() => expect(screen.queryByText('Message received. Thanks for reaching out!')).not.toBeNull())
})
