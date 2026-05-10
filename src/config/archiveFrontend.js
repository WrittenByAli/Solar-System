/**
 * Frontend-only product defaults (no API).
 */
export const PRIMARY_ARCHIVE_HUB_ID = 'earth'

export const ARCHIVE_SOLAR_PUBLIC_URL = 'https://archive.solar'

export function primaryArchivePath() {
    return `/archive/${PRIMARY_ARCHIVE_HUB_ID}`
}
