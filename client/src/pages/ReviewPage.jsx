import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import LineItemRow from '../components/LineItemRow'

export default function ReviewPage() {
  const navigate = useNavigate()
  const {
    credentials,
    selectedPO,
    subsidiary,
    location,
    matchedLines,
    setMatchedLines,
    setSubmittedReceipt,
    capturedImage
  } = useAppStore()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const unmatched = matchedLines.filter(l => !l.poLine)
  const totalLines = matchedLines.filter(l => l.include).length

  const updateLine = (idx, changes) => {
    setMatchedLines(matchedLines.map((l, i) => i === idx ? { ...l, ...changes } : l))
  }

  const handleSubmit = async () => {
    const toReceive = matchedLines.filter(l => l.include && l.poLine && l.qtyToReceive > 0)
    if (toReceive.length === 0) {
      setError('No lines selected to receive.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 50, 100])

      const res = await fetch('/api/netsuite/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`,
          'x-ns-account-id': credentials.accountId,
        },
        body: JSON.stringify({
          purchaseOrderId: selectedPO.id,
          subsidiaryId: subsidiary.id,
          locationId: location.id,
          tranid: selectedPO.tranid,
          lines: toReceive.map(l => ({
            orderLine: l.poLine.line,
            quantity: l.qtyToReceive,
            locationId: location.id,
          })),
          image: capturedImage,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSubmittedReceipt(data.receipt)
      navigate('/confirm')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      <div className="bg-navy-800 border-b border-navy-600 px-4 py-4 sticky top-0 z-10">
        <div className="text-xs text-amber-400 font-mono uppercase tracking-widest">Review Items</div>
        <div className="text-sm text-slate-300 mt-1 font-mono">{selectedPO?.tranid}</div>
        <div className="text-xs text-slate-400 mt-1">{totalLines} of {matchedLines.length} lines selected</div>
      </div>

      {unmatched.length > 0 && (
        <div className="bg-red-900/30 border-b border-red-500/30 px-4 py-3">
          <div className="text-red-300 text-sm font-mono">
            ⚠ {unmatched.length} unmatched line{unmatched.length > 1 ? 's' : ''} — review required
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-navy-700">
        {matchedLines.map((line, idx) => (
          <LineItemRow
            key={idx}
            line={line}
            poLines={selectedPO?.lines || []}
            onChange={(changes) => updateLine(idx, changes)}
          />
        ))}
      </div>

      <div className="bg-navy-800 border-t border-navy-600 p-4">
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm mb-3">
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 text-navy-900 font-bold py-4 rounded-lg text-base min-h-[52px] transition-colors"
        >
          {submitting ? 'Submitting...' : `Submit Item Receipt (${totalLines} lines)`}
        </button>
      </div>
    </div>
  )
}
