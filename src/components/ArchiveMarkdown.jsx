import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MARKDOWN_PLUGINS = [remarkGfm]

export default function ArchiveMarkdown({ children }) {
    return (
        <ReactMarkdown
            remarkPlugins={MARKDOWN_PLUGINS}
            components={{
                a: ({ href, children: linkChildren }) => (
                    <a
                        href={href}
                        target={href?.startsWith('http') ? '_blank' : undefined}
                        rel={href?.startsWith('http') ? 'noreferrer' : undefined}
                    >
                        {linkChildren}
                    </a>
                ),
            }}
        >
            {children}
        </ReactMarkdown>
    )
}
