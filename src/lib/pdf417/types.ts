export type BarcodeFormat = 'pdf417' | 'qr' | 'data-matrix';

export type InputEncodingType = 'text' | 'json' | 'employee' | 'url';

export interface BarcodePayload {
  format: BarcodeFormat;
  encoding: InputEncodingType;
  data: string | Record<string, unknown>;
}

export interface Pdf417Options {
  /** Error correction level (0 to 8). Default is automatic based on data length */
  ecLevel?: number;
  /** Number of data columns (1 to 30). Default is automatic */
  columns?: number;
  /** Number of rows. Default is automatic */
  rows?: number;
  /** Compact (truncated) PDF417 format. Default is false */
  compact?: boolean;
  /** Module scale / pixel width multiplier. Default is 3 */
  scale?: number;
  /** Height multiplier for rows. Default is 3 */
  rowHeightMultiplier?: number;
  /** Margin quiet zone in pixels. Default is 10 */
  padding?: number;
  /** Foreground hex color, e.g. '#000000' */
  foreground?: string;
  /** Background hex color, e.g. '#ffffff' */
  background?: string;
  /** Output format: 'png' data URL, 'svg' string, or canvas drawing */
  outputFormat?: 'png' | 'svg';
}

export interface EncodedBarcode {
  format: 'pdf417';
  dataUrl: string; // PNG base64 data URL
  svgString?: string; // SVG markup if generated
  width: number;
  height: number;
  columns: number;
  rows: number;
  ecLevel: number;
  dataSizeBytes: number;
  qualityEstimate: 'Excellent' | 'Good' | 'Fair' | 'Dense / Hard to scan';
  rawPayload: string;
}

export interface DecodedBarcode {
  format: string;
  text: string;
  bytes?: Uint8Array;
  timestamp: number;
  points?: Array<{ x: number; y: number }>;
}

export interface Pdf417Encoder {
  encode(input: BarcodePayload, options?: Pdf417Options): Promise<EncodedBarcode>;
}

export interface Pdf417Decoder {
  decode(imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | ImageData): Promise<DecodedBarcode[]>;
}
