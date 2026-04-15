// components/BlobCanvas.tsx
'use client'

import { useEffect, useRef } from 'react'

export default function BlobCanvas() {
  const cvRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return

    const S = 0.5
    let W = 0, H = 0

    const B: number[][] = [
      [.12,.12,440,225,238,255,.58,.00016,.00011,130,100,0],
      [.88,.38,320, 70,140,255,.52,.00013,.00020,110,140,2.1],
      [.32,.88,360,120, 68,250,.44,.00009,.00015, 95, 88,4.2],
      [.58,.52,230,138,210,255,.36,.00021,.00017, 85,105,1.0],
      [.78,.14,170,255,255,255,.20,.00026,.00019, 65, 72,3.5],
    ]

    function resize() {
      W = cv.width  = Math.round(window.innerWidth  * S)
      H = cv.height = Math.round(window.innerHeight * S)
      cv.style.width  = '100vw'
      cv.style.height = '100vh'
    }

    resize()
    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200) }
    window.addEventListener('resize', onResize, { passive: true })

    let last = 0
    let rafId: number

    function draw(ts: number) {
      rafId = requestAnimationFrame(draw)
      if (ts - last < 32) return
      last = ts
      ctx.clearRect(0, 0, W, H)
      for (const b of B) {
        const x = (b[0] * W / S + Math.sin(ts * b[7] + b[11]) * b[9]) * S
        const y = (b[1] * H / S + Math.cos(ts * b[8] + b[11] * 1.3) * b[10]) * S
        const r = b[2] * (1 + 0.065 * Math.sin(ts * 0.00044 + b[11])) * S
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(${b[3]},${b[4]},${b[5]},${b[6]})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.ellipse(x, y, r, r * 0.8, ts * 0.00001 + b[11] * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      }
    }

    rafId = requestAnimationFrame(draw)

    // Grain texture
    const grain = document.getElementById('grain') as HTMLDivElement | null
    if (grain) {
      const gc = document.createElement('canvas')
      gc.width = gc.height = 256
      const gx = gc.getContext('2d')!
      const d = gx.createImageData(256, 256)
      for (let i = 0; i < d.data.length; i += 4) {
        const v = (Math.random() * 255) | 0
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v
        d.data[i + 3] = 255
      }
      gx.putImageData(d, 0, 0)
      grain.style.backgroundImage = `url(${gc.toDataURL()})`
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={cvRef} id="blob-canvas" aria-hidden="true" />
}
