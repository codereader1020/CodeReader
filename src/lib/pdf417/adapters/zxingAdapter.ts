import {
  BinaryBitmap,
  GlobalHistogramBinarizer,
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
    const canvas = await this.convertToCanvas(input);

    // 1. Try Native Browser BarcodeDetector API across candidate regions
    const nativeResult = await this.tryNativeBarcodeDetector(canvas);
    if (nativeResult) {
      return [nativeResult];
    }

    // 2. Multi-scale & Multi-ROI ZXing decoding strategy
    const scales = [1.0, 1200 / Math.max(canvas.width, 1200), 800 / Math.max(canvas.width, 800)];
    const uniqueScales = Array.from(new Set(scales)).filter((s) => s > 0 && s <= 1.0);

    for (const scale of uniqueScales) {
      const scaledCanvas = scale === 1.0 ? canvas : this.scaleCanvas(canvas, scale);

      // Candidate Region of Interests (ROIs) on ID Cards/Documents:
      // - Full image (0-100%)
      // - Top-to-Upper-Mid region (0-60% height) - typical position of PDF417 on ID back
      // - Band region (10%-50% height)
      // - Lower region (40%-100% height)
      const rois = [
        { x: 0, y: 0, w: scaledCanvas.width, h: scaledCanvas.height },
        { x: 0, y: 0, w: scaledCanvas.width, h: Math.floor(scaledCanvas.height * 0.6) },
        { x: 0, y: Math.floor(scaledCanvas.height * 0.1), w: scaledCanvas.width, h: Math.floor(scaledCanvas.height * 0.45) },
        { x: 0, y: Math.floor(scaledCanvas.height * 0.4), w: scaledCanvas.width, h: Math.floor(scaledCanvas.height * 0.6) },
      ];

      for (const roi of rois) {
        const roiCanvas = this.cropCanvas(scaledCanvas, roi.x, roi.y, roi.w, roi.h);
        const decoded = this.tryDecodeCanvasVariants(roiCanvas);
        if (decoded) {
          return [decoded];
        }
      }
    }

    // 3. Try Rotations (90, 180, 270 degrees) if standard orientations fail
    const angles = [90, 180, 270];
    for (const angle of angles) {
      const rotatedCanvas = this.rotateCanvas(canvas, angle);
      const decoded = this.tryDecodeCanvasVariants(rotatedCanvas);
      if (decoded) {
        return [decoded];
      }
    }

    throw new Error("Couldn't detect or decode a valid PDF417 barcode in the provided image.");
  }

  private tryDecodeCanvasVariants(canvas: HTMLCanvasElement): DecodedBarcode | null {
    if (canvas.width < 50 || canvas.height < 20) return null;

    // Variant A: Normal Binarization (HybridBinarizer)
    let result = this.decodeCanvasWithBinarizer(canvas, 'hybrid');
    if (result) return result;

    // Variant B: Global Histogram Binarization
    result = this.decodeCanvasWithBinarizer(canvas, 'global');
    if (result) return result;

    // Variant C: Contrast Boosted & Sharpened Binarization
    const enhancedCanvas = this.enhanceContrast(canvas);
    result = this.decodeCanvasWithBinarizer(enhancedCanvas, 'hybrid');
    if (result) return result;

    result = this.decodeCanvasWithBinarizer(enhancedCanvas, 'global');
    if (result) return result;

    return null;
  }

  private decodeCanvasWithBinarizer(
    canvas: HTMLCanvasElement,
    mode: 'hybrid' | 'global'
  ): DecodedBarcode | null {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const luminanceSource = new RGBLuminanceSource(
        new Uint8ClampedArray(imageData.data.buffer),
        canvas.width,
        canvas.height
      );

      const binarizer =
        mode === 'hybrid'
          ? new HybridBinarizer(luminanceSource)
          : new GlobalHistogramBinarizer(luminanceSource);

      const bitmap = new BinaryBitmap(binarizer);
      const zResult = this.pdf417Reader.decode(bitmap);

      if (zResult && zResult.getText()) {
        return {
          format: 'pdf417',
          text: zResult.getText(),
          timestamp: Date.now(),
          points: zResult.getResultPoints()?.map((p) => ({ x: p.getX(), y: p.getY() })),
        };
      }
    } catch (e) {
      // Decode attempt failed for this variant
    }
    return null;
  }

  private async tryNativeBarcodeDetector(canvas: HTMLCanvasElement): Promise<DecodedBarcode | null> {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      return null;
    }
    try {
      // eslint-disable-next-line
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const formats = await BarcodeDetectorClass.getSupportedFormats();
      if (formats.includes('pdf417')) {
        const detector = new BarcodeDetectorClass({ formats: ['pdf417'] });
        const results = await detector.detect(canvas);
        if (results && results.length > 0) {
          return {
            format: 'pdf417',
            text: results[0].rawValue,
            timestamp: Date.now(),
            points: results[0].cornerPoints,
          };
        }
      }
    } catch (e) {}
    return null;
  }

  private enhanceContrast(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Apply grayscale + high-contrast histogram stretching
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }

    const range = max - min || 1;
    for (let i = 0; i < data.length; i += 4) {
      const normalized = Math.round(((data[i] - min) / range) * 255);
      // High contrast thresholding
      const contrastVal = normalized < 128 ? Math.max(0, normalized - 30) : Math.min(255, normalized + 30);
      data[i] = contrastVal;
      data[i + 1] = contrastVal;
      data[i + 2] = contrastVal;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  private cropCanvas(
    sourceCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    w: number,
    h: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
    }
    return canvas;
  }

  private scaleCanvas(sourceCanvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(sourceCanvas.width * scale);
    canvas.height = Math.floor(sourceCanvas.height * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
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
