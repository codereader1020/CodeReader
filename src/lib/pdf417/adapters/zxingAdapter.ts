import {
  BinaryBitmap,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  PDF417Reader,
  RGBLuminanceSource,
} from '@zxing/library';
import { DecodedBarcode, Pdf417Decoder } from '../types';

export class ZxingPdf417Decoder implements Pdf417Decoder {
  private pdf417Reader = new PDF417Reader();

  async decode(
    input: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | ImageData
  ): Promise<DecodedBarcode[]> {
    // 1. Attempt Browser-Native BarcodeDetector API if available
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        // eslint-disable-next-line
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const formats = await BarcodeDetectorClass.getSupportedFormats();
        if (formats.includes('pdf417')) {
          const detector = new BarcodeDetectorClass({ formats: ['pdf417'] });
          const nativeResults = await detector.detect(input as ImageBitmapSource);
          if (nativeResults && nativeResults.length > 0) {
            return nativeResults.map((res: { rawValue: string; cornerPoints?: Array<{ x: number; y: number }> }) => ({
              format: 'pdf417',
              text: res.rawValue,
              timestamp: Date.now(),
              points: res.cornerPoints,
            }));
          }
        }
      } catch (e) {
        // Native detection failed or threw error; proceed to ZXing fallback
      }
    }

    // 2. ZXing Fallback Decoder
    const canvas = await this.convertToCanvas(input);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get canvas 2D rendering context for decoding.');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const luminanceSource = new RGBLuminanceSource(
      new Uint8ClampedArray(imageData.data.buffer),
      canvas.width,
      canvas.height
    );
    const binarizer = new HybridBinarizer(luminanceSource);
    const bitmap = new BinaryBitmap(binarizer);

    try {
      const result = this.pdf417Reader.decode(bitmap);
      if (result) {
        return [
          {
            format: 'pdf417',
            text: result.getText(),
            timestamp: Date.now(),
            points: result.getResultPoints()?.map((p) => ({ x: p.getX(), y: p.getY() })),
          },
        ];
      }
    } catch (e) {
      // ZXing single decode threw NotFoundException; attempt multi-angle / grayscale pre-processing
    }

    // Attempt rotated / enhanced canvas scans if first pass failed
    const enhancedResults = await this.decodeWithPreprocessing(canvas);
    if (enhancedResults.length > 0) {
      return enhancedResults;
    }

    throw new Error("Couldn't detect or decode a valid PDF417 barcode in the provided image.");
  }

  private async decodeWithPreprocessing(canvas: HTMLCanvasElement): Promise<DecodedBarcode[]> {
    const angles = [90, 180, 270];
    for (const angle of angles) {
      try {
        const rotatedCanvas = this.rotateCanvas(canvas, angle);
        const ctx = rotatedCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        const imgData = ctx.getImageData(0, 0, rotatedCanvas.width, rotatedCanvas.height);
        const luminanceSource = new HTMLCanvasElementLuminanceSource(rotatedCanvas);
        const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        const result = this.pdf417Reader.decode(bitmap);
        if (result) {
          return [
            {
              format: 'pdf417',
              text: result.getText(),
              timestamp: Date.now(),
              points: result.getResultPoints()?.map((p) => ({ x: p.getX(), y: p.getY() })),
            },
          ];
        }
      } catch (e) {
        // Continue testing other angles
      }
    }
    return [];
  }

  private rotateCanvas(sourceCanvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    if (degrees === 90 || degrees === 270) {
      canvas.width = sourceCanvas.height;
      canvas.height = sourceCanvas.width;
    } else {
      canvas.width = sourceCanvas.width;
      canvas.height = sourceCanvas.height;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    return canvas;
  }

  private async convertToCanvas(
    input: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | ImageData
  ): Promise<HTMLCanvasElement> {
    if (typeof window === 'undefined') {
      throw new Error('Canvas conversion requires browser environment.');
    }

    if (input instanceof HTMLCanvasElement) {
      return input;
    }

    const canvas = document.createElement('canvas');

    if (input instanceof ImageData) {
      canvas.width = input.width;
      canvas.height = input.height;
      const ctx = canvas.getContext('2d');
      ctx?.putImageData(input, 0, 0);
      return canvas;
    }

    if (input instanceof Blob) {
      const img = new Image();
      const url = URL.createObjectURL(input);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image blob.'));
        img.src = url;
      });
      URL.revokeObjectURL(url);
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      return canvas;
    }

    if (input instanceof HTMLImageElement || input instanceof ImageBitmap) {
      canvas.width = input.width;
      canvas.height = input.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(input, 0, 0);
      return canvas;
    }

    return canvas;
  }
}
