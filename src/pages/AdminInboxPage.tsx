import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { signInUrl, signOutUrl, useAuth } from '../auth/AuthContext'
import './account.css'

type Submission = { id: string; name: string; email: string; message: string; submittedAt: string; status: string }
type Page = { submissions: Submission[]; nextCursor: string | null }

function parsePage(value: unknown): Page {
  const data = value as { code?: unknown; submissions?: unknown; nextCursor?: unknown }
  if (!data || data.code !== 'submissions' || !Array.isArray(data.submissions) || data.submissions.length > 20
    || !(data.nextCursor === null || (typeof data.nextCursor === 'string' && data.nextCursor.length <= 4096))
    || !data.submissions.every(item => item && ['id', 'name', 'email', 'message', 'submittedAt', 'status'].every(key => typeof item[key] === 'string'))) {
    throw new Error('Invalid response')
  }
  return { submissions: data.submissions, nextCursor: data.nextCursor }
}

function submissionDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function InboxContents() {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const [pageNumber, setPageNumber] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState<Page>({ submissions: [], nextCursor: null })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'denied'>('loading')
  const cursor = cursors[pageNumber]
  useEffect(() => {
    const controller = new AbortController()
    // Drop previous message content while checking the next response.
    setPage({ submissions: [], nextCursor: null })
    setStatus('loading')
    void (async () => {
      try {
        const query = cursor === undefined ? '' : `?${new URLSearchParams({ cursor })}`
        const response = await fetch(`/api/admin/submissions${query}`, {
          credentials: 'same-origin', cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        })
        if (controller.signal.aborted) return
        if (response.status === 401 || response.status === 403) { setStatus('denied'); return }
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Inbox unavailable')
        const result = parsePage(await response.json())
        if (!controller.signal.aborted) { setPage(result); setStatus('ready') }
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    })()
    return () => controller.abort()
  }, [cursor, attempt])

  function refresh() {
    setPage({ submissions: [], nextCursor: null })
    setCursors([undefined])
    setPageNumber(0)
    setAttempt(value => value + 1)
  }
  return <>
    <div className="inbox-toolbar">
      <p>Newest first · Up to 20 messages per page</p>
      <button className="button button--secondary" onClick={refresh} disabled={status === 'loading'}>Refresh inbox</button>
    </div>
    <div className="inbox-results" aria-busy={status === 'loading'}>
      {status === 'loading' && <p className="inbox-state" role="status">Loading messages…</p>}
      {status === 'error' && <div className="inbox-state" role="alert"><h2>We couldn’t load this page</h2><p>Try again, or refresh the inbox to start from the newest messages.</p><button className="button button--primary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
      {status === 'denied' && <div className="inbox-state" role="alert"><h2>Inbox access unavailable</h2><p>Your session expired or your account no longer has inbox access.</p><Link className="account-text-link" to="/account">Return to your account</Link></div>}
      {status === 'ready' && page.submissions.length === 0 && <div className="inbox-state"><h2>{pageNumber === 0 && !page.nextCursor ? 'No messages yet' : 'No messages on this page'}</h2><p>{page.nextCursor ? 'Continue to the next page.' : 'New contact submissions will appear here.'}</p></div>}
      {status === 'ready' && page.submissions.map(item => <article className="inbox-card" key={item.id}>
        <div className="inbox-card__heading"><h2>{item.name}</h2><span className="inbox-badge">{item.status}</span></div>
        <div className="inbox-card__meta"><span>{item.email}</span><time dateTime={item.submittedAt}>{submissionDate(item.submittedAt)}</time></div>
        <p className="inbox-message">{item.message}</p>
      </article>)}
    </div>
    {status !== 'denied' && <nav className="inbox-pagination" aria-label="Inbox pages">
      <button className="button button--secondary" disabled={status === 'loading' || pageNumber === 0} onClick={() => setPageNumber(value => value - 1)}>Previous</button>
      <span aria-live="polite">Page {pageNumber + 1}</span>
      <button className="button button--secondary" disabled={status !== 'ready' || !page.nextCursor} onClick={() => {
        if (!page.nextCursor) return
        setCursors(current => [...current.slice(0, pageNumber + 1), page.nextCursor!])
        setPageNumber(value => value + 1)
      }}>Next</button>
    </nav>}
  </>
}

export default function AdminInboxPage() {
  const auth = useAuth()
  return <section className="inbox-page section-shell" aria-labelledby="inbox-heading">
    <div className="inbox-heading">
      <div><p className="eyebrow">Private workspace</p><h1 id="inbox-heading">Contact <span>inbox.</span></h1></div>
      {auth.status === 'signed-in' && <div className="inbox-account"><span>{auth.user.name}</span><a href={signOutUrl} onClick={auth.clear}>Sign out</a></div>}
    </div>
    {auth.status === 'loading' && <p role="status">Checking your session…</p>}
    {auth.status === 'error' && <div className="inbox-state" role="alert"><p>We couldn’t check your account.</p><button className="button button--primary" onClick={auth.refresh}>Try again</button></div>}
    {auth.status === 'anonymous' && <div className="inbox-state"><h2>Sign in to continue</h2><p>This inbox is private.</p><a className="button button--primary" href={signInUrl}>Sign in with Microsoft</a></div>}
    {auth.status === 'signed-in' && !auth.user.isAdmin && <div className="inbox-state"><h2>This inbox is private</h2><p>Your account does not have access to submissions.</p><Link className="account-text-link" to="/account">Return to your account</Link></div>}
    {auth.status === 'signed-in' && auth.user.isAdmin && <InboxContents key={auth.user.id} />}
  </section>
}
