'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { type HistorySession, historyApi, storeOrGetTriplet } from '@/lib/history-api'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return iso }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function SessionCard({ session }: { session: HistorySession }) {
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const handleLoad = () => {
    sessionStorage.setItem('te_load_session', JSON.stringify({
      query: session.query, domain: session.domain,
      ishikawa: session.ishikawa, fiveWhys: session.five_whys,
    }))
    router.push('/')
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      {/* Card body */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
              {session.title || session.query}
            </h3>
            {session.title && session.title !== session.query && (
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{session.query}</p>
            )}

            {/* Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#fff',
                background: '#f97316', borderRadius: 5, padding: '2px 8px',
              }}>{session.domain}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: '#6b7280', background: '#f9fafb',
                border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 8px',
              }}>
                <Calendar size={10} /> {formatDate(session.created_at)} · {formatTime(session.created_at)}
              </span>
              {session.cause_count > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: '#059669', background: '#f0fdf4',
                  border: '1px solid #bbf7d0', borderRadius: 5, padding: '2px 8px',
                }}>
                  <Layers size={10} /> {session.cause_count} cause{session.cause_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Root causes preview */}
            {session.root_causes?.slice(0, 2).map((rc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                <GitBranch size={11} style={{ color: '#d1d5db', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{rc}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button
              onClick={handleLoad}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#f97316', border: 'none', borderRadius: 7,
                padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ea6c0a' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f97316' }}
            >
              Load <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setExpanded(x => !x)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 7, padding: '6px 12px',
                fontSize: 11, fontWeight: 600, color: '#6b7280',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
            >
              {expanded ? <><ChevronDown size={11} /> Less</> : <><ChevronRight size={11} /> Preview</>}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded data preview */}
      {expanded && (
        <div style={{
          borderTop: '1px solid #f3f4f6',
          padding: '14px 20px',
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          background: '#fafafa',
        }}>
          {/* Ishikawa */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Ishikawa Categories
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(session.ishikawa ?? []).slice(0, 6).map(cat => (
                <div key={cat.category} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{cat.category}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{cat.result?.length ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5-Why */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              5-Why Root Causes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(session.five_whys ?? []).length === 0 ? (
                <span style={{ fontSize: 11, color: '#9ca3af' }}>No 5-Why data</span>
              ) : (session.five_whys ?? []).slice(0, 4).map((item, i) => (
                <div key={i} style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px',
                }}>
                  <span style={{
                    fontSize: 11, color: '#374151', lineHeight: 1.35,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.root_cause || item.problem_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const triplet = storeOrGetTriplet()
      const res = await historyApi.fetchHistory(triplet)
      if (res.success) setSessions(res.sessions ?? [])
      else setError(res.message ?? 'Failed to load history.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchHistory() }, [])

  const filtered = sessions.filter(s =>
    !search.trim() ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.query?.toLowerCase().includes(search.toLowerCase()) ||
    s.domain?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      padding: '0',
    }}>
      {/* Top nav bar */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#374151', padding: '6px 8px',
            borderRadius: 6, transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Analysis History</span>
        {sessions.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#f97316',
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: 999, padding: '2px 8px',
          }}>
            {sessions.length}
          </span>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by title, query, or domain…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
                padding: '9px 32px 9px 34px', fontSize: 13, color: '#374151',
                background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.12s',
              }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#f97316' }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#d1d5db' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
              padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>

        {/* Summary line */}
        {!loading && !error && sessions.length > 0 && (
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
            {filtered.length === sessions.length
              ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`
              : `Showing ${filtered.length} of ${sessions.length} sessions`}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12, color: '#9ca3af' }}>
            <Loader2 size={28} className="animate-spin" />
            <span style={{ fontSize: 13 }}>Loading history…</span>
          </div>
        ) : error ? (
          <div style={{
            padding: 16, background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, color: '#dc2626', fontSize: 13,
          }}>
            <strong>Error:</strong> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>
            {search ? `No sessions match "${search}"` : 'No saved analyses yet. Complete and finalize an analysis to see history here.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(session => (
              <SessionCard key={session.session_id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
