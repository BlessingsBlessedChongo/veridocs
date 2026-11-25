import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { hashBuffer } from './hash';
import { signData, verifySignature } from './key';

/** The PDF itself is the problem (damaged, password-protected), not the request. */
export class PdfUnreadableError extends Error {}

export interface SignDocumentOptions {
  pdfBuffer: Buffer;
  documentId: string;
  verificationUrl: string;
  issuerName: string;
  privateKeyPem: string;
}

export interface SignedDocumentResult {
  signedPdf: Buffer;
  fileHash: string;
  signature: string;
  qrCodeDataUrl: string;
}

/**
 * Signs a PDF document by:
 * 1. Computing its SHA-256 hash
 * 2. Signing the hash with the issuer's private key
 * 3. Embedding a QR code linking to the verification URL
 */
export async function signDocument(
  options: SignDocumentOptions
): Promise<SignedDocumentResult> {
  const { pdfBuffer, documentId, verificationUrl, issuerName, privateKeyPem } = options;
  
  // Step 1: Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 256,
    margin: 2,
  });
  
  // Step 2: Embed QR code into PDF
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(pdfBuffer);
  } catch (error) {
    const encrypted = /encrypt/i.test(String(error));
    throw new PdfUnreadableError(encrypted ? 'This PDF is password-protected. Remove the password, then sign it.' : 'This PDF could not be read. It may be damaged.');
  }
  // pdf-lib is lenient: a broken file can "load" with no page tree at all, and then even
  // counting its pages throws. Anything wrong with the structure means it can't be signed.
  let pageCount = 0;
  let alreadySigned = false;
  try {
    pageCount = pdfDoc.getPageCount();
    alreadySigned = pdfDoc.getProducer() === 'VeriDocs' || (pdfDoc.getKeywords() ?? '').split(/[\s,]+/).includes('veridocs');
  } catch {
    pageCount = 0;
  }
  if (pageCount === 0) throw new PdfUnreadableError('This PDF could not be read. It may be damaged or empty.');
  // Signing VeriDocs' own output would stack a second stamp and QR code on the first.
  if (alreadySigned) throw new PdfUnreadableError('This PDF has already been signed with VeriDocs. Sign the original document instead.');
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  // Embed QR code image
  const qrImageBytes = Buffer.from(
    qrCodeDataUrl.split(',')[1],
    'base64'
  );
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  
  // A small stamp in the bottom-right corner: the QR code, and beside it who issued the
  // document, where to check it and its ID, so it can be verified even without a phone.
  const qrSize = 72;
  const margin = 24;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const shortUrl = verificationUrl.replace(/^https?:\/\//, '');
  const lines: Array<[string, typeof font, number]> = [
    ['Verify this document', bold, 7.5],
    [fit(`Issued by ${issuerName}`, font, 6.5, 190), font, 6.5],
    [fit(shortUrl, font, 6.5, 190), font, 6.5],
    [`ID ${documentId}`, font, 5.5],
  ];
  const textWidth = Math.max(...lines.map(([text, f, size]) => f.widthOfTextAtSize(text, size)));
  const boxWidth = qrSize + 10 + textWidth + 14;
  const boxX = width - margin - boxWidth;
  firstPage.drawRectangle({ x: boxX, y: margin - 4, width: boxWidth, height: qrSize + 8, color: rgb(1, 1, 1), borderColor: rgb(0.82, 0.84, 0.9), borderWidth: 0.5 });
  firstPage.drawImage(qrImage, { x: width - margin - qrSize - 4, y: margin, width: qrSize, height: qrSize });
  let lineY = margin + qrSize - 14;
  for (const [text, f, size] of lines) {
    firstPage.drawText(text, { x: boxX + 8, y: lineY, size, font: f, color: f === bold ? rgb(0.19, 0.18, 0.5) : rgb(0.3, 0.33, 0.4) });
    lineY -= size + 7;
  }

  // Add document metadata
  pdfDoc.setTitle(`Signed Document - ${documentId}`);
  pdfDoc.setProducer('VeriDocs');
  pdfDoc.setCreator(latin1(issuerName));
  pdfDoc.setSubject(`Document ID: ${documentId}`);
  pdfDoc.setKeywords(['veridocs', 'signed', documentId]);
  
  const signedPdfBytes = await pdfDoc.save();
  const signedPdf = Buffer.from(signedPdfBytes);

  // Hash and sign the final PDF that is returned to the issuer.
  const fileHash = hashBuffer(signedPdf);
  const signature = signData(fileHash, privateKeyPem);
  
  return {
    signedPdf,
    fileHash,
    signature,
    qrCodeDataUrl,
  };
}

/** The built-in PDF fonts only cover Latin-1: drop accents, then anything else they can't draw. */
export function latin1(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

/** Shortens text with an ellipsis until it fits the given width. */
function fit(raw: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string {
  const text = latin1(raw);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 4 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * Verifies a signed document against a stored hash and signature.
 */
export function verifyDocument(
  pdfBuffer: Buffer,
  storedHash: string,
  signature: string,
  publicKeyPem: string
): { valid: boolean; reason?: string } {
  const currentHash = hashBuffer(pdfBuffer);
  
  if (currentHash !== storedHash) {
    return {
      valid: false,
      reason: 'Document hash does not match. Document has been altered.',
    };
  }
  
  const signatureValid = verifySignature(storedHash, signature, publicKeyPem);
  
  if (!signatureValid) {
    return {
      valid: false,
      reason: 'Invalid signature. Document was not signed by the claimed issuer.',
    };
  }
  
  return { valid: true };
}