import { useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../App.jsx'
import { themeText } from '../utils/themeText.js'
import FogPageShell, { useSceneReveal } from './FogPageShell.jsx'
import { SITE_NAME } from '../utils/legalConstants.js'
import '../styles/solar-legal.css'

/** Sets document.title + meta description + JSON-LD, matching the pattern
    already used by CommunityReviewFeed.jsx for /reviews. Resets the title
    on unmount so navigating away doesn't leave a stale tab title. */
function useLegalSeo({ title, description, path }) {
  useEffect(() => {
    const fullTitle = `${title} — ${SITE_NAME}`
    document.title = fullTitle

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)

    let script = document.getElementById('sa-legal-jsonld')
    if (!script) {
      script = document.createElement('script')
      script.id = 'sa-legal-jsonld'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: fullTitle,
      description,
      url: typeof window !== 'undefined' ? `${window.location.origin}/#${path}` : path,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME },
    })

    return () => {
      document.title = SITE_NAME
    }
  }, [title, description, path])
}

function renderBlock(block, i) {
  if (block.type === 'ul') {
    return (
      <ul key={i} className="sa-legal-list">
        {block.items.map((item, j) => <li key={j}>{item}</li>)}
      </ul>
    )
  }
  if (block.type === 'ol') {
    return (
      <ol key={i} className="sa-legal-list sa-legal-list--ordered">
        {block.items.map((item, j) => <li key={j}>{item}</li>)}
      </ol>
    )
  }
  return <p key={i} className="sa-legal-p">{block.text}</p>
}

/** Shared layout for /privacy and /terms — page chrome, SEO, and a
    "jump to" section index are identical between the two documents;
    only `sections` (the actual legal content) differs per page. */
export default function LegalPage({ eyebrow, title, lastUpdated, intro, sections, seoDescription, path }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { ink, body, muted } = themeText(isDark)
  const sceneReveal = useSceneReveal()
  const reduceMotion = useReducedMotion()

  useLegalSeo({ title, description: seoDescription, path })

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Plain href="#id" anchors are broken under this app's HashRouter --
  // clicking one replaces the router's own #/route hash and the catch-all
  // route kicks the user home (see Reviews.jsx's feed CTA / Join.jsx's
  // Terms-Privacy links for the same established fix). Intercept the
  // click and scroll+focus manually instead.
  const jumpTo = (id) => (e) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }

  return (
    <FogPageShell isDark={isDark} sceneReveal={sceneReveal}>
      <div className="solar-page">
        <div className="solar-page__inner solar-page__inner--md sa-legal-page">
          <header className="sa-legal-header">
            <p className="sa-legal-eyebrow" style={{ color: muted }}>{eyebrow}</p>
            <h1 className="sa-legal-title" style={{ color: ink }}>{title}</h1>
            <p className="sa-legal-updated" style={{ color: muted }}>Last updated: {lastUpdated}</p>
            {intro && <p className="sa-legal-intro" style={{ color: body }}>{intro}</p>}
          </header>

          <nav className="sa-legal-toc sa-glass-surface" aria-label={`${title} — section index`}>
            <p className="sa-legal-toc__label" style={{ color: muted }}>Jump to</p>
            <ul className="sa-legal-toc__list">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="sa-legal-toc__link" onClick={jumpTo(s.id)}>{s.heading}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sa-legal-sections">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="sa-legal-section" tabIndex={-1}>
                <h2 className="sa-legal-h2" style={{ color: ink }}>{s.heading}</h2>
                <div style={{ color: body }}>
                  {s.blocks.map((block, i) => renderBlock(block, i))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </FogPageShell>
  )
}
