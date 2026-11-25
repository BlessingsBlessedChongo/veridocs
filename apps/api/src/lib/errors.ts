import { NextResponse } from 'next/server';
import { logger } from './logger';

export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required') { super(401, 'UNAUTHORIZED', message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') { super(403, 'FORBIDDEN', message); }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') { super(404, 'NOT_FOUND', message); }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(400, 'VALIDATION_ERROR', message); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(409, 'CONFLICT', message); }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') { super(429, 'RATE_LIMIT_EXCEEDED', message); }
}

export function handleApiError(error: unknown) {
  const appError = error instanceof AppError ? error : new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
  if (!(error instanceof AppError)) logger.error({ err: error }, 'Unhandled API error');
  return NextResponse.json({ success: false, error: { code: appError.code, message: appError.message } }, { status: appError.statusCode });
}