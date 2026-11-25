import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers and CORS for every API route (Next.js 16 calls middleware "proxy").
 *
 * - Public verification endpoints answer any website (anyone may build a verifier).
 * - Everything else answers only the VeriDocs web app (NEXT_PUBLIC_APP_URL) and any extra
 *   origins listed in CORS_ORIGINS (comma-separated). API-key integrations run server-side
 *   and don't need CORS at all.
 */
const PUBLIC_PATHS = [/^\/api\/documents\/verify/, /^\/api\/public\//, /^\/api\/health/];

function allowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (PUBLIC_PATHS.some((p) => p.test(request.nextUrl.pathname))) return '*';
  const allowed = [process.env.NEXT_PUBLIC_APP_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
    .map((o) => o?.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function withHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Request-Id', request.headers.get('x-request-id') || crypto.randomUUID());
  const origin = allowedOrigin(request);
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Expose-Headers', 'X-Document-Id, X-Request-Id, X-Batch-Id, X-Batch-Signed, X-Batch-Failed, Content-Disposition');
  }
  return response;
}

export function proxy(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (allowedOrigin(request)) {
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    return withHeaders(response, request);
  }
  return withHeaders(NextResponse.next(), request);
}

export const config = { matcher: ['/api/:path*'] };
