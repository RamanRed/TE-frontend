'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, GitBranch, Loader2, RefreshCw, Search, X } from 'lucide-react'
import { type HistorySession, historyApi, storeOrGetTriplet } from '@/lib/history-api'
import type { FiveWhyChainItem, IshikawaCategory } from '@/lib/root-cause'

interface HistorySidebarProps {
  onLoad: (session: {
    query: string
    domain: string
    ishikawa: IshikawaCategory[]
    fiveWhys: FiveWhyChainItem[]
  }) => void
}

function timeAgo(iso: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function groupByDate(sessions: HistorySession[]) {
  const now = Date.now()
  const groups: { label: string; items: HistorySession[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
  ]
  for (const s of sessions) {
    const diff = Math.floor((now - new Date(s.created_at).getTime()) / 86400000)
    if (diff === 0) groups[0].items.push(s)
    else if (diff === 1) groups[1].items.push(s)
    else if (diff < 7) groups[2].items.push(s)
    else groups[3].items.push(s)
  }
  return groups.filter(g => g.items.length > 0)
}

export function HistorySidebar({ onLoad }: HistorySidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const triplet = storeOrGetTriplet()
      const res = await historyApi.fetchHistory(triplet)
      setSessions(res.success ? (res.sessions ?? []) : [])
      if (!res.success) setError(res.message ?? 'Failed to load history.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasFetched.current) { hasFetched.current = true; fetchHistory() }
  }, [])

  const filtered = sessions.filter(s =>
    !search.trim() ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.query?.toLowerCase().includes(search.toLowerCase()) ||
    s.domain?.toLowerCase().includes(search.toLowerCase()),
  )

  const grouped = groupByDate(filtered)

  const handleLoad = (session: HistorySession) => {
    setActiveId(session.session_id)
    onLoad({ query: session.query, domain: session.domain, ishikawa: session.ishikawa, fiveWhys: session.five_whys })
  }

  return (
    <aside
      style={{
        width: collapsed ? 52 : 260,
        minWidth: collapsed ? 52 : 260,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: '#fafafa',
        borderRight: '1px solid #e5e7eb',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '14px 0' : '14px 12px',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
        gap: 8,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Clock size={15} color="#6b7280" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
              History
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '4px 5px',
            cursor: 'pointer',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Collapsed icon-strip */}
      {collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0' }}>
          <button
            onClick={fetchHistory}
            title="Refresh"
            style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#9ca3af', borderRadius: 6, display: 'flex' }}
          >
            <RefreshCw size={14} />
          </button>
          {sessions.slice(0, 15).map(s => {
            const isActive = activeId === s.session_id
            return (
              <button
                key={s.session_id}
                onClick={() => handleLoad(s)}
                title={s.title || s.query}
                style={{
                  width: 32, height: 32,
                  borderRadius: 6,
                  border: isActive ? '2px solid #f97316' : '1px solid #e5e7eb',
                  background: isActive ? '#fff7ed' : '#fff',
                  cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                  color: isActive ? '#f97316' : '#6b7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                  flexShrink: 0,
                }}
              >
                {(s.title || s.query).charAt(0).toUpperCase()}
              </button>
            )
          })}
        </div>
      )}

      {/* Expanded panel */}
      {!collapsed && (
        <>
          {/* Search */}
          <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '6px 26px 6px 28px',
                  fontSize: 12,
                  color: '#374151',
                  background: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#f97316' }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#e5e7eb' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Refresh row */}
          <div style={{ padding: '0 10px 8px', flexShrink: 0 }}>
            <button
              onClick={fetchHistory}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 6, padding: '5px 10px',
                fontSize: 11, fontWeight: 600, color: '#6b7280',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
            >
              {loading
                ? <Loader2 size={11} className="animate-spin" />
                : <RefreshCw size={11} />}
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div style={{ height: 1, background: '#f3f4f6', flexShrink: 0 }} />

          {/* Session list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {error ? (
              <p style={{ margin: '12px 10px', fontSize: 11, color: '#ef4444', lineHeight: 1.5, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
                {error}
              </p>
            ) : loading && sessions.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 10px', gap: 8, color: '#9ca3af' }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: 11 }}>Loading…</span>
              </div>
            ) : grouped.length === 0 ? (
              <div style={{ padding: '32px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 11, lineHeight: 1.6 }}>
                {search ? `No results for "${search}"` : 'No saved analyses yet.\nRun and save an analysis to see history.'}
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.label}>
                  <p style={{ padding: '8px 12px 3px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    {group.label}
                  </p>
                  {group.items.map(session => {
                    const isActive = activeId === session.session_id
                    return (
                      <button
                        key={session.session_id}
                        onClick={() => handleLoad(session)}
                        title={session.query}
                        style={{
                          width: '100%',
                          display: 'flex', flexDirection: 'column', gap: 3,
                          padding: '8px 12px',
                          background: isActive ? '#fff7ed' : 'transparent',
                          border: 'none',
                          borderLeft: `3px solid ${isActive ? '#f97316' : 'transparent'}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s, border-color 0.1s',
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        {/* Title */}
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: isActive ? '#c2410c' : '#111827',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                        }}>
                          {session.title || session.query}
                        </span>

                        {/* Meta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, color: '#fff', fontWeight: 600,
                            background: '#f97316', borderRadius: 4, padding: '1px 5px',
                          }}>
                            {session.domain}
                          </span>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>
                            {timeAgo(session.created_at)}
                          </span>
                        </div>

                        {/* First root cause */}
                        {session.root_causes?.[0] && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <GitBranch size={9} style={{ color: '#d1d5db', flexShrink: 0, marginTop: 2 }} />
                            <span style={{
                              fontSize: 10, color: '#9ca3af', lineHeight: 1.35,
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {session.root_causes[0]}
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {sessions.length > 0 && (
            <div style={{ borderTop: '1px solid #f3f4f6', padding: '7px 12px', fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              {search && filtered.length !== sessions.length && ` · ${filtered.length} shown`}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
