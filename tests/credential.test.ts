import { describe, it, expect } from 'vitest';
import { createEmployeeCredential } from '../src/lib/credentials/serialization';
import { validateEmployeeCredential } from '../src/lib/credentials/validation';
import { signCredential } from '../src/lib/credentials/signing';

describe('Company Employee Credential System Tests', () => {
  it('should validate a correctly formatted employee credential', async () => {
    const cred = createEmployeeCredential({
      employeeId: 'EMP-999',
      name: 'Jane Doe',
      company: 'Test Corp',
      department: 'Engineering',
      expiresAt: '2030-01-01',
    });

    const res = await validateEmployeeCredential(JSON.stringify(cred));
    expect(res.isValid).toBe(true);
    expect(res.status).toBe('VALID');
    expect(res.credential?.employeeId).toBe('EMP-999');
  });

  it('should flag expired credentials correctly', async () => {
    const cred = createEmployeeCredential({
      employeeId: 'EMP-888',
      name: 'John Old',
      expiresAt: '2020-01-01', // Expired date
    });

    const res = await validateEmployeeCredential(JSON.stringify(cred));
    expect(res.isValid).toBe(false);
    expect(res.status).toBe('EXPIRED');
    expect(res.reason).toContain('Credential expired');
  });

  it('should sign and cryptographically authenticate credentials', async () => {
    const secret = 'super-secret-key-123';
    let cred = createEmployeeCredential({
      employeeId: 'EMP-777',
      name: 'Secure Employee',
      expiresAt: '2030-01-01',
    });

    // Sign credential
    cred = await signCredential(cred, secret);
    expect(cred.signature).toBeDefined();

    // Validate with matching secret key
    const validRes = await validateEmployeeCredential(JSON.stringify(cred), secret);
    expect(validRes.status).toBe('AUTHENTICATED');
    expect(validRes.isAuthenticated).toBe(true);

    // Validate with wrong secret key
    const invalidRes = await validateEmployeeCredential(JSON.stringify(cred), 'wrong-key');
    expect(invalidRes.status).toBe('UNAUTHENTICATED');
    expect(invalidRes.isAuthenticated).toBe(false);
  });
});
