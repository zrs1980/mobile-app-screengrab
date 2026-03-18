import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setCredentials } = useAppStore()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const accountId = params.get('account_id')

    if (accessToken && accountId) {
      const creds = { accountId, accessToken }
      sessionStorage.setItem('ns_credentials', JSON.stringify(creds))
      setCredentials(creds)
      // Clear token from URL bar
      window.history.replaceState(null, '', '/auth/callback')
      navigate('/po-search', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-amber-400 font-mono text-sm">Completing sign in...</div>
      </div>
    </div>
  )
}
