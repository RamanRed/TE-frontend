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
  FileText,
  X,
} from 'lucide-react'
import { HistoryViewer } from '@/components/history-viewer'
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
    // Ensure we capture the full session data for the transfer
    const transferData = {
      query: session.query,
      domain: session.domain,
      ishikawa: session.ishikawa || [],
      fiveWhys: session.five_whys || [],
    }
    sessionStorage.setItem('te_load_session', JSON.stringify(transferData))
    // Use window.location.href to force a clean mount of the home page
    window.location.href = '/'
  }

  return (
    <div style={{
      padding: '16px 20px', background: expanded ? '#ffffff' : '#f8fafc',
      borderRadius: 16, border: `1px solid ${expanded ? '#f1f5f9' : '#e2e8f0'}`,
      boxShadow: expanded ? '0 10px 25px rgba(0,0,0,0.06)' : '0 2px 4px rgba(0,0,0,0.02)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 20, padding: '4px' }}>
        {/* Left icon box */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', flexShrink: 0, border: '1px solid #e2e8f0',
        }}>
          <FileText size={24} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <h3 style={{
              margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a',
              lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {session.title || session.query}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Calendar size={12} />
              {formatDate(session.created_at)}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#fff',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: 6, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {session.domain}
            </span>
            <div style={{ width: 1, height: 10, background: '#e2e8f0' }} />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              {formatTime(session.created_at)}
            </span>
            {session.cause_count > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: '#059669', fontWeight: 700,
                background: '#f0fdf4', border: '1px solid #dcfce7',
                borderRadius: 6, padding: '2px 8px',
              }}>
                <Layers size={10} /> {session.cause_count} Potential Cause{session.cause_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Root causes preview */}
          {session.root_causes && session.root_causes.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              background: '#f8fafc', padding: '12px', borderRadius: 12,
              border: '1px solid #f1f5f9',
            }}>
              {session.root_causes.slice(0, 2).map((rc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <GitBranch size={12} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>{rc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, justifyContent: 'center' }}>
          <button
            onClick={handleLoad}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0f172a', border: 'none', borderRadius: 10,
              padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#fff',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1e293b';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#0f172a';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none'
            }}
          >
            Restore Analysis <ChevronRight size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#475569',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
          >
            {expanded ? (
              <><ChevronDown size={14} strokeWidth={2.5} /> Hide Details</>
            ) : (
              <><ChevronRight size={14} strokeWidth={2.5} /> View Full Report</>
            )}
          </button>
        </div>
      </div>

      {/* Expanded — read-only HistoryViewer */}
      {expanded && (
        <div style={{
          marginTop: 20, paddingTop: 32, borderTop: '2px solid #f8fafc',
          background: '#fff', borderRadius: 12,
        }}>
          <div style={{ maxWidth: 840, margin: '0 auto' }}>
            <HistoryViewer
              problem={session.query}
              domain={session.domain}
              createdAt={session.created_at}
              ishikawa={session.ishikawa ?? []}
              fiveWhys={session.five_whys ?? []}
            />
            {/* Quick Restore Button at the bottom of the report */}
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleLoad}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none', borderRadius: 12, padding: '14px 28px',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 8px 20px rgba(234, 88, 12, 0.2)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 24px rgba(234, 88, 12, 0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.2)';
                }}
              >
                Restore this Analysis to Editor <ChevronRight size={18} strokeWidth={2.5} />
              </button>
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header section */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid #f1f5f9',
        padding: '32px 24px', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: 12,
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#475569', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#475569' }}
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Analysis Repository
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                Access and restore your past Ishikawa and 5-Why sessions
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search repository..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: '12px 16px 12px 42px', fontSize: 14, color: '#1e293b',
                background: '#f8fafc', outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={e => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#f97316';
                (e.currentTarget as HTMLInputElement).style.background = '#fff';
                (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 4px rgba(249, 115, 22, 0.1)'
              }}
              onBlur={e => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#e2e8f0';
                (e.currentTarget as HTMLInputElement).style.background = '#f8fafc';
                (e.currentTarget as HTMLInputElement).style.boxShadow = 'none'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}>
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 80px' }}>
        {error ? (
          <div style={{
            background: '#fff', border: '1px solid #fee2e2', borderRadius: 20,
            padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a' }}>Failed to Load Repository</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>{error}</p>
            <button
              onClick={fetchHistory}
              style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        ) : loading && sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Loader2 size={40} className="animate-spin" color="#f97316" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, color: '#64748b', fontWeight: 500 }}>Fetching your analysis history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid #f1f5f9', borderRadius: 24,
            padding: '80px 40px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              {search ? 'No Matching Analyses Found' : 'Repository is Empty'}
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: '#64748b', maxWidth: 400,  lineHeight: 1.6 }}>
              {search ? `We couldn't find any sessions matching "${search}".` : 'You haven\'t finalized any root cause analyses yet.'}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
               <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{filtered.length} Session{filtered.length !== 1 ? 's' : ''}</span>
               <button
                  onClick={fetchHistory}
                  style={{ background: 'none', border: 'none', color: '#f97316', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
               >
                 <RefreshCw size={14} /> Refresh List
               </button>
            </div>
            {filtered.map(session => (
              <SessionCard key={session.session_id} session={session} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
