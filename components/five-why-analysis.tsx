'use client'

import { useState } from 'react'
import { Lock, Unlock, RefreshCw } from 'lucide-react'

interface FiveWhyData {
  problem: string
  rows: Array<{
    potentialCause: string
    preventOccurrence: string
    protectEscape: string
    predictSystemic: string
    preventType: string
    escapeType: string
    systemicType: string
  }>
}

const rootCauseTypes = [
  { label: 'Managerial Root Cause', value: 'MRC', color: '#d32f2f' },
  { label: 'Technical Root Cause', value: 'TRC', color: '#1976d2' }
]

const POTENTIAL_CAUSES = [
  'Burr on pin surface', 'Worn tooling not replaced', 'Incorrect material hardness',
  'Operator skipped inspection step', 'Maintenance schedule not followed',
  'Calibration drift in measurement device', 'Temperature variation in process',
  'Supplier part out of tolerance', 'Fixture misalignment', 'Inadequate lubrication',
]
const PREVENT_OCCURRENCE = [
  'Defective part produced due to worn die', 'Process parameter exceeded control limit',
  'Incorrect setup performed by operator', 'Tool wear exceeded threshold',
  'Raw material did not meet specification', 'Inspection step was skipped',
  'Poka-yoke bypassed', 'Wrong revision of work instruction used',
]
const PROTECT_ESCAPE = [
  'Visual inspection insufficient to detect defect', 'Gauge R&R not performed',
  'Sampling plan missed defect', 'Operator not trained for this failure mode',
  'Final check omitted due to time pressure', 'Control chart not monitored',
  'Defect not included in failure catalog', 'No mistake-proofing at this step',
]
const PREDICT_SYSTEMIC = [
  'PFMEA did not include this failure mode', 'Control plan not updated after process change',
  'Risk assessment not reviewed annually', 'Change management process not followed',
  'Lessons learned not transferred from similar project', 'No escalation process for repeated deviations',
  'KPI did not capture this failure category', '',
]
const TYPES = ['TRC', 'MRC']

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const generateRandomRow = () => ({
  potentialCause: pick(POTENTIAL_CAUSES),
  preventOccurrence: pick(PREVENT_OCCURRENCE),
  protectEscape: pick(PROTECT_ESCAPE),
  predictSystemic: pick(PREDICT_SYSTEMIC),
  preventType: pick(TYPES),
  escapeType: pick(TYPES),
  systemicType: pick(TYPES),
})

const generateRandomRows = (count = 4) => Array.from({ length: count }, generateRandomRow)

