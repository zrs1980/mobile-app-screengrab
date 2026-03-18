import { useRef, useState, useCallback } from 'react'

export default function CameraCapture({ onCapture, error }) {
  const fileRef = useRef()
  const videoRef = useRef()
  const [preview, setPreview] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState(null)

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      setStream(s)
      setCameraActive(true)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      // Fall back to file picker if camera is unavailable
      fileRef.current?.click()
    }
  }

  const capture = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPreview(dataUrl)
    stream?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
  }, [stream])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const retake = () => {
    setPreview(null)
    stream?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
  }

  return (
    <div className="flex-1 flex flex-col">
      {!cameraActive && !preview && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-48 h-48 border-2 border-dashed border-navy-600 rounded-2xl flex items-center justify-center">
            <span className="text-5xl">📄</span>
          </div>
          <p className="text-slate-400 text-sm text-center">
            Position the packing list flat with good lighting and no glare
          </p>
          {error && (
            <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm w-full">
              {error}
            </div>
          )}
          <button
            onClick={startCamera}
            className="w-full bg-amber-400 text-navy-900 font-bold py-4 rounded-lg text-base min-h-[52px]"
          >
            Take Photo
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border border-navy-600 text-slate-300 py-4 rounded-lg text-base min-h-[52px]"
          >
            Upload Image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {cameraActive && (
        <div className="flex-1 relative bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {/* Corner guide overlay */}
          <div className="absolute inset-4 border-2 border-amber-400/60 rounded-xl pointer-events-none" />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={capture}
              className="w-20 h-20 rounded-full bg-amber-400 border-4 border-white shadow-lg active:scale-95 transition-transform"
            />
          </div>
        </div>
      )}

      {preview && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-black">
            <img src={preview} alt="Captured packing list" className="w-full h-full object-contain" />
          </div>
          <div className="bg-navy-800 border-t border-navy-600 p-4 flex gap-3">
            <button
              onClick={retake}
              className="flex-1 border border-navy-600 text-slate-300 py-4 rounded-lg font-bold min-h-[52px]"
            >
              Retake
            </button>
            <button
              onClick={() => onCapture(preview)}
              className="flex-1 bg-amber-400 text-navy-900 font-bold py-4 rounded-lg min-h-[52px]"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
