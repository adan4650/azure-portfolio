import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CheckIcon } from './Icons'
import VideoCard from './VideoCard'
import { currentProject, plannedProjects, profile, videos } from '../data/portfolio'
import './project-journey.css'

type JourneyIcon = 'website' | 'infrastructure' | 'monitoring' | 'pipeline'

function StageGraphic({ icon }: { icon: JourneyIcon }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {icon === 'website' && <>
        <path d="M12 32V18h6v-6h44v6h6v36h-6v6H18v-6h-6V32ZM12 27h56M21 20h4m5 0h4m5 0h4" />
        <path d="m29 36-7 7 7 7m22-14 7 7-7 7m-8-17-6 20M32 60v8m16-8v8M25 68h30" />
      </>}
      {icon === 'infrastructure' && <>
        <path d="M28 9h24v20H28ZM9 51h24v20H9Zm38 0h24v20H47ZM40 29v13M21 51v-9h38v9" />
        <path d="M34 16h12m-12 6h7M15 58h12m-12 6h7m31-6h12m-12 6h7" />
      </>}
      {icon === 'pipeline' && <>
        <path d="M8 12h22v20H8Zm42 0h22v20H50ZM28 50h24v20H28ZM30 22h20M61 32v10H40v8" />
        <path d="m15 22 3 3 6-7m32 4 3 3 6-7M35 57l10 5-10 5ZM42 18l4 4-4 4" />
      </>}
      {icon === 'monitoring' && <>
        <path d="M10 16h60v43H10ZM10 51h60M31 59v9m18-9v9M23 68h34" />
        <path d="M17 36h9l6-11 10 19 7-12h14" />
        <path d="M61 9h9v9h-9Z" fill="currentColor" stroke="none" />
      </>}
    </svg>
  )
}

const stages = [
  { id: currentProject.id, shortTitle: 'Website & Azure', status: currentProject.status, icon: 'website' as JourneyIcon },
  ...plannedProjects,
]

