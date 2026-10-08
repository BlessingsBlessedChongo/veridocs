import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { hashBuffer } from './hash';
import { signData, verifySignature } from './key';

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
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  // Embed QR code image
  const qrImageBytes = Buffer.from(
    qrCodeDataUrl.split(',')[1],
    'base64'
  );
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  
  const qrSize = 80;
  const margin = 30;
  
  firstPage.drawImage(qrImage, {
    x: width - qrSize - margin,
    y: margin,
    width: qrSize,
    height: qrSize,
  });
  
  // Add verification text
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  firstPage.drawText('Verify at:', {
    x: width - qrSize - margin - 60,
    y: margin + qrSize / 2 - 5,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  // Add document metadata
  pdfDoc.setTitle(`Signed Document - ${documentId}`);
  pdfDoc.setProducer('VeriDocs');
  pdfDoc.setCreator(issuerName);
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