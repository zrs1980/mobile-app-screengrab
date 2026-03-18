export async function extractLineItems(imageDataUrl) {
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.items
}
