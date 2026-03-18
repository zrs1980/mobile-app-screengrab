import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import CameraCapture from '../components/CameraCapture'

export default function CapturePage() {
  const navigate = useNavigate()
  const { selectedPO, setCapturedImage, setExtractedItems, setMatchedLines } = useAppStore()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleCapture = async (imageDataUrl) => {
    setCapturedImage(imageDataUrl)
    setProcessing(true)
    setError(null)

    try {
      if (typeof navigator.vibrate === 'function') navigator.vibrate(50)

      // Compress image before sending
      const compressed = await compressImage(imageDataUrl)

      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setExtractedItems(data.items)

      const { matchItems } = await import('../utils/matchItems.js')
      const matched = matchItems(data.items, selectedPO.lines)
      setMatchedLines(matched)

      navigate('/review')
    } catch (err) {
      setError(err.message)
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      <div className="bg-navy-800 border-b border-navy-600 px-4 py-4">
        <div className="text-xs text-amber-400 font-mono uppercase tracking-widest">Capture Packing List</div>
        <div className="text-sm text-slate-300 mt-1 font-mono">{selectedPO?.tranid} — {selectedPO?.vendor}</div>
      </div>

      {processing ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-amber-400 font-mono text-sm">Extracting line items...</div>
          <div className="text-slate-400 text-xs text-center">AI is reading your packing list</div>
        </div>
      ) : (
        <CameraCapture onCapture={handleCapture} error={error} />
      )}
    </div>
  )
}

async function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round(height * MAX / width)
          width = MAX
        } else {
          width = Math.round(width * MAX / height)
          height = MAX
        }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}
