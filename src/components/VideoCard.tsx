import { ArrowUpRight } from './Icons'
import type { PortfolioVideo } from '../data/portfolio'

export default function VideoCard({ video, featured = false }: { video: PortfolioVideo; featured?: boolean }) {
  return (
    <article className={featured ? 'video-card video-card--featured' : 'video-card'}>
      <div className="video-card__media">
        {video.media.type === 'file' && (
          <video controls preload="metadata" poster={video.thumbnailUrl} aria-label={video.title}>
            <source src={video.media.url} />
            {video.media.captionsUrl && <track kind="captions" src={video.media.captionsUrl} srcLang="en" label="English" default />}
            Your browser does not support this video. <a href={video.media.url}>Open the video file</a>.
          </video>
        )}
        {video.media.type === 'youtube' && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.media.videoId)}`}
            title={video.title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
        {video.media.type === 'link' && (
          <a className="video-card__external" href={video.media.url} target="_blank" rel="noreferrer">
            {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy" />}
            <span>{video.media.label} <ArrowUpRight className="size-5" /></span>
          </a>
        )}
      </div>
      <div className="video-card__copy">
        <p className="eyebrow">{video.project}</p>
        <h3>{video.title}</h3>
        <p>{video.description}</p>
      </div>
    </article>
  )
}
