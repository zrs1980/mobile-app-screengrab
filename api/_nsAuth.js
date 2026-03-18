import crypto from 'crypto'

/**
 * Build a NetSuite TBA OAuth 1.0a Authorization header.
 *
 * @param {string} method  HTTP method (GET, POST, etc.)
 * @param {string} url     Full request URL including query string
 * @param {object} creds   { accountId, consumerKey, consumerSecret, tokenKey, tokenSecret }
 * @returns {string}       Value for the Authorization header
 */
export function buildNSAuthHeader(method, url, creds) {
  const { accountId, consumerKey, consumerSecret, tokenKey, tokenSecret } = creds

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenKey,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
  }

  // Parse URL to separate base URL from query params
  const urlObj = new URL(url)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`

  // Combine OAuth params + URL query params for signature base string
  const allParams = { ...oauthParams }
  urlObj.searchParams.forEach((v, k) => { allParams[k] = v })

  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${pct(k)}=${pct(allParams[k])}`)
    .join('&')

  const baseString = [
    method.toUpperCase(),
    pct(baseUrl),
    pct(paramString),
  ].join('&')

  const signingKey = `${pct(consumerSecret)}&${pct(tokenSecret)}`
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(baseString)
    .digest('base64')

  oauthParams.oauth_signature = signature
  oauthParams.realm = accountId

  const headerParts = Object.keys(oauthParams)
    .map(k => `${k}="${pct(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

/**
 * Build a Bearer Authorization header for OAuth 2.0 access tokens.
 *
 * @param {string} accessToken
 * @returns {string}
 */
export function buildBearerHeader(accessToken) {
  return `Bearer ${accessToken}`
}

/**
 * Percent-encode a string per RFC 3986 (stricter than encodeURIComponent).
 */
function pct(str) {
  return encodeURIComponent(String(str))
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}
