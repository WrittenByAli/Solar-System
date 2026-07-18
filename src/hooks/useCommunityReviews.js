import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import {
  COMMUNITY_REVIEWS_PAGE_SIZE,
  fetchCommunityReviews,
} from '../utils/communityReviews.js'

const POLL_MS_CONNECTED = 60_000
const POLL_MS_DISCONNECTED = 15_000
const SEARCH_DEBOUNCE_MS = 320

export function useCommunityReviews({
  sort = 'newest',
  filters = {},
  enabled = true,
} = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [connectionState, setConnectionState] = useState('connecting')

  const cursorRef = useRef(null)
  const mountedRef = useRef(true)
  const pollTimerRef = useRef(null)
  const channelRef = useRef(null)
  const searchTimerRef = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '')

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  )

  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search || '')
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(searchTimerRef.current)
  }, [filters.search])

  const loadPage = useCallback(async ({ append = false } = {}) => {
    if (!enabled) return
    if (append) setLoadingMore(true)
    else setLoading(true)

    const result = await fetchCommunityReviews({
      cursor: append ? cursorRef.current : null,
      limit: COMMUNITY_REVIEWS_PAGE_SIZE,
      sort,
      filters: effectiveFilters,
    })

    if (!mountedRef.current) return

    if (result.error) {
      setError(result.error.message || 'Unable to load community reviews.')
      if (!append) setItems([])
      setHasMore(false)
    } else {
      setError(null)
      setItems((prev) => (append ? [...prev, ...result.items] : result.items))
      setHasMore(result.hasMore)
      cursorRef.current = result.nextCursor
    }

    setLoading(false)
    setLoadingMore(false)
  }, [enabled, sort, effectiveFilters])

  const reload = useCallback(() => {
    cursorRef.current = null
    return loadPage({ append: false })
  }, [loadPage])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return
    return loadPage({ append: true })
  }, [hasMore, loadingMore, loading, loadPage])

  useEffect(() => {
    mountedRef.current = true
    cursorRef.current = null
    reload()
    return () => { mountedRef.current = false }
  }, [reload])

  useEffect(() => {
    if (!enabled) {
      setConnectionState('disconnected')
      return undefined
    }

    let cancelled = false
    const schedulePoll = (ms) => {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = setInterval(() => { reload() }, ms)
    }

    const channel = supabase
      .channel(`community-reviews-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, () => reload())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'archive_entries' }, () => reload())
      .subscribe((status) => {
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected')
          schedulePoll(POLL_MS_CONNECTED)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionState('disconnected')
          schedulePoll(POLL_MS_DISCONNECTED)
        } else {
          setConnectionState('connecting')
        }
      })

    channelRef.current = channel

    return () => {
      cancelled = true
      clearInterval(pollTimerRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, reload])

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    connectionState,
    reload,
    loadMore,
  }
}
