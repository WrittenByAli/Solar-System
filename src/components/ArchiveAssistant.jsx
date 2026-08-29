import React, { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
    RotateCcw,
    Send,
    Sparkles,
    Square,
    X,
} from 'lucide-react'
import '../styles/archive-assistant.css'

const ArchiveMarkdown = lazy(() => import('./ArchiveMarkdown.jsx'))

const STARTERS = [
    'How does the 8-layer archive work?',
    'Which hub should I explore?',
    'How can I submit research?',
]

const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant',
    content: 'Welcome to The Solar Archive. I can help you navigate the hubs, explain archive content, or answer a general question. Where should we begin?',
}

function createMessage(role, content) {
    return {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role,
        content,
    }
}

function ArchiveGuideMark({ size = 22 }) {
    return (
        <svg
            className="archive-assistant__mark"
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
        >
            <circle className="archive-assistant__mark-ring" cx="16" cy="16" r="5.4" />
            <path className="archive-assistant__mark-orbit" d="M4.5 16c3.1-5.1 7-7.7 11.5-7.7S24.4 10.9 27.5 16C24.4 21.1 20.5 23.7 16 23.7S7.6 21.1 4.5 16Z" />
            <path className="archive-assistant__mark-axis" d="M16 3.5v6.2M16 22.3v6.2M3.5 16h6.2M22.3 16h6.2" />
            <circle className="archive-assistant__mark-core" cx="16" cy="16" r="2.15" />
            <circle className="archive-assistant__mark-star" cx="24.4" cy="10.1" r="1.25" />
        </svg>
    )
}

function plainMarkdownFallback(content) {
    return content.replace(/\*\*|__/g, '')
}

