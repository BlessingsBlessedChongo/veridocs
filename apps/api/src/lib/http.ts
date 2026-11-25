import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';

/** A schema judged by what it produces (defaults filled in), whatever it accepts. */
type Schema<T> = ZodType<T, unknown>;
import { handleApiError, RateLimitError, ValidationError } from './errors';
import { rateLimit } from './rate-limit';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** Reads and checks a JSON body; the first problem becomes a 400 with a readable message. */
export async function readJson<T>(request: NextRequest, schema: Schema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError('The request body must be JSON');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
    throw new ValidationError(`${where}${issue.message}`);
  }
  return parsed.data;
}

export function readQuery<T>(request: NextRequest, schema: Schema<T>): T {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  return parsed.data;
}

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function limit(key: string, max: number, window: string, message?: string) {
  const result = await rateLimit(key, max, window);
  if (!result.success) throw new RateLimitError(message);
}

type Params = Record<string, string>;

/**
 * Wraps a route handler: resolves the route's params (a Promise since Next.js 15) so handlers
 * can read them directly, and turns any thrown AppError into its JSON error reply.
 */
export function route<C extends { params: Params } = { params: Params }>(fn: (request: NextRequest, context: C) => Promise<Response>) {
  return async (request: NextRequest, context: { params: Promise<C['params']> }): Promise<Response> => {
    try {
      const params = context?.params ? await context.params : ({} as C['params']);
      return await fn(request, { params } as C);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
