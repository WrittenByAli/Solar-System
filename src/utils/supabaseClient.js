import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast, loudly, at boot — never run with a silently broken config.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

/**
 * When Clerk is registered as a Supabase third-party auth provider
 * (Supabase dashboard → Authentication → Third-party auth → Clerk)
 * set VITE_SUPABASE_THIRD_PARTY_AUTH=true. Every request then carries
 * the Clerk session JWT, so RLS policies (supabase_rls.sql) can match
 * auth.jwt()->>'sub' against users_profile.clerk_id.
 *
 * Leave the flag unset until that dashboard step is done — sending a
 * token Supabase can't verify would reject every request.
 */
const useClerkToken = import.meta.env.VITE_SUPABASE_THIRD_PARTY_AUTH === 'true'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    ...(useClerkToken && {
        accessToken: async () => {
            try {
                return (await window.Clerk?.session?.getToken()) ?? null
            } catch {
                return null
            }
        },
    }),
})
