import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import {
  Rocket,
  Server,
  Container,
  Boxes,
  TrainFront,
  Database,
  Check,
  Copy,
  ChevronDown,
  Terminal,
  Cpu,
  MemoryStick,
  HardDrive,
  GitBranch,
  Globe,
  ShieldCheck,
  KeyRound,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowDown,
  CircleDot,
  Wrench,
  Network,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import '../styles/solar-deploy.css'

/* ── Deployment providers ─────────────────────────────────────── */

const PROVIDERS = [
  {
    id: 'coolify',
    name: 'Coolify',
    icon: Rocket,
    tagline: 'Open-source, self-hosted PaaS. One dashboard, one-click redeploys.',
    status: 'recommended',
  },
  {
    id: 'docker',
    name: 'Docker Compose',
    icon: Container,
    tagline: 'Raw container deployment for full manual control.',
    status: 'soon',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    icon: Boxes,
    tagline: 'Cluster orchestration for multi-node, high-availability setups.',
    status: 'soon',
  },
  {
    id: 'railway',
    name: 'Railway',
    icon: TrainFront,
    tagline: 'Managed cloud deploys straight from the repository.',
    status: 'soon',
  },
  {
    id: 'supabase',
    name: 'Self-hosted Supabase',
    icon: Database,
    tagline: 'Run the entire data layer on your own hardware.',
    status: 'soon',
  },
]

/* ── Environment variables (placeholders only — never real keys) ── */

const ENV_VARS = [
  { key: 'VITE_SUPABASE_URL', value: 'https://YOUR-PROJECT-REF.supabase.co', note: 'Supabase → Settings → API' },
  { key: 'VITE_SUPABASE_ANON_KEY', value: 'YOUR-PUBLISHABLE-ANON-KEY', note: 'Public anon key — safe for the browser' },
  { key: 'VITE_CLERK_PUBLISHABLE_KEY', value: 'pk_test_YOUR-PUBLISHABLE-KEY', note: 'Clerk → API Keys → Publishable' },
  { key: 'VITE_SUPABASE_THIRD_PARTY_AUTH', value: 'true', note: 'Only if Clerk is registered as a Supabase auth provider' },
]

/* ── Coolify wizard steps ─────────────────────────────────────── */

const WIZARD_STEPS = [
  {
    id: 'install',
    title: 'Install Coolify',
    icon: Terminal,
    intro: 'SSH into any server with Docker support (a VPS or your own 24/7 machine) and run the official installer. The dashboard comes up on port 8000.',
    commands: [{ label: 'Run on your server', code: 'curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash' }],
    note: 'First visit to http://<server-ip>:8000 walks you through creating the admin account.',
  },
  {
    id: 'server',
    title: 'Create a server',
    icon: Server,
    intro: 'If Coolify runs on the same machine you deploy to, the "localhost" server already exists — nothing to do. To deploy onto a different machine, add it under Servers with its SSH details.',
    commands: [],
    note: 'One Coolify dashboard can manage deployments across many servers.',
  },
  {
    id: 'github',
    title: 'Connect GitHub',
    icon: GitBranch,
    intro: 'For a public repository, no setup is needed — you paste the URL in the next step. For a private repository, create a GitHub App under Settings → Sources so Coolify can clone it.',
    commands: [],
    note: 'The GitHub App also unlocks push-to-deploy webhooks (step 7).',
  },
  {
    id: 'import',
    title: 'Import SOLAR Archive',
    icon: Rocket,
    intro: 'New Resource → Application → choose your repository. Coolify detects the Dockerfile at the repo root and selects the Dockerfile build pack automatically — no build command or publish directory to configure.',
    commands: [],
    note: 'The Dockerfile builds the Vite bundle and serves it with nginx, security headers included.',
  },
  {
    id: 'env',
    title: 'Configure environment variables',
    icon: KeyRound,
    intro: 'Add the four variables below in the Environment Variables tab, and mark every one as "Available at Buildtime". Vite bakes them into the static bundle during the build — runtime-only variables produce a build with no keys in it.',
    commands: [],
    envTable: true,
    note: 'Never add SUPABASE_SERVICE_ROLE_KEY or CLERK_SECRET_KEY here — secret keys must not exist in a browser build.',
  },
  {
    id: 'deploy',
    title: 'Deploy',
    icon: Globe,
    intro: 'Set the exposed port to 80 (nginx inside the container), attach your domain if you have one — Coolify issues a Let\'s Encrypt certificate automatically — and click Deploy.',
    commands: [],
    note: 'The first build takes a minute or two: npm ci, Vite build, then the nginx image.',
  },
  {
    id: 'complete',
    title: 'Complete',
    icon: Check,
    intro: 'Open the deployed URL and sign in to confirm Clerk and Supabase are reachable. Enable the deploy webhook (Application → Webhooks) and every git push redeploys automatically — zero clicks from here on.',
    commands: [],
    note: 'Work through the status checklist below to confirm nothing was missed.',
  },
]

/* ── System requirements ──────────────────────────────────────── */

const REQUIREMENTS = [
  { icon: Cpu, label: 'CPU', value: '2+ cores', note: 'Any modest x86/ARM server' },
  { icon: MemoryStick, label: 'RAM', value: '2 GB min', note: '4 GB comfortable for builds' },
  { icon: HardDrive, label: 'Storage', value: '30 GB SSD', note: 'Coolify + images + build cache' },
  { icon: Container, label: 'Docker', value: '24+', note: 'Installed by the Coolify script' },
  { icon: Terminal, label: 'Node', value: '20 LTS', note: 'Inside the build image — nothing to install' },
  { icon: Database, label: 'Database', value: 'Supabase cloud', note: 'No local PostgreSQL needed' },
]

/* ── Status checklist (persisted locally per browser) ─────────── */

const CHECKLIST_ITEMS = [
  { id: 'coolify', label: 'Coolify installed on the server' },
  { id: 'repo', label: 'Repository connected' },
  { id: 'dockerfile', label: 'App imported — Dockerfile build pack detected' },
  { id: 'envvars', label: 'Environment variables set as build variables' },
  { id: 'clerk', label: 'Clerk configured (publishable key only)' },
  { id: 'supabase', label: 'Supabase configured (URL + anon key)' },
  { id: 'ssl', label: 'Domain attached · SSL enabled' },
  { id: 'live', label: 'Deployment successful — site is live' },
]

const CHECKLIST_STORAGE_KEY = 'sa-deploy-checklist'

/* ── Troubleshooting ──────────────────────────────────────────── */

const TROUBLESHOOTING = [
  {
    id: 'blank-keys',
    problem: 'Site loads but sign-in fails / data never appears',
    solution:
      'The variables were set at runtime only, so the build was produced with empty keys. In Coolify, edit each variable and enable "Available at Buildtime", then redeploy. The Dockerfile receives them as build ARGs.',
  },
  {
    id: 'oom',
    problem: 'Build fails or the server freezes during deploy',
    solution:
      'The Vite build can exceed 2 GB of RAM on small servers. Add swap (2–4 GB) or build on a machine with 4 GB. Coolify keeps serving the previous deployment while a build fails, so the site stays up.',
  },
  {
    id: 'default-page',
    problem: 'Domain shows the Coolify placeholder page instead of the app',
    solution:
      'The exposed port doesn\'t match the container. Set Ports Exposes to 80 (nginx inside the image listens there), confirm the domain is attached to this application, and redeploy.',
  },
  {
    id: 'https',
    problem: 'Browser console shows mixed-content or CSP errors',
    solution:
      'Serve over HTTPS — attach a domain so Coolify issues a Let\'s Encrypt certificate, or put Cloudflare in front. The app ships its security headers (CSP, HSTS) in the nginx config; they assume HTTPS in production.',
  },
  {
    id: 'supabase-fail',
    problem: 'Network tab shows failing requests to supabase.co',
    solution:
      'Double-check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY against Supabase → Settings → API for the correct project. A URL from one project with a key from another fails with 401s.',
  },
  {
    id: 'stale',
    problem: 'Old version still showing after a successful deploy',
    solution:
      'Hard-refresh (Ctrl+Shift+R). Asset filenames are content-hashed so caches self-invalidate, but the HTML shell itself can be cached by an intermediate proxy — configure your CDN/proxy to not cache index.html.',
  },
]

/* ── Architecture flow ────────────────────────────────────────── */

const ARCH_FLOW = [
  { id: 'github', icon: GitBranch, title: 'GitHub', sub: 'Source of truth · push to deploy' },
  { id: 'coolify', icon: Rocket, title: 'Coolify', sub: 'Builds the Dockerfile on your server' },
  { id: 'container', icon: Container, title: 'Docker Container', sub: 'nginx serving the static bundle' },
  { id: 'app', icon: Globe, title: 'React App', sub: 'SOLAR Archive in the visitor\'s browser' },
]

const ARCH_SERVICES = [
  { id: 'clerk', icon: ShieldCheck, title: 'Clerk', sub: 'Accounts · sessions · MFA' },
  { id: 'supabase', icon: Database, title: 'Supabase', sub: 'Archive data · storage · realtime' },
]

/* ── Small shared pieces ──────────────────────────────────────── */

function useCopy() {
  const [copiedId, setCopiedId] = useState(null)
  const timerRef = useRef(null)
  useEffect(() => () => clearTimeout(timerRef.current), [])
  const copy = useCallback(async (id, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopiedId(null), 1800)
    } catch {
      /* clipboard unavailable (permissions/insecure context) — button just doesn't flash */
    }
  }, [])
  return { copiedId, copy }
}

