import { buildNSAuthHeader } from './_nsAuth.js'

/**
 * Vercel serverless function — handles all NetSuite proxy routes:
 *
 *   GET  /api/netsuite/subsidiaries
 *   GET  /api/netsuite/locations?subsidiaryId=X
 *   GET  /api/netsuite/pos?subsidiaryId=X&query=Y
 *   GET  /api/netsuite/po/:id
 *   POST /api/netsuite/receipt
 */
export default async function handler(req, res) {
  const rawCreds = req.headers['x-ns-credentials']
  if (!rawCreds) return res.status(401).json({ error: 'Missing credentials header' })

  let creds
  try {
    creds = JSON.parse(rawCreds)
  } catch {
    return res.status(400).json({ error: 'Malformed credentials header' })
  }

  if (!creds.accountId) return res.status(401).json({ error: 'Missing accountId in credentials' })

  const { accountId } = creds
  const NS_BASE = `https://${accountId}.suitetalk.api.netsuite.com/services/rest`
  const SUITEQL_URL = `${NS_BASE}/query/v1/suiteql`

  // Strip the /api/netsuite prefix to get the sub-path
  const path = req.url.replace(/^\/api\/netsuite/, '').split('?')[0]

  try {
    // ------------------------------------------------------------------
    // GET /subsidiaries
    // ------------------------------------------------------------------
    if (req.method === 'GET' && path === '/subsidiaries') {
      const url = `${NS_BASE}/record/v1/subsidiary?limit=100`
      const data = await nsGet(url, creds)
      const subsidiaries = (data.items || []).map(s => ({ id: String(s.id), name: s.name }))
      return res.json({ subsidiaries })
    }

    // ------------------------------------------------------------------
    // GET /locations?subsidiaryId=X
    // ------------------------------------------------------------------
    if (req.method === 'GET' && path === '/locations') {
      const subsidiaryId = req.query?.subsidiaryId
      if (!subsidiaryId) return res.status(400).json({ error: 'subsidiaryId is required' })
      const sql = `
        SELECT id, name
        FROM location
        WHERE subsidiary = ${Number(subsidiaryId)}
          AND isinactive = 'F'
        ORDER BY name
      `
      const data = await nsSuiteQL(SUITEQL_URL, sql, creds)
      const locations = (data.items || []).map(l => ({ id: String(l.id), name: l.name }))
      return res.json({ locations })
    }

    // ------------------------------------------------------------------
    // GET /pos?subsidiaryId=X&query=Y
    // ------------------------------------------------------------------
    if (req.method === 'GET' && path === '/pos') {
      const subsidiaryId = req.query?.subsidiaryId
      const query = (req.query?.query || '').replace(/'/g, "''")
      if (!subsidiaryId) return res.status(400).json({ error: 'subsidiaryId is required' })

      const likeClause = query
        ? `AND (tranid LIKE '%${query}%' OR entity.companyName LIKE '%${query}%')`
        : ''

      const sql = `
        SELECT id, tranid, entity.companyName AS vendor, trandate, status
        FROM transaction
        WHERE type = 'PurchOrd'
          AND status IN ('PurchOrd:B', 'PurchOrd:D', 'PurchOrd:E')
          AND subsidiary = ${Number(subsidiaryId)}
          ${likeClause}
        ORDER BY trandate DESC
        OFFSET 0 ROWS FETCH NEXT 25 ROWS ONLY
      `
      const data = await nsSuiteQL(SUITEQL_URL, sql, creds)
      const pos = (data.items || []).map(p => ({
        id: String(p.id),
        tranid: p.tranid,
        vendor: p.vendor,
        trandate: p.trandate,
        status: (p.status || '').replace('PurchOrd:', ''),
      }))
      return res.json({ pos })
    }

    // ------------------------------------------------------------------
    // GET /po/:id
    // ------------------------------------------------------------------
    const poMatch = path.match(/^\/po\/(\d+)$/)
    if (req.method === 'GET' && poMatch) {
      const id = poMatch[1]
      const url = `${NS_BASE}/record/v1/purchaseOrder/${id}?expandSubResources=true`
      const data = await nsGet(url, creds)
      const lines = (data.item?.items || []).map(li => ({
        line: li.line,
        itemId: li.item?.id,
        itemName: li.item?.refName,
        itemRefName: li.item?.refName,
        quantity: li.quantity,
        quantityreceived: li.quantityreceived,
        quantityremaining: li.quantityremaining,
        rate: li.rate,
        unit: li.unit?.refName,
      }))
      const po = {
        id: String(data.id),
        tranid: data.tranid,
        vendor: data.entity?.refName,
        lines,
      }
      return res.json({ po })
    }

    // ------------------------------------------------------------------
    // POST /receipt
    // ------------------------------------------------------------------
    if (req.method === 'POST' && path === '/receipt') {
      const { purchaseOrderId, subsidiaryId, locationId, tranid, lines, image } = req.body || {}

      if (!purchaseOrderId || !subsidiaryId || !locationId || !lines?.length) {
        return res.status(400).json({ error: 'Missing required receipt fields' })
      }

      const today = new Date().toISOString().split('T')[0]
      const payload = {
        createdFrom: { id: purchaseOrderId, type: 'purchaseOrder' },
        subsidiary: { id: subsidiaryId },
        location: { id: locationId },
        trandate: today,
        memo: `Received via Packing List App — PO ${tranid}`,
        item: {
          items: lines.map(l => ({
            orderLine: l.orderLine,
            itemreceive: true,
            quantity: l.quantity,
            location: { id: l.locationId },
          })),
        },
      }

      const receiptUrl = `${NS_BASE}/record/v1/itemReceipt`
      const authHeader = buildNSAuthHeader('POST', receiptUrl, creds)
      const createRes = await fetch(receiptUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      })

      if (!createRes.ok) {
        const text = await createRes.text()
        return res.status(createRes.status).json({ error: text })
      }

      const receipt = await createRes.json()
      const receiptId = receipt.id

      // Attach packing list image (non-fatal if it fails)
      if (image && receiptId) {
        try {
          await attachImage(NS_BASE, image, receiptId, tranid, today, creds)
        } catch (attachErr) {
          console.error('Image attachment failed (non-fatal):', attachErr.message)
        }
      }

      return res.json({
        receipt: {
          id: String(receiptId),
          tranid: receipt.tranid,
          linesReceived: lines.length,
        },
      })
    }

    return res.status(404).json({ error: `Route not found: ${req.method} ${path}` })
  } catch (err) {
    console.error('NetSuite proxy error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function nsGet(url, creds) {
  const authHeader = buildNSAuthHeader('GET', url, creds)
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NetSuite GET error ${res.status}: ${text}`)
  }
  return res.json()
}

async function nsSuiteQL(url, sql, creds) {
  const authHeader = buildNSAuthHeader('POST', url, creds)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Prefer: 'transient',
    },
    body: JSON.stringify({ q: sql.trim() }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SuiteQL error ${res.status}: ${text}`)
  }
  return res.json()
}

async function attachImage(NS_BASE, imageDataUrl, receiptId, tranid, date, creds) {
  const base64 = imageDataUrl.split(',')[1]
  const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg'
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'
  const fileName = `${tranid}-packing-list.${ext}`

  const filePayload = {
    name: fileName,
    content: base64,
    description: `Packing list for PO ${tranid}`,
    // folder -15 = SuiteFiles root; update to a specific folder ID if needed
    folder: { id: '-15' },
  }

  const fileUrl = `${NS_BASE}/record/v1/file`
  const authHeader = buildNSAuthHeader('POST', fileUrl, creds)
  const fileRes = await fetch(fileUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(filePayload),
  })

  if (!fileRes.ok) throw new Error(await fileRes.text())
  const fileData = await fileRes.json()

  // Link file to the item receipt record
  const linkUrl = `${NS_BASE}/record/v1/itemReceipt/${receiptId}/files`
  const linkAuth = buildNSAuthHeader('POST', linkUrl, creds)
  await fetch(linkUrl, {
    method: 'POST',
    headers: { Authorization: linkAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: fileData.id }),
  })
}
