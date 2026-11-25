import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { hashBuffer } from '../hash';
import { generateKeyPair, verifySignature } from '../key';
import { latin1, PdfUnreadableError, signDocument } from '../signing';

const keys = generateKeyPair();

async function blankPdf(text = 'A certificate') {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]).drawText(text, { x: 50, y: 780 });
  return Buffer.from(await pdf.save());
}

const sign = (pdfBuffer: Buffer, issuerName = 'University of Zambia') =>
  signDocument({ pdfBuffer, documentId: '3f2a0c1e-1111-4222-8333-944455556666', verificationUrl: 'https://verify.example/verify/3f2a0c1e-1111-4222-8333-944455556666', issuerName, privateKeyPem: keys.privateKey });

describe('signDocument', () => {
  it('signs the fingerprint of exactly the PDF it returns', async () => {
    const result = await sign(await blankPdf());
    expect(result.fileHash).toBe(hashBuffer(result.signedPdf));
    expect(verifySignature(result.fileHash, result.signature, keys.publicKey)).toBe(true);
    expect(result.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('refuses a PDF it already signed, rather than stacking a second stamp', async () => {
    const once = await sign(await blankPdf());
    await expect(sign(once.signedPdf)).rejects.toBeInstanceOf(PdfUnreadableError);
  });

  it('refuses something that is not a PDF with a readable reason', async () => {
    await expect(sign(Buffer.from('%PDF-1.7 but not really'))).rejects.toThrow(/could not be read/);
  });

  it('handles issuer names outside Latin-1 without failing', async () => {
    const result = await sign(await blankPdf(), 'Université de Lubumbashi 大学');
    expect(result.signedPdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('latin1', () => {
  it('keeps accents where the PDF fonts can draw them, and replaces the rest', () => {
    expect(latin1('Université')).toBe('Universite');
    expect(latin1('大学 Lusaka')).toBe('?? Lusaka');
  });
});
