import React, { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers, BookOpen, Database, Image as ImageIcon, LayoutGrid, Info, X, Star } from 'lucide-react'
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
    L7_NARRATIVE_SEGMENT_COUNT,
    L8_CITED_SEGMENT_START_INDEX,
    L8_FACT_SOURCE_SLOTS,
    L8_FINAL_SEGMENT_INDEX,
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

export const SUBMISSION_LAYER_OPTIONS = [4, 5, 6, 7, 8].map((layer) => ({
    layer,
    short: `L${layer}`,
    title: LAYER_LABELS[layer]?.split('·')[1]?.trim() || `Layer ${layer}`,
    desc: `${CELL_PX[layer]}×${CELL_PX[layer]} px logical cell — ${LAYER_LABELS[layer] || ''}`,
}))

export const SUBMISSION_LAYER_GUIDES = {
    4: {
        headline: 'Name your zone cell',
        tips: [
            'The subject title is the only text visible at 64×64 px scale — make it clear and concise.',
            'Keep titles under 50 characters; the grid trims long names with an ellipsis.',
            'The zone label feeds search and compass navigation for your hub.',
            'Filling adjacent cells first unlocks the next empty slot in the zone grid.',
        ],
        writingBody: [
            'L4 renders each cell as a **64×64 px zone tile** showing just a title and coordinate. Readers scan dozens of these tiles at once in the map view.',
            "Use the **subject** field as the zone name — it's the primary and often only text shown. Avoid abbreviations that won't be obvious to newcomers.",
            'L4 submissions are intentionally title-only. Add summary and detail by targeting L5 or deeper layers.',
        ],
        figuresBody: [
            'Figures are not collected for title-only L4 submissions.',
            'Add images, graphs, and source links when targeting L5 or deeper layers.',
        ],
    },
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
            'Tiles **31–32** hold **cited facts** (from hub references and attachments; compact preview) and **grid references** (other indexed coordinates on the hub). They are **not** filled from your submission body text.',
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
            'Narrative fills the main band (easiest first); the **final** cell stitches the full-depth block; **cited** tier sits on the **bottom row** of the 450-grid.',
            'Use SI units, define acronyms once, and prefer indicative mood over vague qualifiers.',
        ],
        writingBody: [
            'L8 is **16384×16384 px** inside one cell. The segment index is a **30-column × 15-row grid (450 slots)** on the real archive.',
            `**Slots 1–${L8_NARRATIVE_TILE_TOTAL}** are **narrative** tiles in difficulty order. **Slot ${L8_FINAL_SEGMENT_INDEX + 1}** is the **final stitched** full-depth block. **Slots ${L8_CITED_SEGMENT_START_INDEX + 1}–${L8_SEGMENT_COUNT}** are **cited-fact + source** pairs on the **bottom row** (same ${L8_FACT_SOURCE_SLOTS}-wide cited tier as before, moved visually to the end of the layer).`,
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
                    <div className="text-[9px] px-1 py-0.5 truncate" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                        {a.label || `File ${i + 1}`}
                    </div>
                </div>
            ))}
        </div>
    )
}

