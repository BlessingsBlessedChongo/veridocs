import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// One .env at the repository root serves the API, the web app and the database scripts.
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(here, '../../.env') })

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@veridocs/crypto', '@veridocs/database', '@veridocs/shared'],
  // Prisma, pino and nodemailer run in Node as they are; bundling them breaks them.
  serverExternalPackages: ['@prisma/client', 'pino', 'pino-pretty', 'nodemailer'],
  // The API serves JSON only: no image optimisation endpoint to attack.
  images: { unoptimized: true },
  poweredByHeader: false,
}

export default nextConfig
