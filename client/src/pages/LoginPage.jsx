import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setCredentials } = useAppStore()

  const [form, setForm] = useState({
    accountId: '',
    consumerKey: '',
    consumerSecret: '',
    tokenKey: '',
    tokenSecret: '',
  })
  const [showFields, setShowFields] = useState({
    consumerSecret: false,
    tokenSecret: false,
  })
  const [rememberAccount, setRememberAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('ns_account_id')
    if (saved) {
      setForm(f => ({ ...f, accountId: saved }))
      setRememberAccount(true)
    }
  }, [])

  const toggle = (field) => setShowFields(s => ({ ...s, [field]: !s[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (rememberAccount) {
      localStorage.setItem('ns_account_id', form.accountId)
    } else {
      localStorage.removeItem('ns_account_id')
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')

      const creds = { ...form }
      sessionStorage.setItem('ns_credentials', JSON.stringify(creds))
      setCredentials(creds)
      navigate('/po-search')
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Network error — check your connection and try again.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'accountId', label: 'Account ID', placeholder: '3550424', type: 'text' },
    { key: 'consumerKey', label: 'Consumer Key', placeholder: '••••••••', type: 'text' },
    { key: 'consumerSecret', label: 'Consumer Secret', placeholder: '••••••••', type: showFields.consumerSecret ? 'text' : 'password', toggle: 'consumerSecret' },
    { key: 'tokenKey', label: 'Token Key', placeholder: '••••••••', type: 'text' },
    { key: 'tokenSecret', label: 'Token Secret', placeholder: '••••••••', type: showFields.tokenSecret ? 'text' : 'password', toggle: 'tokenSecret' },
  ]

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <div className="text-amber-400 text-xs font-mono tracking-widest uppercase mb-2">Loop ERP</div>
        <h1 className="text-2xl font-bold text-white">Packing List<br />Receipt App</h1>
        <p className="text-slate-400 text-sm mt-2">Enter your NetSuite credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ key, label, placeholder, type, toggle: tog }) => (
          <div key={key}>
            <label className="block text-xs text-slate-400 mb-1 font-mono uppercase tracking-wider">{label}</label>
            <div className="relative">
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required
                className="w-full bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[48px]"
              />
              {tog && (
                <button
                  type="button"
                  onClick={() => toggle(tog)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono"
                >
                  {showFields[tog] ? 'HIDE' : 'SHOW'}
                </button>
              )}
            </div>
          </div>
        ))}

        <label className="flex items-center gap-3 cursor-pointer py-2">
          <input
            type="checkbox"
            checked={rememberAccount}
            onChange={e => setRememberAccount(e.target.checked)}
            className="w-5 h-5 rounded accent-amber-400"
          />
          <span className="text-sm text-slate-300">Remember Account ID</span>
        </label>

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 text-navy-900 font-bold py-4 rounded-lg text-base min-h-[52px] transition-colors"
        >
          {loading ? 'Connecting...' : 'Connect to NetSuite'}
        </button>
      </form>
    </div>
  )
}
