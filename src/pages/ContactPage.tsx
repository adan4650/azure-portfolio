import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../components/Icons'
import Turnstile from '../components/Turnstile'
import './contact.css'

type Draft = { name: string; email: string; message: string; website: string }
type Field = 'name' | 'email' | 'message'
type FieldErrors = Partial<Record<Field, string>>
const emptyDraft: Draft = { name: '', email: '', message: '', website: '' }
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? ''

export default function ContactPage() {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [token, setToken] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const inFlight = useRef(false)
  const summary = useRef<HTMLDivElement>(null)

  function update(field: keyof Draft, value: string) {
    setDraft(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }
  function showFeedback(message: string) {
    setFeedback(message)
    window.requestAnimationFrame(() => summary.current?.focus())
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    setErrors({})
    if (!siteKey || !token) {
      setStatus('error')
      showFeedback('Complete the verification before sending your message.')
      return
    }
    inFlight.current = true
    setStatus('sending')
    setFeedback('Sending your message…')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, turnstileToken: token }),
        signal: AbortSignal.timeout(25000),
      })
      // Gate success on the API contract: an SPA fallback or proxy page is never success.
      const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
      if (response.status === 201 && result?.code === 'sent') {
        setDraft(emptyDraft)
        setStatus('success')
        showFeedback('Message received. Thanks for reaching out!')
      } else {
        setStatus('error')
        if (result?.code === 'validation_failed') {
          const fieldErrors: FieldErrors = {}
          for (const field of ['name', 'email', 'message'] as const) {
            if (typeof result.errors?.[field] === 'string') fieldErrors[field] = result.errors[field]
          }
          setErrors(fieldErrors)
          showFeedback('Check the highlighted fields. Your draft is still here.')
        } else if (result?.code === 'verification_failed') {
          showFeedback('Verification expired or could not be confirmed. Complete it again, then retry. Your draft is still here.')
        } else if (response.status === 429 || response.status === 403) {
          showFeedback('Your request was limited or blocked. Wait a moment, complete verification, and try again. Your draft is still here.')
        } else if (response.status === 413) {
          showFeedback('This message is too large to send. Shorten it and try again. Your draft is still here.')
        } else {
          showFeedback('We couldn’t confirm delivery. Your draft is still here; complete verification and retry in a moment.')
        }
      }
    } catch {
      setStatus('error')
      showFeedback('We couldn’t confirm delivery. Check your connection and retry. Your draft is still here. If the first request arrived, a retry may send it twice.')
    } finally {
      inFlight.current = false
      setToken('')
      setAttempt(current => current + 1)
    }
  }

  return <section className="contact-page section-shell" aria-labelledby="contact-heading">
    <div className="contact-copy" data-reveal>
      <p className="eyebrow">Let’s connect</p>
      <h1 id="contact-heading">Start a <span>conversation.</span></h1>
      <p>Have a question about a project, an opportunity to share, or a cloud idea to talk through? I’d like to hear it.</p>
      <div className="contact-note"><span className="small-status-dot" /> No account needed</div>
      <p className="contact-privacy">I’ll use your name, email, and message to respond to your inquiry. Please leave out passwords and other sensitive information.</p>
      <Link className="contact-back" to="/">Back to the portfolio <ArrowRight /></Link>
    </div>
    <div className="contact-panel" data-reveal>
      <div className="contact-panel__bar"><span>Send a message</span><span aria-hidden="true">+ + +</span></div>
      <form className="contact-form" onSubmit={submit} aria-busy={status === 'sending'}>
        {!siteKey && <p className="contact-notice">The contact form is being set up. Please check back soon.</p>}
        <fieldset disabled={status === 'sending'}>
          <label htmlFor="contact-name">Name</label>
          <input id="contact-name" name="name" autoComplete="name" required maxLength={100} value={draft.name} onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
          {errors.name && <p className="contact-field-error" id="name-error">{errors.name}</p>}
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={draft.email} onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
          {errors.email && <p className="contact-field-error" id="email-error">{errors.email}</p>}
          <label htmlFor="contact-message">Message</label>
          <textarea id="contact-message" name="message" required rows={6} maxLength={5000} value={draft.message} onChange={event => update('message', event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={`message-hint${errors.message ? ' message-error' : ''}`} />
          <p className="contact-hint" id="message-hint">{draft.message.length.toLocaleString()} / 5,000 characters</p>
          {errors.message && <p className="contact-field-error" id="message-error">{errors.message}</p>}
          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor="contact-website">Leave this field empty</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={draft.website} onChange={event => update('website', event.target.value)} />
          </div>
          {siteKey && <Turnstile siteKey={siteKey} attempt={attempt} onToken={setToken} />}
          <button className="button button--primary contact-submit" type="submit" disabled={!siteKey || !token || status === 'sending'}>{status === 'sending' ? 'Sending…' : status === 'error' ? 'Try again' : 'Send message'} <ArrowRight /></button>
          {siteKey && !token && status !== 'sending' && <p className="contact-hint">Complete verification to enable sending.</p>}
        </fieldset>
        <div ref={summary} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className={`contact-feedback contact-feedback--${status}`}>{feedback}</div>
        <p className="contact-hint">If sending fails, your draft stays on this page. Leaving or reloading the page clears it.</p>
      </form>
    </div>
  </section>
}