function CopyButton({ id, text, copiedId, onCopy, label = 'Copy' }) {
  const copied = copiedId === id
  return (
    <button
      type="button"
      className={`deploy-copy${copied ? ' deploy-copy--done' : ''}`}
      onClick={() => onCopy(id, text)}
      aria-label={copied ? 'Copied' : `${label} to clipboard`}
    >
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function SectionHead({ kicker, title, lead }) {
  return (
    <header className="deploy-section__head">
      <span className="deploy-section__kicker">{kicker}</span>
      <h2 className="deploy-section__title">{title}</h2>
      {lead && <p className="deploy-section__lead">{lead}</p>}
    </header>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] } },
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function DeployHub() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion()
  const wizardRef = useRef(null)

  const [sceneReveal, setSceneReveal] = useState(0)
  const [openStep, setOpenStep] = useState('install')
  const [openIssue, setOpenIssue] = useState(null)
  const [checked, setChecked] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY))
      return raw && typeof raw === 'object' ? raw : {}
    } catch {
      return {}
    }
  })

  const { copiedId, copy } = useCopy()

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 900
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setSceneReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checked))
    } catch { /* storage unavailable — checklist still works for the session */ }
  }, [checked])

  const toggleCheck = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }))
  const doneCount = CHECKLIST_ITEMS.filter((i) => checked[i.id]).length
  const allEnvText = ENV_VARS.map((v) => `${v.key}=${v.value}`).join('\n')

  const scrollToWizard = () => wizardRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })

  return (
    <div className={`solar-page sa-deploy-page${isDark ? ' sa-deploy-page--dark' : ' sa-deploy-page--light'}`}>
      <LazyVantaFogBackground isDark={isDark} entryReveal={sceneReveal} className="sa-deploy-page__vanta" />
      <div
        className="sa-deploy-page__veil"
        style={{ opacity: Math.max(0, (isDark ? 0.22 : 0.14) - sceneReveal * (isDark ? 0.12 : 0.08)) }}
        aria-hidden
      />
      <div
        className="sa-deploy-page__vignette"
        style={{ opacity: isDark ? 0.28 + sceneReveal * 0.05 : 0.16 + sceneReveal * 0.04 }}
        aria-hidden
      />

      <div className="sa-deploy-page__inner" style={{ opacity: sceneReveal }}>
        {/* ── Hero ── */}
        <motion.header
          className="deploy-hero"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="deploy-hero__eyebrow">
            <span className="deploy-hero__pulse" aria-hidden />
            Deployment Hub
          </span>
          <h1 className="deploy-hero__title">
            Deploy Your Own <span className="deploy-hero__accent">SOLAR Archive</span>
          </h1>
          <p className="deploy-hero__sub">
            Anyone can run an independent archive on their own hardware — same interface, same
            review system, your infrastructure. Start with Coolify today; more deployment
            targets and a federated network of archives are on the roadmap.
          </p>
          <div className="deploy-hero__actions">
            <button type="button" className="dh-btn dh-btn--primary" onClick={scrollToWizard}>
              <Rocket size={15} aria-hidden /> Start deploying
            </button>
            <a
              className="dh-btn dh-btn--ghost"
              href="https://coolify.io/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Coolify docs <ArrowRight size={14} aria-hidden />
            </a>
          </div>
        </motion.header>

        {/* ── Providers ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Providers"
            title="Choose a deployment method"
            lead="Coolify is the supported path today. The hub is built to grow — each future method plugs in as a new provider card."
          />
          <div className="deploy-providers">
            {PROVIDERS.map(({ id, name, icon: Icon, tagline, status }) => (
              <article
                key={id}
                className={`deploy-provider${status === 'recommended' ? ' deploy-provider--primary' : ' deploy-provider--soon'}`}
              >
                <div className="deploy-provider__top">
                  <span className="deploy-provider__icon"><Icon size={20} aria-hidden /></span>
                  {status === 'recommended'
                    ? <span className="deploy-badge deploy-badge--live">Recommended</span>
                    : <span className="deploy-badge">Coming soon</span>}
                </div>
                <h3 className="deploy-provider__name">{name}</h3>
                <p className="deploy-provider__tagline">{tagline}</p>
                {status === 'recommended' && (
                  <button type="button" className="dh-btn dh-btn--primary dh-btn--sm" onClick={scrollToWizard}>
                    Deploy <ArrowRight size={13} aria-hidden />
                  </button>
                )}
              </article>
            ))}
          </div>
        </motion.section>

        {/* ── Wizard ── */}
        <motion.section className="deploy-section" ref={wizardRef} variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Coolify"
            title="Deployment wizard"
            lead="Seven steps from a bare server to a live archive. After the one-time setup, every future deploy is a single click — or fully automatic on push."
          />
          <ol className="deploy-wizard">
            {WIZARD_STEPS.map((step, i) => {
              const open = openStep === step.id
              const StepIcon = step.icon
              return (
                <li key={step.id} className={`deploy-step${open ? ' deploy-step--open' : ''}`}>
                  <button
                    type="button"
                    className="deploy-step__head"
                    aria-expanded={open}
                    onClick={() => setOpenStep(open ? null : step.id)}
                  >
                    <span className="deploy-step__num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="deploy-step__icon"><StepIcon size={16} aria-hidden /></span>
                    <span className="deploy-step__title">{step.title}</span>
                    <ChevronDown size={16} className="deploy-step__chev" aria-hidden />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        className="deploy-step__body"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="deploy-step__content">
                          <p>{step.intro}</p>
                          {step.commands.map(({ label, code }) => (
                            <div key={code} className="deploy-cmd">
                              <div className="deploy-cmd__bar">
                                <span className="deploy-cmd__label">{label}</span>
                                <CopyButton id={`cmd-${step.id}`} text={code} copiedId={copiedId} onCopy={copy} />
                              </div>
                              <pre className="deploy-cmd__code"><code>{code}</code></pre>
                            </div>
                          ))}
                          {step.envTable && (
                            <ul className="deploy-step__envlist">
                              {ENV_VARS.map((v) => (
                                <li key={v.key}><code>{v.key}</code> — {v.note}</li>
                              ))}
                            </ul>
                          )}
                          {step.note && (
                            <p className="deploy-step__note">
                              <CircleDot size={13} aria-hidden /> {step.note}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ol>
        </motion.section>

        {/* ── Environment variables ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Configuration"
            title="Environment variables"
            lead="Replace the placeholders with your own project values. All four must be flagged as build variables in Coolify."
          />
          <div className="deploy-terminal">
            <div className="deploy-terminal__bar">
              <span className="deploy-terminal__dots" aria-hidden>
                <i /><i /><i />
              </span>
              <span className="deploy-terminal__file">.env — build variables</span>
              <CopyButton id="env-all" text={allEnvText} copiedId={copiedId} onCopy={copy} label="Copy all" />
            </div>
            <div className="deploy-terminal__body">
              {ENV_VARS.map((v) => (
                <div key={v.key} className="deploy-terminal__line">
                  <div className="deploy-terminal__code">
                    <span className="deploy-terminal__key">{v.key}</span>
                    <span className="deploy-terminal__eq">=</span>
                    <span className="deploy-terminal__val">{v.value}</span>
                  </div>
                  <span className="deploy-terminal__note">{v.note}</span>
                  <CopyButton id={`env-${v.key}`} text={`${v.key}=${v.value}`} copiedId={copiedId} onCopy={copy} />
                </div>
              ))}
            </div>
            <p className="deploy-terminal__warn">
              <AlertCircle size={14} aria-hidden />
              Only publishable keys belong here. Secret keys (service role, Clerk secret) must never
              enter a frontend build — everything in this file ships to every visitor's browser.
            </p>
          </div>
        </motion.section>

        {/* ── System requirements ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Hardware"
            title="System requirements"
            lead="The archive itself is a static bundle — the server mostly needs enough headroom to run Coolify and the occasional build."
          />
          <div className="deploy-reqs">
            {REQUIREMENTS.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="deploy-req">
                <span className="deploy-req__icon"><Icon size={18} aria-hidden /></span>
                <span className="deploy-req__label">{label}</span>
                <span className="deploy-req__value">{value}</span>
                <span className="deploy-req__note">{note}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Checklist ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Status"
            title="Deployment checklist"
            lead="Tick items off as you go — progress is saved in this browser."
          />
          <div className="deploy-checklist">
            <div className="deploy-checklist__meter" role="progressbar" aria-valuemin={0} aria-valuemax={CHECKLIST_ITEMS.length} aria-valuenow={doneCount} aria-label="Deployment progress">
              <div className="deploy-checklist__meter-fill" style={{ width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%` }} />
              <span className="deploy-checklist__meter-label">
                {doneCount === CHECKLIST_ITEMS.length
                  ? <>Deployment complete <Sparkles size={13} aria-hidden /></>
                  : `${doneCount} / ${CHECKLIST_ITEMS.length} complete`}
              </span>
            </div>
            <ul className="deploy-checklist__items">
              {CHECKLIST_ITEMS.map(({ id, label }) => {
                const on = !!checked[id]
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`deploy-check${on ? ' deploy-check--on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleCheck(id)}
                    >
                      <span className="deploy-check__box" aria-hidden>{on && <Check size={12} />}</span>
                      <span className="deploy-check__label">{label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </motion.section>

        {/* ── Architecture ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Architecture"
            title="How a deployment flows"
            lead="Your server builds and serves the site; accounts and archive data stay on managed services until self-hosted Supabase lands."
          />
          <div className="deploy-arch">
            {ARCH_FLOW.map(({ id, icon: Icon, title, sub }, i) => (
              <React.Fragment key={id}>
                <div className="deploy-arch__node">
                  <span className="deploy-arch__icon"><Icon size={18} aria-hidden /></span>
                  <span className="deploy-arch__name">{title}</span>
                  <span className="deploy-arch__sub">{sub}</span>
                </div>
                {i < ARCH_FLOW.length - 1 && (
                  <span className="deploy-arch__arrow" aria-hidden><ArrowDown size={16} /></span>
                )}
              </React.Fragment>
            ))}
            <span className="deploy-arch__arrow deploy-arch__arrow--split" aria-hidden><ArrowDown size={16} /></span>
            <div className="deploy-arch__services">
              {ARCH_SERVICES.map(({ id, icon: Icon, title, sub }) => (
                <div key={id} className="deploy-arch__node deploy-arch__node--service">
                  <span className="deploy-arch__icon"><Icon size={18} aria-hidden /></span>
                  <span className="deploy-arch__name">{title}</span>
                  <span className="deploy-arch__sub">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Troubleshooting ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <SectionHead
            kicker="Support"
            title="Troubleshooting"
            lead="The issues people actually hit, with the fix that resolves each one."
          />
          <ul className="deploy-issues">
            {TROUBLESHOOTING.map(({ id, problem, solution }) => {
              const open = openIssue === id
              return (
                <li key={id} className={`deploy-issue${open ? ' deploy-issue--open' : ''}`}>
                  <button
                    type="button"
                    className="deploy-issue__head"
                    aria-expanded={open}
                    onClick={() => setOpenIssue(open ? null : id)}
                  >
                    <Wrench size={14} className="deploy-issue__icon" aria-hidden />
                    <span>{problem}</span>
                    <ChevronDown size={15} className="deploy-issue__chev" aria-hidden />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        className="deploy-issue__body"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="deploy-issue__solution">{solution}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </motion.section>

        {/* ── Federation ── */}
        <motion.section className="deploy-section" variants={fadeUp} initial={reduceMotion ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="deploy-federation">
            <span className="deploy-badge deploy-badge--future"><Network size={12} aria-hidden /> Coming soon</span>
            <h2 className="deploy-federation__title">The federated SOLAR network</h2>
            <p className="deploy-federation__body">
              Independent archive instances — yours included — will connect into a shared network:
              hosting a node earns points, entries replicate across instances, and the archive as a
              whole can never go offline because no single server is the archive. Deploying with
              this hub today means your instance is ready to join when federation ships.
            </p>
            <p className="deploy-federation__aside">
              Looking for the archive-pack tools instead? Grid packs still live under{' '}
              <Link to="/create-archive">Create Archive</Link>.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
