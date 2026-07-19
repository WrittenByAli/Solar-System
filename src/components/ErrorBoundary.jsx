import React from 'react'

/**
 * Top-level error boundary. Without this, any exception thrown during render
 * (e.g. a malformed Supabase row reaching a component) unmounts the entire
 * SPA to a blank white page with no recovery path. This catches it and shows
 * a themed "something went wrong" panel with a reload.
 *
 * Deliberately self-contained: it uses inline styles and reads the theme
 * straight off <html> rather than through ThemeContext, because the thing
 * that crashed might BE a context provider — the fallback must render even
 * when the app's own styling/context is unavailable.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        // Surface it for logging/observability; do not swallow silently.
        console.error('Uncaught render error:', error, info?.componentStack)
    }

    handleReload = () => {
        window.location.reload()
    }

    render() {
        if (!this.state.error) return this.props.children

        const isLight =
            typeof document !== 'undefined' &&
            document.documentElement.classList.contains('light')

        const bg = isLight ? '#f4f6fb' : '#0a0e17'
        const card = isLight ? '#ffffff' : '#121826'
        const border = isLight ? '#dfe4ef' : '#222b3d'
        const ink = isLight ? '#10151f' : '#eef2fb'
        const ink2 = isLight ? '#3a4356' : '#b3bdd2'
        const accent = isLight ? '#e8912a' : '#f5a83e'

        return (
            <div
                role="alert"
                style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    background: bg,
                    fontFamily:
                        'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                }}
            >
                <div
                    style={{
                        maxWidth: '440px',
                        width: '100%',
                        background: card,
                        border: `1px solid ${border}`,
                        borderRadius: '16px',
                        padding: '32px 28px',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '16px' }} aria-hidden>
                        🛰️
                    </div>
                    <h1 style={{ margin: '0 0 10px', fontSize: '22px', color: ink, letterSpacing: '-0.01em' }}>
                        Something went wrong
                    </h1>
                    <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.6, color: ink2 }}>
                        The archive hit an unexpected error and couldn&rsquo;t finish loading this view.
                        Reloading usually clears it. If it keeps happening, try again in a few minutes.
                    </p>
                    <button
                        type="button"
                        onClick={this.handleReload}
                        style={{
                            appearance: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            background: accent,
                            color: '#0a0e17',
                            fontWeight: 700,
                            fontSize: '15px',
                            padding: '12px 24px',
                            borderRadius: '10px',
                        }}
                    >
                        Reload the archive
                    </button>
                </div>
            </div>
        )
    }
}
