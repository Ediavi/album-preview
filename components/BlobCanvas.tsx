// components/BlobCanvas.tsx
'use client'

import { useEffect, useRef } from 'react'

export default function BlobCanvas() {
  const cvRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const W = cv.width = window.innerWidth
    const H = cv.height = window.innerHeight
    cv.style.width = '100vw'
    cv.style.height = '100vh'

    // Dark base
    ctx.fillStyle = '#0d0f14'
    ctx.fillRect(0, 0, W, H)

    // Grain overlay
    const imageData = ctx.getImageData(0, 0, W, H)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 22
      data[i]     = Math.max(0, Math.min(255, data[i] + grain))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain))
    }
    ctx.putImageData(imageData, 0, 0)
  }, [])

  return <canvas ref={cvRef} id="blob-canvas" aria-hidden="true" />
}
