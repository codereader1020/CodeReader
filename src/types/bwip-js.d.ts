declare module 'bwip-js' {
  export interface ToBufferOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    padding?: number;
    backgroundcolor?: string;
    barcolor?: string;
    eclevel?: number;
    columns?: number;
    rows?: number;
    [key: string]: unknown;
  }

  export function toSVG(options: ToBufferOptions): string;
  export function toCanvas(canvas: HTMLCanvasElement | string, options: ToBufferOptions): HTMLCanvasElement;
  export function toBuffer(options: ToBufferOptions): Promise<Buffer>;
  
  const bwipjs: {
    toSVG(options: ToBufferOptions): string;
    toCanvas(canvas: HTMLCanvasElement | string, options: ToBufferOptions): HTMLCanvasElement;
    toBuffer(options: ToBufferOptions): Promise<Buffer>;
  };

  export default bwipjs;
}
