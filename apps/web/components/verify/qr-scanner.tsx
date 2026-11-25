'use client'

import * as React from 'react'
import { Camera, CameraOff, Smartphone } from 'lucide-react'

/**
 * Scans a VeriDocs QR code with the device camera, using the browser's built-in
 * BarcodeDetector (Chrome, Edge and Android). Where it isn't available, it explains how to use
 * the phone's own camera app instead, which opens the same page.
 */
type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }

export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const video = React.useRef<HTMLVideoElement>(null)
  const [state, setState] = React.useState<'idle' | 'starting' | 'scanning' | 'unsupported' | 'denied'>('idle')

  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia)

  React.useEffect(() => {
    if (state !== 'starting') return
    let stream: MediaStream | null = null
    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        setState('scanning')
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector
        const detector = new Ctor({ formats: ['qr_code'] })
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const codes = await detector.detect(video.current)
            if (codes[0]?.rawValue) {
              stopped = true
              onResult(codes[0].rawValue)
              return
            }
          } catch {
            // A frame that can't be read; try the next one.
          }
          timer = setTimeout(tick, 250)
        }
        void tick()
      } catch {
        setState('denied')
      }
    })()

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [state, onResult])

  if (!supported) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <Smartphone size={22} className="shrink-0 text-indigo-600" aria-hidden />
        <p>Open your phone&apos;s camera and point it at the QR code in the corner of the document. Tap the link that appears: it opens the result on this website. No app needed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 sm:aspect-video dark:border-slate-800">
        <video ref={video} className={state === 'scanning' ? 'h-full w-full object-cover' : 'hidden'} muted playsInline aria-label="Camera view" />
        {state === 'scanning' && <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" aria-hidden />}
        {state !== 'scanning' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-300">
            {state === 'denied' ? (
              <p className="flex flex-col items-center gap-2"><CameraOff size={28} aria-hidden />The camera is blocked. Allow it in your browser&apos;s settings, or use your phone&apos;s camera app instead.</p>
            ) : (
              <button onClick={() => setState('starting')} className="flex flex-col items-center gap-2 rounded-xl px-6 py-4 font-medium text-white hover:bg-white/10">
                <Camera size={32} aria-hidden />
                {state === 'starting' ? 'Starting the camera…' : 'Start the camera'}
              </button>
            )}
          </div>
        )}
      </div>
      {state === 'scanning' && <p className="text-center text-sm text-slate-500" aria-live="polite">Hold the QR code inside the frame.</p>}
    </div>
  )
}
