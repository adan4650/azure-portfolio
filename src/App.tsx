import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import VaultIntro from './components/VaultIntro'
import { ArrowRight, ArrowUpRight, ReplayIcon } from './components/Icons'
import HomePage from './pages/HomePage'
import VideosPage from './pages/VideosPage'
import { profile } from './data/portfolio'

function Header() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [location])
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        document.getElementById('navigation-toggle')?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  const isProjects = location.pathname === '/' && location.hash === '#projects'

  return (
    <header className="site-header section-shell">
      <Link className="brand" to="/" onClick={closeMenu} aria-label="Andre Daniels Jr., portfolio home"><span>Andre Daniels Jr<span className="brand__name-period">.</span><small>Cloud portfolio</small></span></Link>
      <button id="navigation-toggle" className="navigation-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>
        <span /><span />
      </button>
      <nav id="main-navigation" className={`navigation ${menuOpen ? 'navigation--open' : ''}`} aria-label="Main navigation">
        <Link className={`nav-link ${location.pathname === '/' && !isProjects ? 'nav-link--active' : ''}`} to="/" onClick={closeMenu} aria-current={location.pathname === '/' && !isProjects ? 'page' : undefined}>Home</Link>
        <Link className={`nav-link ${isProjects ? 'nav-link--active' : ''}`} to="/#projects" onClick={closeMenu} aria-current={isProjects ? 'location' : undefined}>Projects</Link>
        <NavLink className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`} to="/videos" onClick={closeMenu}>Videos</NavLink>
        <span className="nav-divider" aria-hidden="true" />
        <a className="nav-link nav-link--social" href={profile.githubUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>GitHub <ArrowUpRight /><span className="sr-only"> (opens in a new tab)</span></a>
        {profile.linkedInUrl ? <a className="nav-link nav-link--social" href={profile.linkedInUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>LinkedIn <ArrowUpRight /><span className="sr-only"> (opens in a new tab)</span></a> : <span className="nav-link nav-link--unavailable" aria-label="LinkedIn, link coming soon">LinkedIn <span className="unavailable-indicator" aria-hidden="true" /><span className="nav-unavailable-text">Coming soon</span></span>}
      </nav>
    </header>
  )
}

function NotFoundPage() {
  return <section className="not-found section-shell"><p className="eyebrow">A little off course</p><h1>This page isn’t in the cloud yet.</h1><p>Head back to the portfolio to see what I’m building.</p><Link className="button button--primary" to="/">Back to home <ArrowRight className="size-4" /></Link></section>
}

export default function App() {
  const [introVisible, setIntroVisible] = useState(true)
  const [introKey, setIntroKey] = useState(0)
  const siteRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const introHasCompleted = useRef(false)
  const location = useLocation()
  const lastRevealedPath = useRef(location.pathname)

  const completeIntro = useCallback(() => {
    introHasCompleted.current = true
    setIntroVisible(false)
  }, [])

  const replayIntro = () => {
    // The page is already in its final position when it appears through the hood.
    window.scrollTo({ top: 0, behavior: 'instant' })
    setIntroKey((key) => key + 1)
    setIntroVisible(true)
  }

  useLayoutEffect(() => {
    if (introVisible) {
      lastRevealedPath.current = location.pathname
      return
    }
    // The entrance reveals this mounted content directly; only later route changes animate.
    if (lastRevealedPath.current === location.pathname) return
    lastRevealedPath.current = location.pathname
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = gsap.context(() => {
      if (!reduceMotion) gsap.from('[data-reveal]', { opacity: 0, y: 20, duration: 0.8, stagger: 0.08, ease: 'power2.out', clearProps: 'all' })
    }, siteRef)
    return () => context.revert()
  }, [introVisible, location.pathname])

  useEffect(() => {
    const title = location.pathname === '/videos' ? 'Videos | Andre Daniels Jr.' : 'Andre Daniels Jr. | Cloud Portfolio'
    document.title = title
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location])

  useEffect(() => {
    if (introVisible || !introHasCompleted.current) return
    mainRef.current?.focus({ preventScroll: true })
  }, [introVisible, location.pathname])

  return (
    <>
      <div className={`site ${introVisible ? 'site--intro-active' : ''}`} ref={siteRef} inert={introVisible} aria-hidden={introVisible || undefined}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div className="ambient-background" aria-hidden="true"><div className="cloud-haze cloud-haze--left" /><div className="cloud-haze cloud-haze--right" /><div className="cloud-haze cloud-haze--bottom" /><svg className="cloud-trace" viewBox="0 0 1440 880" preserveAspectRatio="none"><path d="M-40 750c72-118 154-100 206-36 40-44 89-43 145 2M490 90c45-77 129-62 166 13 52-49 114-4 110 47M555 435c55-65 133-70 181 0" /></svg></div>
        <Header />
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          <Routes><Route path="/" element={<HomePage />} /><Route path="/videos" element={<VideosPage />} /><Route path="*" element={<NotFoundPage />} /></Routes>
        </main>
        <footer className="site-footer section-shell">
          <button className="replay-button" type="button" onClick={replayIntro}><ReplayIcon className="size-4" /> Replay intro</button>
          <p>{profile.displayName ? `${profile.displayName} · ` : ''}Made of curiosity. Built for the cloud.</p>
          <span className="footer-note"><span className="small-status-dot" /> Always learning</span>
        </footer>
      </div>
      {introVisible && <VaultIntro key={introKey} onComplete={completeIntro} />}
    </>
  )
}
