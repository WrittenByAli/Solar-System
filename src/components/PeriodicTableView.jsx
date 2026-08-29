import { useRef, useState } from 'react'
import { Atom, ChevronRight } from 'lucide-react'
import { ELEMENT_CATEGORIES, PERIODIC_ELEMENTS } from '../data/periodicTable.js'
import '../styles/periodic-table.css'

const TABLE_WIDTH = 18 * 64
const TABLE_HEIGHT = 640
const MIN_TABLE_SCALE = 0.65
const MAX_TABLE_SCALE = 1.8

function clampTableScale(value) {
  return Math.min(MAX_TABLE_SCALE, Math.max(MIN_TABLE_SCALE, value))
}

function ElementTile({ element, selected, onSelect, onPreview, onPreviewEnd }) {
  const category = ELEMENT_CATEGORIES[element.category]
  return (
    <button
      type="button"
      className={`periodic-table__element${selected ? ' periodic-table__element--selected' : ''}`}
      style={{
        '--element-color': category.tone,
        gridColumn: element.displayColumn,
        gridRow: element.displayRow,
      }}
      aria-label={`${element.name}, symbol ${element.symbol}, atomic number ${element.atomicNumber}`}
      aria-pressed={selected}
      title={`${element.atomicNumber} | ${element.name} | ${category.label}`}
      onMouseEnter={() => onPreview(element)}
      onMouseLeave={onPreviewEnd}
      onFocus={() => onPreview(element)}
      onBlur={onPreviewEnd}
      onClick={(event) => onSelect(element, event)}
    >
      <span className="periodic-table__number">{element.atomicNumber}</span>
      <strong className="periodic-table__symbol">{element.symbol}</strong>
      <span className="periodic-table__name">{element.name}</span>
      <span className="periodic-table__mass">{element.atomicMass}</span>
    </button>
  )
}

function AtomicModel({ element }) {
  const shellCount = element.electronShells.length

  return (
    <div
      className="periodic-table__atom"
      style={{ '--atom-color': ELEMENT_CATEGORIES[element.category].tone }}
      role="img"
      aria-label={`${element.name} atom model with ${element.atomicNumber} electron${element.atomicNumber === 1 ? '' : 's'} across ${shellCount} shell${shellCount === 1 ? '' : 's'}`}
    >
      <div className="periodic-table__nucleus"><span>{element.symbol}</span></div>
      {element.electronShells.map((electrons, shellIndex) => {
        const orbitWidth = shellCount === 1 ? 122 : 70 + shellIndex * (134 / (shellCount - 1))
        const orbitHeight = shellCount === 1 ? 48 : 30 + shellIndex * 7
        const startAngle = (shellIndex % 2 === 0 ? -1 : 1) * (14 + shellIndex * 11)

        return (
          <span
            key={shellIndex}
            className="periodic-table__orbit"
            style={{
              '--orbit-width': `${orbitWidth}px`,
              '--orbit-height': `${orbitHeight}px`,
              '--orbit-start': `${startAngle}deg`,
              '--orbit-end': `${startAngle + 360}deg`,
              '--orbit-duration': `${4.8 + shellIndex * 1.35}s`,
              animationDirection: shellIndex % 2 === 0 ? 'normal' : 'reverse',
            }}
            aria-hidden
          >
            {Array.from({ length: electrons }, (_, electronIndex) => {
              const angle = (electronIndex / electrons) * Math.PI * 2
              return (
                <i
                  key={electronIndex}
                  className="periodic-table__electron"
                  style={{
                    '--electron-size': electrons > 18 ? '3px' : electrons > 8 ? '4px' : '5px',
                    left: `${50 + Math.cos(angle) * 50}%`,
                    top: `${50 + Math.sin(angle) * 50}%`,
                  }}
                />
              )
            })}
          </span>
        )
      })}
      <span className="periodic-table__atom-glow" aria-hidden />
      <span className="periodic-table__electron-count">
        <strong>{element.atomicNumber}</strong> ELECTRONS <i>{element.electronShells.join(' / ')}</i>
      </span>
    </div>
  )
}

