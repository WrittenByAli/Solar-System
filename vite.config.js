import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleChatRequest } from './api/chat.js'

// Group the heavyweight SDKs into named vendor chunks so their hashes only
// change when the dependency itself changes — app-code deploys stay cached.
// vendor-three is only reachable through the lazy Home route chunk, so it
// never loads on non-home routes at all.
//
// vendor-react must be pinned explicitly: leaving react/jsx-runtime
// unassigned lets Rollup hoist them into whichever manual chunk it likes —
// it put jsx-runtime inside vendor-three, which made every page (even ones
// with no 3D) pull the 869 KB three chunk just to render JSX.
const VENDOR_CHUNKS = [
    [/[\\/]node_modules[\\/](three|@react-three)[\\/]/, 'vendor-three'],
    [/[\\/]node_modules[\\/]@clerk[\\/]/, 'vendor-clerk'],
    [/[\\/]node_modules[\\/]@supabase[\\/]/, 'vendor-supabase'],
    [/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run|framer-motion|motion-dom|motion-utils)[\\/]/, 'vendor-react'],
]

function localChatApi(apiKey) {
    return {
        name: 'solar-local-chat-api',
        configureServer(server) {
            server.middlewares.use('/api/chat', async (request, response) => {
                try {
                    const body = await new Promise((resolve, reject) => {
                        const chunks = []
                        request.on('data', chunk => chunks.push(chunk))
                        request.on('end', () => resolve(Buffer.concat(chunks)))
                        request.on('error', reject)
                    })
                    const headers = new Headers()
                    if (request.headers['content-type']) headers.set('content-type', request.headers['content-type'])
                    headers.set('x-real-ip', request.socket.remoteAddress || 'local')

                    const webRequest = new Request('http://localhost/api/chat', {
                        method: request.method,
                        headers,
                        body: body.length ? body : undefined,
                    })
                    const webResponse = await handleChatRequest(webRequest, { apiKey })

                    response.statusCode = webResponse.status
                    webResponse.headers.forEach((value, key) => response.setHeader(key, value))
                    if (!webResponse.body) {
                        response.end()
                        return
                    }
                    Readable.fromWeb(webResponse.body).pipe(response)
                } catch (error) {
                    server.config.logger.error(`Local chat API failed: ${error.message}`)
                    response.statusCode = 500
                    response.setHeader('content-type', 'application/json')
                    response.end(JSON.stringify({ error: 'The local Archive Guide failed to start.' }))
                }
            })
        },
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [react(), localChatApi(env.GROQ_API_KEY)],
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        const match = VENDOR_CHUNKS.find(([pattern]) => pattern.test(id))
                        return match ? match[1] : undefined
                    },
                },
            },
        },
    }
})