export default function ArchiveAssistant() {
    const location = useLocation()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([WELCOME_MESSAGE])
    const [input, setInput] = useState('')
    const [status, setStatus] = useState('idle')
    const [error, setError] = useState('')
    const inputRef = useRef(null)
    const scrollRef = useRef(null)
    const abortRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return undefined
        const previousBodyOverflow = document.body.style.overflow
        const previousBodyPaddingRight = document.body.style.paddingRight
        const previousRootOverflow = document.documentElement.style.overflow
        const previousRootOverscroll = document.documentElement.style.overscrollBehavior
        const scrollbarGap = window.innerWidth - document.documentElement.clientWidth
        const timer = window.setTimeout(() => inputRef.current?.focus(), 180)
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setIsOpen(false)
        }
        document.body.classList.add('archive-guide-scroll-locked')
        document.body.style.overflow = 'hidden'
        if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.style.overscrollBehavior = 'none'
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('keydown', handleKeyDown)
            document.body.classList.remove('archive-guide-scroll-locked')
            document.body.style.overflow = previousBodyOverflow
            document.body.style.paddingRight = previousBodyPaddingRight
            document.documentElement.style.overflow = previousRootOverflow
            document.documentElement.style.overscrollBehavior = previousRootOverscroll
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: status === 'streaming' ? 'auto' : 'smooth',
        })
    }, [isOpen, messages, status])

    useEffect(() => () => abortRef.current?.abort(), [])

    const resetChat = () => {
        abortRef.current?.abort()
        abortRef.current = null
        setMessages([WELCOME_MESSAGE])
        setInput('')
        setError('')
        setStatus('idle')
        inputRef.current?.focus()
    }

    const stopResponse = () => {
        abortRef.current?.abort()
        abortRef.current = null
        setStatus('idle')
    }

    const sendMessage = async (suggestedPrompt) => {
        const content = String(suggestedPrompt || input).trim()
        if (!content || status === 'streaming') return

        const userMessage = createMessage('user', content)
        const assistantMessage = createMessage('assistant', '')
        const conversation = [...messages, userMessage]

        setInput('')
        setError('')
        setStatus('streaming')
        setMessages([...conversation, assistantMessage])

        const controller = new AbortController()
        abortRef.current = controller

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page: location.pathname,
                    messages: conversation
                        .filter(message => message.id !== 'welcome')
                        .slice(-12)
                        .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
                }),
                signal: controller.signal,
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'The Archive Guide is unavailable right now.')
            }
            if (!response.body) throw new Error('No response stream was returned.')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let answer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                answer += decoder.decode(value, { stream: true })
                setMessages(current => current.map(message => (
                    message.id === assistantMessage.id
                        ? { ...message, content: answer }
                        : message
                )))
            }

            answer += decoder.decode()
            if (!answer.trim()) throw new Error('The assistant returned an empty response.')
        } catch (requestError) {
            if (requestError.name !== 'AbortError') {
                setError(requestError.message || 'Something interrupted the response.')
                setMessages(current => current.filter(message => (
                    message.id !== assistantMessage.id || message.content.trim()
                )))
            }
        } finally {
            if (abortRef.current === controller) abortRef.current = null
            setStatus('idle')
        }
    }

    const onSubmit = (event) => {
        event.preventDefault()
        sendMessage()
    }

    const onInputKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            sendMessage()
        }
    }

    return (
        <aside className={`archive-assistant ${isOpen ? 'archive-assistant--open' : ''}`}>
            {isOpen && (
                <section
                    className="archive-assistant__panel"
                    role="dialog"
                    aria-label="Archive Guide chatbot"
                    aria-modal="false"
                    onWheel={event => event.stopPropagation()}
                    onTouchMove={event => event.stopPropagation()}
                >
                    <div className="archive-assistant__orbit" aria-hidden="true" />
                    <header className="archive-assistant__header">
                        <div className="archive-assistant__identity">
                            <span className="archive-assistant__avatar" aria-hidden="true">
                                <ArchiveGuideMark size={23} />
                            </span>
                            <span>
                                <strong>Archive Guide</strong>
                                <small><i /> Grounded in this archive</small>
                            </span>
                        </div>
                        <div className="archive-assistant__actions">
                            <button type="button" onClick={resetChat} aria-label="Start a new conversation" title="New conversation">
                                <RotateCcw size={16} />
                            </button>
                            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Archive Guide">
                                <X size={18} />
                            </button>
                        </div>
                    </header>

                    <div className="archive-assistant__messages" ref={scrollRef} aria-live="polite">
                        <div className="archive-assistant__intro">
                            <Sparkles size={15} aria-hidden="true" />
                            <span>Explore the coordinate universe</span>
                        </div>
                        {messages.map(message => (
                            <div key={message.id} className={`archive-assistant__message archive-assistant__message--${message.role}`}>
                                {message.role === 'assistant' && (
                                    <span className="archive-assistant__mini-avatar" aria-hidden="true"><ArchiveGuideMark size={16} /></span>
                                )}
                                <div className="archive-assistant__bubble">
                                    {message.content && message.role === 'assistant' ? (
                                        <Suspense fallback={plainMarkdownFallback(message.content)}>
                                            <ArchiveMarkdown>{message.content}</ArchiveMarkdown>
                                        </Suspense>
                                    ) : message.content || (
                                        <span className="archive-assistant__typing" aria-label="Archive Guide is thinking">
                                            <i /><i /><i />
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {messages.length === 1 && (
                            <div className="archive-assistant__starters" aria-label="Suggested questions">
                                {STARTERS.map(prompt => (
                                    <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="archive-assistant__error" role="alert">
                                {error}
                            </div>
                        )}
                    </div>

                    <form className="archive-assistant__composer" onSubmit={onSubmit}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={event => setInput(event.target.value.slice(0, 4_000))}
                            onKeyDown={onInputKeyDown}
                            placeholder="Ask about the archive or anything else..."
                            aria-label="Message Archive Guide"
                            rows={1}
                        />
                        {status === 'streaming' ? (
                            <button type="button" className="archive-assistant__send archive-assistant__send--stop" onClick={stopResponse} aria-label="Stop response">
                                <Square size={15} fill="currentColor" />
                            </button>
                        ) : (
                            <button type="submit" className="archive-assistant__send" disabled={!input.trim()} aria-label="Send message">
                                <Send size={17} />
                            </button>
                        )}
                        <small>Enter to send · Shift + Enter for a new line</small>
                    </form>
                </section>
            )}

            {!isOpen && (
                <button
                    type="button"
                    className="archive-assistant__launcher"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Archive Guide"
                    title="Ask the Archive Guide"
                >
                    <span className="archive-assistant__launcher-ring" aria-hidden="true" />
                    <ArchiveGuideMark size={29} />
                    <Sparkles className="archive-assistant__launcher-spark" size={13} aria-hidden="true" />
                </button>
            )}
        </aside>
    )
}