function ElementInspector({ element, active }) {
  const category = ELEMENT_CATEGORIES[element.category]
  return (
    <aside
      key={element.atomicNumber}
      className={`periodic-table__inspector${active ? ' periodic-table__inspector--active' : ''}`}
      style={{ '--element-color': category.tone }}
      aria-live="polite"
      aria-hidden={!active}
    >
      <div className="periodic-table__inspector-scan" aria-hidden />
      <div className="periodic-table__inspector-kicker">ELEMENT RECORD / {String(element.atomicNumber).padStart(3, '0')}</div>
      <div className="periodic-table__inspector-heading">
        <span className="periodic-table__inspector-symbol">{element.symbol}</span>
        <div>
          <h2>{element.name}</h2>
          <p><i />{category.label}</p>
        </div>
      </div>

      <AtomicModel element={element} />

      <p className="periodic-table__inspector-summary">
        {element.name} is atomic number {element.atomicNumber}, positioned in period {element.period}{element.group ? ` and group ${element.group}` : ' within the f-block series'}.
      </p>
      <dl className="periodic-table__inspector-data">
        <div><dt>Atomic mass</dt><dd>{element.atomicMass} u</dd></div>
        <div><dt>Electron block</dt><dd>{element.block}-block</dd></div>
        <div><dt>Standard phase</dt><dd>{element.phase}</dd></div>
        <div><dt>Archive depth</dt><dd>L5-L8</dd></div>
      </dl>
      <div className="periodic-table__inspector-cta">
        CLICK ELEMENT TO OPEN RECORD <ChevronRight size={15} aria-hidden />
      </div>
    </aside>
  )
}

