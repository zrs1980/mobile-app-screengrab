import { useState, useEffect } from 'react'
import useAppStore from '../store/useAppStore'

export default function SubsidiaryPicker() {
  const { credentials, setSubsidiary, setLocation } = useAppStore()
  const [subsidiaries, setSubsidiaries] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/netsuite/subsidiaries', {
      headers: { 'x-ns-credentials': JSON.stringify(credentials) }
    })
      .then(r => r.json())
      .then(d => { setSubsidiaries(d.subsidiaries || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!selectedSub) return
    setLoading(true)
    fetch(`/api/netsuite/locations?subsidiaryId=${selectedSub.id}`, {
      headers: { 'x-ns-credentials': JSON.stringify(credentials) }
    })
      .then(r => r.json())
      .then(d => { setLocations(d.locations || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [selectedSub])

  const confirm = () => {
    if (selectedSub && selectedLoc) {
      setSubsidiary(selectedSub)
      setLocation(selectedLoc)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col px-6 py-12">
      <div className="mb-8">
        <div className="text-amber-400 text-xs font-mono tracking-widest uppercase mb-2">Setup</div>
        <h1 className="text-xl font-bold text-white">Select Location</h1>
        <p className="text-slate-400 text-sm mt-1">Choose your subsidiary and warehouse location</p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-2 font-mono uppercase tracking-wider">Subsidiary</label>
          <select
            value={selectedSub?.id || ''}
            onChange={e => {
              const sub = subsidiaries.find(s => s.id === e.target.value)
              setSelectedSub(sub || null)
              setSelectedLoc(null)
            }}
            className="w-full bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-400 min-h-[48px]"
          >
            <option value="">Select subsidiary...</option>
            {subsidiaries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {selectedSub && (
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-mono uppercase tracking-wider">Location</label>
            <select
              value={selectedLoc?.id || ''}
              onChange={e => setSelectedLoc(locations.find(l => l.id === e.target.value) || null)}
              className="w-full bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-400 min-h-[48px]"
            >
              <option value="">Select location...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        <button
          onClick={confirm}
          disabled={!selectedSub || !selectedLoc}
          className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/30 text-navy-900 font-bold py-4 rounded-lg text-base min-h-[52px] transition-colors mt-4"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
