import { ZxingPdf417Decoder } from './adapters/zxingAdapter';
import { DecodedBarcode, Pdf417Decoder } from './types';

let globalDecoder: Pdf417Decoder = new ZxingPdf417Decoder();

/**
 * Configure or override the active PDF417 decoder instance (Dependency Injection pattern)
 */
export function setPdf417Decoder(decoder: Pdf417Decoder): void {
  globalDecoder = decoder;
}

/**
 * Decode PDF417 barcode from an image source
 */
export async function decodePdf417(
  input: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | ImageData
): Promise<DecodedBarcode[]> {
  return globalDecoder.decode(input);
}
