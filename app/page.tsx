'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, History, Loader2, MessageCircle, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

import Chatbot from '@/components/chatbot'
import EightDManager from '@/components/eightd-manager'
import { FiveWhyAnalysis } from '@/components/five-why-analysis'
import { HistorySidebar } from '@/components/history-sidebar'
import { IshikawaDiagram } from '@/components/ishikawa-diagram'
import { IshikawaImageRequest } from '@/components/ishikawa-image-request'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { historyApi, storeOrGetTriplet } from '@/lib/history-api'
import {
  type FiveWhyChainItem,
  type IshikawaCategory,
  getRootCauseApiBaseUrl,
  normalizeFiveWhyAnalysis,
  normalizeIshikawaCategories,
  rootCauseApi,
} from '@/lib/root-cause'

const CURRENT_YEAR = new Date().getFullYear()

const EXAMPLES = [
  'Customer complaints about inconsistent product quality in final inspection',
  'Repeated downtime on the filling line during peak production hours',
  'Late project delivery caused by cross-team dependency slips',
  'High employee turnover in the packaging department',
  'Escaped defects reaching customers despite in-process checks',
]

type BusyAction =
  | 'analyze'
  | 'regenerate-ishikawa'
  | 'generate-five-why'
  | 'regenerate-five-why'
  | 'finalize'
  | null

type SaveToast = 'saving' | 'saved' | 'error' | null

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while contacting the API.'
}

/** Small floating toast shown after auto-save */
function SaveToast({ state }: { state: SaveToast }) {
  if (!state) return null
  const configs = {
    saving: { bg: '#f9fafb', border: '#e5e7eb', color: '#374151', icon: <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />, text: 'Saving to history…' },
    saved:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: <CheckCircle2 size={13} />, text: 'Saved to history' },
    error:  { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: <AlertCircle size={13} />, text: 'Save failed — check console' },
  } as const
  const c = configs[state]
  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 7,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: '8px 14px',
      fontSize: 12, fontWeight: 600, color: c.color,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'opacity 0.2s',
    }}>
      {c.icon} {c.text}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ChatbotFloating() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-4 text-white shadow-lg transition hover:bg-orange-700"
        onClick={() => setOpen(true)}
        aria-label="Open Chatbot"
      >
        <MessageCircle className="size-6" />
        <span className="hidden font-semibold md:inline">Chatbot</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 md:items-center">
          <div className="relative m-4 w-full max-w-md md:m-12 md:max-w-xl" onClick={e => e.stopPropagation()}>
            <Chatbot />
            <button
              className="absolute top-3 right-3 z-[60] rounded-full bg-accent p-2 text-white shadow transition hover:bg-orange-700"
              onClick={() => setOpen(false)}
              aria-label="Close Chatbot"
            >✕</button>
          </div>
        </div>
      )}
    </>
  )
}

