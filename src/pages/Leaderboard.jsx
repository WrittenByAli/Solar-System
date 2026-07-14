import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import VantaFogBackground from '../components/solar-archive/VantaFogBackground.jsx'
import AvatarCircle from '../components/AvatarCircle.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { buildObservatoryModel } from '../utils/leaderboardObservatory.js'
import fallbackData from '../data/researchData.json'
import '../styles/solar-leaderboard.css'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData

const DEMO_PROFILES = [
    { username: 'OrionNova', points: 14520, reviewsCompleted: 412, approvedTotal: 188, contributionsByPlanet: { sun: 42, jupiter: 38, mars: 28 }, approvedByLayer: { '4': 40, '5': 50, '6': 45, '7': 30, '8': 23 }, reviewsByPlanet: { sun: 80, earth: 60, mars: 55 } },
    { username: 'aurora_reviewer', points: 12840, reviewsCompleted: 310, approvedTotal: 142, contributionsByPlanet: { sun: 35, earth: 40, jupiter: 22 }, reviewsByPlanet: { sun: 90, earth: 70, mars: 50 } },
    { username: 'orbit_cartographer', points: 9820, reviewsCompleted: 245, approvedTotal: 118, contributionsByPlanet: { earth: 45, venus: 30, saturn: 20 }, reviewsByPlanet: { earth: 80, venus: 55 } },
    { username: 'solar_factcheck', points: 7640, reviewsCompleted: 198, approvedTotal: 95, contributionsByPlanet: { jupiter: 40, mercury: 25 }, reviewsByPlanet: { jupiter: 100, mercury: 45 } },
    { username: 'bio_dome_archivist', points: 5820, reviewsCompleted: 156, approvedTotal: 72, contributionsByPlanet: { earth: 50, venus: 22 }, reviewsByPlanet: { earth: 70, venus: 40 } },
    { username: 'mars_systems', points: 4210, reviewsCompleted: 112, approvedTotal: 58, contributionsByPlanet: { mars: 45, mercury: 13 }, reviewsByPlanet: { mars: 80 } },
    { username: 'neptune_waterlab', points: 3180, reviewsCompleted: 88, approvedTotal: 42, contributionsByPlanet: { neptune: 35, saturn: 7 }, reviewsByPlanet: { neptune: 60 } },
    { username: 'quantum_scribe', points: 2640, reviewsCompleted: 72, approvedTotal: 35, contributionsByPlanet: { sun: 20, jupiter: 15 }, reviewsByPlanet: { sun: 40 } },
    { username: 'venus_grower', points: 1980, reviewsCompleted: 54, approvedTotal: 28, contributionsByPlanet: { venus: 28 }, reviewsByPlanet: { venus: 35 } },
    { username: 'saturn_ecology', points: 1540, reviewsCompleted: 41, approvedTotal: 22, contributionsByPlanet: { saturn: 22 }, reviewsByPlanet: { saturn: 28 } },
]

const PODIUM_ORDER = [
    { place: 2, rankIndex: 1 },
    { place: 1, rankIndex: 0 },
    { place: 3, rankIndex: 2 },
]

const PODIUM_TONE = { 1: 'gold-1', 2: 'gold-2', 3: 'gold-3' }

