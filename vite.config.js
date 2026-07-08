import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

export default defineConfig({
    plugins: [react()],
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
})