export function FiveWhyAnalysis() {
  const problem = 'Pin not fitting in assembly'
  const [rows, setRows] = useState(() => generateRandomRows(4))
  const [locked, setLocked] = useState(false)
  // Per-row lock: locked rows are preserved during regeneration
  const [lockedRows, setLockedRows] = useState<boolean[]>(() => Array(4).fill(false))

  const toggleRowLock = (rowIdx: number) => {
    setLockedRows(prev => prev.map((v, i) => i === rowIdx ? !v : v))
  }

  const handleRegenerate = () => {
    // Replace only unlocked rows with fresh random data; keep locked rows
    setRows(prev => prev.map((row, idx) => lockedRows[idx] ? row : generateRandomRow()))
    setLocked(false)
  }

  const handleExport = () => {
    const exportData = { problem, rows };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'five-why-analysis.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFinalize = () => {
    setLocked(true);
    alert('5 Why Analysis finalized!');
  };

  const handleChange = (rowIdx: number, field: string, value: string) => {
    setRows(prev => {
      const updated = prev.map((row, idx) =>
        idx === rowIdx ? { ...row, [field]: value } : row
      )
      return updated
    })
  }

  return (
    <div className="overflow-x-auto mt-6">
      <div className="mb-4 p-3 bg-muted/30 rounded border border-border">
        <span className="text-sm text-muted-foreground mr-2 font-semibold">Problem:</span>
        <span className="font-semibold text-foreground">{problem}</span>
      </div>
      <div className="flex items-center gap-6 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#d32f2f] inline-block border border-border" />
          <span className="text-xs font-semibold">Managerial Root Cause</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#1976d2] inline-block border border-border" />
          <span className="text-xs font-semibold">Technical Root Cause</span>
        </div>
      </div>
      <table className="min-w-full border border-border bg-card rounded-lg text-sm">
        <thead>
          <tr>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2 w-32 align-top" rowSpan={2} style={{ minWidth: 120 }}>Potential Cause</th>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2" colSpan={2}>Prevent Occurrence<br /><span className="font-normal text-xs">(How the defect was created?)</span></th>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2" colSpan={2}>Protect Escape<br /><span className="font-normal text-xs">(How the defect escaped the process controls?)</span></th>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2" colSpan={2}>Predict Systemic<br /><span className="font-normal text-xs">(How the system failed allowing both the occurrences and escape causes?)</span></th>
          </tr>
          <tr>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Description</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Type</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Description</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Type</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Description</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Type</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, rowIdx) => (
            <tr key={rowIdx} style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : undefined }}>
              {/* Potential Cause (Why?) */}
              <td className="border border-border align-top text-center" style={{ minWidth: 120, backgroundColor: lockedRows[rowIdx] ? '#d6eaf8' : 'white' }}>
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="mb-1 flex items-center gap-1">
                    <span className="inline-block text-[1.2rem] font-bold text-orange-500">Why?</span>
                    <button
                      className="p-0.5 rounded hover:bg-gray-100 transition"
                      onClick={() => toggleRowLock(rowIdx)}
                      title={lockedRows[rowIdx] ? 'Unlock this row' : 'Lock this row'}
                      aria-label={lockedRows[rowIdx] ? 'Unlock row' : 'Lock row'}
                      type="button"
                    >
                      {lockedRows[rowIdx]
                        ? <Lock className="w-3.5 h-3.5 text-blue-600" />
                        : <Unlock className="w-3.5 h-3.5 text-gray-400" />
                      }
                    </button>
                  </div>
                  <textarea
                    className="w-full min-w-[100px] min-h-[40px] border border-border rounded p-1 text-xs text-foreground resize-y"
                    style={{ backgroundColor: lockedRows[rowIdx] ? '#d6eaf8' : 'white' }}
                    value={row.potentialCause}
                    onChange={e => handleChange(rowIdx, 'potentialCause', e.target.value)}
                    aria-label="Potential Cause"
                    rows={1}
                    disabled={locked || lockedRows[rowIdx]}
                  />
                </div>
              </td>
              {/* Prevent Occurrence */}
              <td className="border border-border align-top" style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}>
                <textarea
                  className="w-full min-h-[40px] border border-border rounded p-1 text-xs text-foreground resize-y"
                  style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}
                  value={row.preventOccurrence}
                  onChange={e => handleChange(rowIdx, 'preventOccurrence', e.target.value)}
                  aria-label="Prevent Occurrence"
                  rows={1}
                  disabled={locked || lockedRows[rowIdx]}
                />
              </td>
              <td className="border border-border align-top w-20 overflow-visible relative z-10" style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}>
                <select
                  className="w-full text-xs rounded border border-border"
                  aria-label="Prevent Occurrence Type"
                  value={row.preventType}
                  onChange={e => handleChange(rowIdx, 'preventType', e.target.value)}
                  style={{ position: 'relative', zIndex: 10, backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}
                  disabled={locked || lockedRows[rowIdx]}
                >
                  <option value="">Type</option>
                  {rootCauseTypes.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color }}>{opt.label}</option>
                  ))}
                </select>
              </td>
              {/* Protect Escape */}
              <td className="border border-border align-top" style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}>
                <textarea
                  className="w-full min-h-[40px] border border-border rounded p-1 text-xs text-foreground resize-y"
                  style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}
                  value={row.protectEscape}
                  onChange={e => handleChange(rowIdx, 'protectEscape', e.target.value)}
                  aria-label="Protect Escape"
                  rows={1}
                  disabled={locked || lockedRows[rowIdx]}
                />
              </td>
              <td className="border border-border align-top w-20 overflow-visible relative z-10" style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}>
                <select
                  className="w-full text-xs rounded border border-border"
                  aria-label="Protect Escape Type"
                  value={row.escapeType}
                  onChange={e => handleChange(rowIdx, 'escapeType', e.target.value)}
                  style={{ position: 'relative', zIndex: 10, backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}
                  disabled={locked || lockedRows[rowIdx]}
                >
                  <option value="">Type</option>
                  {rootCauseTypes.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color }}>{opt.label}</option>
                  ))}
                </select>
              </td>
              {/* Predict Systemic */}
              <td className="border border-border align-top" style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}>
                <textarea
                  className="w-full min-h-[40px] border border-border rounded p-1 text-xs text-foreground resize-y"
                  style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}
                  value={row.predictSystemic}
                  onChange={e => handleChange(rowIdx, 'predictSystemic', e.target.value)}
                  aria-label="Predict Systemic"
                  rows={1}
                  disabled={locked || lockedRows[rowIdx]}
                />
              </td>
              <td className="border border-border align-top w-20 overflow-visible relative z-10" style={{ backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}>
                <select
                  className="w-full text-xs rounded border border-border"
                  aria-label="Predict Systemic Type"
                  value={row.systemicType}
                  onChange={e => handleChange(rowIdx, 'systemicType', e.target.value)}
                  style={{ position: 'relative', zIndex: 10, backgroundColor: lockedRows[rowIdx] ? '#e8f4fd' : 'white' }}
                  disabled={locked || lockedRows[rowIdx]}
                >
                  <option value="">Type</option>
                  {rootCauseTypes.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color }}>{opt.label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4 justify-end">
        <button
          className="px-6 py-2 rounded bg-secondary text-foreground font-semibold shadow hover:bg-orange-700 hover:text-white transition flex items-center gap-2"
          onClick={handleRegenerate}
          aria-label="Regenerate unlocked rows"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
        {!locked && (
          <button
            className="px-6 py-2 rounded bg-primary text-white font-semibold shadow hover:bg-orange-700 transition"
            onClick={handleFinalize}
            aria-label="Finalize 5 Why Analysis"
          >
            Finalize
          </button>
        )}
        <button
          className="px-6 py-2 rounded bg-accent text-white font-semibold shadow hover:bg-orange-700 transition"
          onClick={handleExport}
          aria-label="Export 5 Why Analysis"
        >
          Export
        </button>
      </div>
    </div>
  )
}
