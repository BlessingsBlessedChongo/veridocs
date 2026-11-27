'use client'

import * as React from 'react'
import { Play } from 'lucide-react'

/**
 * The one-minute film on the landing page. Only a still picture loads until
 * someone presses play, so the video costs no data for visitors who skip it.
 */
export function TourVideo() {
  const video = React.useRef<HTMLVideoElement>(null)
  const [started, setStarted] = React.useState(false)

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-[0_30px_80px_rgba(79,70,229,0.18)] dark:border-slate-800">
      <video
        ref={video}
        src="/video/meet-veridocs.mp4"
        poster="/video/meet-veridocs-poster.webp"
        preload="none"
        playsInline
        controls={started}
        className="h-full w-full object-cover"
        aria-label="Meet VeriDocs: a narrated film of the site, about one minute long"
      />
      {!started && (
        <button
          type="button"
          onClick={() => { setStarted(true); void video.current?.play() }}
          className="group absolute inset-0 flex w-full flex-col items-center justify-center gap-3 bg-slate-950/35 text-white transition hover:bg-slate-950/20 focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-8 focus-visible:outline-indigo-300"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 pl-1 shadow-xl transition group-hover:scale-105" aria-hidden>
            <Play className="h-8 w-8 fill-current" />
          </span>
          <span className="text-center font-semibold [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
            Watch the film
            <span className="block text-sm font-normal opacity-90">One minute, with sound</span>
          </span>
        </button>
      )}
    </div>
  )
}
