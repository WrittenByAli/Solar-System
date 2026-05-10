import React, { useMemo } from 'react'
import { Layers, BookOpen, Database, Image as ImageIcon, LayoutGrid } from 'lucide-react'
import SegmentHoverSurface from './SegmentHoverSurface.jsx'
import {
    buildSortedSegments,
    estimateSegmentDifficulty,
    normalizeSegmentsEasiestFirst,
    resolveSegmentDifficulty,
    segmentDifficultyValue,
    segmentText,
} from '../utils/segmentDifficulty.js'
import {
    CELL_PX,
    L7_SEGMENT_NAV_COLS,
    L7_SEGMENT_NAV_TOTAL,
    L8_FACT_SOURCE_SLOTS,
    L8_GRID_COLS,
    L8_NARRATIVE_TILE_TOTAL,
    L8_SEGMENT_COUNT,
    LAYER_LABELS,
} from '../utils/archiveLayerSpecs.js'

function pad4(n) {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    return sign + String(abs).padStart(4, '0')
}

const DEMO_ATTACHMENTS = [
    {
        kind: 'graph',
        label: 'Example diagram (legend + axes)',
        url: `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="160" viewBox="0 0 280 160">
  <rect fill="#1e293b" width="100%" height="100%" rx="8"/>
  <path d="M24 120 Q80 40 140 90 T260 50" fill="none" stroke="#38bdf8" stroke-width="3"/>
  <text x="140" y="24" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="system-ui">Example chart</text>
</svg>`,
        )}`,
        download: false,
    },
]

export const SUBMISSION_LAYER_OPTIONS = [5, 6, 7, 8].map((layer) => ({
    layer,
    short: `L${layer}`,
    title: LAYER_LABELS[layer]?.split('·')[1]?.trim() || `Layer ${layer}`,
    desc: `${CELL_PX[layer]}×${CELL_PX[layer]} px logical cell — ${LAYER_LABELS[layer] || ''}`,
}))

export const SUBMISSION_LAYER_GUIDES = {
    5: {
        headline: 'Write for the summary strip',
        tips: [
            'Lead with the concrete claim or finding in one or two sentences.',
            'Use 50–400 characters in the short summary field: enough to stand alone if someone never zooms deeper.',
            'Avoid jargon without a six-word gloss; peers skim hundreds of tiles.',
        ],
        writingBody: [
            'At L5 each archive cell behaves like a **256×256 px** card: subject line plus your short summary dominate the viewport. Readers decide whether to zoom to L6+ from this single glance.',
            'Keep the **subject** tight (navigation and search). Put numbers, caveats, and “what we measured” into the **summary** so the tile is truthful without opening detail.',
            'Deep detail you add below still exists for L6–L8 — the summary should tease it, not reproduce it.',
        ],
        figuresBody: [
            'One or two attachments are ideal at L5: they render as **compact thumbnails** under the text. Prefer SVG/PNG with readable axes; PDFs show as a download chip.',
            'Caption every figure in the summary (“Fig. 1 — …”) so the L5 tile stays self-explanatory when the image is tiny.',
            'Avoid watermark-heavy images; contrast should hold up at thumbnail scale.',
        ],
    },
    6: {
        headline: 'Overview plus ranked segments',
        tips: [
            'The same short summary anchors the top “Archive overview” panel.',
            'Below, each sentence appears once in difficulty order (easiest → hardest), each with a 1–5 comprehension badge.',
            'Match your detail sentences to what reviewers will grade — they feed L7/L8 directly.',
        ],
        writingBody: [
            'L6 is **1024×1024 px**: a fixed two-band layout — **storage/meta** plus **Archive overview** on top, then a **scrollable segment list** sorted by estimated comprehension difficulty.',
            'The **detail** field is split into sentences (`! ? .`). Each sentence becomes one segment row. Aim for parallel structure between sentences so reordering by difficulty still reads cleanly.',
            'The entry-level difficulty slider nudges how your sentences are scored when metadata is sparse; reviewers can override.',
        ],
        figuresBody: [
            'Figures appear **above** the segment list in the overview band. Use clear labels; reviewers open attachments while scanning segments.',
            'If a chart supports one sentence only, say so in that sentence (“see Fig. 2”) to keep segment tiles resolvable without scrolling.',
            'Up to six files, each under the size cap — large figures may be scaled in-browser with a notice on the archive.',
        ],
    },
    7: {
        headline: 'One sentence ≈ one segment tile',
        tips: [
            'Separate sentences with . ! or ? — each becomes its own segment block.',
            'Segments are ordered easiest-first across L7/L8; each tile shows a difficulty score.',
            'Every sentence must be 20–250 characters (validator enforced).',
        ],
        writingBody: [
            'L7 expands the same cell to **4096×4096 px**. The **narrative band** is a **fixed 8×4 grid of 30 tiles** (SEG navigation steps between these). Each filled tile is one ranked sentence.',
            'Tiles **31–32** are reserved hub-wide **grid fact indices** on the real archive (not filled from your submission text). Do not rely on those slots for your narrative.',
            'Write **complete thoughts per sentence**; D-pad readers may land on any tile. The preview mirrors tile order after difficulty sort.',
        ],
        figuresBody: [
            'Attachments render **above** the 30-tile narrative mesh. At L7 they have more room — still reference them explicitly in the matching sentence.',
            'Cited sources for deep claims should appear as linkable attachments or URLs so L8 “cited fact” automation has something to latch onto.',
        ],
    },
    8: {
        headline: 'Deep citations + narrative mesh',
        tips: [
            'First attachments seed “CITED FACT” tiles with a source link when possible.',
            'Remaining tiles cycle segment sentences (easiest first); the **last slot** of the 450-grid is the full stitched block.',
            'Use SI units, define acronyms once, and prefer indicative mood over vague qualifiers.',
        ],
        writingBody: [
            'L8 is **16384×16384 px** inside one cell. The segment index is a **30-column × 15-row grid (450 slots)** on the real archive.',
            `Slots **1–${L8_FACT_SOURCE_SLOTS}** are **cited-fact + source** pairs drawn from hub facts and your strongest references. Slots **${L8_FACT_SOURCE_SLOTS + 1}–${L8_SEGMENT_COUNT - 1}** are **narrative** (${L8_NARRATIVE_TILE_TOTAL} tiles) plus aggregation patterns. Slot **${L8_SEGMENT_COUNT}** is the **final stitched** full-depth block.`,
            'Sentence rules are unchanged (20–250 chars). The narrative band consumes sentences in difficulty order across hundreds of tiles — concise sentences age better than long rambles.',
        ],
        figuresBody: [
            'Every **https** attachment or data URL can surface as a **SOURCE** line under a cited-fact tile. Prefer stable URLs (DOI, institutional repos).',
            'Complex figures still attach normally; cite them in the first sentences so they map to early cited tiers when possible.',
            'If you have no attachments, cited tiers remain structural placeholders — reviewers may still pass text-only entries, but sourcing strengthens L8.',
        ],
    },
}

function renderBoldSegments(line) {
    const parts = String(line).split(/\*\*/)
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))
}

function PreviewAttachmentsRow({ list, col, isDark }) {
    const visual = (list || []).filter((a) => {
        const u = a?.url || a?.href || ''
        return typeof u === 'string' && (u.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u.split('?')[0]))
    })
    if (!visual.length) return null
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {visual.slice(0, 3).map((a, i) => (
                <div
                    key={i}
                    className="rounded-md overflow-hidden border shrink-0"
                    style={{ borderColor: `${col}55`, maxWidth: 120 }}
                >
                    <img src={a.url || a.href} alt="" className="block w-full h-14 object-cover" />
                    <div className="text-[9px] px-1 py-0.5 truncate" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        {a.label || `File ${i + 1}`}
                    </div>
                </div>
            ))}
        </div>
    )
}

function PreviewL5({ lx, ly, data, col, isDark, attachments }) {
    const px = CELL_PX[5]
    return (
        <div
            className="rounded-xl overflow-hidden border h-[220px] flex flex-col"
            style={{
                borderColor: `${col}44`,
                background: isDark ? 'rgba(6,4,14,0.95)' : '#fff',
                padding: 10,
            }}
        >
            <div className="text-[10px] font-mono font-extrabold mb-1.5 flex justify-between gap-2" style={{ color: col }}>
                <span>
                    {pad4(lx)},{pad4(ly)} · SUMMARY
                </span>
                <span className="opacity-80">{px}×{px}px</span>
            </div>
            <div className="text-[13px] font-extrabold leading-snug mb-1.5" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                {data.title || 'Subject title'}
            </div>
            <p className="text-[11px] leading-relaxed flex-1 overflow-hidden" style={{ color: isDark ? '#94a3b8' : '#334155' }}>
                {data.shortSummary || 'Short summary preview…'}
            </p>
            {attachments?.length > 0 && <PreviewAttachmentsRow list={attachments} col={col} isDark={isDark} />}
            {attachments?.length > 0 && (
                <div className="text-[9px] mt-1 font-semibold" style={{ color: col }}>
                    Files →
                </div>
            )}
        </div>
    )
}

function DifficultyPill({ difficulty, accent, isDark }) {
    if (difficulty == null) return null
    return (
        <span
            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
            style={{
                color: isDark ? '#fde68a' : '#b45309',
                background: isDark ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.22)',
                border: `1px solid ${accent}44`,
            }}
            title="Comprehension difficulty (1 = easiest)"
        >
            {difficulty}/5
        </span>
    )
}

function PreviewL6({ lx, ly, data, col, isDark, attachments, segments }) {
    const list = Array.isArray(segments) ? segments.slice(0, 6) : []
    const coordLabel = `${pad4(lx)},${pad4(ly)}`
    const px = CELL_PX[6]
    return (
        <div
            className="rounded-xl overflow-hidden border flex flex-col h-[300px]"
            style={{ borderColor: `${col}44`, background: isDark ? 'rgba(4,2,12,0.98)' : '#fff' }}
        >
            <div className="flex border-b shrink-0" style={{ borderColor: `${col}33` }}>
                <div className="w-[28%] p-2 border-r text-[9px] font-mono space-y-1" style={{ borderColor: `${col}33`, color: col }}>
                    <div className="opacity-80">STORAGE</div>
                    <div>X {pad4(lx)}</div>
                    <div>Y {pad4(ly)}</div>
                    <div className="opacity-70 pt-1">{px}px cell</div>
                </div>
                <div className="flex-1 p-2 min-w-0">
                    <div className="text-[10px] font-bold mb-1 tracking-wide" style={{ color: col }}>
                        ARCHIVE OVERVIEW
                    </div>
                    <div className="text-[11px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#94a3b8' : '#334155' }}>
                        {data.shortSummary || 'Overview text…'}
                    </div>
                    <PreviewAttachmentsRow list={attachments} col={col} isDark={isDark} />
                </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col px-2 pt-1.5 pb-2">
                <div className="text-[9px] font-black mb-1 shrink-0 flex justify-between" style={{ color: col }}>
                    <span>SEGMENTS · EASIEST → HARDEST</span>
                    <span className="opacity-80 font-mono">{segments?.length || 0} seg</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {list.length === 0 ? (
                        <SegmentHoverSurface
                            coordLabel={coordLabel}
                            difficulty={data.content?.trim() ? estimateSegmentDifficulty(data.content.slice(0, 800)) : null}
                            accentColor={col}
                            isDark={isDark}
                            style={{ cursor: 'default' }}
                        >
                            <div
                                className="text-[10px] leading-relaxed line-clamp-4"
                                style={{ color: isDark ? '#94a3b8' : '#1e293b' }}
                            >
                                {data.content?.trim() ? data.content.slice(0, 220) : 'Detail sentences appear here with difficulty…'}
                            </div>
                        </SegmentHoverSurface>
                    ) : (
                        list.map((seg, idx) => (
                            <SegmentHoverSurface
                                key={idx}
                                coordLabel={coordLabel}
                                difficulty={resolveSegmentDifficulty(seg)}
                                accentColor={col}
                                isDark={isDark}
                                className="rounded border px-1.5 py-1 cursor-default"
                                style={{ borderColor: `${col}33` }}
                            >
                                <div className="flex justify-between items-center gap-1 mb-0.5">
                                    <span className="text-[9px] font-black" style={{ color: col }}>
                                        #{idx + 1}
                                    </span>
                                    <DifficultyPill difficulty={segmentDifficultyValue(seg)} accent={col} isDark={isDark} />
                                </div>
                                <div className="text-[10px] leading-snug line-clamp-2" style={{ color: isDark ? '#64748b' : '#475569' }}>
                                    {segmentText(seg)}
                                </div>
                            </SegmentHoverSurface>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

/** Mini 8×4 L7 narrative grid (30 active tiles) — matches archive SEG stepping. */
function PreviewL7NarrativeGrid({ sortedSegments, col, isDark, highlightSlot }) {
    const filledCount = Math.min(L7_SEGMENT_NAV_TOTAL, sortedSegments?.length || 0)
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5 gap-2">
                <span className="text-[9px] font-black" style={{ color: col }}>
                    NARRATIVE GRID · {L7_SEGMENT_NAV_COLS} cols × 4 rows (30) + hub index
                </span>
                <span className="text-[9px] font-mono opacity-80" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    {filledCount}/{L7_SEGMENT_NAV_TOTAL} filled
                </span>
            </div>
            <div
                className="grid gap-1 rounded-lg p-2 border"
                style={{
                    borderColor: `${col}33`,
                    background: isDark ? 'rgba(3,2,10,0.9)' : '#f8fafc',
                    gridTemplateColumns: `repeat(${L7_SEGMENT_NAV_COLS}, minmax(0, 1fr))`,
                }}
            >
                {Array.from({ length: L7_SEGMENT_NAV_TOTAL }, (_, i) => {
                    const n = i + 1
                    const filled = i < filledCount
                    const seg = sortedSegments[i]
                    const isHi = highlightSlot != null && highlightSlot === n
                    const snippet = seg ? segmentText(seg).slice(0, 42) : ''
                    return (
                        <div
                            key={i}
                            title={filled ? snippet || `Sentence ${n}` : `Empty slot ${n}`}
                            className="rounded border min-h-[36px] flex flex-col justify-start p-0.5 transition-shadow"
                            style={{
                                borderColor: isHi ? col : `${col}22`,
                                boxShadow: isHi ? `0 0 0 2px ${col}` : 'none',
                                background: filled ? (isDark ? 'rgba(30,41,59,0.5)' : '#fff') : (isDark ? 'rgba(15,23,42,0.35)' : 'rgba(241,245,249,0.6)'),
                            }}
                        >
                            <span className="text-[8px] font-black leading-none mb-0.5" style={{ color: col }}>
                                {n}
                            </span>
                            {filled ? (
                                <span
                                    className="text-[7px] leading-tight line-clamp-3 break-words"
                                    style={{ color: isDark ? '#94a3b8' : '#475569' }}
                                >
                                    {snippet}
                                    {(seg && segmentText(seg).length > 42) ? '…' : ''}
                                </span>
                            ) : (
                                <span className="text-[7px] opacity-45" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                                    ·
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="flex gap-2 mt-2">
                <div
                    className="flex-1 rounded border px-2 py-1.5 text-[8px] font-bold text-center opacity-80"
                    style={{ borderColor: `${col}28`, color: col }}
                >
                    SEG 31 · hub fact index (part 1)
                </div>
                <div
                    className="flex-1 rounded border px-2 py-1.5 text-[8px] font-bold text-center opacity-80"
                    style={{ borderColor: `${col}28`, color: col }}
                >
                    SEG 32 · hub fact index (part 2)
                </div>
            </div>
        </div>
    )
}

/** L8: cited strip + narrative window into 30-col grid */
function PreviewL8Grid({ sortedSegments, col, isDark, highlightSlot, attachments }) {
    const citedDemoFilled = Math.min(
        L8_FACT_SOURCE_SLOTS,
        Math.max(attachments?.length || 0, sortedSegments?.length ? 2 : 0),
    )
    const narrFilled = Math.min(L8_NARRATIVE_TILE_TOTAL, sortedSegments?.length || 0)
    const windowCols = L8_GRID_COLS
    const windowRows = 3
    const windowCells = windowCols * windowRows
    const focus = highlightSlot != null ? Math.max(0, Math.min(L8_NARRATIVE_TILE_TOTAL - 1, highlightSlot - 1)) : 0
    let start = Math.max(0, focus - 5)
    if (start + windowCells > L8_NARRATIVE_TILE_TOTAL) start = Math.max(0, L8_NARRATIVE_TILE_TOTAL - windowCells)
    return (
        <div className="space-y-2">
            <div className="text-[9px] font-black flex flex-wrap justify-between gap-1" style={{ color: col }}>
                <span>CITED FACT TIER · {L8_FACT_SOURCE_SLOTS} tiles ({L8_GRID_COLS}×1)</span>
                <span className="font-mono opacity-80">L8 cell {CELL_PX[8]}×{CELL_PX[8]} px</span>
            </div>
            <div className="overflow-x-auto rounded-lg border p-1.5" style={{ borderColor: `${col}33`, background: isDark ? 'rgba(0,10,24,0.88)' : '#f1f5f9' }}>
                <div
                    className="grid gap-0.5"
                    style={{
                        gridTemplateColumns: `repeat(${L8_GRID_COLS}, minmax(14px, 18px))`,
                        minWidth: L8_GRID_COLS * 17,
                    }}
                >
                    {Array.from({ length: L8_FACT_SOURCE_SLOTS }, (_, i) => {
                        const filled = i < citedDemoFilled
                        return (
                            <div
                                key={`c-${i}`}
                                className="h-5 rounded border text-[7px] font-mono flex items-center justify-center"
                                style={{
                                    borderColor: `${col}30`,
                                    background: filled ? `${col}25` : (isDark ? 'rgba(15,23,42,0.4)' : '#fff'),
                                    color: col,
                                }}
                                title={`Cited slot ${i + 1}`}
                            >
                                {i + 1}
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="text-[9px] font-black" style={{ color: col }}>
                NARRATIVE BAND · {L8_NARRATIVE_TILE_TOTAL} tiles · window around next slot
            </div>
            <div
                className="grid gap-0.5 rounded-lg p-1.5 border"
                style={{
                    borderColor: `${col}33`,
                    gridTemplateColumns: `repeat(${windowCols}, minmax(0, 1fr))`,
                    background: isDark ? 'rgba(4,2,14,0.92)' : '#fff',
                }}
            >
                {Array.from({ length: windowCells }, (_, wi) => {
                    const absN = start + wi + 1
                    const filled = absN <= narrFilled
                    const seg = sortedSegments[absN - 1]
                    const isHi = highlightSlot != null && highlightSlot === absN
                    return (
                        <div
                            key={`n-${wi}`}
                            className="h-7 rounded border flex flex-col items-center justify-center px-0.5"
                            style={{
                                borderColor: isHi ? col : `${col}20`,
                                boxShadow: isHi ? `0 0 0 2px ${col}` : 'none',
                                background: filled ? (isDark ? 'rgba(30,27,75,0.5)' : '#f8fafc') : (isDark ? 'rgba(15,23,42,0.25)' : '#f1f5f9'),
                            }}
                            title={filled && seg ? segmentText(seg).slice(0, 80) : `Narrative ${absN}`}
                        >
                            <span className="text-[7px] font-black leading-none" style={{ color: col }}>
                                {absN}
                            </span>
                        </div>
                    )
                })}
            </div>
            <div className="text-[9px] flex flex-wrap justify-between gap-1" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                <span>
                    Showing narrative {start + 1}–{Math.min(start + windowCells, L8_NARRATIVE_TILE_TOTAL)} of {L8_NARRATIVE_TILE_TOTAL}
                </span>
                {highlightSlot != null ? (
                    <span className="font-mono font-bold" style={{ color: col }}>
                        Next write targets #{highlightSlot}
                    </span>
                ) : null}
            </div>
            <div
                className="rounded-lg border px-2 py-2 text-[9px] text-center font-bold"
                style={{ borderColor: `${col}35`, color: col, opacity: 0.85 }}
            >
                Slot {L8_SEGMENT_COUNT} · FINAL · full stitched depth block (auto-composed on archive)
            </div>
        </div>
    )
}

function PreviewL7Full({ data, col, isDark, segments, lx, ly, highlightSlot }) {
    const s0 = segments[0]
    const s1 = segments[1]
    const coordLabel = `${pad4(lx)},${pad4(ly)}`
    const t0 = s0 ? segmentText(s0) : 'Each sentence you enter becomes a segment like this one.'
    const t1 = s1 ? segmentText(s1) : 'Keep sentences between 20 and 250 characters.'
    const d0 = s0 ? segmentDifficultyValue(s0) : null
    const d1 = s1 ? segmentDifficultyValue(s1) : null
    return (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
                <SegmentHoverSurface
                    coordLabel={coordLabel}
                    difficulty={s0 ? resolveSegmentDifficulty(s0) : estimateSegmentDifficulty(t0)}
                    accentColor={col}
                    isDark={isDark}
                    className="rounded-lg border p-2 min-h-[88px] overflow-hidden cursor-default"
                    style={{ borderColor: `${col}44`, background: isDark ? 'rgba(5,4,18,0.9)' : '#f8fafc' }}
                >
                    <div className="flex justify-between items-center gap-1 mb-1">
                        <div className="text-[9px] font-black" style={{ color: col }}>
                            RANK 1
                        </div>
                        <DifficultyPill difficulty={d0} accent={col} isDark={isDark} />
                    </div>
                    <div className="text-[10px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        {t0}
                    </div>
                </SegmentHoverSurface>
                <SegmentHoverSurface
                    coordLabel={coordLabel}
                    difficulty={s1 ? resolveSegmentDifficulty(s1) : estimateSegmentDifficulty(t1)}
                    accentColor={col}
                    isDark={isDark}
                    className="rounded-lg border p-2 min-h-[88px] overflow-hidden cursor-default"
                    style={{ borderColor: `${col}44`, background: isDark ? 'rgba(5,4,18,0.9)' : '#f8fafc' }}
                >
                    <div className="flex justify-between items-center gap-1 mb-1">
                        <div className="text-[9px] font-black" style={{ color: col }}>
                            RANK 2
                        </div>
                        <DifficultyPill difficulty={d1} accent={col} isDark={isDark} />
                    </div>
                    <div className="text-[10px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        {t1}
                    </div>
                </SegmentHoverSurface>
            </div>
            <PreviewL7NarrativeGrid sortedSegments={segments} col={col} isDark={isDark} highlightSlot={highlightSlot} />
            {data.attachments?.length > 0 && (
                <div className="rounded-lg border p-2" style={{ borderColor: `${col}33` }}>
                    <div className="text-[9px] font-bold mb-1 flex items-center gap-1" style={{ color: col }}>
                        <ImageIcon size={12} /> Figures at L7
                    </div>
                    <PreviewAttachmentsRow list={data.attachments} col={col} isDark={isDark} />
                </div>
            )}
        </div>
    )
}

function PreviewL8Full({ lx, ly, data, col, isDark, segments, highlightSlot }) {
    const firstSeg = segments[0]
    const secondSeg = segments[1]
    const coordLabel = `${pad4(lx)},${pad4(ly)}`
    const fact = firstSeg ? segmentText(firstSeg) : 'First sentence often feeds cited-fact blurbs when attachments exist.'
    const nar = secondSeg ? segmentText(secondSeg) : 'Later sentences fill narrative segment tiles toward the end of the layer.'
    const factDiff = firstSeg ? segmentDifficultyValue(firstSeg) : null
    const narDiff = secondSeg ? segmentDifficultyValue(secondSeg) : null
    return (
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            <SegmentHoverSurface
                coordLabel={coordLabel}
                difficulty={estimateSegmentDifficulty(fact)}
                accentColor={col}
                isDark={isDark}
                className="rounded-lg border p-3 cursor-default"
                style={{ borderColor: `${col}44`, background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(248,250,252,0.98)' }}
            >
                <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="text-[11px] font-black" style={{ color: col }}>
                        CITED FACT 1
                    </div>
                    <DifficultyPill difficulty={factDiff} accent={col} isDark={isDark} />
                </div>
                <div className="text-[10px] font-mono mt-0.5 opacity-90" style={{ color: col }}>
                    {pad4(lx)},{pad4(ly)}
                </div>
                <div className="text-[11px] font-bold mt-1" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                    {data.title || 'Your subject'}
                </div>
                <p className="text-[10px] mt-1 leading-relaxed line-clamp-3" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                    {fact}
                </p>
                <div className="text-[9px] font-black mt-2 tracking-wider" style={{ color: col }}>
                    SOURCE
                </div>
                <div className="text-[10px]" style={{ color: isDark ? '#7dd3fc' : '#0369a1' }}>
                    {data.attachments?.[0]?.label || 'Link or file when provided'}
                </div>
            </SegmentHoverSurface>
            <SegmentHoverSurface
                coordLabel={coordLabel}
                difficulty={secondSeg ? resolveSegmentDifficulty(secondSeg) : estimateSegmentDifficulty(nar)}
                accentColor={col}
                isDark={isDark}
                className="rounded-lg border p-2 cursor-default"
                style={{ borderColor: `${col}33`, background: isDark ? '#06040e' : '#fff' }}
            >
                <div className="flex justify-between items-center gap-2 mb-1">
                    <div className="text-[10px] font-black" style={{ color: col }}>
                        NARRATIVE · rank 2
                    </div>
                    <DifficultyPill difficulty={narDiff} accent={col} isDark={isDark} />
                </div>
                <div className="text-[10px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#64748b' : '#475569' }}>
                    {nar}
                </div>
            </SegmentHoverSurface>
            <PreviewL8Grid
                sortedSegments={segments}
                col={col}
                isDark={isDark}
                highlightSlot={highlightSlot}
                attachments={data.attachments}
            />
        </div>
    )
}

export default function SubmissionLayerGuide({
    previewLayer,
    onLayerChange,
    showRichPreview,
    onRichToggle,
    form,
    attachments,
    isDark,
    accent,
    highlightSegmentSlot,
}) {
    const lx = parseInt(String(form.coordX || '100'), 10)
    const ly = parseInt(String(form.coordY || '130'), 10)

    const previewAttachments = useMemo(() => {
        if (attachments?.length) return attachments
        if (showRichPreview) return DEMO_ATTACHMENTS
        return []
    }, [showRichPreview, attachments])

    const sortedSegments = useMemo(() => {
        const t = String(form.detail || '').trim()
        const strings = (t.match(/[^.!?]+[.!?]*/g) || [t]).map((s) => s.trim()).filter(Boolean)
        return normalizeSegmentsEasiestFirst(buildSortedSegments(strings, form.difficulty ?? null), form.difficulty ?? null)
    }, [form.detail, form.difficulty])

    const data = useMemo(
        () => ({
            title: form.subject?.trim() || 'Your subject title',
            shortSummary: form.summary?.trim() || 'Your short summary will fill the L5 tile and the top of L6…',
            content: form.detail?.trim() || '',
            attachments: previewAttachments,
        }),
        [form.subject, form.summary, form.detail, previewAttachments],
    )

    const guide = SUBMISSION_LAYER_GUIDES[previewLayer] || SUBMISSION_LAYER_GUIDES[5]
    const layerOption = SUBMISSION_LAYER_OPTIONS.find((x) => x.layer === previewLayer) || SUBMISSION_LAYER_OPTIONS[0]
    const segmentHighlight =
        (previewLayer === 7 || previewLayer === 8) && highlightSegmentSlot != null ? highlightSegmentSlot : null
    const showSegmentHint =
        segmentHighlight != null &&
        ((previewLayer === 8 && segmentHighlight > L8_NARRATIVE_TILE_TOTAL) ||
            (previewLayer === 7 && segmentHighlight > L7_SEGMENT_NAV_TOTAL))

    return (
        <aside
            className="rounded-2xl border flex flex-col gap-4 p-4 lg:sticky lg:top-24 self-start"
            style={{
                borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.12)',
                background: isDark ? 'rgba(7,20,40,0.75)' : 'rgba(255,255,255,0.92)',
                boxShadow: isDark ? '0 0 32px rgba(79,195,247,0.06)' : '0 8px 40px rgba(0,0,0,0.06)',
            }}
        >
            <div className="flex items-center gap-2">
                <Layers size={18} style={{ color: accent }} />
                <div>
                    <h2 className="text-sm font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        Layer &amp; segment preview
                    </h2>
                    <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        Choose L5–L8 to match the archive zoom. Query <span className="font-mono">archiveLayer</span> stays in the URL for deep links.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
                    Layer picker
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SUBMISSION_LAYER_OPTIONS.map((o) => (
                        <button
                            key={o.layer}
                            type="button"
                            onClick={() => onLayerChange(o.layer)}
                            className="rounded-xl px-2 py-2 text-left transition-all border"
                            style={{
                                background: previewLayer === o.layer ? `${accent}18` : isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.95)',
                                borderColor: previewLayer === o.layer ? `${accent}66` : isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)',
                            }}
                        >
                            <div className="text-[12px] font-black" style={{ color: previewLayer === o.layer ? accent : isDark ? '#94a3b8' : '#64748b' }}>
                                {o.short}
                            </div>
                            <div className="text-[9px] mt-0.5 leading-snug line-clamp-2" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                                {o.title}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {segmentHighlight != null ? (
                <div
                    className="rounded-xl px-3 py-2 text-[11px] font-semibold border"
                    style={{
                        borderColor: `${accent}44`,
                        background: `${accent}10`,
                        color: isDark ? '#e2e8f0' : '#0f172a',
                    }}
                >
                    <LayoutGrid size={14} className="inline mr-1 align-text-bottom" style={{ color: accent }} aria-hidden />
                    Deep-link target: <span style={{ color: accent }}>L{previewLayer}</span> narrative slot{' '}
                    <span className="font-mono">{segmentHighlight}</span>
                    {previewLayer === 7 ? ` / ${L7_SEGMENT_NAV_TOTAL}` : previewLayer === 8 ? ` / ${L8_NARRATIVE_TILE_TOTAL}` : ''}
                    {showSegmentHint ? ' · slot out of range for this layer’s narrative band (check archive HUD).' : ''}
                </div>
            ) : null}

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                <input type="checkbox" checked={showRichPreview} onChange={(e) => onRichToggle(e.target.checked)} className="rounded border-slate-500" />
                <span>Show example diagram when you have no uploads yet</span>
            </label>

            <div>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: accent }}>
                    <BookOpen size={12} />
                    {layerOption.title} · {LAYER_LABELS[previewLayer]}
                </div>
                <p className="text-[11px] mb-2 leading-snug" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    {layerOption.desc}
                </p>
                <p className="text-[12px] font-semibold mb-1.5" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                    {guide.headline}
                </p>
                <ul className="text-[11px] space-y-1.5 pl-4 list-disc mb-3" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                    {guide.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                    ))}
                </ul>
                <div className="text-[10px] font-black uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                    Writing guidelines
                </div>
                <div className="text-[11px] space-y-2 mb-3 leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                    {(guide.writingBody || []).map((para, i) => (
                        <p key={i}>{renderBoldSegments(para)}</p>
                    ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                    Figures &amp; attachments
                </div>
                <ul className="text-[11px] space-y-1.5 pl-4 list-disc" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                    {(guide.figuresBody || []).map((t, i) => (
                        <li key={i}>{t}</li>
                    ))}
                </ul>
            </div>

            <div>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: accent }}>
                    <Database size={12} />
                    Live layout mock-up (coords {pad4(lx)},{pad4(ly)})
                </div>
                {previewLayer === 5 && <PreviewL5 lx={lx} ly={ly} data={data} col={accent} isDark={isDark} attachments={previewAttachments} />}
                {previewLayer === 6 && (
                    <PreviewL6
                        lx={lx}
                        ly={ly}
                        data={data}
                        col={accent}
                        isDark={isDark}
                        attachments={previewAttachments}
                        segments={sortedSegments}
                    />
                )}
                {previewLayer === 7 && (
                    <PreviewL7Full
                        data={data}
                        col={accent}
                        isDark={isDark}
                        segments={sortedSegments}
                        lx={lx}
                        ly={ly}
                        highlightSlot={previewLayer === 7 ? segmentHighlight : null}
                    />
                )}
                {previewLayer === 8 && (
                    <PreviewL8Full
                        lx={lx}
                        ly={ly}
                        data={data}
                        col={accent}
                        isDark={isDark}
                        segments={sortedSegments}
                        highlightSlot={previewLayer === 8 ? segmentHighlight : null}
                    />
                )}
            </div>

            <p className="text-[10px] leading-relaxed border-t pt-3" style={{ borderColor: isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.08)', color: isDark ? '#64748b' : '#94a3b8' }}>
                One submission still powers every layer: summary → detail → segments → deep citations. This panel tracks <span className="font-mono">archiveLayer</span> in the URL so archive HUD “Submit” deep-links stay aligned with what you are editing.
            </p>
        </aside>
    )
}
