import React, { useRef } from 'react'

/**
 * 6-box one-time-code input.
 * - Auto-advances on digit entry; Backspace steps back
 * - Arrow keys navigate; Home/End jump
 * - Pasting distributes the full code across boxes
 * - Fires onComplete(code) when all boxes are filled
 */
export default function OtpInput({
    length = 6,
    value = '',
    onChange,
    onComplete,
    disabled = false,
    ariaLabel = 'Verification code',
}) {
    const refs = useRef([])
    const digits = Array.from({ length }, (_, i) => value[i] ?? '')

    const commit = (next) => {
        const clean = next.slice(0, length)
        onChange(clean)
        if (clean.length === length && onComplete) onComplete(clean)
    }

    const focusBox = (i) => {
        const el = refs.current[Math.max(0, Math.min(length - 1, i))]
        if (el) { el.focus(); el.select?.() }
    }

    const handleChange = (i, raw) => {
        const d = raw.replace(/\D/g, '')
        if (!d) return
        // typed (or autofilled) more than one digit — treat as paste from box i
        const next = (value.slice(0, i) + d).slice(0, length)
        commit(next)
        focusBox(i + d.length)
    }

    const handleKeyDown = (i, e) => {
        switch (e.key) {
            case 'Backspace': {
                e.preventDefault()
                if (digits[i]) {
                    commit(value.slice(0, i) + value.slice(i + 1))
                } else if (i > 0) {
                    commit(value.slice(0, i - 1) + value.slice(i))
                    focusBox(i - 1)
                }
                break
            }
            case 'ArrowLeft': e.preventDefault(); focusBox(i - 1); break
            case 'ArrowRight': e.preventDefault(); focusBox(i + 1); break
            case 'Home': e.preventDefault(); focusBox(0); break
            case 'End': e.preventDefault(); focusBox(length - 1); break
            default: break
        }
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '')
        if (!pasted) return
        commit(pasted)
        focusBox(pasted.length)
    }

    return (
        <div
            className="sj-otp"
            role="group"
            aria-label={ariaLabel}
            onPaste={handlePaste}
        >
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => { refs.current[i] = el }}
                    id={`sj-otp-digit-${i}`}
                    name={`otp-digit-${i}`}
                    className="sj-otp__box"
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={length /* allow autofill of full code into box 0 */}
                    value={d}
                    disabled={disabled}
                    aria-label={`Digit ${i + 1} of ${length}`}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    autoFocus={i === 0}
                />
            ))}
        </div>
    )
}
