import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, CheckIcon } from './Icons'
import { certificationGoals, projectReadmeSections } from '../data/portfolio'
import './learning-approach.css'

export default function LearningApproach() {
  const { hash } = useLocation()
  const certificationHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (hash === '#certifications') certificationHeading.current?.focus({ preventScroll: true })
  }, [hash])

  return (
    <>
      <section className="build-journal section-shell" aria-labelledby="journal-heading" data-reveal>
        <div className="build-journal__intro">
          <p className="arcade-eyebrow">02 / Behind every decision</p>
          <h2 id="journal-heading">The build is only<br /><span>half the story.</span></h2>
          <p>I’m documenting the struggles as I go: what failed, the options I considered, why I chose an approach, and what I would change at production scale.</p>
          <p>Every project gets its own GitHub repository and a README with these four sections. Once the build and notes are ready, I’ll record a walkthrough and share it here.</p>
          <div className="build-journal__process" aria-label="Project documentation process"><span>Build & take notes</span><ArrowRight /><span>Write the README</span><ArrowRight /><span>Record & share</span></div>
        </div>
        <ol className="build-journal__sections" aria-label="The four sections in every project README">
          {projectReadmeSections.map((section, index) => <li key={section.title}>
            <span className="build-journal__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div><h3>{section.title}</h3><p>{section.description}</p></div>
          </li>)}
        </ol>
      </section>
      <section id="certifications" className="certification-path section-shell" aria-labelledby="certification-heading" data-reveal>
        <div className="certification-path__heading"><p className="arcade-eyebrow">03 / After the projects</p><h2 id="certification-heading" ref={certificationHeading} tabIndex={-1}>Next level: certifications.</h2><p>Security+ earned. Azure certifications are the next goals after these builds.</p></div>
        <ol className="certification-path__stages" aria-label="Certification goals">
          {certificationGoals.map((certification) => <li key={certification.title} className={certification.complete ? 'certification-path__stage--complete' : undefined}>
            <span className="certification-path__marker" aria-hidden="true">{certification.complete ? <CheckIcon /> : <span />}</span>
            <span className="certification-path__status">{certification.status}</span>
            <h3>{certification.title}</h3>
            <p>{certification.description}</p>
          </li>)}
        </ol>
      </section>
    </>
  )
}
