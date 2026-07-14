export function rankProfiles(profiles) {
    return [...(profiles || [])].sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
}