export default function ProjectJourney() {
  const location = useLocation()
  const selectedId = location.hash.replace('#project-', '')
  const matchedIndex = stages.findIndex((stage) => stage.id === selectedId)
  const selectedIndex = matchedIndex < 0 ? 0 : matchedIndex
  const selected = stages[selectedIndex]
  const planned = selectedIndex > 0 ? plannedProjects[selectedIndex - 1] : undefined
  const project = planned ?? currentProject
  const introductionVideo = videos.find((video) => video.id === currentProject.videoId)
  const detailHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (location.hash.startsWith('#project-')) detailHeading.current?.focus({ preventScroll: true })
  }, [location.hash])

  return (
    <section id="projects" className="arcade-projects section-shell" aria-labelledby="projects-heading">
      <div className="arcade-section-heading" data-reveal>
        <div><p className="arcade-eyebrow">01 / The learning path</p><h2 id="projects-heading">One build.<br /><span>The next level.</span></h2></div>
        <p>Every project starts where the last one ends. Follow my path into the cloud, from this website to what comes next.</p>
      </div>

      <div className="journey-map" data-reveal>
        <div className="journey-map__header">
          <p><span className="arcade-pixel" aria-hidden="true" /> My Azure journey</p>
          <span>01 complete <span aria-hidden="true">/</span> {String(plannedProjects.length).padStart(2, '0')} ahead</span>
        </div>
        <nav aria-label="Project learning path" className="journey-map__route">
          <svg className="journey-map__connections" viewBox="0 0 1000 180" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path className="journey-map__line" d="M125 48H250V118H375H500V48H625H750V118H875" />
            <path className="journey-map__start-line" d="M125 48H250V118H290" />
            <path className="journey-map__arrow" d="M282 112l8 6-8 6 M532 42l8 6-8 6 M782 112l8 6-8 6" />
          </svg>
          <ol className="journey-map__stages">
            {stages.map((stage, index) => (
              <li key={stage.id} className={`journey-stop ${index === 0 ? 'journey-stop--complete' : ''} ${selectedIndex === index ? 'journey-stop--selected' : ''}`}>
                <Link to={`/#project-${stage.id}`} aria-current={selectedIndex === index ? 'step' : undefined} className="journey-stop__link">
                  <span className="journey-stop__graphic"><StageGraphic icon={stage.icon} /><span className="journey-stop__number">{String(index + 1).padStart(2, '0')}</span></span>
                  <span className="journey-stop__label"><span className="journey-stop__status">{index === 0 && <CheckIcon />}{stage.status}</span><strong>{stage.shortTitle}</strong><span className="journey-stop__hint">{index === 0 ? 'Start with the introduction' : 'Explore the plan'} <ArrowRight /></span></span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="journey-map__footer"><span>Showcase <ArrowRight /> Build <ArrowRight /> Monitor <ArrowRight /> Automate</span><span>Select a stage to explore</span></div>
      </div>

      <article id={`project-${selected.id}`} className="journey-detail" aria-labelledby="project-heading" data-reveal>
        <div className="journey-detail__topline"><span>Project {String(selectedIndex + 1).padStart(2, '0')} / {planned ? 'The road ahead' : 'Introduction'}</span><span className={`journey-detail__status ${!planned ? 'journey-detail__status--complete' : ''}`}>{!planned && <CheckIcon />}{selected.status}</span></div>
        <div className="journey-detail__body">
          <div className="journey-detail__copy">
            <h3 id="project-heading" ref={detailHeading} tabIndex={-1}>{project.title}</h3>
            <p className="journey-detail__description">{project.description}</p>
            <p className="journey-detail__summary">{project.summary}</p>
            {planned && <div className="journey-detail__problem"><h4>The business problem</h4><p>{planned.businessProblem}</p></div>}
            <h4>{planned ? 'What I plan to build' : 'What I accomplished'}</h4>
            <ul className={`journey-detail__outcomes ${planned ? 'journey-detail__outcomes--planned' : ''}`}>
              {(planned ? planned.goals : currentProject.completed).map((item) => <li key={item}>{planned ? <span className="journey-detail__bullet" aria-hidden="true" /> : <CheckIcon />}<span>{item}</span></li>)}
            </ul>
            {!planned && <a className="arcade-text-link" href={profile.repositoryUrl} target="_blank" rel="noreferrer">View the project on GitHub <ArrowUpRight /><span className="sr-only"> (opens in a new tab)</span></a>}
            {planned && (planned.repositoryUrl ? <a className="arcade-text-link" href={planned.repositoryUrl} target="_blank" rel="noreferrer">View the project on GitHub <ArrowUpRight /><span className="sr-only"> (opens in a new tab)</span></a> : <p className="journey-detail__repository">Dedicated GitHub repository planned for this build.</p>)}
          </div>
          <div className="journey-detail__aside">
            {planned ? (
              <div className="journey-blueprint">
                <span className="journey-blueprint__label">The next connection</span>
                <div className="journey-blueprint__graphic" aria-hidden="true"><StageGraphic icon={stages[selectedIndex - 1].icon} /><ArrowRight /><StageGraphic icon={selected.icon} /></div>
                <h4>{stages[selectedIndex - 1].shortTitle}<span><ArrowRight />{selected.shortTitle}</span></h4>
                <p>{planned.connection}</p>
                <span className="journey-blueprint__note">Planned project · Build and document first. Record the walkthrough afterward.</span>
              </div>
            ) : introductionVideo && <VideoCard video={introductionVideo} featured />}
            {planned && <div className="journey-notes">
              <h4>Decisions to document</h4>
              <p>{planned.documentationFocus}</p>
              <h4>Questions for production scale</h4>
              <ul>{planned.productionQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
            </div>}
          </div>
        </div>
        <div className="journey-detail__navigation">
          {selectedIndex > 0 ? <Link className="arcade-text-link journey-detail__previous" to={`/#project-${stages[selectedIndex - 1].id}`}><ArrowRight /> Previous project</Link> : <span className="journey-detail__start"><span className="arcade-pixel" aria-hidden="true" /> This is where the journey begins.</span>}
          {selectedIndex < stages.length - 1 ? <Link className="arcade-text-link" to={`/#project-${stages[selectedIndex + 1].id}`}>Next: {stages[selectedIndex + 1].shortTitle} <ArrowRight /></Link> : <Link className="arcade-text-link" to="/#certifications">After the projects: certifications <ArrowRight /></Link>}
        </div>
      </article>
    </section>
  )
}
