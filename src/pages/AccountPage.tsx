import { Link } from 'react-router-dom'
import { signInUrl, signOutUrl, useAuth } from '../auth/AuthContext'
import './account.css'

export default function AccountPage() {
  const auth = useAuth()
  return <section className="account-page section-shell" aria-labelledby="account-heading">
    <div className="account-intro">
      <p className="eyebrow">Your space</p>
      <h1 id="account-heading">Your <span>account.</span></h1>
      <p>Browsing the portfolio and sending a message are always open. Sign in when you need access to your account.</p>
      <Link className="account-text-link" to="/contact">Send a message</Link>
    </div>
    <div className="account-panel">
      <div className="account-panel__bar">Microsoft account</div>
      <div className="account-panel__body">
        {auth.status === 'loading' && <p role="status">Checking your session…</p>}
        {auth.status === 'error' && <div role="alert"><h2>Account unavailable</h2><p>We couldn’t check your session. Try again in a moment.</p><button className="button button--primary" onClick={auth.refresh}>Try again</button></div>}
        {auth.status === 'anonymous' && <>
          <h2>Welcome back</h2>
          <p>Use your Microsoft account from the portfolio’s connected organization. Inbox access is limited to the portfolio owner.</p>
          <a className="button button--primary" href={signInUrl}>Sign in with Microsoft</a>
        </>}
        {auth.status === 'signed-in' && <>
          <p className="account-caption">Signed in as</p>
          <h2 className="account-name">{auth.user.name}</h2>
          {auth.user.details !== auth.user.name && <p className="account-details">{auth.user.details}</p>}
          <p>{auth.user.isAdmin ? 'Your private inbox is ready to open.' : 'You’re signed in. Your account does not have access to the private inbox.'}</p>
          <div className="account-actions">
            {auth.user.isAdmin && <Link className="button button--primary" to="/admin">Open inbox</Link>}
            <a className="button button--secondary" href={signOutUrl} onClick={auth.clear}>Sign out</a>
          </div>
        </>}
      </div>
    </div>
  </section>
}
