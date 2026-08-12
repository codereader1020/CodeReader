import {
  BinaryBitmap,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  PDF417Reader,
  RGBLuminanceSource,
} from '@zxing/library';
import { readBarcodesFromImageData } from 'zxing-wasm';
import { DecodedBarcode, Pdf417Decoder } from '../types';

/**
 * ZxingPdf417Decoder
 *
 * Uses a two-tier decoding strategy:
 *   1. PRIMARY: zxing-wasm (ZXing-C++ compiled to WebAssembly) — far superior real-world accuracy
 *   2. FALLBACK: @zxing/library (JS port) — kept as secondary fallback
 *
 * Both are run against multiple image preprocessing variants:
 *   - Raw, grayscale, high-contrast, adaptive thresholding, sharpened
 *
 * Multi-pass scale and multi-ROI scanning ensures robust detection on
 * driver's license backs, photos with glare, compression artifacts, etc.
 */
export class ZxingPdf417Decoder implements Pdf417Decoder {
  private pdf417Reader = new PDF417Reader();
  private wasmReady = false;

  async decode(
    input: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | ImageData
  ): Promise<DecodedBarcode[]> {
    const canvas = await this.convertToCanvas(input);

    // Native browser BarcodeDetector (Chrome on Android / some desktop Chrome)
    const nativeResult = await this.tryNativeBarcodeDetector(canvas);
    if (nativeResult) return [nativeResult];

    // Build all image variants from the canvas upfront
    const variants = this.buildImageVariants(canvas);

    // --- PASS 1: Full-image wasm scan on all variants ---
    for (const variant of variants) {
      const result = await this.tryWasmDecode(variant);
      if (result) return [result];
    }

    // --- PASS 2: Multi-ROI × multi-scale wasm scan ---
    const scales = [1.0, 1.5, 2.0, 0.75];
    const roiDefs = [
      { x: 0,    y: 0,    wPct: 1.0, hPct: 1.0 },   // full image
      { x: 0,    y: 0,    wPct: 1.0, hPct: 0.55 },  // top 55%
      { x: 0,    y: 0.45, wPct: 1.0, hPct: 0.55 },  // bottom 55%
      { x: 0,    y: 0.15, wPct: 1.0, hPct: 0.7  },  // middle 70%
      { x: 0,    y: 0.05, wPct: 1.0, hPct: 0.40 },  // upper band
      { x: 0,    y: 0.55, wPct: 1.0, hPct: 0.40 },  // lower band
    ];

    for (const scale of scales) {
      const scaledCanvas = scale === 1.0 ? canvas : this.upscaleCanvas(canvas, scale);
      for (const roi of roiDefs) {
        const roiCanvas = this.cropCanvas(
          scaledCanvas,
          Math.floor(roi.x * scaledCanvas.width),
          Math.floor(roi.y * scaledCanvas.height),
          Math.floor(roi.wPct * scaledCanvas.width),
          Math.floor(roi.hPct * scaledCanvas.height)
        );
        if (roiCanvas.width < 50 || roiCanvas.height < 10) continue;

        const roiVariants = this.buildImageVariants(roiCanvas);
        for (const v of roiVariants) {
          const result = await this.tryWasmDecode(v);
          if (result) return [result];
        }
      }
    }

    // --- PASS 3: Rotations (90 / 180 / 270) with wasm ---
    for (const angle of [90, 180, 270]) {
      const rotated = this.rotateCanvas(canvas, angle);
      const rotatedVariants = this.buildImageVariants(rotated);
      for (const v of rotatedVariants) {
        const result = await this.tryWasmDecode(v);
        if (result) return [result];
      }
    }

    // --- PASS 4: JS ZXing fallback (multi-ROI) ---
    for (const scale of [1.0, 1.5]) {
      const scaledCanvas = scale === 1.0 ? canvas : this.upscaleCanvas(canvas, scale);
      const rois = [
        scaledCanvas,
        this.cropCanvas(scaledCanvas, 0, 0, scaledCanvas.width, Math.floor(scaledCanvas.height * 0.6)),
        this.cropCanvas(scaledCanvas, 0, Math.floor(scaledCanvas.height * 0.4), scaledCanvas.width, Math.floor(scaledCanvas.height * 0.6)),
      ];
      for (const roi of rois) {
        const result = this.tryJsZxingVariants(roi);
        if (result) return [result];
      }
    }

    throw new Error(
      "Couldn't detect a PDF417 barcode. Try dragging the crop box handles tightly around just the barcode strip."
    );
  }

