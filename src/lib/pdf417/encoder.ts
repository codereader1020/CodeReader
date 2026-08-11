import { BwipPdf417Encoder } from './adapters/bwipAdapter';
import { BarcodePayload, EncodedBarcode, Pdf417Encoder, Pdf417Options } from './types';

let globalEncoder: Pdf417Encoder = new BwipPdf417Encoder();

/**
 * Configure or override the active PDF417 encoder instance (Dependency Injection pattern)
 */
export function setPdf417Encoder(encoder: Pdf417Encoder): void {
  globalEncoder = encoder;
}

/**
 * Generate a PDF417 barcode using the active encoder
 */
export async function generatePdf417(
  payload: BarcodePayload,
  options?: Pdf417Options
): Promise<EncodedBarcode> {
  return globalEncoder.encode(payload, options);
}
