import { describe, expect, it } from 'vitest';
import { rateLimit } from '../lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests up to the configured limit and rejects the next request', async () => {
    const identifier = `test-${crypto.randomUUID()}`;
    expect((await rateLimit(identifier, 2, '1m')).success).toBe(true);
    expect((await rateLimit(identifier, 2, '1m')).success).toBe(true);
    expect((await rateLimit(identifier, 2, '1m')).success).toBe(false);
  });
});