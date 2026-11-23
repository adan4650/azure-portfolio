import { afterEach, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../src/pages/HomePage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.removeItem('portfolio-idle-motion')
})

function deviceMotion(reduced: boolean) {
  const query = Object.assign(new EventTarget(), { matches: reduced })
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return (next: boolean) => act(() => {
    query.matches = next
    query.dispatchEvent(new Event('change'))
  })
}

function renderHome() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>)
}

test('a visitor can enable loops despite reduced motion and keep play or pause across visits', async () => {
  deviceMotion(true)
  const user = userEvent.setup()
  let page = renderHome()
  expect(page.container.querySelector('.arcade-home')?.getAttribute('data-idle-motion')).toBe('off')
  await user.click(screen.getByRole('button', { name: 'Play animations' }))
  expect(page.container.querySelector('.arcade-home')?.getAttribute('data-idle-motion')).toBe('on')

  page.unmount()
  page = renderHome()
  await user.click(screen.getByRole('button', { name: 'Pause animations' }))
  page.unmount()
  page = renderHome()
  expect(screen.getByRole('button', { name: 'Play animations' })).toBeTruthy()
  expect(page.container.querySelector('.arcade-home')?.getAttribute('data-idle-motion')).toBe('off')
})

test('device preference changes apply until the visitor makes an explicit choice', async () => {
  const changeDevice = deviceMotion(false)
  renderHome()
  expect(screen.getByRole('button', { name: 'Pause animations' })).toBeTruthy()
  changeDevice(true)
  await userEvent.click(screen.getByRole('button', { name: 'Play animations' }))
  changeDevice(false)
  changeDevice(true)
  expect(screen.getByRole('button', { name: 'Pause animations' })).toBeTruthy()
})

test('the control works when browser storage is blocked', async () => {
  deviceMotion(true)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
  const page = renderHome()
  await userEvent.click(screen.getByRole('button', { name: 'Play animations' }))
  expect(screen.getByRole('button', { name: 'Pause animations' })).toBeTruthy()
  expect(page.container.querySelector('.arcade-home')?.getAttribute('data-idle-motion')).toBe('on')
})
