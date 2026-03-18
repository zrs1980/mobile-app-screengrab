import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/vision
 * Accepts a base64 image data URL and returns extracted line items as JSON.
 *
 * Body: { image: "data:image/jpeg;base64,..." }
 * Response: { items: [{ lineNumber, partNumber, description, quantity, unitOfMeasure }] }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { image } = req.body || {}
  if (!image) return res.status(400).json({ error: 'image field is required' })

  const base64 = image.split(',')[1]
  if (!base64) return res.status(400).json({ error: 'Invalid image data URL format' })

  const mediaType = (image.split(';')[0].split(':')[1] || 'image/jpeg')

  const prompt = `You are a warehouse receiving assistant. Analyze this packing list / delivery slip image and extract all line items.

Return ONLY a valid JSON array with no additional text, markdown, or explanation.

Each object in the array must have these exact keys:
{
  "lineNumber": number or null,
  "partNumber": "string or null",
  "description": "string",
  "quantity": number,
  "unitOfMeasure": "string or null"
}

Rules:
- quantity must always be a positive number
- If a field cannot be determined, use null
- description is required and must never be null
- Normalize quantities: "1 DOZ" → 12, "1/2" → 0.5
- Include ALL line items, even if partially legible`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const text = response.content[0].text.trim()

    let items
    try {
      items = JSON.parse(text)
    } catch {
      // Try to extract a JSON array if the model wrapped it in prose
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        items = JSON.parse(match[0])
      } else {
        return res.status(422).json({
          error: 'AI returned an unexpected format — please retry or enter items manually',
        })
      }
    }

    if (!Array.isArray(items)) {
      return res.status(422).json({ error: 'AI response was not a JSON array' })
    }

    return res.json({ items })
  } catch (err) {
    console.error('Vision API error:', err)
    return res.status(500).json({ error: 'Vision extraction failed: ' + err.message })
  }
}
