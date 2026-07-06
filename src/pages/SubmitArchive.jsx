import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, CheckCircle, ChevronDown, AlertCircle, X, Link2, PenLine, Flag, Info, Lock, ShieldCheck, Zap } from 'lucide-react'
import { useTheme } from '../App.jsx'
import SubmissionLayerGuide, {
    LayerGuidelinesOverlay,
    SUBMISSION_LAYER_GUIDES,
    SUBMISSION_LAYER_OPTIONS,
} from '../components/SubmissionLayerGuide.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import FoundationLogo from '../components/FoundationLogo.jsx'
import { appendPendingSubmission, getSubmissions, migrateSubmission, normalizeSubmissionTags, MAX_TAGS_PER_SUBMISSION } from '../utils/submissionStorage.js'
import { appendSegmentReport } from '../utils/segmentReports.js'
import {
  parseSubmissionArchiveLayer,
  parsePositiveInt,
  isL7NarrativeBandComplete,
  cellHasL5,
  cellHasL5AndL6,
  L56_NARRATIVE_GATE_MESSAGE,
  L7_NARRATIVE_SEGMENT_COUNT,
  getNarrativeSubmitState,
} from '../utils/archiveLayerSpecs.js'
import { buildMergedSectionEntries } from '../utils/archiveSectionEntries.js'
import { buildSortedSegments } from '../utils/segmentDifficulty.js'
import { getHubResearchSections, getHubTaxonomy } from '../utils/hubTaxonomyRegistry.js'
import { readGridDimensionsFromStorage, normalizeHubId } from '../utils/archiveInstanceStorage.js'

import fallbackData from '../data/researchData.json'
import '../styles/solar-submit.css'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData;
const PLANETS = researchData.planets.map(p => ({
    id: p.id,
    label: p.planet,
    domain: p.domain,
    color: p.color
}))

const MAX_ATTACHMENTS = 6
const MAX_FILE_BYTES = 1_200_000
const MAX_SOURCE_LINKS = 12
const MAX_ALTERNATE_PERSPECTIVES = 6

const KIND_OPTIONS = [
    { value: 'image', label: 'Photo / figure' },
    { value: 'sketch', label: 'Sketch / scan' },
    { value: 'graph', label: 'Chart / graph' },
]

const PLANET_IDS = new Set(PLANETS.map((p) => String(p.id || '').toLowerCase()))

function normalizeCoordString(value) {
    const n = parseInt(String(value ?? '').trim(), 10)
    return Number.isFinite(n) ? String(n) : ''
}

function formatDisplayCoord(value) {
    const n = parseInt(String(value ?? '').trim(), 10)
    if (!Number.isFinite(n)) return '----'
    const sign = n < 0 ? '-' : ''
    return `${sign}${String(Math.abs(n)).padStart(4, '0')}`
}

function cellKeyFromDisplay(lx, ly, halfW, halfH) {
    const x = parseInt(String(lx ?? '').trim(), 10)
    const y = parseInt(String(ly ?? '').trim(), 10)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return `${x + halfW},${halfH - y}`
}

function displayFromCellKey(key, halfW, halfH) {
    const [gxRaw, gyRaw] = String(key || '').split(',')
    const gx = parseInt(gxRaw, 10)
    const gy = parseInt(gyRaw, 10)
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) return null
    return { coordX: String(gx - halfW), coordY: String(halfH - gy), gx, gy }
}

function planetWithCompiledSections(basePlanet, hubId) {
    if (!basePlanet) return null
    const sections = getHubResearchSections(hubId)
    return sections?.length ? { ...basePlanet, sections } : basePlanet
}

function topicKeyFromParts(subfieldId, title) {
    return `${String(subfieldId || '')}::${String(title || '')}`
}

function parseSourceLinks(input) {
    return String(input || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_SOURCE_LINKS)
        .map((line) => {
            const parts = line.split('|').map((p) => p.trim()).filter(Boolean)
            if (parts.length >= 2) return { label: parts.slice(0, -1).join(' | '), url: parts[parts.length - 1] }
            return { label: parts[0], url: parts[0] }
        })
}