function PreviewL4({ lx, ly, data, col, isDark, hasSelectedCoord }) {
    const px = CELL_PX[4]
    const title = data.title || (hasSelectedCoord ? 'Zone title' : 'Select a grid slot')
    const emptyCells = Array.from({ length: 16 }, (_, i) => i)
    return (
        <div
            className="rounded-2xl overflow-hidden border"
            style={{
                borderColor: `${col}44`,
                background: isDark
                    ? `linear-gradient(145deg, rgba(6,4,14,0.96), ${col}10)`
                    : `linear-gradient(145deg, #fff, ${col}0c)`,
                padding: 14,
                boxShadow: `0 0 34px ${col}12`,
            }}
        >
            <div className="text-[10px] font-mono font-extrabold mb-3 flex justify-between gap-2" style={{ color: col }}>
                <span>{hasSelectedCoord ? `${pad4(lx)},${pad4(ly)}` : '----,----'} · SELECTED ZONE</span>
                <span className="opacity-70">{px}×{px}px</span>
            </div>

            <AnimatePresence mode="wait">
                {!hasSelectedCoord ? (
                    <motion.div
                        key="empty-grid"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div
                            className="grid grid-cols-4 gap-2 rounded-2xl border p-3"
                            style={{
                                borderColor: `${col}28`,
                                background: isDark ? 'rgba(15,23,42,0.58)' : 'rgba(248,250,252,0.94)',
                            }}
                        >
                            {emptyCells.map((cell) => (
                                <motion.div
                                    key={cell}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: cell * 0.012 }}
                                    className="rounded-xl border min-h-[46px] flex items-center justify-center"
                                    style={{
                                        borderColor: `${col}24`,
                                        background: isDark ? 'rgba(2,6,23,0.5)' : 'rgba(255,255,255,0.72)',
                                        color: `${col}88`,
                                    }}
                                >
                                    <span className="text-[8px] font-mono font-black">EMPTY</span>
                                </motion.div>
                            ))}
                        </div>
                        <p className="mt-3 text-[10px] leading-relaxed" style={{ color: isDark ? '#64748b' : '#475569' }}>
                            Select a valid adjacent grid slot. The preview will focus into that one cell and remove the surrounding grid.
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key={`selected-${lx}-${ly}`}
                        initial={{ opacity: 0, scale: 0.82, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                        className="relative overflow-hidden rounded-2xl border min-h-[220px] flex flex-col justify-between p-5"
                        style={{
                            borderColor: `${col}88`,
                            background: isDark ? `radial-gradient(circle at 25% 12%, ${col}32, rgba(15,23,42,0.92) 58%)` : `radial-gradient(circle at 25% 12%, ${col}22, rgba(255,255,255,0.98) 60%)`,
                            boxShadow: `0 0 42px ${col}35, inset 0 0 0 1px ${col}22`,
                        }}
                    >
                        <div
                            className="absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl"
                            style={{ background: `${col}30` }}
                            aria-hidden
                        />
                        <div className="relative">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: col }}>
                                L4 title cell
                            </div>
                            <div className="mt-3 text-2xl font-black leading-tight" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {title}
                            </div>
                            <p className="mt-3 text-xs leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                                This is the selected grid cell only. The surrounding grid is hidden so the submit target is clear.
                            </p>
                        </div>
                        <div className="relative flex items-end justify-between gap-3">
                            <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ background: `${col}18`, color: col, border: `1px solid ${col}35` }}>
                                Selected
                            </span>
                            <span className="font-mono text-sm font-black" style={{ color: col }}>
                                {pad4(lx)},{pad4(ly)}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function PreviewL5({ lx, ly, data, col, isDark, attachments }) {
    const px = CELL_PX[5]
    return (
        <div
            className="rounded-xl overflow-hidden border flex flex-col"
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
            <div className="text-[13px] font-extrabold leading-snug mb-1.5" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                {data.title || 'Subject title'}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#334155' }}>
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
            className="rounded-xl overflow-hidden border flex flex-col"
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
            <div className="flex flex-col px-2 pt-1.5 pb-2">
                <div className="text-[9px] font-black mb-1 flex justify-between" style={{ color: col }}>
                    <span>SEGMENTS · EASIEST → HARDEST</span>
                    <span className="opacity-80 font-mono">{segments?.length || 0} seg</span>
                </div>
                <div className="space-y-1.5">
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
                                <div className="text-[10px] leading-snug line-clamp-2" style={{ color: isDark ? '#64748b' : '#334155' }}>
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

/** Mini 8×4 L7 narrative grid (30 active tiles) — matches archive SEG stepping (31–32 are separate panels). */
function PreviewL7NarrativeGrid({ sortedSegments, col, isDark, highlightSlot }) {
    const filledCount = Math.min(L7_NARRATIVE_SEGMENT_COUNT, sortedSegments?.length || 0)
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5 gap-2">
                <span className="text-[9px] font-black" style={{ color: col }}>
                    NARRATIVE GRID · {L7_SEGMENT_NAV_COLS} cols × 4 rows (30) + cited / grid refs
                </span>
                <span className="text-[9px] font-mono opacity-80" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                    {filledCount}/{L7_NARRATIVE_SEGMENT_COUNT} filled
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
                {Array.from({ length: L7_NARRATIVE_SEGMENT_COUNT }, (_, i) => {
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
                                <span className="text-[7px] opacity-45" style={{ color: isDark ? '#64748b' : '#475569' }}>
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
                    SEG 31 · cited facts
                </div>
                <div
                    className="flex-1 rounded border px-2 py-1.5 text-[8px] font-bold text-center opacity-80"
                    style={{ borderColor: `${col}28`, color: col }}
                >
                    SEG 32 · grid references
                </div>
            </div>
        </div>
    )
}

/** L8: narrative window + final + cited row at bottom (matches archive order). */
function PreviewL8Grid({ sortedSegments, col, isDark, highlightSlot, attachments }) {
    const narrFilled = Math.min(L8_NARRATIVE_TILE_TOTAL, sortedSegments?.length || 0)
    const citedDemoFilled = Math.min(L8_FACT_SOURCE_SLOTS, Math.max(attachments?.length || 0, sortedSegments?.length ? 2 : 0))
    const fillPct = Math.round((narrFilled / L8_NARRATIVE_TILE_TOTAL) * 100)

    // 20-tile window centred on the next active slot
    const focus = highlightSlot != null ? Math.max(0, Math.min(L8_NARRATIVE_TILE_TOTAL - 1, highlightSlot - 1)) : narrFilled
    const windowSize = 20
    let wStart = Math.max(0, focus - 6)
    if (wStart + windowSize > L8_NARRATIVE_TILE_TOTAL) wStart = Math.max(0, L8_NARRATIVE_TILE_TOTAL - windowSize)

    return (
        <div className="space-y-3">

            {/* ── Stats card ── */}
            <div
                className="rounded-2xl border p-3"
                style={{
                    borderColor: `${col}30`,
                    background: isDark ? `linear-gradient(135deg, ${col}10, rgba(2,6,23,0.6))` : `linear-gradient(135deg, ${col}08, rgba(255,255,255,0.9))`,
                }}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: col }}>
                        L8 · {CELL_PX[8]}×{CELL_PX[8]} px
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: `${col}18`, color: col, border: `1px solid ${col}30` }}>
                        {narrFilled} / {L8_NARRATIVE_TILE_TOTAL} narrative
                    </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                    <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg, ${col}88, ${col})` }}
                    />
                </div>
                <div className="flex justify-between mt-1.5 text-[8px]" style={{ color: isDark ? '#64748b' : '#475569' }}>
                    <span>{fillPct}% narrative filled</span>
                    <span>{L8_FACT_SOURCE_SLOTS} cited · 1 final</span>
                </div>
            </div>

            {/* ── Windowed narrative tiles ── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: col }}>
                        Narrative band
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        showing {wStart + 1}–{Math.min(wStart + windowSize, L8_NARRATIVE_TILE_TOTAL)} of {L8_NARRATIVE_TILE_TOTAL}
                    </span>
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
                    {Array.from({ length: windowSize }, (_, wi) => {
                        const absN = wStart + wi + 1
                        const filled = absN <= narrFilled
                        const isHi = highlightSlot === absN
                        const isNext = !filled && absN === narrFilled + 1
                        return (
                            <motion.div
                                key={wi}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: wi * 0.015 }}
                                className="h-9 rounded-xl border flex items-center justify-center"
                                style={{
                                    borderColor: isHi ? col : isNext ? `${col}55` : filled ? `${col}28` : `${col}12`,
                                    background: isHi
                                        ? `${col}30`
                                        : isNext
                                            ? `${col}12`
                                            : filled
                                                ? (isDark ? `${col}18` : `${col}0c`)
                                                : (isDark ? 'rgba(15,23,42,0.25)' : 'rgba(241,245,249,0.7)'),
                                    boxShadow: isHi ? `0 0 12px ${col}66` : 'none',
                                }}
                                title={sortedSegments[absN - 1] ? segmentText(sortedSegments[absN - 1]).slice(0, 80) : `Tile ${absN}`}
                            >
                                <span
                                    className="text-[8px] font-black"
                                    style={{ color: isHi || isNext ? col : filled ? `${col}cc` : isDark ? '#334155' : '#64748b' }}
                                >
                                    {absN}
                                </span>
                            </motion.div>
                        )
                    })}
                </div>
                {highlightSlot != null && (
                    <p className="text-[9px] mt-1.5 font-bold text-right" style={{ color: col }}>
                        Next write → slot #{highlightSlot}
                    </p>
                )}
            </div>

            {/* ── Final slot ── */}
            <div
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                style={{
                    borderColor: `${col}35`,
                    background: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(248,250,252,0.9)',
                }}
            >
                <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${col}20`, border: `1px solid ${col}44` }}
                >
                    <Star size={10} fill="currentColor" style={{ color: col }} aria-hidden />
                </div>
                <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: col }}>
                        Slot {L8_FINAL_SEGMENT_INDEX + 1} · Final
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        Full stitched depth block — auto-composed on archive
                    </div>
                </div>
            </div>

            {/* ── Cited fact tier ── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: col }}>
                        Cited fact tier
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        {citedDemoFilled} / {L8_FACT_SOURCE_SLOTS} filled
                    </span>
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${L8_GRID_COLS}, minmax(0, 1fr))` }}>
                    {Array.from({ length: L8_FACT_SOURCE_SLOTS }, (_, i) => {
                        const filled = i < citedDemoFilled
                        return (
                            <div
                                key={i}
                                className="h-3.5 rounded border"
                                style={{
                                    borderColor: filled ? `${col}44` : `${col}18`,
                                    background: filled ? `${col}40` : (isDark ? 'rgba(15,23,42,0.35)' : 'rgba(241,245,249,0.8)'),
                                }}
                                title={`Cited ${i + 1}`}
                            />
                        )
                    })}
                </div>
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
        <div className="space-y-3">
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
                    <div className="text-[10px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#64748b' : '#334155' }}>
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
                    <div className="text-[10px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#64748b' : '#334155' }}>
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
        <div className="space-y-3">
            <div
                className="rounded-2xl border p-3"
                style={{
                    borderColor: `${col}35`,
                    background: isDark
                        ? `linear-gradient(135deg, ${col}16, rgba(2,6,23,0.76))`
                        : `linear-gradient(135deg, ${col}10, rgba(255,255,255,0.92))`,
                    boxShadow: `0 0 28px ${col}12`,
                }}
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: col }}>
                            L8 live lattice
                        </div>
                        <div className="text-sm font-black mt-0.5" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {data.title || 'Deep full text preview'}
                        </div>
                    </div>
                    <div className="flex gap-1.5 text-[9px] font-mono font-black" style={{ color: col }}>
                        <span className="rounded-full px-2 py-1" style={{ background: `${col}18`, border: `1px solid ${col}30` }}>
                            {segments.length} seg
                        </span>
                        <span className="rounded-full px-2 py-1" style={{ background: `${col}18`, border: `1px solid ${col}30` }}>
                            {data.attachments?.length || 0} src
                        </span>
                    </div>
                </div>
            </div>
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
                <div className="text-[11px] font-bold mt-1" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
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
                <div className="text-[10px] leading-relaxed line-clamp-4" style={{ color: isDark ? '#64748b' : '#334155' }}>
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

export function LayerGuidelinesOverlay({ open, onClose, guide, layerOption, previewLayer, accent, isDark }) {
    useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        // Lock page scroll while the overlay is open (restored on close/unmount).
        // The viewport scroller is documentElement here, so lock both it and body.
        const prevHtmlOverflow = document.documentElement.style.overflow
        const prevBodyOverflow = document.body.style.overflow
        const prevPaddingRight = document.body.style.paddingRight
        const scrollbarGap = window.innerWidth - document.documentElement.clientWidth
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
        if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            document.documentElement.style.overflow = prevHtmlOverflow
            document.body.style.overflow = prevBodyOverflow
            document.body.style.paddingRight = prevPaddingRight
        }
    }, [open, onClose])

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        top: 'var(--solar-nav-offset)',
                        bottom: 'auto',
                        height: 'calc(100dvh - var(--solar-nav-offset))',
                        overflowY: 'hidden',
                        background: isDark
                            ? 'linear-gradient(180deg, rgba(5,6,8,0.82), rgba(5,6,8,0.92))'
                            : 'rgba(15,23,42,0.38)',
                        backdropFilter: 'blur(20px) saturate(1.1)',
                        WebkitBackdropFilter: 'blur(20px) saturate(1.1)',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Layer ${previewLayer} guidelines`}
                        initial={{ opacity: 0, y: 40, scale: 0.965 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.9 }}
                        className="relative min-h-0 w-full sm:max-w-3xl flex flex-col rounded-t-[2rem] sm:rounded-[1.5rem] overflow-hidden"
                        style={{
                            maxHeight: 'calc(100dvh - var(--solar-nav-offset) - 1rem)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)'}`,
                            background: isDark
                                ? 'linear-gradient(170deg, #121419 0%, #0b0d11 60%, #0a0c10 100%)'
                                : 'linear-gradient(170deg, #ffffff, #f6f8fb)',
                            boxShadow: isDark
                                ? `0 1px 0 rgba(255,255,255,0.05) inset, 0 32px 90px rgba(0,0,0,0.65), 0 0 90px ${accent}0d`
                                : `0 1px 0 rgba(255,255,255,0.9) inset, 0 28px 70px rgba(15,23,42,0.16), 0 0 70px ${accent}0a`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative glows */}
                        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full blur-3xl" style={{ background: `${accent}14` }} aria-hidden />
                        <div className="pointer-events-none absolute -left-20 top-40 h-48 w-48 rounded-full blur-3xl" style={{ background: `${accent}08` }} aria-hidden />
                        <div className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }} aria-hidden />

                        {/* ── Sticky header ── */}
                        <div
                            className="relative shrink-0 px-5 sm:px-7 pt-5 pb-4 border-b"
                            style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)', background: isDark ? 'rgba(13,15,20,0.88)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                        >
                            {/* drag handle (mobile) */}
                            <div className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" style={{ background: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)' }} />

                            <div className="flex items-start gap-3 sm:gap-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.08 }}
                                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border"
                                    style={{ color: accent, borderColor: `${accent}3d`, background: `${accent}12`, boxShadow: `0 1px 0 rgba(255,255,255,0.08) inset, 0 0 26px ${accent}1a` }}
                                >
                                    <Info size={20} />
                                </motion.div>
                                <div className="min-w-0 flex-1">
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}
                                    >
                                        Layer {previewLayer} · {layerOption.title}
                                    </motion.div>
                                    <motion.h2
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                        className="mt-0.5 text-xl sm:text-2xl font-semibold leading-tight tracking-tight" style={{ color: isDark ? '#f5f5f7' : '#0f172a' }}
                                    >
                                        {guide.headline}
                                    </motion.h2>
                                    <motion.p
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}
                                        className="mt-1 text-[11px] font-mono leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.42)' : '#475569' }}
                                    >
                                        {layerOption.desc}
                                    </motion.p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="shrink-0 rounded-full p-2 transition-all duration-200 hover:scale-105 active:scale-95"
                                    style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#475569', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}` }}
                                    aria-label="Close guidelines"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        {/* ── Scrollable body ── */}
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-7">

                            {/* Quick tips */}
                            <motion.section
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>Quick tips</span>
                                    <span className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {guide.tips.map((tip, i) => (
                                        <motion.div
                                            key={tip}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.16 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                            whileHover={{ y: -3 }}
                                            className="rounded-2xl border p-4 transition-shadow duration-200"
                                            style={{
                                                borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
                                                background: isDark ? 'rgba(255,255,255,0.028)' : 'rgba(255,255,255,0.85)',
                                                boxShadow: isDark ? '0 1px 0 rgba(255,255,255,0.03) inset' : '0 1px 0 rgba(255,255,255,0.8) inset',
                                            }}
                                        >
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <span
                                                    className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold"
                                                    style={{ background: `${accent}1a`, color: accent, border: `1px solid ${accent}30` }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: `${accent}90` }}>tip</span>
                                            </div>
                                            <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(15,23,42,0.7)' }}>{tip}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Writing guidelines */}
                            <motion.section
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.22, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>Writing guidelines</span>
                                    <span className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
                                </div>
                                <div
                                    className="rounded-2xl border p-5 space-y-4"
                                    style={{
                                        borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
                                        background: isDark ? 'rgba(255,255,255,0.022)' : 'rgba(248,250,252,0.9)',
                                    }}
                                >
                                    {(guide.writingBody || []).map((para, i) => (
                                        <motion.div
                                            key={i} className="flex gap-3"
                                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.26 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}66` }} />
                                            <p className="text-sm leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.72)' }}>
                                                {renderBoldSegments(para)}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Figures & attachments */}
                            <motion.section
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>Figures &amp; attachments</span>
                                    <span className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
                                </div>
                                <div
                                    className="rounded-2xl border p-5 space-y-4"
                                    style={{
                                        borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
                                        background: isDark ? 'rgba(255,255,255,0.022)' : 'rgba(248,250,252,0.9)',
                                    }}
                                >
                                    {(guide.figuresBody || []).map((item, i) => (
                                        <motion.div
                                            key={i} className="flex gap-3"
                                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.34 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}66` }} />
                                            <p className="text-sm leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.72)' }}>
                                                {renderBoldSegments(item)}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>
                        </div>

                        {/* ── Footer ── */}
                        <div
                            className="shrink-0 px-5 sm:px-7 py-4 border-t"
                            style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)', background: isDark ? 'rgba(13,15,20,0.85)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                        >
                            <motion.button
                                type="button"
                                onClick={onClose}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.985 }}
                                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200"
                                style={{
                                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                    boxShadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px ${accent}30`,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Got it
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
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
    const hasSelectedCoord = form.coordX !== '' && form.coordY !== ''
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
            (previewLayer === 7 && segmentHighlight > L7_NARRATIVE_SEGMENT_COUNT))

    return (
        <aside
            className="sa-preview-card rounded-[20px] border flex flex-col gap-4 p-4 lg:sticky lg:top-24 self-start"
        >
            <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ color: accent, borderColor: `${accent}30`, background: `${accent}0e` }}>
                    <Layers size={15} />
                </span>
                <div>
                    <h2 className="text-sm font-semibold tracking-tight" style={{ color: isDark ? '#f5f5f7' : '#0f172a' }}>
                        Layer &amp; segment preview
                    </h2>
                    <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#475569' }}>
                        Choose L4–L8 to match the archive zoom. Query <span className="font-mono">archiveLayer</span> stays in the URL for deep links.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#475569' }}>
                        Layer picker
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-1 rounded-xl border p-1"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.09)', background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.03)' }}>
                    {SUBMISSION_LAYER_OPTIONS.map((o) => {
                        const active = previewLayer === o.layer
                        return (
                            <button
                                key={o.layer}
                                type="button"
                                onClick={() => onLayerChange(o.layer)}
                                className="relative rounded-lg px-1.5 py-2 text-left transition-colors duration-200"
                            >
                                {active && (
                                    <motion.span
                                        layoutId="sa-preview-layer-pill"
                                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                        className="absolute inset-0 rounded-lg"
                                        style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                                        aria-hidden
                                    />
                                )}
                                <div className="relative z-10 text-[12px] font-semibold" style={{ color: active ? accent : isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}>
                                    {o.short}
                                </div>
                                <div className="relative z-10 text-[9px] mt-0.5 leading-snug line-clamp-2" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#475569' }}>
                                    {o.title}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {segmentHighlight != null ? (
                <div
                    className="rounded-xl px-3 py-2 text-[11px] font-semibold border"
                    style={{
                        borderColor: `${accent}44`,
                        background: `${accent}10`,
                        color: isDark ? '#f8fafc' : '#0f172a',
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

            <div
                className="rounded-xl border px-4 py-3"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)', background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.75)' }}
            >
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1 flex items-center gap-1.5" style={{ color: accent }}>
                    <BookOpen size={12} />
                    L{previewLayer} · {layerOption.title}
                </div>
                <p className="text-[12px] font-semibold leading-snug" style={{ color: isDark ? '#f5f5f7' : '#0f172a' }}>
                    {guide.headline}
                </p>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#475569' }}>
                    Open the info panel for writing rules, figures, and layer-specific constraints.
                </p>
            </div>

            <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#475569' }}>
                    <Database size={12} />
                    Live layout mock-up (coords {pad4(lx)},{pad4(ly)})
                </div>
                {previewLayer === 4 && <PreviewL4 lx={lx} ly={ly} data={data} col={accent} isDark={isDark} hasSelectedCoord={hasSelectedCoord} />}
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

        </aside>
    )
}

