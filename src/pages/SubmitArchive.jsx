import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, CheckCircle, ChevronDown, AlertCircle, X, Link2, PenLine, Flag } from 'lucide-react'
import { useTheme } from '../App.jsx'
import FoundationLogo from '../components/FoundationLogo.jsx'
import SubmissionLayerGuide from '../components/SubmissionLayerGuide.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { appendPendingSubmission, getSubmissions, migrateSubmission, normalizeSubmissionTags, MAX_TAGS_PER_SUBMISSION } from '../utils/submissionStorage.js'
import { appendSegmentReport } from '../utils/segmentReports.js'
import {
  parseSubmissionArchiveLayer,
  parsePositiveInt,
  isL7NarrativeBandComplete,
  cellHasL5AndL6,
  L56_NARRATIVE_GATE_MESSAGE,
  L7_NARRATIVE_SEGMENT_COUNT,
  getNarrativeSubmitState,
} from '../utils/archiveLayerSpecs.js'
import { buildMergedSectionEntries } from '../utils/archiveSectionEntries.js'
import { readGridDimensionsFromStorage, normalizeHubId } from '../utils/archiveInstanceStorage.js'

import fallbackData from '../data/researchData.json'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData;
const PLANETS = researchData.planets.map(p => ({
    id: p.id,
    label: p.planet,
    domain: p.domain,
    color: p.color
}))

const MAX_ATTACHMENTS = 6
const MAX_FILE_BYTES = 1_200_000

const LAYER_GUIDE_ROWS = [
    {
        layer: 5,
        title: 'Layer 5 — short summary (256 px scale)',
        tips: [
            'Write for a curious reader who is not yet a specialist; define jargon once.',
            'State one main claim and keep it falsifiable; separate hypothesis from evidence.',
            'Length targets match the living grid: summary field on submit (50–400 chars) feeds this scale.',
            'Add one figure URL or sketch if it clarifies the claim — caption what it proves.',
        ],
    },
    {
        layer: 6,
        title: 'Layer 6 — longer exposition (1024 px scale)',
        tips: [
            'Connect this cell to parents in the hierarchy: say which broader topic this elaborates.',
            'Use short paragraphs; deep zoom readers skim on mobile — front-load structure.',
            'Cite primary sources in attachments (graphs, papers); prefer stable URLs.',
        ],
    },
    {
        layer: 7,
        title: 'Layer 7 — intermediate narrative segments',
        tips: [
            'Requires Layer 5 (short summary) and Layer 6 (detail) at the same coordinate before any L7 narrative tile can be authored.',
            'Break the detail field into sentences (20–250 chars each); graders reorder them easiest → hardest (difficulty 1 fills L7 first).',
            'Use the + Add control on the first empty TILE in the archive, or the HUD + Add / Full form on Layer 7.',
            'The last two L7 segments are cited facts and grid references — they are not filled from submission text.',
            'Layer 8 authoring for new narrative sentences is locked until all 30 L7 narrative tiles have sentences at that coordinate (catalog + approved submissions).',
        ],
    },
    {
        layer: 8,
        title: 'Layer 8 — deep full text + citation lattice',
        tips: [
            'The bottom row holds cited / source slots; narrative fills the band above, then the single final stitch slot.',
            'You must complete the 30 Layer 7 narrative tiles at the same coordinate before adding further sentences targeted at Layer 8 (same pool; harder reading order continues here).',
            'Final slot stitches the narrative; keep tone consistent with L7 ordering.',
            'If you attach imagery, label axes/units so reviewers can fact-check quickly.',
        ],
    },
]

const KIND_OPTIONS = [
    { value: 'image', label: 'Photo / figure' },
    { value: 'sketch', label: 'Sketch / scan' },
    { value: 'graph', label: 'Chart / graph' },
]

