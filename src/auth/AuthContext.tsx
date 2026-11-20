import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type User = { id: string; details: string; name: string; isAdmin: boolean }
type AuthState = { status: 'loading' | 'anonymous' | 'error'; user: null } | { status: 'signed-in'; user: User }
type AuthContextValue = AuthState & { refresh: () => void; clear: () => void }
const AuthContext = createContext<AuthContextValue | null>(null)
export const signInUrl = '/.auth/login/aad?post_login_redirect_uri=/account'
export const signOutUrl = '/.auth/logout?post_logout_redirect_uri=/'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })
  const active = useRef<AbortController | null>(null)
  const clear = useCallback(() => {
    active.current?.abort()
    setState({ status: 'anonymous', user: null })
  }, [])
  const refresh = useCallback(() => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setState({ status: 'loading', user: null })
    const options: RequestInit = { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }
    void (async () => {
      try {
        const response = await fetch('/api/account', options)
        if (controller.signal.aborted) return
        if (response.status === 401) { setState({ status: 'anonymous', user: null }); return }
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
        if (!controller.signal.aborted) setState({ status: 'signed-in', user: { id: user.id, details: user.details, isAdmin: user.isAdmin, name } })
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error', user: null })
      }
    })()
  }, [])

  useEffect(() => {
    refresh()
    const visibility = () => {
      if (document.visibilityState === 'visible') refresh()
      else {
        active.current?.abort()
        setState({ status: 'loading', user: null })
      }
    }
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) refresh() }
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', pageShow)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      active.current?.abort()
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', pageShow)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [refresh])
  return <AuthContext.Provider value={{ ...state, refresh, clear }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider is required')
  return auth
}