export default function PeriodicTableView({ isDark, selectedAtomicNumber, onSelectElement }) {
  const [hoveredElement, setHoveredElement] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [tableScale, setTableScale] = useState(1)
  const scrollRef = useRef(null)
  const dragRef = useRef({ active: false, dragged: false, pointerId: null, x: 0, y: 0, left: 0, top: 0 })
  const pointersRef = useRef(new Map())
  const pinchRef = useRef({ active: false, distance: 0, scale: 1, contentX: 0, contentY: 0 })
  const previewElement = hoveredElement || PERIODIC_ELEMENTS[0]
  const inspectorActive = !!hoveredElement

  const handleDragStart = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const scroller = scrollRef.current
    if (!scroller) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      const rect = scroller.getBoundingClientRect()
      const centerX = (first.x + second.x) / 2 - rect.left
      const centerY = (first.y + second.y) / 2 - rect.top
      pinchRef.current = {
        active: true,
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        scale: tableScale,
        contentX: (scroller.scrollLeft + centerX) / tableScale,
        contentY: (scroller.scrollTop + centerY) / tableScale,
      }
      dragRef.current.active = false
      setHoveredElement(null)
      for (const pointerId of pointersRef.current.keys()) scroller.setPointerCapture?.(pointerId)
      return
    }

    dragRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
    }
  }

  const handleDragMove = (event) => {
    const scroller = scrollRef.current
    if (!scroller || !pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pinchRef.current.active && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()]
      const pinch = pinchRef.current
      const rect = scroller.getBoundingClientRect()
      const centerX = (first.x + second.x) / 2 - rect.left
      const centerY = (first.y + second.y) / 2 - rect.top
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
      const nextScale = clampTableScale(pinch.scale * distance / pinch.distance)
      setTableScale(nextScale)
      requestAnimationFrame(() => {
        scroller.scrollLeft = pinch.contentX * nextScale - centerX
        scroller.scrollTop = pinch.contentY * nextScale - centerY
      })
      event.preventDefault()
      return
    }

    const drag = dragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.dragged && Math.hypot(dx, dy) < 5) return
    if (!drag.dragged) {
      drag.dragged = true
      scroller.setPointerCapture?.(event.pointerId)
      setHoveredElement(null)
      setIsDragging(true)
    }
    event.preventDefault()
    scroller.scrollLeft = drag.left - dx
    scroller.scrollTop = drag.top - dy
  }

  const handleDragEnd = (event) => {
    const drag = dragRef.current
    pointersRef.current.delete(event.pointerId)

    if (pinchRef.current.active) {
      if (scrollRef.current?.hasPointerCapture?.(event.pointerId)) {
        scrollRef.current.releasePointerCapture(event.pointerId)
      }
      if (pointersRef.current.size < 2) pinchRef.current.active = false
      dragRef.current.active = false
      dragRef.current.dragged = true
      setIsDragging(false)
      if (pointersRef.current.size === 0) {
        window.setTimeout(() => { dragRef.current.dragged = false }, 0)
      }
      return
    }

    if (!drag.active || drag.pointerId !== event.pointerId) return
    const dragged = drag.dragged
    drag.active = false
    if (scrollRef.current?.hasPointerCapture?.(event.pointerId)) {
      scrollRef.current.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
    if (dragged) {
      window.setTimeout(() => {
        if (!dragRef.current.active) dragRef.current.dragged = false
      }, 0)
    }
  }

  const handleElementSelect = (element, event) => {
    const drag = dragRef.current
    const moved = event.detail !== 0 && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 5
    if (moved) return
    onSelectElement(element)
  }

  const handleWheelZoom = (event) => {
    const scroller = scrollRef.current
    if (!scroller) return
    event.preventDefault()
    const rect = scroller.getBoundingClientRect()
    const anchorX = event.clientX - rect.left
    const anchorY = event.clientY - rect.top
    const contentX = (scroller.scrollLeft + anchorX) / tableScale
    const contentY = (scroller.scrollTop + anchorY) / tableScale
    const nextScale = clampTableScale(tableScale * Math.exp(-event.deltaY * 0.0015))
    if (nextScale === tableScale) return
    setTableScale(nextScale)
    requestAnimationFrame(() => {
      scroller.scrollLeft = contentX * nextScale - anchorX
      scroller.scrollTop = contentY * nextScale - anchorY
    })
  }

  return (
    <section
      className={`periodic-table periodic-table--${isDark ? 'dark' : 'light'}`}
      aria-labelledby="periodic-table-title"
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="periodic-table__atmosphere" aria-hidden />
      <header className="periodic-table__header">
        <div className="periodic-table__eyebrow"><Atom size={14} aria-hidden /> URANUS / CHEMISTRY ARCHIVE / L4</div>
        <div className="periodic-table__title-row">
          <div>
            <h1 id="periodic-table-title">Periodic table of the elements</h1>
            <p>Native L4 cells / hover to inspect / click to descend into the element archive.</p>
          </div>
          <div className="periodic-table__count"><strong>118</strong><span>VERIFIED<br />ELEMENTS</span></div>
        </div>
      </header>

      <div className="periodic-table__body">
        <div
          ref={scrollRef}
          className={`periodic-table__scroll${isDragging ? ' periodic-table__scroll--dragging' : ''}`}
          tabIndex="0"
          aria-label="Interactive periodic table. Drag to pan, use the mouse wheel or pinch to zoom."
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onWheel={handleWheelZoom}
        >
          <div
            className="periodic-table__zoom-stage"
            style={{ width: TABLE_WIDTH * tableScale, height: TABLE_HEIGHT * tableScale }}
          >
            <div className="periodic-table__canvas" style={{ transform: `scale(${tableScale})` }}>
              <div className="periodic-table__groups" aria-hidden>
                {Array.from({ length: 18 }, (_, index) => <span key={index}>{index + 1}</span>)}
              </div>
              <div className="periodic-table__grid">
                <span className="periodic-table__series-marker" style={{ gridColumn: 3, gridRow: 6 }}>57-71</span>
                <span className="periodic-table__series-marker" style={{ gridColumn: 3, gridRow: 7 }}>89-103</span>
                <span className="periodic-table__series-label" style={{ gridColumn: '1 / span 2', gridRow: 8 }}>LANTHANIDES</span>
                <span className="periodic-table__series-label" style={{ gridColumn: '1 / span 2', gridRow: 9 }}>ACTINIDES</span>
                {PERIODIC_ELEMENTS.map((element) => (
                  <ElementTile
                    key={element.atomicNumber}
                    element={element}
                    selected={element.atomicNumber === selectedAtomicNumber}
                    onSelect={handleElementSelect}
                    onPreview={setHoveredElement}
                    onPreviewEnd={() => setHoveredElement(null)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="periodic-table__zoom-readout" aria-live="polite">
          <strong>{Math.round(tableScale * 100)}%</strong><span>WHEEL / PINCH</span>
        </div>

        <div className={`periodic-table__inspector-shell${inspectorActive ? ' periodic-table__inspector-shell--active' : ''}`}>
          <ElementInspector element={previewElement} active={inspectorActive} />
        </div>
      </div>

      <footer className="periodic-table__legend" aria-label="Element categories">
        {Object.entries(ELEMENT_CATEGORIES).map(([key, category]) => (
          <span key={key}><i style={{ background: category.tone }} />{category.label}</span>
        ))}
      </footer>
    </section>
  )
}
