import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// One .env at the repository root serves the API, the web app and the database scripts.
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(here, '../../.env') })

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // The camera is used only to scan a document's QR code on the verify page.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
