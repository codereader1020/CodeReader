import { describe, it, expect } from 'vitest';
import { parseAamvaDriverLicense, buildAamvaDriverLicensePayload } from '../src/lib/credentials/aamva';

describe('AAMVA Driver License PDF417 Parser & Generator Tests', () => {
  it('should parse raw AAMVA US Driver License PDF417 text into structured fields', () => {
    const rawAamva = `@\n\x1e\rANSI 636001100402DL00410396ZN04370070DLDCAD\rDCBNONE\rDCDNONE\rDBA08312029\rDCSMOTORIST\rDACMICHAEL\rDADMATTHEW\rDBD10312021\rDBB08311978\rDBC1\rDAYBLU\rDAU069 in\rDAG2345 ANYWHERE STREET\rDAIYOUR CITY\rDAJNY\rDAK123450000\rDAQ123456789\rDCFNONE\rDCGUSA\rDDEN\rDDFN\rDDGN\rDDK1 ZNZNAMOTORIST\rZNBENCRYPTED ELEMENT GOES HERE`;

    const parsed = parseAamvaDriverLicense(rawAamva);
    expect(parsed).not.toBeNull();
    expect(parsed?.firstName).toBe('MICHAEL');
    expect(parsed?.lastName).toBe('MOTORIST');
    expect(parsed?.licenseNumber).toBe('123456789');
    expect(parsed?.state).toBe('NY');
    expect(parsed?.dateOfBirth).toBe('1978-08-31');
    expect(parsed?.expirationDate).toBe('2029-08-31');
    expect(parsed?.city).toBe('YOUR CITY');
  });

  it('should generate valid AAMVA compliance payload string', () => {
    const payload = buildAamvaDriverLicensePayload({
      firstName: 'MICHAEL',
      lastName: 'MOTORIST',
      licenseNumber: '123456789',
      state: 'NY',
      dateOfBirth: '1978-08-31',
      expirationDate: '2029-08-31',
    });

    expect(payload).toContain('@\n\x1e\rANSI 636001');
    expect(payload).toContain('DCSMOTORIST');
    expect(payload).toContain('DACMICHAEL');
    expect(payload).toContain('DAQ123456789');
    expect(payload).toContain('DAJNY');
  });
});
