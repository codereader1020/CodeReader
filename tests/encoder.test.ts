import { describe, it, expect } from 'vitest';
import { BwipPdf417Encoder } from '../src/lib/pdf417/adapters/bwipAdapter';

describe('PDF417 Encoder Unit Tests', () => {
  const encoder = new BwipPdf417Encoder();

  it('should encode simple text into a valid PDF417 payload', async () => {
    const result = await encoder.encode({
      format: 'pdf417',
      encoding: 'text',
      data: 'Hello PDF417 Studio',
    });

    expect(result.format).toBe('pdf417');
    expect(result.dataUrl).toContain('data:image/');
    expect(result.dataSizeBytes).toBeGreaterThan(0);
    expect(result.rawPayload).toBe('Hello PDF417 Studio');
  });

  it('should encode structured JSON objects correctly', async () => {
    const payload = { employeeId: 'EMP-001', name: 'Alice' };
    const result = await encoder.encode({
      format: 'pdf417',
      encoding: 'json',
      data: payload,
    });

    expect(result.rawPayload).toBe(JSON.stringify(payload));
    expect(result.ecLevel).toBeGreaterThanOrEqual(2);
  });

  it('should reject empty payloads', async () => {
    await expect(
      encoder.encode({
        format: 'pdf417',
        encoding: 'text',
        data: '',
      })
    ).rejects.toThrow('Cannot encode empty payload into PDF417 barcode.');
  });

  it('should respect custom error correction level and column options', async () => {
    const result = await encoder.encode(
      {
        format: 'pdf417',
        encoding: 'text',
        data: 'Custom parameters payload',
      },
      {
        ecLevel: 5,
        columns: 4,
      }
    );

    expect(result.ecLevel).toBe(5);
    expect(result.columns).toBe(4);
  });
});
