export default function MatchBadge({ confidence }) {
  if (confidence === 'exact') {
    return <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300 font-mono">✓ Matched</span>
  }
  if (confidence === 'high') {
    return <span className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-300 font-mono">~ Likely</span>
  }
  if (confidence === 'medium') {
    return <span className="text-xs px-2 py-1 rounded bg-orange-900/50 text-orange-300 font-mono">? Review</span>
  }
  if (confidence === 'manual') {
    return <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300 font-mono">✎ Manual</span>
  }
  return <span className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300 font-mono">✗ Unmatched</span>
}