  // ─────────────────────────────────────────────
  // Image Variant Builder
  // ─────────────────────────────────────────────

  /**
   * Returns multiple ImageData preprocessed variants of the canvas
   * to maximize decode chances on real-world photos.
   */
  private buildImageVariants(canvas: HTMLCanvasElement): ImageData[] {
    const variants: ImageData[] = [];

    // Raw
    const raw = this.getImageData(canvas);
    if (raw) variants.push(raw);

    // Grayscale
    const gray = this.applyGrayscale(canvas);
    if (gray) variants.push(gray);

    // High-contrast (histogram stretch + threshold push)
    const contrast = this.applyHighContrast(canvas);
    if (contrast) variants.push(contrast);

    // Adaptive threshold (Otsu-like global threshold)
    const otsu = this.applyOtsuThreshold(canvas);
    if (otsu) variants.push(otsu);

    // Sharpened
    const sharp = this.applySharpen(canvas);
    if (sharp) variants.push(sharp);

    return variants;
  }

  // ─────────────────────────────────────────────
  // WebAssembly ZXing-C++ Decoder (Primary)
  // ─────────────────────────────────────────────

  private async tryWasmDecode(imageData: ImageData): Promise<DecodedBarcode | null> {
    try {
      const results = await readBarcodesFromImageData(imageData, {
        formats: ['PDF417'],
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
        tryDownscale: true,
        tryDenoise: true,
        binarizer: 'LocalAverage',
        isPure: false,
        minLineCount: 2,
        maxNumberOfSymbols: 255,
        textMode: 'Plain',
        returnErrors: false,
      });

      if (results && results.length > 0 && results[0].text) {
        // Normalize any <LF>/<CR> literals (HRI artefacts) to actual control chars
        const rawText = results[0].text
          .replace(/<LF>/g, '\n')
          .replace(/<CR>/g, '\r')
          .replace(/<GS>/g, '\x1d')
          .replace(/<RS>/g, '\x1e');
        return {
          format: 'pdf417',
          text: rawText,
          timestamp: Date.now(),
        };
      }
    } catch (e) {
      // wasm decode failed for this variant — try next
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // JS ZXing Fallback (Secondary)
  // ─────────────────────────────────────────────

  private tryJsZxingVariants(canvas: HTMLCanvasElement): DecodedBarcode | null {
    if (canvas.width < 50 || canvas.height < 10) return null;

    const imageData = this.getImageData(canvas);
    if (!imageData) return null;

    for (const mode of ['hybrid', 'global'] as const) {
      const r = this.decodeJsZxing(imageData, canvas.width, canvas.height, mode);
      if (r) return r;
    }

    // Also try contrast-enhanced variant
    const contrast = this.applyHighContrast(canvas);
    if (contrast) {
      for (const mode of ['hybrid', 'global'] as const) {
        const r = this.decodeJsZxing(contrast, canvas.width, canvas.height, mode);
        if (r) return r;
      }
    }

    return null;
  }

  private decodeJsZxing(
    imageData: ImageData,
    width: number,
    height: number,
    mode: 'hybrid' | 'global'
  ): DecodedBarcode | null {
    try {
      const luminanceSource = new RGBLuminanceSource(
        new Uint8ClampedArray(imageData.data.buffer),
        width,
        height
      );
      const binarizer =
        mode === 'hybrid'
          ? new HybridBinarizer(luminanceSource)
          : new GlobalHistogramBinarizer(luminanceSource);
      const bitmap = new BinaryBitmap(binarizer);
      const zResult = this.pdf417Reader.decode(bitmap);
      if (zResult?.getText()) {
        return {
          format: 'pdf417',
          text: zResult.getText(),
          timestamp: Date.now(),
          points: zResult.getResultPoints()?.map((p) => ({ x: p.getX(), y: p.getY() })),
        };
      }
    } catch (e) {
      // Silent — expected on failed decode attempts
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // Native BarcodeDetector (Chrome/Edge on Android)
  // ─────────────────────────────────────────────

  private async tryNativeBarcodeDetector(canvas: HTMLCanvasElement): Promise<DecodedBarcode | null> {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
    try {
      const BarcodeDetectorClass = (window as Record<string, unknown>).BarcodeDetector as {
        getSupportedFormats: () => Promise<string[]>;
        new(opts: { formats: string[] }): { detect: (src: HTMLCanvasElement) => Promise<Array<{ rawValue: string; cornerPoints: unknown }>> };
      };
      const formats = await BarcodeDetectorClass.getSupportedFormats();
      if (!formats.includes('pdf417')) return null;
      const detector = new BarcodeDetectorClass({ formats: ['pdf417'] });
      const results = await detector.detect(canvas);
      if (results?.length > 0) {
        return { format: 'pdf417', text: results[0].rawValue, timestamp: Date.now() };
      }
    } catch (e) {}
    return null;
  }

  // ─────────────────────────────────────────────
  // Image Preprocessing Filters
  // ─────────────────────────────────────────────

  private getImageData(canvas: HTMLCanvasElement): ImageData | null {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      return null;
    }
  }

  private applyGrayscale(sourceCanvas: HTMLCanvasElement): ImageData | null {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(imgData, 0, 0);
    return imgData;
  }

  private applyHighContrast(sourceCanvas: HTMLCanvasElement): ImageData | null {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Grayscale first
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = d[i + 1] = d[i + 2] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    // Histogram stretch + contrast push
    const range = max - min || 1;
    for (let i = 0; i < d.length; i += 4) {
      const normalized = Math.round(((d[i] - min) / range) * 255);
      const v = normalized < 128
        ? Math.max(0, normalized - 40)
        : Math.min(255, normalized + 40);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return imgData;
  }

  private applyOtsuThreshold(sourceCanvas: HTMLCanvasElement): ImageData | null {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const n = d.length / 4;

    // Build grayscale + histogram
    const hist = new Array(256).fill(0);
    const grays = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const g = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      grays[i] = g;
      hist[g]++;
    }

    // Otsu threshold calculation
    let total = 0;
    for (let t = 0; t < 256; t++) total += t * hist[t];
    let sumB = 0, wB = 0, max = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = n - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (total - sumB) / wF;
      const between = wB * wF * (mB - mF) ** 2;
      if (between > max) { max = between; threshold = t; }
    }

    // Apply binary threshold
    for (let i = 0; i < n; i++) {
      const v = grays[i] >= threshold ? 255 : 0;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return imgData;
  }

  private applySharpen(sourceCanvas: HTMLCanvasElement): ImageData | null {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.filter = 'contrast(1.4) brightness(1.05)';
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.filter = 'none';
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // ─────────────────────────────────────────────
  // Canvas Utilities
  // ─────────────────────────────────────────────

  private upscaleCanvas(sourceCanvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
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

  private cropCanvas(sourceCanvas: HTMLCanvasElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
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
    if (typeof window === 'undefined') throw new Error('Canvas requires browser environment.');

    if (input instanceof HTMLCanvasElement) return input;

    const canvas = document.createElement('canvas');

    if (input instanceof ImageData) {
      canvas.width = input.width;
      canvas.height = input.height;
      canvas.getContext('2d')?.putImageData(input, 0, 0);
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
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      return canvas;
    }

    if (input instanceof HTMLImageElement) {
      // Wait for image to be fully loaded
      if (!input.complete || input.naturalWidth === 0) {
        await new Promise<void>((resolve) => {
          input.onload = () => resolve();
        });
      }
      canvas.width = input.naturalWidth || input.width;
      canvas.height = input.naturalHeight || input.height;
      canvas.getContext('2d')?.drawImage(input, 0, 0);
      return canvas;
    }

    if (input instanceof ImageBitmap) {
      canvas.width = input.width;
      canvas.height = input.height;
      canvas.getContext('2d')?.drawImage(input, 0, 0);
      return canvas;
    }

    return canvas;
  }
}
