/**
 * Match extracted packing list items against PO lines.
 * Returns a merged array with confidence scores and quantities for review.
 *
 * Matching priority:
 *   1. Exact part number match
 *   2. Fuzzy description match (Jaccard token similarity)
 *   3. No match — user must manually assign
 */
export function matchItems(extractedItems, poLines) {
  return extractedItems.map(extracted => {
    // 1. Exact part number match
    if (extracted.partNumber) {
      const exact = poLines.find(pl =>
        pl.itemName?.toLowerCase() === extracted.partNumber.toLowerCase() ||
        pl.itemRefName?.toLowerCase() === extracted.partNumber.toLowerCase()
      )
      if (exact) {
        return {
          extracted,
          poLine: exact,
          confidence: 'exact',
          qtyToReceive: extracted.quantity,
          include: true,
        }
      }
    }

    // 2. Fuzzy description match
    const desc = extracted.description?.toLowerCase() || ''
    let bestMatch = null
    let bestScore = 0

    for (const pl of poLines) {
      const plName = (pl.itemName || pl.itemRefName || '').toLowerCase()
      const score = jaccardSimilarity(desc, plName)
      if (score > bestScore) {
        bestScore = score
        bestMatch = pl
      }
    }

    if (bestScore >= 0.85) {
      return {
        extracted,
        poLine: bestMatch,
        confidence: 'high',
        qtyToReceive: extracted.quantity,
        include: true,
      }
    }
    if (bestScore >= 0.70) {
      return {
        extracted,
        poLine: bestMatch,
        confidence: 'medium',
        qtyToReceive: extracted.quantity,
        include: true,
      }
    }

    // 3. No match
    return {
      extracted,
      poLine: null,
      confidence: 'none',
      qtyToReceive: 0,
      include: false,
    }
  })
}

/**
 * Token-based Jaccard similarity between two strings.
 * Splits on whitespace and computes intersection / union of token sets.
 */
function jaccardSimilarity(a, b) {
  const tokensA = new Set(a.split(/\s+/).filter(Boolean))
  const tokensB = new Set(b.split(/\s+/).filter(Boolean))
  if (tokensA.size === 0 && tokensB.size === 0) return 0
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length
  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : intersection / union
}