function newAttachmentId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `a-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyForm() {
    return {
        planet: '',
        subject: '',
        coordX: '',
        coordY: '',
        summary: '',
        detail: '',
        difficulty: 3,
        tags: '',
    }
}

function Field({ label, children, required }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold flex items-center gap-1" style={{ color: 'inherit' }}>
                {label}{required && <span style={{ color: '#f87171' }}>*</span>}
            </label>
            {children}
        </div>
    )
}

function SubmissionGuidelinesPanel({ previewLayer, isDark }) {
    const row = LAYER_GUIDE_ROWS.find((r) => r.layer === previewLayer) || LAYER_GUIDE_ROWS[0]
    const border = isDark ? 'rgba(79,195,247,0.22)' : 'rgba(15,23,42,0.12)'
    const cardBg = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(241,245,249,0.96)'

    return (
        <div
            className="mb-5 rounded-2xl text-xs overflow-hidden"
            style={{ border: `1px solid ${border}`, background: cardBg }}
        >
            <details open className="group">
                <summary
                    className="cursor-pointer list-none px-4 py-3 font-bold flex items-center justify-between gap-2"
                    style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
                >
                    <span>Guidelines & tips · {row.title}</span>
                    <ChevronDown size={16} className="shrink-0 opacity-70 group-open:rotate-180 transition-transform" aria-hidden />
                </summary>
                <ul className="px-4 pb-3 space-y-2 list-disc pl-5" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                    {row.tips.map((t, i) => (
                        <li key={i} className="leading-relaxed">{t}</li>
                    ))}
                </ul>
            </details>
        </div>
    )
}

function AuthorSubmissionOverview({ username, isDark, accent }) {
    const [tick, setTick] = useState(0)
    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => window.removeEventListener('solar-archive-submissions-updated', bump)
    }, [])
    const rows = useMemo(
        () =>
            getSubmissions()
                .filter((s) => s.authorUsername === username)
                .map(migrateSubmission)
                .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
        [username, tick],
    )

    if (!username || rows.length === 0) return null

    const border = isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)'
    const cardBg = isDark ? 'rgba(7,20,40,0.85)' : 'rgba(255,255,255,0.92)'
    const muted = isDark ? '#94a3b8' : '#64748b'
    const a = accent || (isDark ? '#4fc3f7' : '#0284c7')

    return (
        <div
            className="mb-6 p-4 rounded-2xl text-sm"
            style={{ background: cardBg, border: `1px solid ${border}` }}
        >
            <p className="font-bold mb-3" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                Your submissions
            </p>
            <ul className="space-y-3">
                {rows.map((s) => {
                    const tags = Array.isArray(s.tags) ? s.tags : []
                    const reviews = s.reviews || []
                    return (
                        <li
                            key={s.id}
                            className="rounded-xl p-3"
                            style={{
                                background: isDark ? 'rgba(2,4,8,0.35)' : 'rgba(241,245,249,0.95)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.06)'}`,
                            }}
                        >
                            <div className="flex flex-wrap justify-between gap-2">
                                <span className="font-semibold" style={{ color: a }}>{s.subject || 'Untitled'}</span>
                                <span className="text-xs uppercase font-bold" style={{ color: muted }}>{s.status}</span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: muted }}>
                                {String(s.planet)} · ({String(s.coordX).padStart(3, '0')},{String(s.coordY).padStart(3, '0')}) ·{' '}
                                {reviews.length}/3 reviews
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {tags.map((tg) => (
                                        <Link
                                            key={tg}
                                            to={`/submit?tags=${encodeURIComponent(tg)}`}
                                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                            style={{ background: `${a}22`, color: a }}
                                        >
                                            #{tg}
                                        </Link>
                                    ))}
                                </div>
                            )}
                            {reviews.length > 0 && (
                                <div className="mt-2 text-xs space-y-2" style={{ color: muted }}>
                                    <span className="font-semibold" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Reviewer feedback</span>
                                    {reviews.map((r) => (
                                        <div key={`${r.reviewerUsername}-${r.at}`}>
                                            <span className="font-medium" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                                                @{r.reviewerUsername}
                                            </span>
                                            {' — '}
                                            fact-check {r.factCheckPass ? 'pass' : 'fail'}, difficulty {r.difficulty}/5
                                            {r.notes?.trim() ? (
                                                <div className="mt-0.5 pl-2 border-l-2 whitespace-pre-wrap" style={{ borderColor: a }}>
                                                    {r.notes.trim()}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {s.status === 'approved' && (
                                <Link to={`/archive/${s.planet}`} className="inline-block mt-2 text-xs font-bold" style={{ color: a }}>
                                    Open archive hub →
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default function SubmitArchive() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { isLoggedIn, username } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const isSegmentReport = searchParams.get('intent') === 'segmentReport'
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [errors, setErrors] = useState({})
    const [availableSlots, setAvailableSlots] = useState([])
    const [attachments, setAttachments] = useState([])
    const [attachKind, setAttachKind] = useState('image')
    const [graphUrlDraft, setGraphUrlDraft] = useState('')
    const [attachErr, setAttachErr] = useState('')
    const [attachmentCountSubmitted, setAttachmentCountSubmitted] = useState(0)
    const [previewLayer, setPreviewLayer] = useState(5)
    const [showRichPreview, setShowRichPreview] = useState(false)
    const [submissionMergeTick, setSubmissionMergeTick] = useState(0)

    useEffect(() => {
        const bump = () => setSubmissionMergeTick((t) => t + 1)
        window.addEventListener('solar-archive-submissions-updated', bump)
        const onStorage = (ev) => {
            if (ev.key === 'submittedArchiveEntries') bump()
        }
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('solar-archive-submissions-updated', bump)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const hubIdForForm = normalizeHubId(form.planet || 'earth')
    const gridDimsForMerge = useMemo(() => readGridDimensionsFromStorage(hubIdForForm), [hubIdForForm, submissionMergeTick])
    const { halfW: mergeHalfW, halfH: mergeHalfH } = gridDimsForMerge

    const planetDataForMerge = useMemo(() => {
        if (!form.planet) return null
        const id = String(form.planet).toLowerCase()
        return researchData.planets.find((p) => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id) || null
    }, [form.planet])

    const mergedSectionEntries = useMemo(() => {
        if (!planetDataForMerge || !form.planet) return {}
        return buildMergedSectionEntries(planetDataForMerge, mergeHalfW, mergeHalfH)
    }, [planetDataForMerge, form.planet, mergeHalfW, mergeHalfH, submissionMergeTick])

    const submitMergeCellKey = useMemo(() => {
        if (!form.coordX || !form.coordY) return null
        const lx = parseInt(String(form.coordX).trim(), 10)
        const ly = parseInt(String(form.coordY).trim(), 10)
        if (!Number.isFinite(lx) || !Number.isFinite(ly)) return null
        const gx = lx + mergeHalfW
        const gy = mergeHalfH - ly
        return `${gx},${gy}`
    }, [form.coordX, form.coordY, mergeHalfW, mergeHalfH])

    const mergedCellAtTarget = submitMergeCellKey ? mergedSectionEntries[submitMergeCellKey] : null
    const l56GateBlocksNarrative = !cellHasL5AndL6(mergedCellAtTarget)
    const l7GateBlocksL8 = !isL7NarrativeBandComplete(mergedCellAtTarget)
    const narrativeStateL7 = getNarrativeSubmitState(7, mergedCellAtTarget)
    const narrativeStateL8 = getNarrativeSubmitState(8, mergedCellAtTarget)

    const highlightSegmentSlot = useMemo(() => {
        const lyr = parseSubmissionArchiveLayer(searchParams.get('archiveLayer'))
        if (lyr !== 7 && lyr !== 8) return null
        return parsePositiveInt(searchParams.get('nextSegmentSlot'))
    }, [searchParams])

    useEffect(() => {
        const layerFromUrl = parseSubmissionArchiveLayer(searchParams.get('archiveLayer'))
        if (!isSegmentReport && (layerFromUrl === 7 || layerFromUrl === 8) && l56GateBlocksNarrative) {
            setPreviewLayer(6)
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('archiveLayer', '6')
                    next.delete('nextSegmentSlot')
                    return next
                },
                { replace: true },
            )
            return
        }
        if (!isSegmentReport && layerFromUrl === 8 && l7GateBlocksL8) {
            setPreviewLayer(7)
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('archiveLayer', '7')
                    next.delete('nextSegmentSlot')
                    return next
                },
                { replace: true },
            )
            return
        }
        if (layerFromUrl != null) setPreviewLayer(layerFromUrl)
    }, [searchParams, l7GateBlocksL8, l56GateBlocksNarrative, isSegmentReport, setSearchParams])

    const handlePreviewLayerChange = useCallback(
        (layer) => {
            if (!isSegmentReport && (layer === 7 || layer === 8) && l56GateBlocksNarrative) {
                setPreviewLayer(6)
                setSearchParams(
                    (prev) => {
                        const next = new URLSearchParams(prev)
                        next.set('archiveLayer', '6')
                        next.delete('nextSegmentSlot')
                        return next
                    },
                    { replace: true },
                )
                return
            }
            if (!isSegmentReport && layer === 8 && l7GateBlocksL8) {
                setPreviewLayer(7)
                setSearchParams(
                    (prev) => {
                        const next = new URLSearchParams(prev)
                        next.set('archiveLayer', '7')
                        next.delete('nextSegmentSlot')
                        return next
                    },
                    { replace: true },
                )
                return
            }
            setPreviewLayer(layer)
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    if ([5, 6, 7, 8].includes(layer)) next.set('archiveLayer', String(layer))
                    if (layer !== 7 && layer !== 8) next.delete('nextSegmentSlot')
                    return next
                },
                { replace: true },
            )
        },
        [setSearchParams, l7GateBlocksL8, l56GateBlocksNarrative, isSegmentReport],
    )

    const set = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), [])

    useEffect(() => {
        const intent = searchParams.get('intent')
        if (intent === 'segmentReport') {
            const p = searchParams.get('planet') || ''
            const x = searchParams.get('coordX') ?? ''
            const y = searchParams.get('coordY') ?? ''
            const archiveLayer = searchParams.get('archiveLayer') || '6'
            const segmentIndex = searchParams.get('segmentIndex') || ''
            const segmentLabel = searchParams.get('segmentLabel') || ''
            const excerpt = searchParams.get('excerpt') || ''
            setForm((f) => ({
                ...f,
                planet: p || f.planet,
                coordX: x !== '' ? String(x) : f.coordX,
                coordY: y !== '' ? String(y) : f.coordY,
                subject:
                    p && x !== '' && y !== ''
                        ? `Segment report · L${archiveLayer} · (${x},${y}) · ${segmentLabel || `#${segmentIndex}`}`
                        : f.subject,
                summary: excerpt
                    ? `Issue with ${segmentLabel || `segment ${segmentIndex}`}: ${excerpt.slice(0, 240)}${excerpt.length > 240 ? '…' : ''}`
                    : `Segment report — ${segmentLabel || `slot ${segmentIndex}`} — describe what is wrong (accuracy, tone, formatting, etc.).`,
                detail:
                    `--- System context (keep for moderators) ---\nHub: ${p}\nLayer: L${archiveLayer}\nDisplay coords: X=${x}, Y=${y}\nSegment id: ${segmentIndex}\nLabel: ${segmentLabel}\nExcerpt:\n${excerpt || '(none)'}\n\n--- Your report ---\n`,
            }))
            return
        }
        const p = searchParams.get('planet')
        const x = searchParams.get('coordX')
        const y = searchParams.get('coordY')
        const tags = searchParams.get('tags')
        if (!p && !x && !y && (tags == null || tags === '')) return
        setForm(f => ({
            ...f,
            ...(p ? { planet: p } : {}),
            ...(x ? { coordX: String(x).padStart(3, '0') } : {}),
            ...(y ? { coordY: String(y).padStart(3, '0') } : {}),
            ...(tags != null && tags !== '' ? { tags } : {}),
        }))
    }, [searchParams])

    useEffect(() => {
        const persisted = getSubmissions()
        const occupied = new Set(
            persisted
                .filter((item) => item.status !== 'rejected')
                .map((item) => `${String(item.coordX).padStart(3, '0')}:${String(item.coordY).padStart(3, '0')}`),
        )

        const nextSlots = []
        for (let x = 100; x <= 160; x += 1) {
            for (let y = 130; y <= 180; y += 1) {
                const x3 = String(x).padStart(3, '0')
                const y3 = String(y).padStart(3, '0')
                const key = `${x3}:${y3}`
                if (!occupied.has(key)) nextSlots.push({ coordX: x3, coordY: y3, label: `X=${x3}, Y=${y3}` })
            }
        }

        if (form.coordX && form.coordY) {
            const currentKey = `${String(form.coordX).padStart(3, '0')}:${String(form.coordY).padStart(3, '0')}`
            if (!occupied.has(currentKey) && !nextSlots.find(s => `${s.coordX}:${s.coordY}` === currentKey)) {
                nextSlots.unshift({
                    coordX: String(form.coordX).padStart(3, '0'),
                    coordY: String(form.coordY).padStart(3, '0'),
                    label: `X=${String(form.coordX).padStart(3, '0')}, Y=${String(form.coordY).padStart(3, '0')} (Selected)`
                })
            }
        }

        setAvailableSlots(nextSlots)
    }, [form.coordX, form.coordY, submitted])

    const appendFiles = useCallback((fileList, kind) => {
        const files = Array.from(fileList || [])
        if (!files.length) return
        setAttachErr('')
        for (const file of files) {
            if (file.size > MAX_FILE_BYTES) {
                setAttachErr(`"${file.name}" is too large (max ${Math.round(MAX_FILE_BYTES / 1024)} KB).`)
                continue
            }
            const reader = new FileReader()
            reader.onload = () => {
                const url = reader.result
                if (typeof url !== 'string') return
                setAttachments((prev) => {
                    if (prev.length >= MAX_ATTACHMENTS) {
                        setAttachErr(`Maximum ${MAX_ATTACHMENTS} files.`)
                        return prev
                    }
                    return [...prev, {
                        id: newAttachmentId(),
                        kind,
                        label: file.name,
                        url,
                        mime: file.type || '',
                        download: file.type === 'application/pdf',
                    }]
                })
            }
            reader.readAsDataURL(file)
        }
    }, [])

    const addRemoteGraphUrl = () => {
        const u = graphUrlDraft.trim()
        setAttachErr('')
        if (!u) return
        if (!/^https?:\/\//i.test(u)) {
            setAttachErr('URL must start with http:// or https://')
            return
        }
        if (attachments.length >= MAX_ATTACHMENTS) {
            setAttachErr(`Maximum ${MAX_ATTACHMENTS} attachments.`)
            return
        }
        setAttachments((prev) => [...prev, {
            id: newAttachmentId(),
            kind: 'graph',
            label: u.length > 80 ? `${u.slice(0, 77)}…` : u,
            url: u,
            download: false,
        }])
        setGraphUrlDraft('')
    }

    const removeAttachment = (id) => setAttachments((a) => a.filter((x) => x.id !== id))

    const validate = () => {
        if (isSegmentReport) {
            const errs = {}
            if (!form.planet) errs.planet = 'Select a planet/domain'
            if (!form.coordX || !form.coordY) {
                errs.coordX = 'Coordinates are required'
                errs.coordY = 'Coordinates are required'
            }
            if (!form.subject.trim()) errs.subject = 'Subject is required'
            const sum = form.summary.trim()
            if (sum.length < 30 || sum.length > 800) errs.summary = 'Summary must be 30–800 characters (what is the issue?)'
            const det = form.detail.trim()
            if (det.length < 40 || det.length > 4000) errs.detail = 'Detail must be 40–4000 characters (keep the context block and explain).'
            if (String(form.tags || '').length > 600) errs.tags = 'Tags field is too long'
            return errs
        }
        const errs = {}
        if (!form.planet) errs.planet = 'Select a planet/domain'
        if (!form.subject.trim()) errs.subject = 'Subject is required'
        if (!form.coordX || !form.coordY) {
            errs.coordX = 'Select an available grid coordinate (X,Y)'
            errs.coordY = 'Select an available grid coordinate (X,Y)'
        } else {
            if (isNaN(parseInt(form.coordX)) || isNaN(parseInt(form.coordY))) {
                errs.coordX = 'Valid X coordinate required'
                errs.coordY = 'Valid Y coordinate required'
            }
        }
        if (!form.summary.trim() || form.summary.length < 50 || form.summary.length > 400) errs.summary = 'Summary must be 50 to 400 characters'

        const detailTrimmed = form.detail.trim()
        if (!detailTrimmed || detailTrimmed.length < 100 || detailTrimmed.length > 2500) {
            errs.detail = 'Detail must be 100 to 2500 characters'
        } else {
            const segments = (detailTrimmed.match(/[^.!?]+[.!?]*/g) || [detailTrimmed]).map(s => s.trim()).filter(s => s.length > 0)
            const invalidSegment = segments.find(s => s.length < 20 || s.length > 250)
            if (invalidSegment) {
                errs.detail = `Segments (sentences) must be 20-250 chars. Found invalid length (${invalidSegment.length} chars): "${invalidSegment.substring(0, 30)}..."`
            }
        }
        if (String(form.tags || '').length > 600) errs.tags = 'Tags field is too long (use shorter comma-separated labels)'
        if (!isSegmentReport && (previewLayer === 7 || previewLayer === 8) && l56GateBlocksNarrative) {
            errs.previewLayer = L56_NARRATIVE_GATE_MESSAGE
        } else if (!isSegmentReport && previewLayer === 8 && l7GateBlocksL8) {
            errs.previewLayer = `Complete all ${L7_NARRATIVE_SEGMENT_COUNT} Layer 7 narrative tiles at this coordinate (catalog + approved submissions) before targeting Layer 8.`
        }
        return errs
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        if (!isLoggedIn || !username) {
            setErrors({ login: 'Please sign in from Join / Login before submitting.' })
            return
        }

        if (isSegmentReport) {
            const attachmentCount = attachments.length
            appendSegmentReport({
                planet: form.planet,
                coordX: String(form.coordX).trim(),
                coordY: String(form.coordY).trim(),
                archiveLayer: searchParams.get('archiveLayer') || '',
                segmentIndex: searchParams.get('segmentIndex') || '',
                segmentLabel: searchParams.get('segmentLabel') || '',
                excerptAtOpen: searchParams.get('excerpt') || '',
                subject: form.subject.trim(),
                summary: form.summary.trim(),
                detail: form.detail.trim(),
                authorUsername: username,
                attachments,
            })
            setAttachmentCountSubmitted(attachmentCount)
            setSubmitted(true)
            return
        }

        const attachmentCount = attachments.length
        appendPendingSubmission({
            ...form,
            coordX: String(form.coordX).padStart(3, '0'),
            coordY: String(form.coordY).padStart(3, '0'),
            createdAt: new Date().toISOString(),
            attachments,
            authorUsername: username,
            tags: normalizeSubmissionTags(form.tags),
        })
        setAttachmentCountSubmitted(attachmentCount)
        setSubmitted(true)
    }

    const selectedPlanet = PLANETS.find(p => p.id === form.planet)

    const archiveLayerHint = searchParams.get('archiveLayer')
    const nextSegmentSlotHint = searchParams.get('nextSegmentSlot')
    const archiveLayerNum = parseSubmissionArchiveLayer(archiveLayerHint)
    const narrativeStateForHint =
        archiveLayerNum === 7 ? narrativeStateL7 : archiveLayerNum === 8 ? narrativeStateL8 : { kind: 'none' }
    const showSegmentSlotHint =
        !isSegmentReport &&
        narrativeStateForHint.kind === 'ready' &&
        nextSegmentSlotHint &&
        /^\d+$/.test(String(nextSegmentSlotHint).trim()) &&
        String(narrativeStateForHint.slot) === String(nextSegmentSlotHint).trim()

    const showL56GateBanner =
        !isSegmentReport &&
        (previewLayer === 7 || previewLayer === 8 || archiveLayerNum === 7 || archiveLayerNum === 8) &&
        l56GateBlocksNarrative

    const showL7GateBanner =
        !isSegmentReport &&
        (previewLayer === 8 || archiveLayerNum === 8) &&
        !l56GateBlocksNarrative &&
        l7GateBlocksL8

    const inputStyle = {
        padding: '10px 14px',
        borderRadius: 12,
        border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)'}`,
        background: isDark ? 'rgba(2,4,8,0.6)' : 'rgba(240,244,248,0.8)',
        color: isDark ? '#e2e8f0' : '#0f172a',
        fontSize: 13,
        outline: 'none',
        width: '100%',
        fontFamily: 'Inter, sans-serif',
    }

    const errorColor = '#f87171'

    const resetForm = () => {
        setSubmitted(false)
        setAttachments([])
        setAttachErr('')
        setGraphUrlDraft('')
        setAttachmentCountSubmitted(0)
        setPreviewLayer(5)
        setShowRichPreview(false)
        setForm(emptyForm())
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete('archiveLayer')
                next.delete('nextSegmentSlot')
                return next
            },
            { replace: true },
        )
    }

    if (submitted) {
        const wasSegmentReport = searchParams.get('intent') === 'segmentReport'
        return (
            <div className="min-h-screen pt-20 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    className="text-center max-w-md"
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mx-auto mb-6 flex items-center justify-center rounded-full overflow-hidden"
                        style={{
                            width: 112,
                            height: 112,
                            background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                            boxShadow: isDark ? '0 0 36px rgba(245,166,35,0.45)' : '0 0 28px rgba(245,166,35,0.35)',
                        }}
                    >
                        <FoundationLogo fillCircle alt="" />
                    </motion.div>
                    <CheckCircle size={48} className="mx-auto mb-4" color="#34d399" />
                    <h2 className="text-2xl font-black mb-2" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        {wasSegmentReport ? 'Report Sent' : 'Entry Submitted!'}
                    </h2>
                    <p className="mb-2" style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
                        {wasSegmentReport ? (
                            <>
                                Your segment report for <strong style={{ color: selectedPlanet?.color }}>{selectedPlanet?.label}</strong> at ({form.coordX}, {form.coordY}) was saved locally for the moderation queue demo.
                            </>
                        ) : (
                            <>
                                Your archive entry for <strong style={{ color: selectedPlanet?.color }}>{selectedPlanet?.label}</strong> has been received.
                            </>
                        )}
                    </p>
                    <p className="text-sm mb-6" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                        {wasSegmentReport
                            ? 'Reports are stored in this browser (solarArchiveSegmentReports). Attachments, if any, are included in the report record.'
                            : `It enters the review queue until three independent reviewers pass fact-check and difficulty grading; only then it appears on the coordinate grid at (${form.coordX}, ${form.coordY}).${
                                  attachmentCountSubmitted > 0 ? ` ${attachmentCountSubmitted} file(s) attached (stored in this browser).` : ''
                              }`}
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="px-8 py-3 rounded-full font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                        onClick={resetForm}
                    >
                        Submit Another
                    </motion.button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-6xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.65, ease: 'easeInOut' }}
                        className="w-[4.5rem] h-[4.5rem] rounded-full mx-auto mb-5 flex items-center justify-center overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                            boxShadow: isDark ? '0 0 28px rgba(245,166,35,0.35)' : '0 0 24px rgba(245,166,35,0.25)',
                        }}
                    >
                        <FoundationLogo fillCircle alt="" />
                    </motion.div>
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {isSegmentReport ? (
                            <Flag size={28} color={isDark ? '#f87171' : '#dc2626'} aria-hidden />
                        ) : (
                            <Upload size={28} color={isDark ? '#4fc3f7' : '#0284c7'} />
                        )}
                        <h1 className="text-3xl md:text-4xl font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                            {isSegmentReport ? 'Report a segment' : 'Submit Archive'}
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        {isSegmentReport
                            ? 'Flag inaccurate, offensive, or misplaced archive text on layers 6–8. Your context block is pre-filled; add specifics below. Sign in so moderators can follow up.'
                            : 'Contribute a research entry to the SOLAR coordinate grid. Add tags so peers can search and cross-link related submissions. Sign in so reviewers know who authored each entry.'}
                    </p>
                </motion.div>

                {isSegmentReport && (
                    <div
                        className="mb-6 p-4 rounded-2xl text-sm flex gap-3 items-start"
                        style={{
                            border: '1px solid rgba(248,113,113,0.45)',
                            background: isDark ? 'rgba(127,29,29,0.2)' : 'rgba(254,226,226,0.95)',
                            color: isDark ? '#fecaca' : '#7f1d1d',
                        }}
                    >
                        <Flag size={18} className="shrink-0 mt-0.5" aria-hidden />
                        <div>
                            <p className="font-bold mb-1" style={{ color: isDark ? '#fecaca' : '#7f1d1d' }}>
                                Segment moderation report
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: isDark ? '#fca5a5' : '#991b1b' }}>
                                This submission is saved as a <strong>report</strong> (not a new grid entry). Keep the gray &quot;System context&quot; block in the detail field so reviewers know which tile you mean.
                            </p>
                        </div>
                    </div>
                )}

                {showL56GateBanner && (
                    <div
                        className="mb-6 p-4 rounded-2xl text-sm flex gap-3 items-start"
                        style={{
                            border: '1px solid rgba(251,191,36,0.45)',
                            background: isDark ? 'rgba(120,53,15,0.35)' : 'rgba(254,243,199,0.95)',
                            color: isDark ? '#fde68a' : '#854d0e',
                        }}
                    >
                        <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden />
                        <div>
                            <p className="font-bold mb-1">Layer 7 / 8 locked — add L5 &amp; L6 first</p>
                            <p className="text-xs leading-relaxed">{L56_NARRATIVE_GATE_MESSAGE}</p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-bold underline"
                                onClick={() => handlePreviewLayerChange(5)}
                            >
                                Switch preview to Layer 5 (summary)
                            </button>
                        </div>
                    </div>
                )}

                {showL7GateBanner && !showL56GateBanner && (
                    <div
                        className="mb-6 p-4 rounded-2xl text-sm flex gap-3 items-start"
                        style={{
                            border: '1px solid rgba(251,191,36,0.45)',
                            background: isDark ? 'rgba(120,53,15,0.35)' : 'rgba(254,243,199,0.95)',
                            color: isDark ? '#fde68a' : '#854d0e',
                        }}
                    >
                        <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden />
                        <div>
                            <p className="font-bold mb-1">Layer 8 locked — complete Layer 7 narrative band</p>
                            <p className="text-xs leading-relaxed">
                                Finish all {L7_NARRATIVE_SEGMENT_COUNT} narrative tiles on Layer 7 at this coordinate before adding harder sentences on Layer 8.
                            </p>
                        </div>
                    </div>
                )}

                {showSegmentSlotHint && (
                    <div
                        className="mb-6 p-4 rounded-2xl text-sm flex gap-3 items-start"
                        style={{
                            border: `1px solid ${(selectedPlanet?.color || '#4fc3f7')}44`,
                            background: isDark ? `${selectedPlanet?.color || '#4fc3f7'}14` : `${selectedPlanet?.color || '#0284c7'}0d`,
                            color: isDark ? '#e2e8f0' : '#0f172a',
                        }}
                    >
                        <PenLine size={18} className="shrink-0 mt-0.5" style={{ color: selectedPlanet?.color || '#4fc3f7' }} aria-hidden />
                        <div>
                            <p className="font-bold mb-1" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                                Layer {archiveLayerHint} · narrative segment {nextSegmentSlotHint}
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                                Your detail field must split into sentences (20–250 characters each). After grading, sentences land on archive tiles in
                                easiest-to-hardest order — slot <strong>{nextSegmentSlotHint}</strong> is the next empty narrative tile for this coordinate from the archive HUD.
                            </p>
                        </div>
                    </div>
                )}

                {!isLoggedIn && (
                    <div
                        className="mb-6 p-4 rounded-2xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        style={{
                            background: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
                            border: `1px solid ${isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.25)'}`,
                            color: isDark ? '#e2e8f0' : '#0f172a',
                        }}
                    >
                        <span>Submitting requires an account so entries can be reviewed and attributed.</span>
                        <Link
                            to="/join"
                            className="font-bold shrink-0 px-4 py-2 rounded-xl text-center text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                        >
                            Join / Login
                        </Link>
                    </div>
                )}

                {isLoggedIn && (
                    <AuthorSubmissionOverview username={username} isDark={isDark} accent={selectedPlanet?.color} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-8 items-start">
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onSubmit={handleSubmit}
                    className="p-6 rounded-2xl flex flex-col gap-5 min-w-0"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)'}`,
                        boxShadow: isDark ? '0 0 40px rgba(79,195,247,0.06)' : '0 4px 40px rgba(0,0,0,0.08)',
                    }}
                >
                    {errors.login && (
                        <div
                            className="flex flex-wrap items-center gap-2 text-xs p-3 rounded-xl"
                            style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.35)' }}
                        >
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{errors.login}</span>
                            <Link to="/join" className="font-bold underline" style={{ color: '#f87171' }}>
                                Open Join / Login
                            </Link>
                        </div>
                    )}
                    <Field label="Planet / Research Domain" required>
                        <div className="relative">
                            <select
                                value={form.planet}
                                onChange={e => set('planet', e.target.value)}
                                style={{ ...inputStyle, appearance: 'none', paddingRight: 36 }}
                            >
                                <option value="">Select a planet...</option>
                                {PLANETS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label} — {p.domain}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                        </div>
                        {selectedPlanet && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs px-3 py-1.5 rounded-lg w-fit" style={{ background: `${selectedPlanet.color}22`, color: selectedPlanet.color, border: `1px solid ${selectedPlanet.color}44` }}>
                                ● {selectedPlanet.domain}
                            </motion.div>
                        )}
                        {errors.planet && <p className="text-xs" style={{ color: errorColor }}>{errors.planet}</p>}
                    </Field>

                    {!isSegmentReport && (
                        <>
                            <Field label="Target layer (preview & URL)" required={false}>
                                <select
                                    value={previewLayer}
                                    onChange={(e) => handlePreviewLayerChange(Number(e.target.value))}
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                    aria-label="Choose archive layer for preview and submission hints"
                                >
                                    <option value={5}>L5 — Short summary grid</option>
                                    <option value={6}>L6 — Longer summary grid</option>
                                    <option value={7} disabled={!isSegmentReport && l56GateBlocksNarrative}>
                                        L7 — Segment / narrative tiles{!isSegmentReport && l56GateBlocksNarrative ? ' (needs L5+L6)' : ''}
                                    </option>
                                    <option value={8} disabled={!isSegmentReport && (l56GateBlocksNarrative || l7GateBlocksL8)}>
                                        L8 — Deep lattice + citations
                                        {!isSegmentReport && l56GateBlocksNarrative ? ' (needs L5+L6)' : !isSegmentReport && l7GateBlocksL8 ? ' (complete L7 first)' : ''}
                                    </option>
                                </select>
                                <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                                    Updates the illustrated grid on the right and the <code className="text-[10px]">archiveLayer</code> query hint for reviewers.
                                </p>
                                {!isSegmentReport && (previewLayer === 7 || previewLayer === 8) && l56GateBlocksNarrative ? (
                                    <p
                                        className="text-xs mt-2 rounded-lg px-2 py-1.5"
                                        style={{
                                            color: isDark ? '#fde68a' : '#854d0e',
                                            background: isDark ? 'rgba(120,53,15,0.35)' : 'rgba(254,243,199,0.95)',
                                            border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(180,83,9,0.25)'}`,
                                        }}
                                    >
                                        {L56_NARRATIVE_GATE_MESSAGE}
                                    </p>
                                ) : null}
                                {!isSegmentReport && previewLayer === 8 && !l56GateBlocksNarrative && l7GateBlocksL8 ? (
                                    <p
                                        className="text-xs mt-2 rounded-lg px-2 py-1.5"
                                        style={{
                                            color: isDark ? '#fde68a' : '#854d0e',
                                            background: isDark ? 'rgba(120,53,15,0.35)' : 'rgba(254,243,199,0.95)',
                                            border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(180,83,9,0.25)'}`,
                                        }}
                                    >
                                        Layer 8 is locked until this coordinate has{' '}
                                        <strong>{L7_NARRATIVE_SEGMENT_COUNT} narrative sentences</strong> counted toward Layer&nbsp;7 (easiest-first pool shared with L8). Finish L7 tiles in the archive or submit more sentences at L7 first.
                                    </p>
                                ) : null}
                                {errors.previewLayer ? (
                                    <p className="text-xs mt-2" style={{ color: errorColor }}>{errors.previewLayer}</p>
                                ) : null}
                            </Field>
                            <SubmissionGuidelinesPanel previewLayer={previewLayer} isDark={isDark} />
                        </>
                    )}

                    <Field label="Images, sketches, and graphs (optional)">
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <select
                                value={attachKind}
                                onChange={(e) => setAttachKind(e.target.value)}
                                style={{ ...inputStyle, maxWidth: 220, cursor: 'pointer' }}
                            >
                                {KIND_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <label className="text-xs font-medium cursor-pointer px-4 py-2.5 rounded-xl border text-center" style={{ borderColor: isDark ? 'rgba(79,195,247,0.35)' : 'rgba(15,23,42,0.2)', color: isDark ? '#94a3b8' : '#475569' }}>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.svg,image/svg+xml,application/pdf"
                                    className="hidden"
                                    onChange={(e) => { appendFiles(e.target.files, attachKind); e.target.value = '' }}
                                />
                                Choose files…
                            </label>
                        </div>
                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            Up to {MAX_ATTACHMENTS} files, {Math.round(MAX_FILE_BYTES / 1024)} KB each (images, SVG, PDF). Stored locally until a backend is connected.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 mt-3 items-stretch sm:items-center">
                            <input
                                type="url"
                                placeholder="Or paste image URL (https://…)"
                                value={graphUrlDraft}
                                onChange={(e) => setGraphUrlDraft(e.target.value)}
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={addRemoteGraphUrl}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
                                style={{
                                    background: isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.1)',
                                    color: isDark ? '#4fc3f7' : '#0284c7',
                                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.3)' : 'rgba(2,132,199,0.25)'}`,
                                }}
                            >
                                <Link2 size={16} /> Add URL
                            </button>
                        </div>
                        {attachErr && <p className="text-xs mt-2" style={{ color: errorColor }}>{attachErr}</p>}
                        {attachments.length > 0 && (
                            <ul className="mt-3 space-y-2">
                                {attachments.map((a) => (
                                    <li
                                        key={a.id}
                                        className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg"
                                        style={{
                                            background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.95)',
                                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.08)'}`,
                                        }}
                                    >
                                        <span className="truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                                            <span className="font-bold uppercase mr-2 opacity-70">{a.kind}</span>
                                            {a.label}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Remove"
                                            onClick={() => removeAttachment(a.id)}
                                            className="shrink-0 p-1 rounded-md hover:opacity-80"
                                            style={{ color: errorColor }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Field>

                    <Field label="Subject Title" required>
                        <input
                            type="text"
                            placeholder="e.g. Solar Panel Efficiency Optimization"
                            value={form.subject}
                            onChange={e => set('subject', e.target.value)}
                            style={inputStyle}
                            maxLength={80}
                        />
                        {errors.subject && <p className="text-xs" style={{ color: errorColor }}>{errors.subject}</p>}
                    </Field>

                    <Field label={`Tags (optional, up to ${MAX_TAGS_PER_SUBMISSION})`}>
                        <input
                            type="text"
                            placeholder="e.g. fusion, materials-science, citation-needed"
                            value={form.tags}
                            onChange={e => set('tags', e.target.value)}
                            style={inputStyle}
                        />
                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            Comma or hashtag separated. Normalized for search — reuse tags to cross-link subjects across hubs.
                        </p>
                        {errors.tags && <p className="text-xs" style={{ color: errorColor }}>{errors.tags}</p>}
                    </Field>

                    <Field label="Choose an available grid slot" required>
                        <select
                            value={`${form.coordX || ''}:${form.coordY || ''}`}
                            onChange={e => {
                                const [x, y] = e.target.value.split(':')
                                set('coordX', x)
                                set('coordY', y)
                            }}
                            style={{ ...inputStyle, appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
                        >
                            <option value=":">Select an open slot...</option>
                            {availableSlots.length > 0 ? availableSlots.map(slot => (
                                <option key={`${slot.coordX}:${slot.coordY}`} value={`${slot.coordX}:${slot.coordY}`}>
                                    {slot.label}
                                </option>
                            )) : (
                                <option value=":" disabled>No slots available (reset localStorage to free)</option>
                            )}
                        </select>
                        <p className="text-xs mt-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            Only empty grid records are selectable here.
                        </p>
                        {(errors.coordX || errors.coordY) && <p className="text-xs" style={{ color: errorColor }}>{errors.coordX || errors.coordY}</p>}
                    </Field>

                    <Field label="Short Summary" required>
                        <textarea
                            rows={3}
                            placeholder="A concise overview of the research entry (50-400 characters)..."
                            value={form.summary}
                            maxLength={400}
                            onChange={e => set('summary', e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div className="flex justify-between">
                            {errors.summary
                                ? <p className="text-xs" style={{ color: errorColor }}>{errors.summary}</p>
                                : <span />
                            }
                            <span className="text-xs" style={{ color: form.summary.length < 50 || form.summary.length > 400 ? errorColor : '#34d399' }}>
                                {form.summary.length}/400
                            </span>
                        </div>
                    </Field>

                    <Field label="Technical Deep Detail" required>
                        <textarea
                            rows={6}
                            placeholder="In-depth technical analysis. Enter discrete sentences to be parsed as grid segments (20-250 characters each)..."
                            value={form.detail}
                            maxLength={2500}
                            onChange={e => set('detail', e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div className="flex justify-between">
                            {errors.detail
                                ? <p className="text-xs" style={{ color: errorColor }}>{errors.detail}</p>
                                : <span />
                            }
                            <span className="text-xs" style={{ color: form.detail.length < 100 || form.detail.length > 2500 ? errorColor : '#34d399' }}>
                                {form.detail.length}/2500
                            </span>
                        </div>
                    </Field>

                    {!isSegmentReport && (
                    <Field label={`Difficulty Level: ${form.difficulty}/5`}>
                        <input
                            type="range"
                            min={1} max={5} step={1}
                            value={form.difficulty}
                            onChange={e => set('difficulty', parseInt(e.target.value, 10))}
                            className="w-full"
                            style={{ accentColor: isDark ? '#4fc3f7' : '#0284c7' }}
                        />
                        <div className="flex justify-between text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                            <span>1 — Beginner</span>
                            <span>3 — Intermediate</span>
                            <span>5 — Expert</span>
                        </div>
                        <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <span key={i} style={{ fontSize: 18, color: i <= form.difficulty ? '#f5a623' : 'rgba(245,166,35,0.15)', transition: 'color 0.1s' }}>★</span>
                            ))}
                        </div>
                    </Field>
                    )}

                    {!isSegmentReport && (
                    <div
                        className="flex items-start gap-2 p-3 rounded-xl"
                        style={{
                            background: isDark ? 'rgba(79,195,247,0.06)' : 'rgba(2,132,199,0.05)',
                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.15)'}`,
                        }}
                    >
                        <AlertCircle size={14} style={{ color: isDark ? '#4fc3f7' : '#0284c7', flexShrink: 0, marginTop: 1 }} aria-hidden />
                        <p className="text-xs leading-relaxed" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            All entries are reviewed for accuracy and relevance before being added to the archive. Entries with citations and real-world examples are prioritised. Coordinates are checked against the existing grid to avoid collisions.
                        </p>
                    </div>
                    )}

                    <motion.button
                        type="submit"
                        disabled={!isLoggedIn}
                        whileHover={{ scale: isLoggedIn ? 1.02 : 1 }}
                        whileTap={{ scale: isLoggedIn ? 0.97 : 1 }}
                        className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                        style={{
                            background: isSegmentReport
                                ? 'linear-gradient(135deg, #b91c1c, #f97316)'
                                : 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                            boxShadow: isSegmentReport ? '0 0 24px rgba(185,28,28,0.35)' : '0 0 24px rgba(124,58,237,0.4)',
                            fontSize: 15,
                        }}
                    >
                        {isSegmentReport ? <Flag size={17} /> : <Upload size={17} />}
                        {isSegmentReport ? 'Send segment report' : 'Submit to the Archive'}
                    </motion.button>
                </motion.form>

                <SubmissionLayerGuide
                    previewLayer={previewLayer}
                    onLayerChange={handlePreviewLayerChange}
                    showRichPreview={showRichPreview}
                    onRichToggle={setShowRichPreview}
                    form={form}
                    attachments={attachments}
                    isDark={isDark}
                    accent={selectedPlanet?.color || (isDark ? '#4fc3f7' : '#0284c7')}
                    highlightSegmentSlot={highlightSegmentSlot}
                />
                </div>
            </div>
        </div>
    )
}
