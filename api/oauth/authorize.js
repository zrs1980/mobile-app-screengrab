import crypto from 'crypto'

/**
 * GET /api/oauth/authorize?accountId=XXX
 * Redirects the user to NetSuite's OAuth 2.0 login page.
 */
export default function handler(req, res) {
  const { accountId } = req.query
  if (!accountId) return res.status(400).json({ error: 'accountId is required' })

  const clientId = process.env.NS_CLIENT_ID
  if (!clientId) return res.status(500).json({ error: 'NS_CLIENT_ID is not configured' })

  const appUrl = process.env.APP_URL
  if (!appUrl) return res.status(500).json({ error: 'APP_URL is not configured' })

  // Encode accountId into state to retrieve it in the callback
  const nonce = crypto.randomBytes(16).toString('hex')
  const state = Buffer.from(JSON.stringify({ accountId, nonce })).toString('base64url')

  const redirectUri = `${appUrl}/api/oauth/callback`

  // NetSuite uses account subdomain with dashes (not underscores)
  const accountSubdomain = accountId.toLowerCase().replace(/_/g, '-')
  const authUrl = new URL(
    `https://${accountSubdomain}.app.netsuite.com/app/login/oauth2/authorize.nl`
  )
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'rest_webservices')
  authUrl.searchParams.set('state', state)

  return res.redirect(302, authUrl.toString())
}