function PodiumColumn({ contributor, place, isMe, avatarUrl }) {
    if (!contributor) return <div className="obs-podium__col obs-podium__col--empty" aria-hidden />

    const tone = PODIUM_TONE[place]

    return (
        <motion.div
            className={`obs-podium__col obs-podium__col--${place}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: place === 1 ? 0.1 : place === 2 ? 0 : 0.2 }}
        >
            <div className={`obs-podium__player obs-podium__player--${tone}`}>
                <span className={`obs-podium__tag obs-podium__tag--${tone}`}>
                    {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
                </span>
                <div className={`obs-podium__avatar obs-podium__avatar--${tone}`}>
                    <AvatarCircle username={contributor.username} avatarUrl={avatarUrl} size={place === 1 ? 72 : 58} />
                </div>
                <div className="obs-podium__identity">
                    <p className="obs-podium__name">{contributor.username}</p>
                    {isMe ? <span className="obs-podium__you">you</span> : null}
                </div>
                <p className="obs-podium__points">{contributor.points.toLocaleString()}</p>
            </div>
            <div className={`obs-podium__pedestal obs-podium__pedestal--${tone}`}>
                <span className={`obs-podium__badge obs-podium__badge--${tone}`}>{place}</span>
            </div>
        </motion.div>
    )
}

function LeaderboardTable({ rows, myUsername, resolveAvatar }) {
    if (rows.length === 0) return null

    return (
        <div className="obs-lb-table-wrap">
            <div className="obs-lb-table__head" aria-hidden>
                <span className="obs-lb-th obs-lb-th--rank">#</span>
                <span className="obs-lb-th obs-lb-th--player">Player</span>
                <span className="obs-lb-th obs-lb-th--points">Points</span>
                <span className="obs-lb-th obs-lb-th--entries">Entries</span>
            </div>
            <ol className="obs-lb-table" aria-label="Rankings">
                {rows.map((c) => {
                    const isMe = myUsername && c.username === myUsername
                    return (
                        <li key={`${c.userId || c.username}-${c.rank}`} className={`obs-lb-row${isMe ? ' obs-lb-row--me' : ''}`}>
                            <span className="obs-lb-row__rank">{c.rank}</span>
                            <div className="obs-lb-row__player">
                                <AvatarCircle username={c.username} avatarUrl={resolveAvatar(c)} size={36} />
                                <div className="obs-lb-row__identity">
                                    <span className="obs-lb-row__name">{c.username}</span>
                                    {isMe ? <span className="obs-lb-row__you">you</span> : null}
                                </div>
                            </div>
                            <span className="obs-lb-row__points">{c.points.toLocaleString()}</span>
                            <span className="obs-lb-row__entries">{c.approvedTotal || 0}</span>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}

export default function Leaderboard() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { username: myUsername, avatarUrl: myAvatarUrl } = useAuth()
    const [sceneReveal, setSceneReveal] = useState(0)
    const [supaProfiles, setSupaProfiles] = useState([])
    const [refreshing, setRefreshing] = useState(false)
    const [tick, setTick] = useState(0)

    useEffect(() => { window.scrollTo(0, 0) }, [])

    useEffect(() => {
        let frame
        const start = performance.now()
        const duration = 900
        const tickReveal = (now) => {
            const p = Math.min(1, (now - start) / duration)
            setSceneReveal(1 - Math.pow(1 - p, 3))
            if (p < 1) frame = requestAnimationFrame(tickReveal)
        }
        frame = requestAnimationFrame(tickReveal)
        return () => cancelAnimationFrame(frame)
    }, [])

    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-profile-updated', bump)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => {
            window.removeEventListener('solar-archive-profile-updated', bump)
            window.removeEventListener('solar-archive-submissions-updated', bump)
        }
    }, [])

    const loadLeaderboard = async () => {
        const { data: rows } = await supabase
            .from('leaderboard_view')
            .select('*')
            .order('rank')
            .limit(100)

        const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))]
        const avatarByUserId = {}

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('users_profile')
                .select('id, avatar_url')
                .in('id', userIds)

            for (const profile of profiles || []) {
                avatarByUserId[profile.id] = profile.avatar_url || null
            }
        }

        const built = (rows || []).map((r) => ({
            userId: r.user_id,
            username: r.username,
            avatarUrl: avatarByUserId[r.user_id] || r.avatar_url || null,
            points: r.points || 0,
            reviewsCompleted: r.reviews_completed || 0,
            approvedTotal: r.approved_total || 0,
            contributionsByPlanet: r.approved_by_planet || {},
            approvedByLayer: r.approved_by_layer || {},
            reviewsByPlanet: r.reviews_by_planet || {},
        }))
        setSupaProfiles(built)
    }

    useEffect(() => {
        let active = true
        loadLeaderboard().catch(() => { if (active) setSupaProfiles([]) })
        return () => { active = false }
    }, [tick])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await supabase.rpc('refresh_leaderboard_view')
            await loadLeaderboard()
        } finally {
            setRefreshing(false)
        }
    }

    const rawProfiles = supaProfiles.length > 0 ? supaProfiles : DEMO_PROFILES

    const model = useMemo(
        () => buildObservatoryModel(rawProfiles, researchData.planets),
        [rawProfiles],
    )

    const topThree = model.contributors.slice(0, 3)
    const rest = model.contributors.slice(3, 25)

    const resolveAvatar = (contributor) => {
        if (myUsername && contributor.username === myUsername && myAvatarUrl) {
            return myAvatarUrl
        }
        return contributor.avatarUrl || null
    }

    return (
        <div className={`solar-page obs-page${isDark ? ' obs-page--dark' : ' obs-page--light'}`}>
            <VantaFogBackground
                isDark={isDark}
                entryReveal={sceneReveal}
                className="obs-page__vanta"
            />
            <div
                className="obs-page__veil"
                style={{ opacity: Math.max(0, (isDark ? 0.18 : 0.06) - sceneReveal * (isDark ? 0.14 : 0.05)) }}
                aria-hidden="true"
            />
            <div
                className="obs-page__vignette"
                style={{ opacity: isDark ? 0.28 + sceneReveal * 0.05 : 0.08 + sceneReveal * 0.02 }}
                aria-hidden="true"
            />

            <div className="obs-page__inner obs-page__inner--podium" style={{ opacity: sceneReveal }}>
                <header className="obs-hero obs-hero--compact">
                    <h1 className="obs-hero__title">Top Contributors</h1>
                    <button
                        type="button"
                        className="obs-refresh-btn"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw size={14} className={refreshing ? 'obs-spin' : ''} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </header>

                <section className="obs-podium" aria-label="Top three contributors">
                    {PODIUM_ORDER.map(({ place, rankIndex }) => (
                        <PodiumColumn
                            key={place}
                            place={place}
                            contributor={topThree[rankIndex]}
                            isMe={myUsername && topThree[rankIndex]?.username === myUsername}
                            avatarUrl={topThree[rankIndex] ? resolveAvatar(topThree[rankIndex]) : null}
                        />
                    ))}
                </section>

                <p className="obs-podium-cta">
                    Ranked by knowledge points from approved archive contributions.
                </p>

                <LeaderboardTable rows={rest} myUsername={myUsername} resolveAvatar={resolveAvatar} />
            </div>
        </div>
    )
}
