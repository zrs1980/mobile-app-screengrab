import { useState } from 'react'
import MatchBadge from './MatchBadge'

export default function LineItemRow({ line, poLines, onChange }) {
  const [showMatch, setShowMatch] = useState(false)
  const overQty = line.poLine && line.qtyToReceive > (line.poLine.quantityremaining || 0)

  return (
    <div className={`px-4 py-4 ${!line.include ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={line.include}
          onChange={e => onChange({ include: e.target.checked })}
          className="w-5 h-5 mt-1 rounded accent-amber-400 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm text-white font-mono truncate">{line.extracted.description}</span>
            <MatchBadge confidence={line.confidence} />
          </div>

          {line.extracted.partNumber && (
            <div className="text-xs text-slate-400 font-mono mb-2">Part: {line.extracted.partNumber}</div>
          )}

          {line.poLine ? (
            <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-2">
              <div className="bg-navy-700 rounded px-2 py-1">
                <div className="text-slate-400">PO Remaining</div>
                <div className="text-white">{line.poLine.quantityremaining ?? '—'}</div>
              </div>
              <div className="bg-navy-700 rounded px-2 py-1">
                <div className="text-slate-400">Extracted</div>
                <div className="text-white">{line.extracted.quantity}</div>
              </div>
              <div className={`rounded px-2 py-1 ${overQty ? 'bg-red-900/40 border border-red-500/30' : 'bg-navy-700'}`}>
                <div className="text-slate-400">To Receive</div>
                <input
                  type="number"
                  value={line.qtyToReceive}
                  min="0"
                  step="any"
                  onChange={e => onChange({ qtyToReceive: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-white focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <button
                onClick={() => setShowMatch(!showMatch)}
                className="text-xs text-amber-400 font-mono underline"
              >
                {showMatch ? 'Cancel' : 'Match to PO line'}
              </button>
              {showMatch && (
                <select
                  className="mt-2 w-full bg-navy-800 border border-navy-600 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  onChange={e => {
                    const pl = poLines.find(p => String(p.line) === e.target.value)
                    onChange({
                      poLine: pl || null,
                      confidence: pl ? 'manual' : null,
                      qtyToReceive: pl ? line.extracted.quantity : 0
                    })
                    setShowMatch(false)
                  }}
                  defaultValue=""
                >
                  <option value="">Select PO line...</option>
                  {poLines.map(pl => (
                    <option key={pl.line} value={pl.line}>
                      {pl.line}. {pl.itemName} (Rem: {pl.quantityremaining})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {overQty && (
            <div className="text-xs text-red-300 font-mono mt-1">⚠ Exceeds PO remaining quantity</div>
          )}
        </div>
      </div>
    </div>
  )
}
