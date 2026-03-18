import { buildNSAuthHeader } from './_nsAuth.js'

/**
 * POST /api/auth
 * Validates NetSuite TBA credentials by making a lightweight test call.
 * Returns 200 { ok: true } on success, 401 on bad credentials.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { accountId, consumerKey, consumerSecret, tokenKey, tokenSecret } = req.body || {}

  if (!accountId || !consumerKey || !consumerSecret || !tokenKey || !tokenSecret) {
    return res.status(400).json({ error: 'All credential fields are required' })
  }

  const creds = { accountId, consumerKey, consumerSecret, tokenKey, tokenSecret }

  // Lightweight validation: fetch a single subsidiary record
  const testUrl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/record/v1/subsidiary?limit=1`

  try {
    const authHeader = buildNSAuthHeader('GET', testUrl, creds)
    const response = await fetch(testUrl, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Prefer: 'transient',
      },
    })

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({
        error: 'Invalid credentials — check your Consumer Key/Secret and Token Key/Secret',
      })
    }

    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({ error: `NetSuite error: ${text}` })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Auth error:', err)
    return res.status(500).json({ error: 'Network error connecting to NetSuite' })
  }
}