function sourceLinksToAttachments(input) {
    return parseSourceLinks(input)
        .filter((src) => /^https?:\/\//i.test(src.url))
        .map((src, index) => ({
            id: newAttachmentId(),
            kind: 'source',
            label: src.label || `Source ${index + 1}`,
            url: src.url,
            download: false,
        }))
}

function parseAlternatePerspectives(input) {
    return String(input || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_ALTERNATE_PERSPECTIVES)
        .map((line) => {
            const parts = line.split('|').map((p) => p.trim()).filter(Boolean)
            const hubId = String(parts[0] || '').toLowerCase()
            const label = parts.length > 1 ? parts.slice(1).join(' | ') : hubId
            return { hubId, label }
        })
}

function buildTaxonomyCellMeta(taxonomy, halfW, halfH) {
    const byDomain = Object.fromEntries((taxonomy?.domains || []).map((d) => [d.id, d]))
    const bySubfield = Object.fromEntries((taxonomy?.subfields || []).map((s) => [s.id, s]))
    const meta = new Map()
    ;(taxonomy?.leaves || []).forEach((leaf) => {
        const subfield = bySubfield[leaf.subfieldId]
        const domain = subfield ? byDomain[subfield.domainId] : null
        const gx = parseInt(String(leaf.lx), 10) + halfW
        const gy = halfH - parseInt(String(leaf.ly), 10)
        if (!Number.isFinite(gx) || !Number.isFinite(gy)) return
        meta.set(`${gx},${gy}`, {
            domainId: domain?.id || '',
            domainLabel: domain?.label || '',
            subfieldId: subfield?.id || '',
            subfieldLabel: subfield?.label || '',
            title: leaf.title,
            topicKey: topicKeyFromParts(leaf.subfieldId, leaf.title),
        })
    })
    return meta
}

function newAttachmentId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `a-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyForm() {
    return {
        planet: '',
        domainId: '',
        subfieldId: '',
        topicKey: '',
        topicLabel: '',
        subject: '',
        coordX: '',
        coordY: '',
        summary: '',
        detail: '',
        difficulty: 3,
        tags: '',
        sourceLinks: '',
        alternatePerspectives: '',
    }
}

function Field({ label, children, required }) {
    return (
        <motion.div
            className="flex flex-col gap-1.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
            <label className="text-[11px] font-black uppercase tracking-[0.16em] flex items-center gap-1.5" style={{ color: 'inherit' }}>
                {label}
                {required && <span style={{ color: '#f87171', fontSize: 14 }}>*</span>}
            </label>
            {children}
        </motion.div>
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
            <p className="font-bold mb-3" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
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
                                {String(s.planet)} · ({formatDisplayCoord(s.coordX)},{formatDisplayCoord(s.coordY)}) ·{' '}
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
    const { isLoggedIn, username, profile } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const isSegmentReport = searchParams.get('intent') === 'segmentReport'
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [errors, setErrors] = useState({})
    const [attachments, setAttachments] = useState([])
    const [attachKind, setAttachKind] = useState('image')
    const [graphUrlDraft, setGraphUrlDraft] = useState('')
    const [attachErr, setAttachErr] = useState('')
    const [attachmentCountSubmitted, setAttachmentCountSubmitted] = useState(0)
    const [submittedCoords, setSubmittedCoords] = useState({ x: '', y: '' })
    const [previewLayer, setPreviewLayer] = useState(5)
    const [guidelinesOpen, setGuidelinesOpen] = useState(false)
    const [showRichPreview, setShowRichPreview] = useState(false)
    const [submissionMergeTick, setSubmissionMergeTick] = useState(0)
    const [showL2Topics, setShowL2Topics] = useState(true)
    const [showL3Topics, setShowL3Topics] = useState(true)

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

    const archiveLayerNum = useMemo(
        () => parseSubmissionArchiveLayer(searchParams.get('archiveLayer')),
        [searchParams],
    )
    // Present when deep-linked from an existing entry ("Add L5 summary" / "Add L6
    // detail" / narrative segment links) -- targets that entry via updates_entry_id
    // instead of creating an independent new topic at an empty coordinate.
    const updatesEntryId = searchParams.get('updatesEntryId') || null
    const isDeepenMode = !isSegmentReport && !!updatesEntryId
    const nextSegmentSlotHint = searchParams.get('nextSegmentSlot')
    const highlightSegmentSlot = useMemo(() => {
        if (archiveLayerNum !== 7 && archiveLayerNum !== 8) return null
        return parsePositiveInt(nextSegmentSlotHint)
    }, [archiveLayerNum, nextSegmentSlotHint])
    const isNarrativeDeepLink = !isSegmentReport && (archiveLayerNum === 7 || archiveLayerNum === 8) && highlightSegmentSlot != null

    const hubIdForForm = normalizeHubId(form.planet || 'earth')
    const gridDimsForMerge = useMemo(() => readGridDimensionsFromStorage(hubIdForForm), [hubIdForForm, submissionMergeTick])
    const { gridW: mergeGridW, gridH: mergeGridH, halfW: mergeHalfW, halfH: mergeHalfH } = gridDimsForMerge

    const selectedTaxonomy = useMemo(
        () => (form.planet ? getHubTaxonomy(hubIdForForm) : null),
        [form.planet, hubIdForForm],
    )
    const selectedDomain = useMemo(
        () => selectedTaxonomy?.domains?.find((d) => d.id === form.domainId) || null,
        [selectedTaxonomy, form.domainId],
    )
    const availableL3Topics = useMemo(
        () => {
            if (!selectedTaxonomy || !form.domainId) return []
            const subfieldById = Object.fromEntries((selectedTaxonomy.subfields || []).map((sf) => [sf.id, sf]))
            return (selectedTaxonomy.leaves || [])
                .map((leaf) => {
                    const subfield = subfieldById[leaf.subfieldId]
                    if (!subfield || subfield.domainId !== form.domainId) return null
                    return {
                        ...leaf,
                        key: topicKeyFromParts(leaf.subfieldId, leaf.title),
                        subfieldLabel: subfield.label,
                        subfieldId: subfield.id,
                    }
                })
                .filter(Boolean)
        },
        [selectedTaxonomy, form.domainId],
    )
    const selectedSubfield = useMemo(
        () => selectedTaxonomy?.subfields?.find((sf) => sf.id === form.subfieldId) || null,
        [selectedTaxonomy, form.subfieldId],
    )
    const selectedL3Topic = useMemo(
        () => availableL3Topics.find((topic) => topic.key === form.topicKey) || null,
        [availableL3Topics, form.topicKey],
    )

    const planetDataForMerge = useMemo(() => {
        if (!form.planet) return null
        const id = String(form.planet).toLowerCase()
        const base = researchData.planets.find((p) => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id) || null
        return planetWithCompiledSections(base, normalizeHubId(id))
    }, [form.planet])

    // Supabase: approved entries for the selected hub, merged over static/local
    // data -- without this, availableSlots and the L5/L6 narrative gates are
    // blind to real submitted content (they'd only ever see hardcoded/local data).
    const [dbEntriesForForm, setDbEntriesForForm] = useState({})
    useEffect(() => {
        if (!hubIdForForm) { setDbEntriesForForm({}); return }
        let active = true
        supabase
            .from('archive_entries')
            .select('*')
            .eq('planet_id', hubIdForForm)
            .eq('status', 'approved')
            .is('updates_entry_id', null)
            .then(({ data }) => {
                if (!active || !Array.isArray(data)) return
                const map = {}
                data.forEach((e) => {
                    const gx = e.coord_x + mergeHalfW
                    const gy = mergeHalfH - e.coord_y
                    const fullText = e.content || e.short_summary || ''
                    const segStrings =
                        fullText.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) || [fullText]
                    map[`${gx},${gy}`] = {
                        id: e.id,
                        title: e.title,
                        content: fullText,
                        detail: e.content || '',
                        shortSummary: e.short_summary || fullText.slice(0, 400),
                        segments: buildSortedSegments(segStrings, e.difficulty ?? null),
                        attachments: Array.isArray(e.attachments) ? e.attachments : [],
                        tags: Array.isArray(e.tags) ? e.tags : [],
                        alternatePerspectives: Array.isArray(e.alternate_perspectives) ? e.alternate_perspectives : [],
                        foundationMeta: null,
                    }
                })
                setDbEntriesForForm(map)
            })
        return () => { active = false }
    }, [hubIdForForm, mergeHalfW, mergeHalfH])

    const mergedSectionEntries = useMemo(() => {
        if (!planetDataForMerge || !form.planet) return {}
        return { ...buildMergedSectionEntries(planetDataForMerge, mergeHalfW, mergeHalfH), ...dbEntriesForForm }
    }, [planetDataForMerge, form.planet, mergeHalfW, mergeHalfH, submissionMergeTick, dbEntriesForForm])

    const submitMergeCellKey = useMemo(
        () => cellKeyFromDisplay(form.coordX, form.coordY, mergeHalfW, mergeHalfH),
        [form.coordX, form.coordY, mergeHalfW, mergeHalfH],
    )

    const mergedCellAtTarget = submitMergeCellKey ? mergedSectionEntries[submitMergeCellKey] : null
    const narrativeGateApplies = !!mergedCellAtTarget && !isSegmentReport && (isNarrativeDeepLink || previewLayer === 7 || previewLayer === 8)
    const l56GateBlocksNarrative = narrativeGateApplies && !cellHasL5AndL6(mergedCellAtTarget)
    const l7GateBlocksL8 = narrativeGateApplies && !isL7NarrativeBandComplete(mergedCellAtTarget)
    const narrativeStateL7 = getNarrativeSubmitState(7, mergedCellAtTarget)
    const narrativeStateL8 = getNarrativeSubmitState(8, mergedCellAtTarget)

    const availableSlots = useMemo(() => {
        if (!form.planet || !planetDataForMerge) return []
        if (selectedTaxonomy && !form.topicKey) return []

        const occupied = new Set(Object.keys(mergedSectionEntries))
        getSubmissions().forEach((raw) => {
            const item = migrateSubmission(raw)
            if (!item || item.status === 'rejected') return
            if (String(item.planet || '').toLowerCase() !== hubIdForForm) return
            const key = cellKeyFromDisplay(item.coordX, item.coordY, mergeHalfW, mergeHalfH)
            if (key) occupied.add(key)
        })

        const taxonomyMeta = buildTaxonomyCellMeta(selectedTaxonomy, mergeHalfW, mergeHalfH)
        const slotsByKey = new Map()

        Object.entries(mergedSectionEntries).forEach(([sourceKey, entry]) => {
            if (!entry) return
            const [gxRaw, gyRaw] = sourceKey.split(',')
            const gx = parseInt(gxRaw, 10)
            const gy = parseInt(gyRaw, 10)
            if (!Number.isFinite(gx) || !Number.isFinite(gy)) return
            ;[[gx - 1, gy], [gx + 1, gy], [gx, gy - 1], [gx, gy + 1]].forEach(([nx, ny]) => {
                if (nx < 0 || ny < 0 || nx >= mergeGridW || ny >= mergeGridH) return
                const key = `${nx},${ny}`
                if (occupied.has(key) || slotsByKey.has(key)) return
                const display = displayFromCellKey(key, mergeHalfW, mergeHalfH)
                if (!display) return
                const meta = taxonomyMeta.get(sourceKey)
                const sourceLabel = meta?.title || entry.title || 'filled cell'
                slotsByKey.set(key, {
                    coordX: display.coordX,
                    coordY: display.coordY,
                    value: `${display.coordX}:${display.coordY}`,
                    label: `X=${formatDisplayCoord(display.coordX)}, Y=${formatDisplayCoord(display.coordY)} · adjacent to ${sourceLabel}`,
                    sourceLabel,
                    domainLabel: meta?.domainLabel || '',
                    subfieldLabel: meta?.subfieldLabel || '',
                })
            })
        })

        const nextSlots = Array.from(slotsByKey.values()).sort((a, b) => {
            const ax = parseInt(a.coordX, 10)
            const ay = parseInt(a.coordY, 10)
            const bx = parseInt(b.coordX, 10)
            const by = parseInt(b.coordY, 10)
            return Math.abs(ax) + Math.abs(ay) - (Math.abs(bx) + Math.abs(by)) || ax - bx || ay - by
        })

        return nextSlots
    }, [
        form.planet,
        form.topicKey,
        planetDataForMerge,
        mergedSectionEntries,
        selectedTaxonomy,
        hubIdForForm,
        mergeHalfW,
        mergeHalfH,
        mergeGridW,
        mergeGridH,
        submissionMergeTick,
    ])

    const selectedSlotValue = `${normalizeCoordString(form.coordX)}:${normalizeCoordString(form.coordY)}`
    const selectedCoordinateIsValid = availableSlots.some((slot) => slot.value === selectedSlotValue)

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
        // L4 has no gate — always allow it
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
                    if ([4, 5, 6, 7, 8].includes(layer)) next.set('archiveLayer', String(layer))
                    if (layer !== 7 && layer !== 8) next.delete('nextSegmentSlot')
                    return next
                },
                { replace: true },
            )
        },
        [setSearchParams, l7GateBlocksL8, l56GateBlocksNarrative, isSegmentReport],
    )

    const set = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), [])
    const setPlanet = useCallback((planet) => {
        setForm((f) => ({
            ...f,
            planet,
            domainId: '',
            subfieldId: '',
            topicKey: '',
            topicLabel: '',
            coordX: '',
            coordY: '',
        }))
    }, [])
    const setDomain = useCallback((domainId) => {
        setForm((f) => ({
            ...f,
            domainId,
            subfieldId: '',
            topicKey: '',
            topicLabel: '',
        }))
    }, [])
    const setL3Topic = useCallback((topic) => {
        setForm((f) => ({
            ...f,
            subfieldId: topic?.subfieldId || '',
            topicKey: topic?.key || '',
            topicLabel: topic?.title || '',
        }))
    }, [])

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
                coordX: x !== '' ? normalizeCoordString(x) : f.coordX,
                coordY: y !== '' ? normalizeCoordString(y) : f.coordY,
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
        const domainId = searchParams.get('domainId')
        const subfieldId = searchParams.get('subfieldId')
        const topicKey = searchParams.get('topicKey')
        const tags = searchParams.get('tags')
        if (!p && !x && !y && !domainId && !subfieldId && !topicKey && (tags == null || tags === '')) return
        setForm(f => ({
            ...f,
            ...(p ? {
                planet: p,
                ...(p !== f.planet ? { domainId: '', subfieldId: '', topicKey: '', topicLabel: '', coordX: '', coordY: '' } : {}),
            } : {}),
            ...(domainId ? { domainId, subfieldId: '', topicKey: '', topicLabel: '' } : {}),
            ...(subfieldId ? { subfieldId } : {}),
            ...(topicKey ? { topicKey } : {}),
            ...(x ? { coordX: normalizeCoordString(x) } : {}),
            ...(y ? { coordY: normalizeCoordString(y) } : {}),
            ...(tags != null && tags !== '' ? { tags } : {}),
        }))
    }, [searchParams])

    // Deepen mode: pull the base entry's own title from Supabase so the user
    // isn't retyping it, and to keep planet/coords authoritative rather than
    // trusting the URL alone.
    useEffect(() => {
        if (!isDeepenMode || !updatesEntryId) return
        let active = true
        supabase
            .from('archive_entries')
            .select('title, planet_id, coord_x, coord_y')
            .eq('id', updatesEntryId)
            .maybeSingle()
            .then(({ data }) => {
                if (!active || !data) return
                setForm((f) => ({
                    ...f,
                    subject: data.title || f.subject,
                    planet: data.planet_id || f.planet,
                    coordX: String(data.coord_x),
                    coordY: String(data.coord_y),
                }))
            })
        return () => { active = false }
    }, [isDeepenMode, updatesEntryId])

    useEffect(() => {
        // In deepen mode the coordinate deliberately targets an already-occupied
        // cell (that's the whole point), so it will never appear in availableSlots
        // -- don't let this effect wipe it out.
        if (isSegmentReport || isDeepenMode || !form.coordX || !form.coordY) return
        if (selectedTaxonomy && (!form.domainId || !form.topicKey)) return
        if (selectedCoordinateIsValid) return
        setForm((f) => ({ ...f, coordX: '', coordY: '' }))
    }, [form.planet, form.domainId, form.subfieldId, form.topicKey, form.coordX, form.coordY, previewLayer, selectedTaxonomy, selectedCoordinateIsValid, isSegmentReport, isDeepenMode])

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
    const showTopicSelectors = !isSegmentReport
    const showTagsField = isSegmentReport || previewLayer >= 5
    // L6 can be submitted without a new L5 summary if L5 already exists at the coordinate
    const l5ExistsAtTarget = cellHasL5(mergedCellAtTarget)
    const summaryRequiredForDeeperLayer = previewLayer >= 6 && !l5ExistsAtTarget
    const showSummaryField = isSegmentReport || previewLayer === 5 || summaryRequiredForDeeperLayer
    const showDetailField = isSegmentReport || previewLayer >= 6
    const showDifficultyField = !isSegmentReport && previewLayer >= 6
    const showAttachmentsField = isSegmentReport || previewLayer >= 5
    const showAlternatePerspectivesField = !isSegmentReport && previewLayer >= 5
    const showSourceLinksField = !isSegmentReport && previewLayer >= 6

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
        if (!isDeepenMode) {
            if (selectedTaxonomy && !form.domainId) errs.domainId = 'Select an L2 topic'
            if (selectedTaxonomy && form.domainId && !form.topicKey) errs.subfieldId = 'Select an L3 subtopic'
        }
        if (!form.subject.trim()) errs.subject = 'Subject is required'
        if (!form.coordX || !form.coordY) {
            errs.coordX = 'Select an available grid coordinate (X,Y)'
            errs.coordY = 'Select an available grid coordinate (X,Y)'
        } else if (isNaN(parseInt(form.coordX)) || isNaN(parseInt(form.coordY))) {
            errs.coordX = 'Valid X coordinate required'
            errs.coordY = 'Valid Y coordinate required'
        } else if (!isDeepenMode && !selectedCoordinateIsValid) {
            // Deepen mode deliberately targets an already-occupied coordinate --
            // that's the entry being deepened, not a fresh adjacent slot.
            const coordMessage = previewLayer === 4
                ? 'Choose one of the valid adjacent coordinates'
                : 'Choose one of the valid adjacent coordinates for this topic/subtopic'
            errs.coordX = coordMessage
            errs.coordY = coordMessage
        }
        // Summary required at L5 always; at L6+ only if L5 doesn't already exist at the coordinate
        const needsSummary = previewLayer === 5 || (previewLayer >= 6 && !l5ExistsAtTarget)
        if (needsSummary && (!form.summary.trim() || form.summary.length < 50 || form.summary.length > 400)) errs.summary = 'Summary must be 50–400 characters'

        const detailTrimmed = form.detail.trim()
        if (previewLayer >= 6 && (!detailTrimmed || detailTrimmed.length < 100 || detailTrimmed.length > 2500)) {
            errs.detail = 'Detail must be 100 to 2500 characters'
        } else if (previewLayer >= 6) {
            const segments = (detailTrimmed.match(/[^.!?]+[.!?]*/g) || [detailTrimmed]).map(s => s.trim()).filter(s => s.length > 0)
            const invalidSegment = segments.find(s => s.length < 20 || s.length > 250)
            if (invalidSegment) {
                errs.detail = `Segments (sentences) must be 20-250 chars. Found invalid length (${invalidSegment.length} chars): "${invalidSegment.substring(0, 30)}..."`
            }
        }
        if (String(form.tags || '').length > 600) errs.tags = 'Tags field is too long (use shorter comma-separated labels)'
        if (showSourceLinksField) {
            const invalidSource = parseSourceLinks(form.sourceLinks).find((src) => !/^https?:\/\//i.test(src.url))
            if (invalidSource) errs.sourceLinks = 'Each source line must end with a valid http:// or https:// URL'
        }
        if (showAlternatePerspectivesField) {
            const invalidPerspective = parseAlternatePerspectives(form.alternatePerspectives).find((ap) => ap.hubId && !PLANET_IDS.has(ap.hubId))
            if (invalidPerspective) errs.alternatePerspectives = `Unknown hub "${invalidPerspective.hubId}". Use a planet id like earth, mars, jupiter, etc.`
        }
        if (!isSegmentReport && (previewLayer === 7 || previewLayer === 8) && l56GateBlocksNarrative) {
            errs.previewLayer = L56_NARRATIVE_GATE_MESSAGE
        } else if (!isSegmentReport && previewLayer === 8 && l7GateBlocksL8) {
            errs.previewLayer = `Complete all ${L7_NARRATIVE_SEGMENT_COUNT} Layer 7 narrative tiles at this coordinate (catalog + approved submissions) before targeting Layer 8.`
        }
        return errs
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        const authorUsername = username || 'guest'
        setSubmittedCoords({ x: normalizeCoordString(form.coordX), y: normalizeCoordString(form.coordY) })

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
                authorUsername,
                attachments,
            })
            setAttachmentCountSubmitted(attachmentCount)
            setSubmitted(true)
            return
        }

        const submittedAttachments = showAttachmentsField
            ? [...attachments, ...(showSourceLinksField ? sourceLinksToAttachments(form.sourceLinks) : [])]
            : []

        const normalizedTags = showTagsField ? normalizeSubmissionTags(form.tags) : []
        const normalizedPerspectives = showAlternatePerspectivesField
            ? parseAlternatePerspectives(form.alternatePerspectives)
            : []

        // Save to Supabase. In deepen mode this is a pending draft attached to an
        // existing entry via updates_entry_id -- it merges into the base entry
        // once reviewed, rather than becoming an independent topic.
        const { error: dbError } = await supabase.from('archive_entries').insert({
            title: form.subject.trim(),
            content: previewLayer >= 6 ? form.detail.trim() : '',
            short_summary: previewLayer >= 5 ? form.summary.trim() : '',
            layer: previewLayer,
            planet_id: form.planet,
            hub_id: form.planet,
            coord_x: parseInt(normalizeCoordString(form.coordX), 10) || 0,
            coord_y: parseInt(normalizeCoordString(form.coordY), 10) || 0,
            status: 'pending',
            submitted_by: profile?.id ?? null,
            updates_entry_id: updatesEntryId || null,
            tags: normalizedTags,
            attachments: submittedAttachments,
            alternate_perspectives: normalizedPerspectives,
        })

        if (dbError) {
            console.error('Supabase insert failed:', dbError.message)
        }

        // Deepen-mode drafts are Supabase-only -- the localStorage fallback merge
        // doesn't understand updates_entry_id and would show it as a competing,
        // independent entry at the same coordinate.
        if (!isDeepenMode) {
            appendPendingSubmission({
                ...form,
                coordX: normalizeCoordString(form.coordX),
                coordY: normalizeCoordString(form.coordY),
                summary: previewLayer >= 5 ? form.summary.trim() : '',
                detail: previewLayer >= 6 ? form.detail.trim() : '',
                createdAt: new Date().toISOString(),
                attachments: submittedAttachments,
                authorUsername,
                tags: normalizedTags,
                alternatePerspectives: normalizedPerspectives,
                archiveLayer: previewLayer,
                domainLabel: selectedDomain?.label || '',
                subfieldLabel: selectedSubfield?.label || '',
                topicKey: selectedL3Topic?.key || form.topicKey,
                topicLabel: selectedL3Topic?.title || form.topicLabel,
            })
        }
        setAttachmentCountSubmitted(submittedAttachments.length)
        setSubmitted(true)
    }

    const selectedPlanet = PLANETS.find(p => p.id === form.planet)
    const accent = selectedPlanet?.color || (isDark ? '#4fc3f7' : '#0284c7')

    const archiveLayerHint = searchParams.get('archiveLayer')
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

    const sourceLinkPreviewAttachments = useMemo(
        () =>
            showSourceLinksField
                ? parseSourceLinks(form.sourceLinks)
                      .filter((src) => /^https?:\/\//i.test(src.url))
                      .map((src, index) => ({
                          id: `source-${index}-${src.url}`,
                          kind: 'source',
                          label: src.label || `Source ${index + 1}`,
                          url: src.url,
                          download: false,
                      }))
                : [],
        [form.sourceLinks, showSourceLinksField],
    )
    const previewAttachmentsForGuide = showAttachmentsField
        ? [...attachments, ...sourceLinkPreviewAttachments]
        : []
    const currentLayerGuide = SUBMISSION_LAYER_GUIDES[previewLayer] || SUBMISSION_LAYER_GUIDES[5]
    const currentLayerOption = SUBMISSION_LAYER_OPTIONS.find((x) => x.layer === previewLayer) || SUBMISSION_LAYER_OPTIONS[0]

    const inputStyle = {
        padding: '12px 15px',
        borderRadius: 14,
        border: `1px solid ${isDark ? `${accent}28` : 'rgba(15,23,42,0.12)'}`,
        background: isDark ? 'rgba(2,6,23,0.72)' : 'rgba(255,255,255,0.88)',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontSize: 13,
        outline: 'none',
        width: '100%',
        fontFamily: 'Inter, sans-serif',
        boxShadow: isDark ? `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 ${accent}` : 'inset 0 1px 0 rgba(255,255,255,0.9)',
        backdropFilter: 'blur(14px)',
        transition: 'border-color 0.25s, box-shadow 0.25s',
    }

    const errorColor = '#f87171'

    const resetForm = () => {
        setSubmitted(false)
        setAttachments([])
        setAttachErr('')
        setGraphUrlDraft('')
        setAttachmentCountSubmitted(0)
        setSubmittedCoords({ x: '', y: '' })
        setPreviewLayer(5)
        setShowRichPreview(false)
        setForm(emptyForm())
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete('archiveLayer')
                next.delete('nextSegmentSlot')
                next.delete('updatesEntryId')
                return next
            },
            { replace: true },
        )
    }

    const readinessItems = [
        { key: 'hub',    label: 'Research hub selected',   done: !!form.planet,                                                                              required: true  },
        { key: 'coord',  label: 'Coordinate ready',        done: isDeepenMode ? !!(form.coordX && form.coordY) : selectedCoordinateIsValid,                    required: true  },
        { key: 'title',  label: 'Entry title set',         done: form.subject.trim().length > 0,                                                             required: true  },
        { key: 'sum',    label: 'Summary completeness',    done: !showSummaryField  || (form.summary.trim().length >= 50 && form.summary.length <= 400),     required: showSummaryField  },
        { key: 'detail', label: 'Technical detail filled', done: !showDetailField   || (form.detail.trim().length  >= 100 && form.detail.length  <= 2500),   required: showDetailField   },
        { key: 'cite',   label: 'Citation detected',       done: !showSourceLinksField || parseSourceLinks(form.sourceLinks).filter(s => /^https?:\/\//i.test(s.url)).length > 0, required: false },
        { key: 'tags',   label: 'Tag coverage',            done: !showTagsField || form.tags.trim().length > 0,                                              required: false },
    ]
    const requiredDone  = readinessItems.filter(r => r.required && r.done).length
    const requiredTotal = readinessItems.filter(r => r.required).length
    const isFormReady   = requiredDone === requiredTotal
    const readinessScore = readinessItems.filter(r => r.done).length

    if (submitted) {
        const wasSegmentReport = searchParams.get('intent') === 'segmentReport'
        return (
            <div className="solar-page solar-page--center sa-submit-page">
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
                    <h2 className="font-solar text-2xl font-black mb-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {wasSegmentReport ? 'Report Sent' : 'Entry Submitted!'}
                    </h2>
                    <p className="mb-2" style={{ color: isDark ? '#64748b' : '#64748b', fontSize: 14 }}>
                        {wasSegmentReport ? (
                            <>
                                Your segment report for <strong style={{ color: selectedPlanet?.color }}>{selectedPlanet?.label}</strong> at ({submittedCoords.x}, {submittedCoords.y}) was saved locally for the moderation queue demo.
                            </>
                        ) : isDeepenMode ? (
                            <>
                                Your L{previewLayer} addition to <strong style={{ color: selectedPlanet?.color }}>{form.subject}</strong> has been received.
                            </>
                        ) : (
                            <>
                                Your archive entry for <strong style={{ color: selectedPlanet?.color }}>{selectedPlanet?.label}</strong> has been received.
                            </>
                        )}
                    </p>
                    <p className="text-sm mb-6" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                        {wasSegmentReport
                            ? 'Reports are stored in this browser (solarArchiveSegmentReports). Attachments, if any, are included in the report record.'
                            : isDeepenMode
                                ? `It enters the review queue until three independent reviewers pass fact-check and difficulty grading; only then does it merge into the existing entry at (${submittedCoords.x}, ${submittedCoords.y}).`
                                : `It enters the review queue until three independent reviewers pass fact-check and difficulty grading; only then it appears on the coordinate grid at (${submittedCoords.x}, ${submittedCoords.y}).${
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
        <div className="solar-page sa-submit-page">

            {/* ── Coordinate Entry Ignition Background ── */}
            <div className="sa-bg" aria-hidden="true">
                <div className="sa-bg__grid" />
                <div className="sa-bg__stars" />
                <div className="sa-bg__node-area">
                    <div className="sa-bg__pulse sa-bg__pulse--a" />
                    <div className="sa-bg__pulse sa-bg__pulse--b" />
                    <div className="sa-bg__pulse sa-bg__pulse--c" />
                    <div className="sa-bg__node-dot" />
                    <svg className="sa-bg__conn-svg" viewBox="0 0 600 400" fill="none" aria-hidden="true">
                        <line x1="300" y1="200" x2="108" y2="82"  className="sa-bg__conn-line" style={{ animationDelay: '0s' }} />
                        <line x1="300" y1="200" x2="478" y2="105" className="sa-bg__conn-line" style={{ animationDelay: '0.5s' }} />
                        <line x1="300" y1="200" x2="158" y2="318" className="sa-bg__conn-line" style={{ animationDelay: '0.9s' }} />
                        <line x1="300" y1="200" x2="502" y2="308" className="sa-bg__conn-line" style={{ animationDelay: '1.3s' }} />
                        <circle cx="108" cy="82"  r="3"   className="sa-bg__conn-node" style={{ animationDelay: '0.3s' }} />
                        <circle cx="478" cy="105" r="2.5" className="sa-bg__conn-node" style={{ animationDelay: '0.8s' }} />
                        <circle cx="158" cy="318" r="2"   className="sa-bg__conn-node" style={{ animationDelay: '1.2s' }} />
                        <circle cx="502" cy="308" r="3"   className="sa-bg__conn-node" style={{ animationDelay: '1.6s' }} />
                    </svg>
                </div>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="sa-bg__fragment" style={{
                        '--fx': `${(i % 2 === 0 ? -1 : 1) * (28 + i * 4)}px`,
                        '--fy': `${(i % 3 === 0 ? -1 : 1) * (18 + i * 3)}px`,
                        left:  `${10 + i * 13}%`,
                        top:   `${25 + ((i * 19) % 55)}%`,
                        animationDuration: `${5 + i * 1.1}s`,
                        animationDelay:    `${-i * 0.9}s`,
                    }} />
                ))}
                <div className="sa-bg__vignette" />
            </div>

            {/* Planet accent glow */}
            {isDark && accent && (
                <div className="pointer-events-none fixed inset-0" aria-hidden
                    style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${accent}10 0%, transparent 65%)`, zIndex: 0 }} />
            )}

            <div className="solar-page__inner solar-page__inner--lg" style={{ position: 'relative', zIndex: 1 }}>

                {/* ── HERO ── */}
                <motion.div className="sa-hero"
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Title */}
                    <motion.h1 className="sa-hero__title"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                    >
                        {isSegmentReport ? (
                            <span style={{ color: '#fca5a5' }}>Report a Segment</span>
                        ) : (
                            <>Submit Knowledge<br /><span className="sa-hero__title--accent">to the Archive</span></>
                        )}
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p className="sa-hero__sub"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                        style={{ color: isDark ? '#64748b' : '#64748b' }}
                    >
                        {isSegmentReport
                            ? 'Flag inaccurate, offensive, or misplaced archive text on layers 6–8. Your context block is pre-filled; add specifics below.'
                            : 'Add research entries, citations, technical details, and evidence into the coordinate grid for community review.'}
                    </motion.p>

                    {!isSegmentReport && (
                        <motion.div className="sa-hero__ctas"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                        >
                            <button type="button" onClick={() => setGuidelinesOpen(true)} className="sa-btn-secondary">
                                <Info size={14} />
                                View Review Rules
                            </button>
                        </motion.div>
                    )}
                </motion.div>

                {/* ── BANNERS ── */}
                {isSegmentReport && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                        className="mb-6 rounded-2xl text-sm flex gap-3 items-start overflow-hidden"
                        style={{ border: '1px solid rgba(248,113,113,0.35)', background: isDark ? 'rgba(127,29,29,0.18)' : 'rgba(254,226,226,0.9)', color: isDark ? '#fecaca' : '#7f1d1d' }}
                    >
                        <div className="shrink-0 w-1 self-stretch rounded-l-2xl" style={{ background: 'linear-gradient(180deg, #f87171, #fb923c)' }} />
                        <div className="py-4 pr-4 flex gap-3 items-start">
                            <Flag size={17} className="shrink-0 mt-0.5" aria-hidden />
                            <div>
                                <p className="font-black text-[11px] uppercase tracking-widest mb-1" style={{ color: isDark ? '#fca5a5' : '#991b1b' }}>Segment moderation report</p>
                                <p className="text-xs leading-relaxed">This submission is saved as a <strong>report</strong> (not a new grid entry). Keep the gray &quot;System context&quot; block in the detail field so reviewers know which tile you mean.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showL56GateBanner && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        className="mb-6 rounded-2xl text-sm flex items-start overflow-hidden"
                        style={{ border: '1px solid rgba(251,191,36,0.38)', background: isDark ? 'rgba(120,53,15,0.3)' : 'rgba(254,243,199,0.9)', color: isDark ? '#fde68a' : '#854d0e' }}
                    >
                        <div className="shrink-0 w-1 self-stretch rounded-l-2xl" style={{ background: 'linear-gradient(180deg, #fbbf24, #f97316)' }} />
                        <div className="py-4 pr-4 pl-3 flex gap-3 items-start">
                            <AlertCircle size={17} className="shrink-0 mt-0.5" aria-hidden />
                            <div>
                                <p className="font-black text-[11px] uppercase tracking-widest mb-1">Layer 7 / 8 locked — add L5 &amp; L6 first</p>
                                <p className="text-xs leading-relaxed">{L56_NARRATIVE_GATE_MESSAGE}</p>
                                <button type="button" className="mt-2 text-xs font-bold underline opacity-80 hover:opacity-100" onClick={() => handlePreviewLayerChange(5)}>
                                    Switch preview to Layer 5 (summary)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showL7GateBanner && !showL56GateBanner && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        className="mb-6 rounded-2xl text-sm flex items-start overflow-hidden"
                        style={{ border: '1px solid rgba(251,191,36,0.38)', background: isDark ? 'rgba(120,53,15,0.3)' : 'rgba(254,243,199,0.9)', color: isDark ? '#fde68a' : '#854d0e' }}
                    >
                        <div className="shrink-0 w-1 self-stretch rounded-l-2xl" style={{ background: 'linear-gradient(180deg, #fbbf24, #f97316)' }} />
                        <div className="py-4 pr-4 pl-3 flex gap-3 items-start">
                            <AlertCircle size={17} className="shrink-0 mt-0.5" aria-hidden />
                            <div>
                                <p className="font-black text-[11px] uppercase tracking-widest mb-1">Layer 8 locked — complete Layer 7 narrative band</p>
                                <p className="text-xs leading-relaxed">Finish all {L7_NARRATIVE_SEGMENT_COUNT} narrative tiles on Layer 7 at this coordinate before adding harder sentences on Layer 8.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showSegmentSlotHint && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        className="mb-6 rounded-2xl text-sm flex items-start overflow-hidden"
                        style={{ border: `1px solid ${accent}38`, background: isDark ? `${accent}10` : `${accent}09`, color: isDark ? '#f8fafc' : '#0f172a' }}
                    >
                        <div className="shrink-0 w-1 self-stretch rounded-l-2xl" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}88)` }} />
                        <div className="py-4 pr-4 pl-3 flex gap-3 items-start">
                            <PenLine size={17} className="shrink-0 mt-0.5" style={{ color: accent }} aria-hidden />
                            <div>
                                <p className="font-black text-[11px] uppercase tracking-widest mb-1" style={{ color: accent }}>Layer {archiveLayerHint} · narrative segment {nextSegmentSlotHint}</p>
                                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                                    Your detail field must split into sentences (20–250 characters each). After grading, sentences land on archive tiles in easiest-to-hardest order — slot <strong>{nextSegmentSlotHint}</strong> is the next empty narrative tile for this coordinate.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {!isLoggedIn && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="mb-6 p-4 rounded-2xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden"
                        style={{ background: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.3)', color: isDark ? '#f8fafc' : '#0f172a' }}
                    >
                        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ background: 'rgba(124,58,237,0.25)' }} aria-hidden />
                        <div className="flex items-center gap-2.5 relative">
                            <Zap size={15} style={{ color: '#a78bfa', flexShrink: 0 }} />
                            <span>Sign in to attribute your submission — without an account it will be submitted as <em>guest</em>.</span>
                        </div>
                        <Link to="/join" className="relative font-bold shrink-0 px-5 py-2.5 rounded-xl text-center text-white text-sm"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                            Join / Login
                        </Link>
                    </motion.div>
                )}

                {isLoggedIn && <AuthorSubmissionOverview username={username} isDark={isDark} accent={selectedPlanet?.color} />}

                {/* ── COCKPIT GRID ── */}
                <div id="sa-form-anchor" className="sa-cockpit">

                    <motion.form
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        onSubmit={handleSubmit}
                        className="sa-cockpit__col"
                    >
                        {/* ═══════════════════════════════════════
                            SECTION 01 — ENTRY DETAILS
                        ═══════════════════════════════════════ */}
                        <motion.div className="sa-panel"
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.08 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                borderColor: form.planet ? `${accent}30` : undefined,
                                boxShadow:   form.planet ? `0 20px 60px rgba(0,0,0,0.35), 0 0 55px ${accent}10` : undefined,
                            }}
                        >
                            <div className="sa-panel__header">
                                <div className="sa-panel__num" style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}>01</div>
                                <div>
                                    <div className="sa-panel__label">Entry Details</div>
                                    <div className="sa-panel__desc">Research hub, title, and taxonomy</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-5">
                                {errors.login && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs p-3 rounded-xl"
                                        style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.35)' }}>
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{errors.login}</span>
                                        <Link to="/join" className="font-bold underline" style={{ color: '#f87171' }}>Open Join / Login</Link>
                                    </div>
                                )}
                                <Field label="Planet / Research Domain" required>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {PLANETS.map((p, i) => {
                                            const active = form.planet === p.id
                                            return (
                                                <motion.button key={p.id} type="button"
                                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                                                    onClick={() => setPlanet(p.id)}
                                                    className="relative text-left rounded-2xl p-3 border transition-all overflow-hidden"
                                                    style={{
                                                        borderColor: active ? `${p.color}88` : isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)',
                                                        background:   active ? isDark ? `linear-gradient(135deg, rgba(5,12,28,0.9), ${p.color}20)` : `linear-gradient(135deg, rgba(255,255,255,0.95), ${p.color}14)` : isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.8)',
                                                        boxShadow:    active ? `0 0 28px ${p.color}28, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                                                    }}
                                                >
                                                    {active && <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse at top right, ${p.color}14, transparent 65%)` }} aria-hidden />}
                                                    <div className="flex items-center gap-2.5 relative">
                                                        <motion.div
                                                            animate={active ? { scale: [1, 1.15, 1], boxShadow: [`0 0 10px ${p.color}88`, `0 0 20px ${p.color}`, `0 0 10px ${p.color}88`] } : {}}
                                                            transition={{ duration: 1.8, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
                                                            className="h-7 w-7 rounded-full shrink-0"
                                                            style={{ background: `radial-gradient(circle at 35% 32%, ${p.color}ff, ${p.color}77)`, boxShadow: active ? `0 0 14px ${p.color}aa` : `0 0 7px ${p.color}55` }}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-black leading-tight" style={{ color: active ? p.color : isDark ? '#f8fafc' : '#0f172a' }}>{p.label}</div>
                                                            <div className="text-[9px] mt-0.5 truncate" style={{ color: isDark ? '#475569' : '#64748b' }}>{p.domain}</div>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            )
                                        })}
                                    </div>
                                    {errors.planet && <p className="text-xs" style={{ color: errorColor }}>{errors.planet}</p>}
                                </Field>

                                {showTopicSelectors && selectedTaxonomy && (
                                    <Field label="L2 Topic" required>
                                        <button type="button" onClick={() => setShowL2Topics((v) => !v)}
                                            className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all"
                                            style={{ borderColor: selectedDomain ? `${selectedDomain.color}55` : isDark ? 'rgba(79,195,247,0.16)' : 'rgba(15,23,42,0.1)', background: isDark ? 'rgba(15,23,42,0.48)' : 'rgba(255,255,255,0.78)', color: isDark ? '#f8fafc' : '#0f172a' }}
                                            aria-expanded={showL2Topics}
                                        >
                                            <span>
                                                <span className="block text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: selectedDomain?.color || selectedPlanet?.color || '#4fc3f7' }}>
                                                    {showL2Topics ? 'Hide L2 topics' : 'Show L2 topics'}
                                                </span>
                                                <span className="block text-sm font-bold mt-0.5">{selectedDomain?.label || 'Choose a topic group'}</span>
                                            </span>
                                            <ChevronDown size={16} className={`shrink-0 transition-transform ${showL2Topics ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showL2Topics && (
                                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {selectedTaxonomy.domains.map((domain) => {
                                                    const active = form.domainId === domain.id
                                                    return (
                                                        <button key={domain.id} type="button"
                                                            onClick={() => { setDomain(domain.id); setShowL2Topics(false); setShowL3Topics(true); }}
                                                            className="text-left rounded-2xl px-4 py-3 border transition-all"
                                                            style={{ borderColor: active ? `${domain.color}88` : isDark ? 'rgba(79,195,247,0.14)' : 'rgba(15,23,42,0.1)', background: active ? `${domain.color}18` : isDark ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.92)', boxShadow: active ? `0 0 24px ${domain.color}22` : 'none' }}
                                                        >
                                                            <span className="block text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: domain.color }}>L2 topic</span>
                                                            <span className="block text-sm font-extrabold mt-1" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{domain.label}</span>
                                                        </button>
                                                    )
                                                })}
                                            </motion.div>
                                        )}
                                        {errors.domainId && <p className="text-xs" style={{ color: errorColor }}>{errors.domainId}</p>}
                                    </Field>
                                )}

                                {showTopicSelectors && selectedTaxonomy && form.domainId && (
                                    <Field label="L3 Subtopic" required>
                                        <button type="button" onClick={() => setShowL3Topics((v) => !v)}
                                            className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all"
                                            style={{ borderColor: form.topicKey ? `${selectedDomain?.color || selectedPlanet?.color || '#4fc3f7'}55` : isDark ? 'rgba(79,195,247,0.16)' : 'rgba(15,23,42,0.1)', background: isDark ? 'rgba(15,23,42,0.48)' : 'rgba(255,255,255,0.78)', color: isDark ? '#f8fafc' : '#0f172a' }}
                                            aria-expanded={showL3Topics}
                                        >
                                            <span>
                                                <span className="block text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: selectedDomain?.color || selectedPlanet?.color || '#4fc3f7' }}>
                                                    {showL3Topics ? 'Hide L3 subtopics' : 'Show L3 subtopics'}
                                                </span>
                                                <span className="block text-sm font-bold mt-0.5">{selectedL3Topic?.title || 'Choose a subtopic'}</span>
                                            </span>
                                            <ChevronDown size={16} className={`shrink-0 transition-transform ${showL3Topics ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showL3Topics && (
                                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {availableL3Topics.map((topic) => {
                                                    const active = form.topicKey === topic.key
                                                    const color  = selectedDomain?.color || selectedPlanet?.color || '#4fc3f7'
                                                    return (
                                                        <button key={topic.key} type="button"
                                                            onClick={() => { setL3Topic(topic); setShowL3Topics(false); }}
                                                            className="text-left rounded-2xl px-4 py-3 border transition-all"
                                                            style={{ borderColor: active ? `${color}88` : isDark ? 'rgba(79,195,247,0.14)' : 'rgba(15,23,42,0.1)', background: active ? `${color}18` : isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.92)' }}
                                                        >
                                                            <span className="block text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>L3 subtopic</span>
                                                            <span className="block text-sm font-bold mt-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{topic.title}</span>
                                                            <span className="block text-[10px] font-semibold mt-2 opacity-70" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{topic.subfieldLabel}</span>
                                                        </button>
                                                    )
                                                })}
                                            </motion.div>
                                        )}
                                        {errors.subfieldId && <p className="text-xs" style={{ color: errorColor }}>{errors.subfieldId}</p>}
                                    </Field>
                                )}

                                <Field label="Subject Title" required>
                                    <input type="text" placeholder="e.g. Solar Panel Efficiency Optimization"
                                        value={form.subject} onChange={e => set('subject', e.target.value)}
                                        style={inputStyle} maxLength={80} />
                                    {errors.subject && <p className="text-xs" style={{ color: errorColor }}>{errors.subject}</p>}
                                </Field>

                                {showTagsField && (
                                    <Field label={`Tags (optional, up to ${MAX_TAGS_PER_SUBMISSION})`}>
                                        <input type="text" placeholder="e.g. fusion, materials-science, citation-needed"
                                            value={form.tags} onChange={e => set('tags', e.target.value)} style={inputStyle} />
                                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            Comma or hashtag separated. Normalized for search — reuse tags to cross-link subjects across hubs.
                                        </p>
                                        {errors.tags && <p className="text-xs" style={{ color: errorColor }}>{errors.tags}</p>}
                                    </Field>
                                )}
                            </div>
                        </motion.div>

                        {/* ═══════════════════════════════════════
                            SECTION 02 — COORDINATE PLACEMENT
                        ═══════════════════════════════════════ */}
                        <motion.div className="sa-panel"
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.08 }}
                            transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                borderColor: selectedCoordinateIsValid ? 'rgba(52,211,153,0.22)' : form.coordX ? 'rgba(248,113,113,0.18)' : undefined,
                            }}
                        >
                            <div className="sa-panel__header">
                                <div className="sa-panel__num" style={{ color: '#22d3ee', borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.1)' }}>02</div>
                                <div>
                                    <div className="sa-panel__label">Coordinate Placement</div>
                                    <div className="sa-panel__desc">Adjacent slot in the archive grid</div>
                                </div>
                                {selectedCoordinateIsValid && (
                                    <CheckCircle size={15} style={{ color: '#34d399', marginLeft: 'auto' }} />
                                )}
                            </div>
                            <div className="flex flex-col gap-5">
                                {form.coordX && form.coordY && (
                                    <div className="sa-coord-status" style={{
                                        borderColor: selectedCoordinateIsValid ? 'rgba(52,211,153,0.38)' : 'rgba(248,113,113,0.38)',
                                        background:  selectedCoordinateIsValid ? 'rgba(52,211,153,0.07)' : 'rgba(248,113,113,0.07)',
                                        color:       selectedCoordinateIsValid ? '#34d399' : '#f87171',
                                    }}>
                                        <div className="sa-coord-status__dot" style={{ background: selectedCoordinateIsValid ? '#34d399' : '#f87171', boxShadow: `0 0 7px ${selectedCoordinateIsValid ? '#34d399' : '#f87171'}` }} />
                                        <span className="sa-coord-status__label">
                                            {selectedCoordinateIsValid ? 'Coordinate ready' : 'Adjacent slot required'}
                                        </span>
                                        <span className="sa-coord-status__value">
                                            X{formatDisplayCoord(form.coordX)} · Y{formatDisplayCoord(form.coordY)}
                                        </span>
                                    </div>
                                )}

                                <Field label="Available grid slot" required>
                                    <div className="relative">
                                        <select
                                            value={selectedSlotValue}
                                            disabled={!isSegmentReport && selectedTaxonomy && !form.topicKey}
                                            onChange={e => { const [x, y] = e.target.value.split(':'); set('coordX', x); set('coordY', y) }}
                                            style={{ ...inputStyle, appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
                                        >
                                            <option value=":">Select a valid adjacent coordinate...</option>
                                            {availableSlots.length > 0 ? availableSlots.map(slot => (
                                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                                            )) : (
                                                <option value=":" disabled>
                                                    {form.planet && (!selectedTaxonomy || !form.domainId || !form.topicKey)
                                                        ? 'Select L2 topic and L3 subtopic first'
                                                        : 'No valid adjacent coordinates available'}
                                                </option>
                                            )}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: isDark ? '#64748b' : '#64748b' }} />
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                        Only coordinates adjacent to filled archive cells are listed for L4–L8 submissions.
                                    </p>
                                    {(errors.coordX || errors.coordY) && <p className="text-xs" style={{ color: errorColor }}>{errors.coordX || errors.coordY}</p>}
                                </Field>

                                {!showSummaryField && previewLayer === 6 && l5ExistsAtTarget && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                                        style={{ background: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.28)', color: isDark ? '#34d399' : '#047857' }}>
                                        <CheckCircle size={13} />
                                        L5 summary already exists at this coordinate — you can submit L6 detail independently.
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* ═══════════════════════════════════════
                            SECTION 03 — KNOWLEDGE CONTENT
                        ═══════════════════════════════════════ */}
                        <motion.div className="sa-panel"
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.08 }}
                            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="sa-panel__header">
                                <div className="sa-panel__num" style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.35)', background: 'rgba(167,139,250,0.1)' }}>03</div>
                                <div>
                                    <div className="sa-panel__label">Knowledge Content</div>
                                    <div className="sa-panel__desc">Summary, technical detail, and target layer</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-5">
                                {showSummaryField && (
                                    <Field label="Short Summary" required>
                                        <textarea rows={3} placeholder="A concise overview of the research entry (50-400 characters)..."
                                            value={form.summary} maxLength={400}
                                            onChange={e => set('summary', e.target.value)}
                                            style={{ ...inputStyle, resize: 'vertical' }} />
                                        <div className="flex justify-between">
                                            {errors.summary ? <p className="text-xs" style={{ color: errorColor }}>{errors.summary}</p> : <span />}
                                            <span className="text-xs" style={{ color: form.summary.length < 50 || form.summary.length > 400 ? errorColor : '#34d399' }}>
                                                {form.summary.length}/400
                                            </span>
                                        </div>
                                    </Field>
                                )}

                                {showDetailField && (
                                    <Field label="Technical Deep Detail" required>
                                        <textarea rows={6} placeholder="In-depth technical analysis. Enter discrete sentences to be parsed as grid segments (20-250 characters each)..."
                                            value={form.detail} maxLength={2500}
                                            onChange={e => set('detail', e.target.value)}
                                            style={{ ...inputStyle, resize: 'vertical' }} />
                                        <div className="flex justify-between">
                                            {errors.detail ? <p className="text-xs" style={{ color: errorColor }}>{errors.detail}</p> : <span />}
                                            <span className="text-xs" style={{ color: form.detail.length < 100 || form.detail.length > 2500 ? errorColor : '#34d399' }}>
                                                {form.detail.length}/2500
                                            </span>
                                        </div>
                                    </Field>
                                )}

                                {!isSegmentReport && (
                                    <Field label="Target layer" required={false}>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {[4, 5, 6, 7, 8].map((lyr) => {
                                                const isActive = previewLayer === lyr
                                                const isGated  = ((lyr === 7 || lyr === 8) && l56GateBlocksNarrative) || (lyr === 8 && l7GateBlocksL8)
                                                return (
                                                    <button key={lyr} type="button"
                                                        onClick={() => handlePreviewLayerChange(lyr)}
                                                        className="relative rounded-xl py-2.5 text-center transition-all"
                                                        style={{
                                                            background:  isActive ? `${accent}20` : isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.95)',
                                                            border:      `1.5px solid ${isActive ? `${accent}66` : isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)'}`,
                                                            boxShadow:   isActive ? `0 0 14px ${accent}28` : 'none',
                                                        }}
                                                    >
                                                        {isGated && <span className="absolute top-1 right-1.5" aria-hidden><Lock size={7} style={{ color: isDark ? '#64748b' : '#64748b' }} /></span>}
                                                        <span className="block text-[13px] font-black" style={{ color: isActive ? accent : isDark ? '#94a3b8' : '#64748b' }}>L{lyr}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <p className="text-xs mt-1.5" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            Drives the live preview and <code className="text-[10px]">archiveLayer</code> reviewer hint. L7/L8 require L5+L6 content at the target coordinate.
                                        </p>
                                        <motion.button type="button" onClick={() => setGuidelinesOpen(true)}
                                            whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.985 }}
                                            className="group relative mt-3 flex w-full items-center justify-between overflow-hidden rounded-2xl px-4 py-3 text-left transition-all"
                                            style={{ color: isDark ? '#f8fafc' : '#0f172a', background: isDark ? `linear-gradient(135deg, rgba(15,23,42,0.9), ${accent}1f 52%, rgba(2,6,23,0.92))` : `linear-gradient(135deg, rgba(255,255,255,0.98), ${accent}16 58%, rgba(248,250,252,0.98))`, border: `1px solid ${accent}44`, boxShadow: `0 18px 44px ${accent}16, inset 0 1px 0 rgba(255,255,255,0.16)` }}
                                            aria-label={`Open Layer ${previewLayer} details`}
                                        >
                                            <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125" style={{ background: `${accent}30` }} aria-hidden />
                                            <span className="absolute inset-x-6 top-0 h-px opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${accent}aa, transparent)` }} aria-hidden />
                                            <span className="relative flex min-w-0 items-center gap-3">
                                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border shadow-inner transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}18` }}>
                                                    <Info size={18} />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>L{previewLayer} details</span>
                                                    <span className="mt-0.5 block text-sm font-black">Rules, format &amp; writing tips</span>
                                                    <span className="mt-1 block text-[10px] font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Click to open the full layer-specific guidance.</span>
                                                </span>
                                            </span>
                                            <span className="relative shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-300 group-hover:translate-x-0.5" style={{ color: accent, background: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.78)', border: `1px solid ${accent}35` }}>
                                                Open details
                                            </span>
                                        </motion.button>
                                        {(previewLayer === 7 || previewLayer === 8) && l56GateBlocksNarrative && (
                                            <p className="text-xs mt-2 rounded-lg px-2 py-1.5" style={{ color: isDark ? '#fde68a' : '#854d0e', background: isDark ? 'rgba(120,53,15,0.35)' : 'rgba(254,243,199,0.95)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(180,83,9,0.25)'}` }}>
                                                {L56_NARRATIVE_GATE_MESSAGE}
                                            </p>
                                        )}
                                        {previewLayer === 8 && !l56GateBlocksNarrative && l7GateBlocksL8 && (
                                            <p className="text-xs mt-2 rounded-lg px-2 py-1.5" style={{ color: isDark ? '#fde68a' : '#854d0e', background: isDark ? 'rgba(120,53,15,0.35)' : 'rgba(254,243,199,0.95)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(180,83,9,0.25)'}` }}>
                                                Layer 8 is locked until this coordinate has <strong>{L7_NARRATIVE_SEGMENT_COUNT} narrative sentences</strong> counted toward Layer&nbsp;7.
                                            </p>
                                        )}
                                        {errors.previewLayer && <p className="text-xs mt-2" style={{ color: errorColor }}>{errors.previewLayer}</p>}
                                    </Field>
                                )}

                                {showDifficultyField && (
                                    <Field label={`Difficulty Level: ${form.difficulty}/5`}>
                                        <input type="range" min={1} max={5} step={1}
                                            value={form.difficulty} onChange={e => set('difficulty', parseInt(e.target.value, 10))}
                                            className="w-full" style={{ accentColor: isDark ? '#4fc3f7' : '#0284c7' }} />
                                        <div className="flex justify-between text-xs" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            <span>1 — Beginner</span><span>3 — Intermediate</span><span>5 — Expert</span>
                                        </div>
                                        <div className="flex gap-0.5 mt-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <span key={i} style={{ fontSize: 18, color: i <= form.difficulty ? '#f5a623' : 'rgba(245,166,35,0.15)', transition: 'color 0.1s' }}>★</span>
                                            ))}
                                        </div>
                                    </Field>
                                )}
                            </div>
                        </motion.div>

                        {/* ═══════════════════════════════════════
                            SECTION 04 — EVIDENCE & CITATIONS
                        ═══════════════════════════════════════ */}
                        <motion.div className="sa-panel"
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.08 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="sa-panel__header">
                                <div className="sa-panel__num" style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.1)' }}>04</div>
                                <div>
                                    <div className="sa-panel__label">Evidence &amp; Citations</div>
                                    <div className="sa-panel__desc">Source-backed knowledge only</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-5">
                                {showAlternatePerspectivesField && (
                                    <Field label="Alternate perspective links (optional)">
                                        <textarea rows={3}
                                            placeholder={'One per line: hubId | Label shown in the map\ne.g. mars | Engineering view of the same topic'}
                                            value={form.alternatePerspectives}
                                            onChange={e => set('alternatePerspectives', e.target.value)}
                                            style={{ ...inputStyle, resize: 'vertical' }} />
                                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            Appears in L5/L6 as "same subject, other scientific view" links. Use planet ids such as earth, mars, venus, jupiter, saturn, neptune.
                                        </p>
                                        {errors.alternatePerspectives && <p className="text-xs" style={{ color: errorColor }}>{errors.alternatePerspectives}</p>}
                                    </Field>
                                )}

                                {showSourceLinksField && (
                                    <Field label="Citation / source links (optional)">
                                        <textarea rows={4}
                                            placeholder={'One per line: Label | https://source-url\ne.g. Field study dataset | https://example.org/dataset'}
                                            value={form.sourceLinks}
                                            onChange={e => set('sourceLinks', e.target.value)}
                                            style={{ ...inputStyle, resize: 'vertical' }} />
                                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            These feed L6 downloads, L7 cited-fact previews, and L8 cited facts/source slots. Up to {MAX_SOURCE_LINKS} links.
                                        </p>
                                        {errors.sourceLinks && <p className="text-xs" style={{ color: errorColor }}>{errors.sourceLinks}</p>}
                                    </Field>
                                )}

                                {showAttachmentsField && (
                                    <Field label="Images, sketches, and links (optional)">
                                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                            <select value={attachKind} onChange={(e) => setAttachKind(e.target.value)}
                                                style={{ ...inputStyle, maxWidth: 220, cursor: 'pointer' }}>
                                                {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            <label className="text-xs font-medium cursor-pointer px-4 py-2.5 rounded-xl border text-center"
                                                style={{ borderColor: isDark ? 'rgba(79,195,247,0.35)' : 'rgba(15,23,42,0.2)', color: isDark ? '#94a3b8' : '#475569' }}>
                                                <input type="file" multiple accept="image/*,.svg,image/svg+xml,application/pdf" className="hidden"
                                                    onChange={(e) => { appendFiles(e.target.files, attachKind); e.target.value = '' }} />
                                                Choose files…
                                            </label>
                                        </div>
                                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            Up to {MAX_ATTACHMENTS} files. Surfaces from L5 through L8 as the same entry deepens.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2 mt-3 items-stretch sm:items-center">
                                            <input type="url" placeholder="Or paste image / source URL (https://...)"
                                                value={graphUrlDraft} onChange={(e) => setGraphUrlDraft(e.target.value)} style={inputStyle} />
                                            <button type="button" onClick={addRemoteGraphUrl}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
                                                style={{ background: isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.1)', color: isDark ? '#4fc3f7' : '#0284c7', border: `1px solid ${isDark ? 'rgba(79,195,247,0.3)' : 'rgba(2,132,199,0.25)'}` }}>
                                                <Link2 size={16} /> Add URL
                                            </button>
                                        </div>
                                        {attachErr && <p className="text-xs mt-2" style={{ color: errorColor }}>{attachErr}</p>}
                                        {attachments.length > 0 && (
                                            <ul className="mt-3 space-y-2">
                                                {attachments.map((a) => (
                                                    <li key={a.id} className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg"
                                                        style={{ background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.95)', border: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.08)'}` }}>
                                                        <span className="truncate" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                                            <span className="font-bold uppercase mr-2 opacity-70">{a.kind}</span>{a.label}
                                                        </span>
                                                        <button type="button" aria-label="Remove" onClick={() => removeAttachment(a.id)}
                                                            className="shrink-0 p-1 rounded-md hover:opacity-80" style={{ color: errorColor }}>
                                                            <X size={16} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Field>
                                )}

                                {!isSegmentReport && (
                                    <div className="flex items-start gap-2 p-3 rounded-xl"
                                        style={{ background: isDark ? 'rgba(245,166,35,0.06)' : 'rgba(245,166,35,0.05)', border: `1px solid ${isDark ? 'rgba(245,166,35,0.18)' : 'rgba(245,166,35,0.22)'}` }}>
                                        <AlertCircle size={14} style={{ color: '#f5a623', flexShrink: 0, marginTop: 1 }} aria-hidden />
                                        <p className="text-xs leading-relaxed" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                                            All entries are reviewed for accuracy and relevance before being added to the archive. Entries with citations and real-world examples are prioritised. Coordinates are checked against the existing grid to avoid collisions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* ═══════════════════════════════════════
                            REVIEW READINESS
                        ═══════════════════════════════════════ */}
                        <motion.div className="sa-readiness-panel"
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.1 }}
                            transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="sa-readiness__header">
                                <ShieldCheck size={16} style={{ color: isFormReady ? '#34d399' : '#f5a623', flexShrink: 0 }} />
                                <span>Review Readiness</span>
                                <span className="sa-readiness__score">{readinessScore}/{readinessItems.length}</span>
                            </div>
                            <div className="sa-readiness__items">
                                {readinessItems.map(item => (
                                    <div key={item.key} className="sa-readiness__item">
                                        <div className="sa-readiness__item-left">
                                            <div className={`sa-readiness__dot${item.done ? ' sa-readiness__dot--done' : ''}`}
                                                style={{ background: item.done ? '#34d399' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)' }} />
                                            <span style={{ color: item.done ? isDark ? '#f1f5f9' : '#1e293b' : isDark ? '#64748b' : '#64748b' }}>
                                                {item.label}
                                            </span>
                                        </div>
                                        {item.required && !item.done && (
                                            <span className="text-[10px] font-semibold" style={{ color: '#f87171', opacity: 0.7 }}>required</span>
                                        )}
                                        {item.done && (
                                            <CheckCircle size={12} style={{ color: '#34d399', flexShrink: 0 }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="sa-readiness__bar-bg">
                                <div className="sa-readiness__bar-fill" style={{
                                    width:      `${(readinessScore / readinessItems.length) * 100}%`,
                                    background: isFormReady ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #f5a623, #fb923c)',
                                }} />
                            </div>
                            <p className="sa-readiness__status" style={{ color: isFormReady ? '#34d399' : isDark ? '#64748b' : '#64748b' }}>
                                {isFormReady ? 'Ready for community review' : `Complete ${requiredTotal - requiredDone} more required field${requiredTotal - requiredDone !== 1 ? 's' : ''} to submit`}
                            </p>
                        </motion.div>

                        {/* ── SUBMIT ── */}
                        <motion.button type="submit"
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="sa-submit-btn"
                            style={{
                                background:  isSegmentReport ? 'linear-gradient(135deg, #b91c1c, #f97316)' : isFormReady ? 'linear-gradient(135deg, #f5a623, #fb923c)' : `linear-gradient(135deg, #7c3aed, ${accent})`,
                                boxShadow:   isSegmentReport ? '0 0 28px rgba(185,28,28,0.3)' : isFormReady ? '0 0 40px rgba(245,166,35,0.45), 0 0 80px rgba(245,166,35,0.12)' : `0 0 28px ${accent}44`,
                            }}
                        >
                            {isSegmentReport ? <Flag size={17} /> : <Upload size={17} />}
                            {isSegmentReport ? 'Send segment report' : isFormReady ? 'Submit to the Archive' : 'Submit to the Archive'}
                            {isFormReady && !isSegmentReport && (
                                <motion.span
                                    className="pointer-events-none absolute inset-0 rounded-2xl"
                                    animate={{ boxShadow: ['0 0 0 0 rgba(245,166,35,0.6)', '0 0 0 18px rgba(245,166,35,0)'] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                                />
                            )}
                        </motion.button>
                    </motion.form>

                    <LayerGuidelinesOverlay
                        open={guidelinesOpen}
                        onClose={() => setGuidelinesOpen(false)}
                        guide={currentLayerGuide}
                        layerOption={currentLayerOption}
                        previewLayer={previewLayer}
                        accent={accent}
                        isDark={isDark}
                    />

                    <SubmissionLayerGuide
                        previewLayer={previewLayer}
                        onLayerChange={handlePreviewLayerChange}
                        showRichPreview={showRichPreview}
                        onRichToggle={setShowRichPreview}
                        form={form}
                        attachments={previewAttachmentsForGuide}
                        isDark={isDark}
                        accent={selectedPlanet?.color || (isDark ? '#4fc3f7' : '#0284c7')}
                        highlightSegmentSlot={highlightSegmentSlot}
                    />
                </div>
            </div>
        </div>
    )
}

