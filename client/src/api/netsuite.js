const getHeaders = ({ accountId, accessToken }) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
  'x-ns-account-id': accountId,
})

export async function getSubsidiaries(credentials) {
  const res = await fetch('/api/netsuite/subsidiaries', { headers: getHeaders(credentials) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.subsidiaries
}

export async function getLocations(credentials, subsidiaryId) {
  const res = await fetch(`/api/netsuite/locations?subsidiaryId=${subsidiaryId}`, {
    headers: getHeaders(credentials)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.locations
}

export async function searchPOs(credentials, subsidiaryId, query) {
  const params = new URLSearchParams({ subsidiaryId, query })
  const res = await fetch(`/api/netsuite/pos?${params}`, { headers: getHeaders(credentials) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.pos
}

export async function getPO(credentials, id) {
  const res = await fetch(`/api/netsuite/po/${id}`, { headers: getHeaders(credentials) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.po
}

export async function submitReceipt(credentials, payload) {
  const res = await fetch('/api/netsuite/receipt', {
    method: 'POST',
    headers: getHeaders(credentials),
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.receipt
}
