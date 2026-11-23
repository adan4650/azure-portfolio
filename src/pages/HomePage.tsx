import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, VideoIcon } from '../components/Icons'
import ProjectJourney from '../components/ProjectJourney'
import LearningApproach from '../components/LearningApproach'
import { credentials, profile } from '../data/portfolio'
import './homepage.css'

const credentialGroups = ['Education', 'Certification', 'Experience'].map((label) => ({
  label,
  entries: credentials.filter((credential) => credential.category === label),
}))

function PixelSpark() {
  return <svg className="player-profile__spark" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><path d="M16 0h8v12h4v4h12v8H28v4h-4v12h-8V28h-4v-4H0v-8h12v-4h4Z" /></svg>
}

function ArcadeController() {
  return <svg viewBox="0 0 88 48" fill="none" aria-hidden="true"><path d="M16 4h56v4h8v8h4v24h-4v4H60v-4h-8v-4H36v4h-8v4H8v-4H4V16h4V8h8Z" fill="currentColor" /><path d="M22 14h8v8h8v8h-8v8h-8v-8h-8v-8h8ZM58 24h8v8h-8Zm12-10h8v8h-8ZM41 25h8v4h-8Z" fill="#180b24" /></svg>
}

export default function HomePage() {
  return (
    <div className="arcade-home">
      <section className="arcade-hero section-shell" aria-labelledby="welcome-heading">
        <div className="arcade-hero__copy" data-reveal>
          <p className="arcade-eyebrow"><span className="arcade-pixel" aria-hidden="true" /> Aspiring cloud engineer</p>
          <h1 id="welcome-heading">In Pursuit of <span>Knowledge daily</span></h1>
          <p className="arcade-hero__description">I’m Andre, an IT Analyst building my path into cloud engineering. Here’s where I share my Azure projects, the decisions behind them, and what I learn along the way.</p>
          <ul className="arcade-credentials" aria-label="Education, certification, and experience">
            {credentialGroups.map((group) => (
              <li key={group.label} className={group.label === 'Education' ? 'arcade-credentials__education' : undefined}>
                <span className="arcade-credentials__label">{group.label}</span>
                <div className="arcade-credentials__entries">
                  {group.entries.map((credential) => (
                    <div className="arcade-credentials__entry" key={credential.title}>
                      <strong>{credential.title}</strong>
                      {credential.detail && <span className="arcade-credentials__detail">{credential.detail}</span>}
                      {credential.status && <span className="arcade-study-status">{credential.status}</span>}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="arcade-hero__actions">
            <Link className="arcade-button arcade-button--primary" to="/#projects">Explore projects <ArrowRight /></Link>
            <Link className="arcade-button arcade-button--secondary" to="/videos">Watch the videos <ArrowUpRight /></Link>
          </div>
        </div>
        <div className="player-profile" data-reveal>
          <PixelSpark />
          <div className="player-profile__window">
            <div className="player-profile__bar"><span>Player 01</span><span className="player-profile__window-pixels" aria-hidden="true"><i /><i /><i /></span></div>
            <div className="player-profile__photo">
              <img src={profile.portraitUrl} alt="Andre smiling in an olive jacket, holding the hood over his eyes." width="1536" height="1152" fetchPriority="high" />
            </div>
            <div className="player-profile__footer"><p>{profile.displayName}</p><ArcadeController /></div>
          </div>
        </div>
      </section>
      <div className="arcade-divider section-shell" aria-hidden="true"><span /><i /><i /><i /><span /></div>
      <ProjectJourney />
      <LearningApproach />
      <section className="arcade-library section-shell" aria-labelledby="library-heading" data-reveal>
        <div className="arcade-library__icon" aria-hidden="true"><VideoIcon /></div>
        <div><p className="arcade-eyebrow">04 / Video library</p><h2 id="library-heading">Every build has a story.</h2><p className="arcade-library__description">Recorded after the build: the struggles, the decisions, and what I’d change at production scale.</p></div>
        <Link className="arcade-button arcade-button--secondary" to="/videos">View all videos <ArrowUpRight /></Link>
      </section>
    </div>
  )
}
