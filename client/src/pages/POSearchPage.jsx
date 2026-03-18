import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import SubsidiaryPicker from '../components/SubsidiaryPicker'

export default function POSearchPage() {
  const navigate = useNavigate()
  const { credentials, subsidiary, location, setSelectedPO, clearCredentials } = useAppStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Show subsidiary/location picker if not set
  if (!subsidiary || !location) {
    return <SubsidiaryPicker />
  }

  const search = async (q) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ query: q, subsidiaryId: subsidiary.id })
      const res = await fetch(`/api/netsuite/pos?${params}`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'x-ns-account-id': credentials.accountId,
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.pos || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    search('')
  }, [])

  const statusLabel = { B: 'Pending Receipt', D: 'Partially Received', E: 'Pending Bill' }
  const statusColor = {
    B: 'bg-blue-900/50 text-blue-300',
    D: 'bg-yellow-900/50 text-yellow-300',
    E: 'bg-green-900/50 text-green-300'
  }

  const selectPO = async (po) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/netsuite/po/${po.id}`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'x-ns-account-id': credentials.accountId,
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSelectedPO(data.po)
      navigate('/capture')
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const logout = () => {
    sessionStorage.clear()
    clearCredentials()
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <div className="bg-navy-800 border-b border-navy-600 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-amber-400 font-mono uppercase tracking-widest">{subsidiary.name}</div>
            <div className="text-xs text-slate-400 font-mono">{location.name}</div>
          </div>
          <button onClick={logout} className="text-xs text-slate-400 font-mono underline">Logout</button>
        </div>
        <input
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search PO# or vendor..."
          className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-400 min-h-[48px]"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
        )}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-navy-800 rounded-xl h-24 animate-pulse" />)}
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="text-center text-slate-400 py-16">
            <div className="text-4xl mb-3">📦</div>
            <div className="font-mono text-sm">No open purchase orders found</div>
            <div className="text-xs mt-2">Try adjusting your search or check filters</div>
          </div>
        )}
        {results.map(po => (
          <button
            key={po.id}
            onClick={() => selectPO(po)}
            className="w-full bg-navy-800 border border-navy-600 hover:border-amber-400/50 rounded-xl p-4 text-left transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-mono text-amber-400 font-semibold">{po.tranid}</span>
              <span className={`text-xs px-2 py-1 rounded font-mono ${statusColor[po.status] || 'bg-slate-700 text-slate-300'}`}>
                {statusLabel[po.status] || po.status}
              </span>
            </div>
            <div className="text-sm text-white mb-1">{po.vendor}</div>
            <div className="text-xs text-slate-400 font-mono">{po.trandate}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
