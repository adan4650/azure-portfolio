import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<TurnstileApi> | undefined
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => { window.clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('Verification could not load')) }
    const timer = window.setTimeout(fail, 15000)
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      window.clearTimeout(timer)
      if (window.turnstile) resolve(window.turnstile)
      else fail()
    }
    script.onerror = fail
    document.head.append(script)
  })
  return loading
}

export default function Turnstile({ siteKey, attempt, onToken }: { siteKey: string; attempt: number; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let disposed = false
    let widget: string | undefined
    let api: TurnstileApi | undefined
    onToken('')
    setFailed(false)
    loadTurnstile().then(loaded => {
      if (disposed || !container.current) return
      api = loaded
      widget = loaded.render(container.current, {
        sitekey: siteKey, action: 'contact', theme: 'dark', size: 'flexible',
        callback: (token: string) => { if (!disposed) { onToken(token); setFailed(false) } },
        'expired-callback': () => { if (!disposed) onToken('') },
        'error-callback': () => { if (!disposed) { onToken(''); setFailed(true) } },
        'timeout-callback': () => { if (!disposed) { onToken(''); setFailed(true) } },
      })
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; if (widget !== undefined) api?.remove(widget) }
  }, [siteKey, attempt, reload, onToken])
  return <div className="contact-verification">
    <div ref={container} />
    {failed && <p role="alert">Verification couldn’t load. Check your connection, then <button type="button" className="contact-text-button" onClick={() => setReload(value => value + 1)}>try verification again</button>.</p>}
  </div>
}
