/**
 * GET /api/oauth/callback?code=XXX&state=XXX
 * Exchanges the authorization code for an access token, then redirects
 * to the SPA with the token in the URL hash fragment.
 */
export default async function handler(req, res) {
  const { code, state, error: oauthError } = req.query

  if (oauthError) {
    return res.redirect(302, `/?error=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !state) {
    return res.redirect(302, '/?error=missing_code')
  }

  // Decode state to recover accountId
  let accountId
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    accountId = decoded.accountId
  } catch {
    return res.redirect(302, '/?error=invalid_state')
  }

  const clientId = process.env.NS_CLIENT_ID
  const clientSecret = process.env.NS_CLIENT_SECRET
  const appUrl = process.env.APP_URL

  if (!clientId || !clientSecret || !appUrl) {
    return res.redirect(302, '/?error=server_misconfigured')
  }

  const redirectUri = `${appUrl}/api/oauth/callback`

  // NetSuite token endpoint uses underscores in account ID
  const accountApiId = accountId.toLowerCase().replace(/-/g, '_')
  const tokenUrl = `https://${accountApiId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`

  try {
    const basicCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error('Token exchange failed:', text)
      return res.redirect(302, `/?error=${encodeURIComponent('Token exchange failed')}`)
    }

    const tokens = await tokenRes.json()
    const accessToken = tokens.access_token

    // Redirect to the SPA callback route with token in hash (not logged by servers)
    const destination = `/auth/callback#access_token=${encodeURIComponent(accessToken)}&account_id=${encodeURIComponent(accountId)}`
    return res.redirect(302, destination)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return res.redirect(302, `/?error=${encodeURIComponent('Authentication failed')}`)
  }
}
