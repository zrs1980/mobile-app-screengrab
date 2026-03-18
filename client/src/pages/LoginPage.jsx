import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [accountId, setAccountId] = useState('')
  const [rememberAccount, setRememberAccount] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('ns_account_id')
    if (saved) {
      setAccountId(saved)
      setRememberAccount(true)
    }
    // Check for error passed back from OAuth callback
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) setError(decodeURIComponent(err))
  }, [])

  const handleLogin = () => {
    if (!accountId.trim()) return
    if (rememberAccount) {
      localStorage.setItem('ns_account_id', accountId.trim())
    } else {
      localStorage.removeItem('ns_account_id')
    }
    window.location.href = `/api/oauth/authorize?accountId=${encodeURIComponent(accountId.trim())}`
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <div className="text-amber-400 text-xs font-mono tracking-widest uppercase mb-2">Loop ERP</div>
        <h1 className="text-2xl font-bold text-white">Packing List<br />Receipt App</h1>
        <p className="text-slate-400 text-sm mt-2">Sign in with your NetSuite account</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-mono uppercase tracking-wider">Account ID</label>
          <input
            type="text"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="e.g. 3550424"
            autoFocus
            className="w-full bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[48px]"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer py-1">
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
            {error === 'access_denied' ? 'Access denied — please try again.' : `Sign in failed: ${error}`}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!accountId.trim()}
          className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/30 disabled:cursor-not-allowed text-navy-900 font-bold py-4 rounded-lg text-base min-h-[52px] transition-colors flex items-center justify-center gap-2"
        >
          <span>Login with NetSuite</span>
          <span>→</span>
        </button>

        <p className="text-xs text-slate-500 text-center font-mono mt-2">
          You will be redirected to NetSuite to sign in
        </p>
      </div>
    </div>
  )
}
