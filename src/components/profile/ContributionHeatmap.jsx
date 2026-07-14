import { useMemo, useRef, useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_ROWS = [{ row: 1, label: 'Mon' }, { row: 3, label: 'Wed' }, { row: 5, label: 'Fri' }]

const CELL = 11
const GAP = 3

function level(count) {
    if (!count) return 0
    if (count === 1) return 1
    if (count === 2) return 2
    if (count <= 4) return 3
    return 4
}

/** GitHub-style activity calendar with hover tooltips. `weeks` comes from buildHeatmapWeeks(). */
export default function ContributionHeatmap({ weeks, muted = '#64748b' }) {
    const wrapRef = useRef(null)
    const [tip, setTip] = useState(null)

    const monthLabels = useMemo(() => {
        const labels = []
        let prevMonth = -1
        let lastIndex = -10
        weeks.forEach((week, i) => {
            const m = week[0].date.getMonth()
            if (m !== prevMonth) {
                if (i - lastIndex >= 3) {
                    labels.push({ i, label: MONTHS[m] })
                    lastIndex = i
                }
                prevMonth = m
            }
        })
        return labels
    }, [weeks])

    const showTip = (e, day) => {
        const wrap = wrapRef.current
        if (!wrap) return
        const cell = e.currentTarget.getBoundingClientRect()
        const box = wrap.getBoundingClientRect()
        setTip({
            x: cell.left - box.left + cell.width / 2,
            y: cell.top - box.top,
            text: `${day.count} ${day.count === 1 ? 'action' : 'actions'} · ${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        })
    }

    return (
        <div ref={wrapRef} className="relative">
            {tip && (
                <span className="sp-heat-tip" style={{ left: tip.x, top: tip.y }}>
                    {tip.text}
                </span>
            )}
            <div className="sp-heat-scroll">
                <div style={{ display: 'inline-block', minWidth: 'max-content' }}>
                    <div style={{ position: 'relative', height: 14, marginLeft: 30 }}>
                        {monthLabels.map(({ i, label }) => (
                            <span key={`${label}-${i}`} className="sp-mono absolute text-[9px] font-medium uppercase tracking-widest" style={{ left: i * (CELL + GAP), color: muted }}>
                                {label}
                            </span>
                        ))}
                    </div>
                    <div className="flex" style={{ gap: GAP }}>
                        <div style={{ position: 'relative', width: 26 }}>
                            {DAY_ROWS.map(({ row, label }) => (
                                <span key={label} className="sp-mono absolute text-[8px] font-medium uppercase" style={{ top: row * (CELL + GAP) - 1, color: muted }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                                {week.map((day) => (
                                    <div
                                        key={day.key}
                                        className="sp-heat-cell"
                                        data-level={level(day.count)}
                                        data-future={day.future}
                                        onMouseEnter={day.future ? undefined : (e) => showTip(e, day)}
                                        onMouseLeave={() => setTip(null)}
                                        aria-label={day.future ? undefined : `${day.count} actions on ${day.key}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-2">
                <span className="sp-mono text-[9px] font-medium uppercase tracking-widest" style={{ color: muted }}>Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} className="sp-heat-cell" data-level={l} style={{ cursor: 'default' }} />
                ))}
                <span className="sp-mono text-[9px] font-medium uppercase tracking-widest" style={{ color: muted }}>More</span>
            </div>
        </div>
    )
}
