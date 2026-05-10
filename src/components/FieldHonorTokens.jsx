import React, { useEffect, useMemo, useState } from 'react'
import { getExpertHonorRank, getFactCheckerHonorRank } from '../utils/fieldLeaderboards.js'

const MEDAL = {
    1: { emoji: '🥇', label: 'Gold' },
    2: { emoji: '🥈', label: 'Silver' },
    3: { emoji: '🥉', label: 'Bronze' },
}

/**
 * Gold / silver / bronze tokens for top-three experts (approved submissions) and
 * top-three fact-checkers (grades filed) on a single planet hub.
 */
export default function FieldHonorTokens({ username, planetId, planetLabel }) {
    const [tick, setTick] = useState(0)
    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-profile-updated', bump)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => {
            window.removeEventListener('solar-archive-profile-updated', bump)
            window.removeEventListener('solar-archive-submissions-updated', bump)
        }
    }, [])

    const { expert, checker } = useMemo(() => {
        if (!username || !planetId) return { expert: null, checker: null }
        return {
            expert: getExpertHonorRank(username, planetId),
            checker: getFactCheckerHonorRank(username, planetId),
        }
    }, [username, planetId, tick])

    if (expert == null && checker == null) return null

    const lbl = planetLabel || planetId

    return (
        <span className="inline-flex items-center gap-0.5 shrink-0 translate-y-px" role="group" aria-label="Field honor medals">
            {expert != null && (
                <span title={`Expert contributor — ${MEDAL[expert].label} on ${lbl}`} className="leading-none cursor-default text-[13px]">
                    {MEDAL[expert].emoji}
                </span>
            )}
            {checker != null && (
                <span title={`Fact-checker — ${MEDAL[checker].label} on ${lbl}`} className="leading-none cursor-default text-[13px]">
                    {MEDAL[checker].emoji}
                </span>
            )}
        </span>
    )
}
