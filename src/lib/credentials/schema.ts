export interface CompanyEmployeeCredentialV1 {
  type: 'company_employee_id';
  version: 1;
  employeeId: string;
  name: string;
  company?: string;
  department?: string;
  role?: string;
  email?: string;
  phone?: string;
  issuedAt?: string; // YYYY-MM-DD
  expiresAt?: string; // YYYY-MM-DD
  employeeNumber?: string;
  customFields?: Record<string, string>;
  issuer?: string;
  signature?: string; // Hex or Base64 signature
}

export type CredentialStatus =
  | 'AUTHENTICATED' // Valid schema, not expired, signature verified
  | 'VALID'         // Valid schema, not expired, no signature
  | 'EXPIRED'       // Schema valid, but past expiration date
  | 'UNAUTHENTICATED' // Schema valid, signature invalid or verification failed
  | 'INVALID';       // Schema mismatch / missing required fields

export interface ValidationResult {
  status: CredentialStatus;
  isValid: boolean;
  isAuthenticated: boolean;
  reason?: string;
  credential?: CompanyEmployeeCredentialV1;
  errors: string[];
}
