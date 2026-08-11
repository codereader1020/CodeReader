import { CompanyEmployeeCredentialV1, ValidationResult } from './schema';
import { verifyCredentialSignature } from './signing';
import { parseAamvaDriverLicense } from './aamva';

/**
 * Parses and validates an arbitrary text string to check if it matches CompanyCredential or AAMVA Driver's License
 */
export async function validateEmployeeCredential(
  rawText: string,
  verificationSecretKey?: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  // 1. Try parsing as AAMVA US/Canada Driver's License
  const aamva = parseAamvaDriverLicense(rawText);
  if (aamva) {
    // Check expiration date if present
    let status: ValidationResult['status'] = 'VALID';
    if (aamva.expirationDate) {
      const exp = new Date(aamva.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!isNaN(exp.getTime()) && exp < today) {
        status = 'EXPIRED';
      }
    }

    return {
      status,
      isValid: status !== 'EXPIRED',
      isAuthenticated: false, // AAMVA barcodes are unencrypted standard format
      aamvaLicense: aamva,
      errors: status === 'EXPIRED' ? [`Driver's License expired on ${aamva.expirationDate}`] : [],
    };
  }

  // 2. Try parsing JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return {
      status: 'INVALID',
      isValid: false,
      isAuthenticated: false,
      reason: 'Raw text is not valid JSON or AAMVA License format.',
      errors: ['Data is not valid JSON or AAMVA License format.'],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      status: 'INVALID',
      isValid: false,
      isAuthenticated: false,
      reason: 'Decoded JSON is not an object.',
      errors: ['Expected JSON object.'],
    };
  }

  const obj = parsed as Record<string, unknown>;

  // 3. Validate Type & Version
  if (obj.type !== 'company_employee_id') {
    return {
      status: 'INVALID',
      isValid: false,
      isAuthenticated: false,
      reason: `Unexpected type '${String(obj.type)}'. Expected 'company_employee_id'.`,
      errors: ['Credential type mismatch.'],
    };
  }

  if (obj.version !== 1) {
    return {
      status: 'INVALID',
      isValid: false,
      isAuthenticated: false,
      reason: `Unsupported credential version '${String(obj.version)}'. Expected version 1.`,
      errors: ['Unsupported credential version.'],
    };
  }

  // 4. Required Fields Check
  if (!obj.employeeId || typeof obj.employeeId !== 'string' || obj.employeeId.trim() === '') {
    errors.push('Missing or empty required field: employeeId.');
  }

  if (!obj.name || typeof obj.name !== 'string' || obj.name.trim() === '') {
    errors.push('Missing or empty required field: name.');
  }

  if (errors.length > 0) {
    return {
      status: 'INVALID',
      isValid: false,
      isAuthenticated: false,
      reason: errors.join(' '),
      errors,
    };
  }

  const credential = obj as unknown as CompanyEmployeeCredentialV1;

  // 5. Date Expiration Check
  if (credential.expiresAt) {
    const expires = new Date(credential.expiresAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(expires.getTime())) {
      errors.push(`Malformed expiresAt date format: ${credential.expiresAt}`);
    } else if (expires < today) {
      return {
        status: 'EXPIRED',
        isValid: false,
        isAuthenticated: false,
        reason: `Credential expired on ${credential.expiresAt}.`,
        credential,
        errors: [`Credential expired on ${credential.expiresAt}.`],
      };
    }
  }

  // 6. Signature Verification Check
  let isAuthenticated = false;
  if (credential.signature) {
    if (verificationSecretKey) {
      const isSigValid = await verifyCredentialSignature(credential, verificationSecretKey);
      if (isSigValid) {
        isAuthenticated = true;
      } else {
        return {
          status: 'UNAUTHENTICATED',
          isValid: true,
          isAuthenticated: false,
          reason: 'Digital signature verification failed. Payload may have been tampered with.',
          credential,
          errors: ['Digital signature verification failed.'],
        };
      }
    }
  }

  const status = isAuthenticated ? 'AUTHENTICATED' : 'VALID';

  return {
    status,
    isValid: true,
    isAuthenticated,
    credential,
    errors: [],
  };
}
