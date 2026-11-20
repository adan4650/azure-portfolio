import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type User = { id: string; details: string; name: string; isAdmin: boolean }
type Session = { status: 'anonymous' | 'error'; user: null } | { status: 'signed-in'; user: User }
type AuthState = Session | { status: 'loading'; user: null }
type AuthContextValue = AuthState & { refresh: () => void; clear: () => void; recheck: () => Promise<Session | null> }
const AuthContext = createContext<AuthContextValue | null>(null)
export const signInUrl = '/.auth/login/aad?post_login_redirect_uri=/account'
export const signOutUrl = '/.auth/logout?post_logout_redirect_uri=/'

async function readSession(signal: AbortSignal): Promise<Session> {
  const options: RequestInit = { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }
  try {
    const response = await fetch('/api/account', options)
    signal.throwIfAborted()
    if (response.status === 401) return { status: 'anonymous', user: null }
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Account unavailable')
    const result = await response.json()
    const user = result?.user
    if (result?.code !== 'account' || typeof user?.id !== 'string' || typeof user?.details !== 'string' || typeof user?.isAdmin !== 'boolean') throw new Error('Invalid account')
    let name = user.details
    try {
      // Claims supply a display name only; the API decides inbox authorization.
      const profileResponse = await fetch('/.auth/me', options)
      if (profileResponse.ok && profileResponse.headers.get('content-type')?.includes('application/json')) {
        const profile = (await profileResponse.json())?.clientPrincipal
        if (profile?.userId === user.id && Array.isArray(profile.claims)) {
          const claim = profile.claims.find((item: { typ?: unknown; val?: unknown }) =>
            (item.typ === 'name' || item.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')
            && typeof item.val === 'string' && item.val.trim() && item.val.length <= 1024)
          if (claim) name = claim.val
        }
      }
    } catch { /* The account remains usable if optional display claims are unavailable. */ }
    return { status: 'signed-in', user: { id: user.id, details: user.details, isAdmin: user.isAdmin, name } }
  } catch { return { status: 'error', user: null } }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })
  const active = useRef<{ controller: AbortController; promise: Promise<Session | null> } | null>(null)
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancel = useCallback(() => {
    clearTimeout(pending.current)
    pending.current = undefined
    active.current?.controller.abort()
    active.current = null
  }, [])
  const clear = useCallback(() => {
    cancel()
    setState({ status: 'anonymous', user: null })
  }, [cancel])
  const recheck = useCallback(() => {
    // Focus, visibility, and inbox recovery share one account request.
    if (active.current) return active.current.promise
    const controller = new AbortController()
    const promise = readSession(controller.signal).then(session => {
      if (controller.signal.aborted) return null
      setState(session)
      return session
    }).finally(() => {
      if (active.current?.controller === controller) active.current = null
    })
    active.current = { controller, promise }
    return promise
  }, [])
  const refresh = useCallback(() => {
    if (document.visibilityState === 'hidden' || active.current) return
    setState({ status: 'loading', user: null })
    void recheck()
  }, [recheck])

  useEffect(() => {
    refresh()
    const onReturn = () => {
      if (document.visibilityState === 'hidden' || pending.current !== undefined) return
      // Returning to a tab commonly fires both focus and visibilitychange.
      pending.current = setTimeout(() => { pending.current = undefined; refresh() }, 100)
    }
    const visibility = () => {
      if (document.visibilityState === 'visible') onReturn()
      else {
        cancel()
        setState({ status: 'loading', user: null })
      }
    }
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) onReturn() }
    window.addEventListener('focus', onReturn)
    window.addEventListener('pageshow', pageShow)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancel()
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('pageshow', pageShow)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [refresh, cancel])
  return <AuthContext.Provider value={{ ...state, refresh, clear, recheck }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider is required')
  return auth
}