export default function Home() {
  const router = useRouter()

  const [problem, setProblem] = useState('')
  const [domain, setDomain] = useState('Manufacturing')
  const [pastRecord, setPastRecord] = useState(String(CURRENT_YEAR))
  const [ishikawaData, setIshikawaData] = useState<IshikawaCategory[] | null>(null)
  const [fiveWhyData, setFiveWhyData] = useState<FiveWhyChainItem[] | null>(null)
  const [finalSummary, setFinalSummary] = useState<Record<string, unknown> | null>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [activeTab, setActiveTab] = useState('input')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveToast, setSaveToast] = useState<SaveToast>(null)

  const isBusy = busyAction !== null
  const apiBaseUrl = useMemo(() => getRootCauseApiBaseUrl(), [])

  // ── Auto-save helper — uses problem statement as session title, no modal ──
  const autoSave = useCallback(async (ishikawa: IshikawaCategory[], fiveWhys: FiveWhyChainItem[], query: string) => {
    setSaveToast('saving')
    try {
      const triplet = storeOrGetTriplet()
      const res = await historyApi.saveAnalysis({
        ...triplet,
        domain: domain.trim(),
        query,
        past_record: Number.parseInt(pastRecord, 10) || CURRENT_YEAR,
        session_title: query.trim().slice(0, 120), // problem statement IS the title
        ishikawa,
        analysis: fiveWhys,
      })
      setSaveToast(res.success ? 'saved' : 'error')
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveToast('error')
    } finally {
      setTimeout(() => setSaveToast(null), 2800)
    }
  }, [domain, pastRecord])

  // Load session injected from history page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('te_load_session')
      if (raw) {
        sessionStorage.removeItem('te_load_session')
        const s = JSON.parse(raw) as { query: string; domain: string; ishikawa: IshikawaCategory[]; fiveWhys: FiveWhyChainItem[] }
        setProblem(s.query)
        setDomain(s.domain)
        setIshikawaData(normalizeIshikawaCategories(s.ishikawa))
        setFiveWhyData(normalizeFiveWhyAnalysis(s.fiveWhys))
        setFinalSummary(null)
        startTransition(() => setActiveTab('ishikawa'))
      }
    } catch { /* ignore */ }
  }, [])

  // Elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (busyAction) {
      setElapsedSeconds(0)
      elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
      setElapsedSeconds(0)
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [busyAction])

  const statusLabel = useMemo(() => {
    switch (busyAction) {
      case 'analyze': return 'Generating Ishikawa diagram'
      case 'regenerate-ishikawa': return 'Refreshing unlocked Ishikawa causes'
      case 'generate-five-why': return 'Generating 5-Why analysis'
      case 'regenerate-five-why': return 'Refreshing unlocked 5-Why chains'
      case 'finalize': return 'Finalizing summary'
      default: return null
    }
  }, [busyAction])

  const requestPayload = useMemo(() => ({
    domain: domain.trim(),
    query: problem.trim(),
    past_record: Number.parseInt(pastRecord, 10) || CURRENT_YEAR,
  }), [domain, pastRecord, problem])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!requestPayload.query) return
    setBusyAction('analyze')
    setErrorMessage(null)
    setFiveWhyData(null)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.generateProblem(requestPayload)
      setIshikawaData(normalizeIshikawaCategories(res.ishikawa))
      startTransition(() => setActiveTab('ishikawa'))
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  const handleIshikawaRegenerate = async (lockedData: IshikawaCategory[]) => {
    if (!requestPayload.query) return
    setBusyAction('regenerate-ishikawa')
    setErrorMessage(null)
    setFiveWhyData(null)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.regenerateIshikawa({ ...requestPayload, locked_result: lockedData })
      setIshikawaData(normalizeIshikawaCategories(res.ishikawa))
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  /**
   * "Finalize Ishikawa" → generates 5-Why, then auto-saves both to history silently.
   */
  const handleIshikawaFinalize = async (finalData: IshikawaCategory[]) => {
    setBusyAction('generate-five-why')
    setErrorMessage(null)
    const normalizedIshikawa = normalizeIshikawaCategories(finalData)
    setIshikawaData(normalizedIshikawa)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.generateFiveWhy({ ...requestPayload, ishikawa: finalData })
      const normalized5Why = normalizeFiveWhyAnalysis(res.analysis)
      setFiveWhyData(normalized5Why)
      startTransition(() => setActiveTab('five-why'))
      // Auto-save silently — no modal
      void autoSave(normalizedIshikawa, normalized5Why, requestPayload.query)
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  const handleFiveWhyRegenerate = async (lockedAnalysis: FiveWhyChainItem[]) => {
    if (!ishikawaData) return
    setBusyAction('regenerate-five-why')
    setErrorMessage(null)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.regenerateFiveWhy({ ...requestPayload, ishikawa: ishikawaData, locked_analysis: lockedAnalysis })
      setFiveWhyData(normalizeFiveWhyAnalysis(res.analysis))
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  /**
   * "Finalize Analysis" (5-Why) → generates final summary, then auto-saves again silently.
   */
  const handleFiveWhyFinalize = async (analysis: FiveWhyChainItem[]) => {
    if (!ishikawaData) return
    setBusyAction('finalize')
    setErrorMessage(null)
    const normalized5Why = normalizeFiveWhyAnalysis(analysis)
    setFiveWhyData(normalized5Why)
    try {
      const res = await rootCauseApi.finalizeAnalysis({
        domain: requestPayload.domain,
        query: requestPayload.query,
        ishikawa: ishikawaData,
        analysis,
      })
      setFinalSummary(res.summary ?? {})
      // Auto-save silently with latest data
      void autoSave(ishikawaData, normalized5Why, requestPayload.query)
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  // History sidebar load
  const handleHistoryLoad = (session: { query: string; domain: string; ishikawa: IshikawaCategory[]; fiveWhys: FiveWhyChainItem[] }) => {
    setProblem(session.query)
    setDomain(session.domain)
    setIshikawaData(normalizeIshikawaCategories(session.ishikawa))
    setFiveWhyData(normalizeFiveWhyAnalysis(session.fiveWhys))
    setFinalSummary(null)
    setErrorMessage(null)
    startTransition(() => setActiveTab('ishikawa'))
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Left History Sidebar ── */}
      <HistorySidebar onLoad={handleHistoryLoad} />

      {/* ── Main Content ── */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,136,0,0.16),_transparent_30%),linear-gradient(135deg,_rgba(255,229,180,0.35),_transparent_42%),linear-gradient(180deg,_var(--background),_rgba(245,245,245,0.9))] px-4 py-6 md:px-8 md:py-10"
      >
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Hero section */}
          <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-sm backdrop-blur">
            <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.25fr_0.75fr] md:px-10 md:py-10">
              <div className="space-y-5">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  AI Root Cause Workflow
                </Badge>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                    Turn one problem statement into an Ishikawa, a 5-Why chain, and a final action summary.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                    Analyses are automatically saved to history when you finalize the Ishikawa or the 5-Why.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1">Editable mapped causes</span>
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1">Lock-aware regeneration</span>
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1">Auto-saved to history</span>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push('/history')}>
                  <History className="size-4" />
                  View Full History
                </Button>
              </div>

              <Card className="gap-4 border-border bg-white/80 px-6 py-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Connection Status</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configure <code>NEXT_PUBLIC_API_BASE_URL</code> if your backend is not on the default host.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Active API base</p>
                  <p className="mt-2 break-all text-sm font-medium text-foreground">{apiBaseUrl}</p>
                </div>
                {statusLabel ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span>
                      {statusLabel}
                      {elapsedSeconds > 5 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({elapsedSeconds}s — LLM inference can take several minutes)
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Ready for a new analysis run.
                  </div>
                )}
              </Card>
            </div>
          </section>

          {errorMessage && (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertCircle className="size-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-card p-2 md:grid-cols-4">
              <TabsTrigger value="input" className="rounded-xl">Input</TabsTrigger>
              <TabsTrigger value="ishikawa" disabled={!ishikawaData?.length} className="rounded-xl">Ishikawa</TabsTrigger>
              <TabsTrigger value="five-why" disabled={!fiveWhyData?.length} className="rounded-xl">5 Why</TabsTrigger>
              <TabsTrigger value="eightd" className="rounded-xl">
                <FileText className="mr-1 inline size-4" />8D Docs
              </TabsTrigger>
            </TabsList>

            <ChatbotFloating />

            {/* Input tab */}
            <TabsContent value="input" className="mt-6 space-y-6">
              <Card className="gap-5 border-border px-6 py-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">Describe Your Problem</h2>
                  <p className="text-sm text-muted-foreground">
                    Provide the problem statement and context. The analysis is auto-saved to history when you finalize.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="domain" className="text-sm font-medium text-foreground">Domain</label>
                    <Input id="domain" value={domain} onChange={e => setDomain(e.target.value)} placeholder="Manufacturing" disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="past-record" className="text-sm font-medium text-foreground">Historical Reference Year</label>
                    <Input id="past-record" type="number" min={1900} max={CURRENT_YEAR} value={pastRecord} onChange={e => setPastRecord(e.target.value)} placeholder={String(CURRENT_YEAR)} disabled={isBusy} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="problem" className="text-sm font-medium text-foreground">Problem Statement</label>
                  <Textarea
                    id="problem"
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    placeholder="Describe the failure, symptom, or recurring issue you want to investigate..."
                    className="min-h-32 resize-y"
                    disabled={isBusy}
                    onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleAnalyze() }}
                  />
                  <p className="text-xs text-muted-foreground">Press Ctrl/Cmd + Enter to submit quickly.</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">Step 1 of 3: Generate Ishikawa</Badge>
                  <Button onClick={handleAnalyze} disabled={!problem.trim() || isBusy} size="lg">
                    {busyAction === 'analyze' ? <><Loader2 className="size-4 animate-spin" />Analyzing…</> : 'Analyze Problem'}
                  </Button>
                </div>
              </Card>

              <Card className="gap-4 border-border px-6 py-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Quick Examples</h3>
                  <p className="text-sm text-muted-foreground">Use one of these to test the API wiring and the downstream tabs.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {EXAMPLES.map(example => (
                    <button
                      key={example}
                      onClick={() => setProblem(example)}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/40"
                      disabled={isBusy}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Ishikawa tab */}
            <TabsContent value="ishikawa" className="mt-6">
              {ishikawaData && (
                <>
                  <IshikawaDiagram
                    problem={problem}
                    data={ishikawaData}
                    busy={isBusy}
                    onRegenerate={handleIshikawaRegenerate}
                    onFinalize={handleIshikawaFinalize}
                  />
                  <IshikawaImageRequest problem={problem} data={ishikawaData} />
                </>
              )}
            </TabsContent>

            {/* 5-Why tab */}
            <TabsContent value="five-why" className="mt-6">
              {fiveWhyData && (
                <FiveWhyAnalysis
                  problem={problem}
                  data={fiveWhyData}
                  summary={finalSummary}
                  busy={isBusy}
                  onRegenerate={handleFiveWhyRegenerate}
                  onFinalize={handleFiveWhyFinalize}
                />
              )}
            </TabsContent>

            {/* 8D tab */}
            <TabsContent value="eightd" className="mt-6">
              <EightDManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Auto-save toast ── */}
      <SaveToast state={saveToast} />
    </div>
  )
}
