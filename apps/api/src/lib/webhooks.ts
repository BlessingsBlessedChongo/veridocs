import { createHmac } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { prisma } from '@veridocs/database';
import { decryptPrivateKey } from '@veridocs/crypto';
import { masterKey } from './config';
import { logger } from './logger';

/**
 * Tells an institution's systems when something happens (document.signed, document.revoked,
 * document.verified). Each delivery is signed so the receiver can trust it:
 *
 *   X-VeriDocs-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>" with the webhook secret>
 *
 * Deliveries never hold up the request that caused them, and every attempt is recorded.
 */
export type WebhookEvent = 'document.signed' | 'document.revoked' | 'document.verified';

export function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** True for loopback, private, link-local (cloud metadata) and other internal addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return true;
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/**
 * In production, webhooks may only reach the public internet (no SSRF into our own network).
 * WEBHOOK_ALLOW_PRIVATE_NETWORKS=true lifts this for staging or local testing only.
 */
async function assertPublicDestination(url: string) {
  if (process.env.NODE_ENV !== 'production' || process.env.WEBHOOK_ALLOW_PRIVATE_NETWORKS === 'true') return;
  const { hostname, protocol } = new URL(url);
  if (protocol !== 'https:') throw new Error('Webhooks must use https');
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error('This address points to a private network');
}

async function deliver(webhook: { id: string; url: string; encryptedSecret: string }, event: WebhookEvent, data: unknown) {
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = decryptPrivateKey(webhook.encryptedSecret, masterKey());
  const started = Date.now();
  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    await assertPublicDestination(webhook.url);
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VeriDocs-Webhooks/1.0',
        'X-VeriDocs-Event': event,
        'X-VeriDocs-Signature': `t=${timestamp},v1=${signPayload(secret, timestamp, body)}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });
    statusCode = response.status;
    if (!response.ok) error = `The endpoint answered ${response.status}`;
  } catch (cause) {
    error = cause instanceof Error ? (cause.name === 'TimeoutError' ? 'No answer within 5 seconds' : cause.message) : 'Delivery failed';
  }
  await prisma.webhookDelivery
    .create({ data: { webhookId: webhook.id, event, statusCode, ok: !error, error, durationMs: Date.now() - started } })
    .catch((cause) => logger.error({ err: cause }, 'Could not record a webhook delivery'));
  return { ok: !error, statusCode, error };
}

/** Sends the event to every active webhook of the institution that wants it, in the background. */
export function emit(institutionId: string, event: WebhookEvent, data: unknown): void {
  void (async () => {
    const hooks = await prisma.webhook.findMany({ where: { institutionId, active: true, events: { has: event } } });
    await Promise.all(hooks.map((hook) => deliver(hook, event, data)));
  })().catch((cause) => logger.error({ err: cause, event }, 'Webhook dispatch failed'));
}

/** A test delivery the administrator triggers from the dashboard; waits for the answer. */
export function sendTest(webhook: { id: string; url: string; encryptedSecret: string }) {
  return deliver(webhook, 'document.verified', { test: true, message: 'This is a test delivery from VeriDocs.' });
}
