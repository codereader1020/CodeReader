import bwipjs from 'bwip-js';
import { BarcodePayload, EncodedBarcode, Pdf417Encoder, Pdf417Options } from '../types';

export class BwipPdf417Encoder implements Pdf417Encoder {
  async encode(payload: BarcodePayload, options: Pdf417Options = {}): Promise<EncodedBarcode> {
    const rawData = typeof payload.data === 'string' 
      ? payload.data 
      : JSON.stringify(payload.data);

    if (!rawData) {
      throw new Error('Cannot encode empty payload into PDF417 barcode.');
    }

    const dataSizeBytes = new TextEncoder().encode(rawData).length;
    if (dataSizeBytes > 2000) {
      throw new Error(`Payload size of ${dataSizeBytes} bytes exceeds safe PDF417 capacity (~1800 bytes). Consider using a verification URL.`);
    }

    // Default configuration options
    const scale = options.scale ?? 3;
    const ecLevel = options.ecLevel ?? this.estimateEcLevel(dataSizeBytes);
    const columns = options.columns ?? 0; // 0 = automatic
    const compact = options.compact ?? false;
    const padding = options.padding ?? 10;
    const foreground = (options.foreground || '#000000').replace('#', '');
    const background = (options.background || '#ffffff').replace('#', '');

    // Map to bwip-js options
    // bwip-js BCID for PDF417 is 'pdf417' or 'compactpdf417'
    const bcid = compact ? 'compactpdf417' : 'pdf417';

    const bwipOptions: Record<string, unknown> = {
      bcid,
      text: rawData,
      scale,
      padding,
      barcolor: foreground,
      backgroundcolor: background,
      eclevel: ecLevel,
    };

    if (columns > 0) {
      bwipOptions.columns = columns;
    }

    if (options.rows && options.rows > 0) {
      bwipOptions.rows = options.rows;
    }

    if (options.rowHeightMultiplier) {
      bwipOptions.height = options.rowHeightMultiplier * 3;
    }

    let dataUrl = '';
    let svgString = '';
    let width = 300;
    let height = 150;

    // Resolve bwipjs functions safely across ESM/CJS and Browser/Node environments
    // eslint-disable-next-line
    let bw: any = bwipjs;
    if (!bw || (!bw.toSVG && !bw.toBuffer && typeof require !== 'undefined')) {
      try {
        bw = require('bwip-js');
      } catch (e) {
        // fallback
      }
    }

    const toSVG = bw?.toSVG || bw?.default?.toSVG;
    const toCanvas = bw?.toCanvas || bw?.default?.toCanvas;
    const toBuffer = bw?.toBuffer || bw?.default?.toBuffer;

    if (typeof toSVG === 'function') {
      try {
        svgString = toSVG(bwipOptions);
      } catch (e: unknown) {
        const err = e as Error;
        throw new Error(`PDF417 encoding failed: ${err?.message || err}`);
      }
    }

    if (typeof window !== 'undefined' && typeof toCanvas === 'function') {
      const canvas = document.createElement('canvas');
      try {
        toCanvas(canvas, bwipOptions);
        dataUrl = canvas.toDataURL('image/png');
        width = canvas.width;
        height = canvas.height;
      } catch (e: unknown) {
        if (svgString) {
          dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        }
      }
    } else if (typeof toBuffer === 'function') {
      // Node.js / Vitest environment
      try {
        const pngBuf = await toBuffer(bwipOptions);
        dataUrl = `data:image/png;base64,${pngBuf.toString('base64')}`;
      } catch (e: unknown) {
        const err = e as Error;
        throw new Error(`PDF417 encoding failed: ${err?.message || err}`);
      }
    } else if (svgString) {
      dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    }

    // Estimate quality
    const qualityEstimate = this.calculateQualityScore(dataSizeBytes, columns);

    return {
      format: 'pdf417',
      dataUrl,
      svgString,
      width,
      height,
      columns: columns > 0 ? columns : Math.ceil(Math.sqrt(dataSizeBytes / 4)),
      rows: options.rows || 0,
      ecLevel,
      dataSizeBytes,
      qualityEstimate,
      rawPayload: rawData,
    };
  }

  private estimateEcLevel(bytes: number): number {
    if (bytes < 40) return 2;
    if (bytes < 160) return 3;
    if (bytes < 320) return 4;
    if (bytes < 800) return 5;
    return 6;
  }

  private calculateQualityScore(bytes: number, cols: number): EncodedBarcode['qualityEstimate'] {
    if (bytes < 200) return 'Excellent';
    if (bytes < 500) return 'Good';
    if (bytes < 1000) return 'Fair';
    return 'Dense / Hard to scan';
  }
}
