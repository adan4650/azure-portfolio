import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, VideoIcon } from '../components/Icons'
import VideoCard from '../components/VideoCard'
import { profile, videos } from '../data/portfolio'

export default function VideosPage() {
  return (
    <div className="videos-page section-shell">
      <section className="videos-heading" aria-labelledby="videos-heading" data-reveal>
        <p className="eyebrow">The learning, documented.</p>
        <h1 id="videos-heading">Behind the build<span className="yellow-period">.</span></h1>
        <p>After each build, I turn my notes into a walkthrough: the business problem, the architecture, the struggles and decisions, and what I’d change at production scale.</p>
      </section>
      {videos.length > 0 ? (
        <section className="video-library-grid" aria-label="Project videos" data-reveal>
          {videos.map((video) => <VideoCard key={video.id} video={video} />)}
        </section>
      ) : (
        <section className="video-empty-state" aria-labelledby="videos-coming-soon" data-reveal>
          <div className="empty-state-art" aria-hidden="true">
            <div className="empty-state-art__ring" />
            <span className="empty-state-art__icon"><VideoIcon /></span>
            <span className="empty-state-art__spark empty-state-art__spark--one" />
            <span className="empty-state-art__spark empty-state-art__spark--two" />
          </div>
          <span className="quiet-label">First up · Azure Portfolio</span>
          <h2 id="videos-coming-soon">The first walkthrough is on its way.</h2>
          <p>I’m building this portfolio and documenting the process. This is where I’ll share the steps, the troubleshooting, and what I learn.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link className="button button--primary" to="/#projects">Explore the project <ArrowRight className="size-4" /></Link>
            <a className="button button--secondary" href={profile.repositoryUrl} target="_blank" rel="noreferrer">Follow on GitHub <ArrowUpRight className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
          </div>
        </section>
      )}
      <div className="videos-bottom-note"><span className="small-status-dot" /><p>Building on Azure. Sharing the journey.</p></div>
    </div>
  )
}
