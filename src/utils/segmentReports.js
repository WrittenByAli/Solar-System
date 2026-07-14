/** Segment reports for moderator review — persisted in Supabase (`segment_reports`). */
import { supabase } from './supabaseClient.js'

// Retained for import compatibility; no longer used as a storage key.
export const SEGMENT_REPORTS_LS = 'solarArchiveSegmentReports'

export async function loadSegmentReports() {
    const { data, error } = await supabase
        .from('segment_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
    if (error) return []
    return (data || []).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        planet: r.planet,
        coordX: r.coord_x,
        coordY: r.coord_y,
        archiveLayer: r.archive_layer,
        segmentIndex: r.segment_index,
        segmentLabel: r.segment_label,
        excerptAtOpen: r.excerpt_at_open,
        subject: r.subject,
        summary: r.summary,
        detail: r.detail,
        authorUsername: r.author_username,
        attachments: r.attachments || [],
    }))
}

export async function appendSegmentReport(entry) {
    const payload = {
        planet: entry.planet || '',
        coord_x: String(entry.coordX ?? ''),
        coord_y: String(entry.coordY ?? ''),
        archive_layer: String(entry.archiveLayer ?? ''),
        segment_index: String(entry.segmentIndex ?? ''),
        segment_label: entry.segmentLabel || '',
        excerpt_at_open: entry.excerptAtOpen || '',
        subject: entry.subject || '',
        summary: entry.summary || '',
        detail: entry.detail || '',
        author_username: entry.authorUsername || '',
        attachments: entry.attachments || [],
    }
    const { data, error } = await supabase.from('segment_reports').insert(payload).select().maybeSingle()
    if (error) {
        const err = new Error('Could not submit this segment report.')
        err.cause = error
        throw err
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('solar-segment-reports-updated', { detail: data }))
    }
    return data
}
