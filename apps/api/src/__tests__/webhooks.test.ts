import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { isPrivateAddress, signPayload } from '../lib/webhooks';

describe('webhook signatures', () => {
  it('match what a receiver computes from the timestamp and raw body', () => {
    const body = JSON.stringify({ event: 'document.signed', data: { documentId: 'x' } });
    const expected = createHmac('sha256', 'whsec_test').update(`1700000000.${body}`).digest('hex');
    expect(signPayload('whsec_test', 1700000000, body)).toBe(expected);
  });

  it('change when the body, time or secret changes', () => {
    const base = signPayload('s', 1, 'a');
    expect(signPayload('s', 1, 'b')).not.toBe(base);
    expect(signPayload('s', 2, 'a')).not.toBe(base);
    expect(signPayload('t', 1, 'a')).not.toBe(base);
  });
});

describe('private address guard', () => {
  it('blocks internal destinations', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it('allows the public internet', () => {
    for (const ip of ['8.8.8.8', '41.72.104.1', '172.32.0.1', '2606:4700:4700::1111']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
