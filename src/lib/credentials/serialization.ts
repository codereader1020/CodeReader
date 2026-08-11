import { CompanyEmployeeCredentialV1 } from './schema';

/**
 * Deterministically serialize a credential payload by recursively sorting keys.
 * Excludes the `signature` field itself during canonical serialization so the signature can be verified.
 */
export function canonicalSerializeCredential(
  credential: Partial<CompanyEmployeeCredentialV1>
): string {
  const cleanObject: Record<string, unknown> = {};

  // Omit signature field when generating data payload for signing
  const sortedKeys = Object.keys(credential)
    .filter((k) => k !== 'signature')
    .sort();

  for (const key of sortedKeys) {
    const val = (credential as Record<string, unknown>)[key];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object' && !Array.isArray(val)) {
        cleanObject[key] = sortObjectKeys(val as Record<string, unknown>);
      } else {
        cleanObject[key] = val;
      }
    }
  }

  return JSON.stringify(cleanObject);
}

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object' && !Array.isArray(val)) {
        result[key] = sortObjectKeys(val as Record<string, unknown>);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/**
 * Format structured employee input into canonical CompanyEmployeeCredentialV1
 */
export function createEmployeeCredential(
  fields: {
    employeeId: string;
    name: string;
    company?: string;
    department?: string;
    role?: string;
    email?: string;
    phone?: string;
    issuedAt?: string;
    expiresAt?: string;
    employeeNumber?: string;
    customFields?: Record<string, string>;
    issuer?: string;
  }
): CompanyEmployeeCredentialV1 {
  return {
    type: 'company_employee_id',
    version: 1,
    employeeId: fields.employeeId.trim(),
    name: fields.name.trim(),
    company: fields.company?.trim() || undefined,
    department: fields.department?.trim() || undefined,
    role: fields.role?.trim() || undefined,
    email: fields.email?.trim() || undefined,
    phone: fields.phone?.trim() || undefined,
    issuedAt: fields.issuedAt || undefined,
    expiresAt: fields.expiresAt || undefined,
    employeeNumber: fields.employeeNumber?.trim() || undefined,
    customFields: fields.customFields || undefined,
    issuer: fields.issuer?.trim() || undefined,
  };
}
