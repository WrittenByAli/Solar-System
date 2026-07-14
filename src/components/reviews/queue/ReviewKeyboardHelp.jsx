import React from 'react'
import { HelpCircle, X } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['J', '↓'], action: 'Next entry' },
  { keys: ['K', '↑'], action: 'Previous entry' },
  { keys: ['Enter', 'O'], action: 'Open / close entry' },
  { keys: ['Esc'], action: 'Close detail' },
]

export default function ReviewKeyboardHelp({ open, onClose }) {
  if (!open) return null
  return (
    <>
      <button type="button" className="rq-help-backdrop" aria-label="Close shortcuts" onClick={onClose} />
      <div className="rq-help-sheet" role="dialog" aria-labelledby="rq-help-title" data-testid="rq-keyboard-help">
        <div className="rq-help-sheet__head">
          <h2 id="rq-help-title"><HelpCircle size={16} aria-hidden /> Keyboard shortcuts</h2>
          <button type="button" className="rq-help-sheet__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <ul className="rq-help-sheet__list">
          {SHORTCUTS.map((s) => (
            <li key={s.action}>
              <span className="rq-help-sheet__keys">
                {s.keys.map((k) => (
                  <kbd key={k} className="rq-kbd">{k}</kbd>
                ))}
              </span>
              <span>{s.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
