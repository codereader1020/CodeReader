export interface AamvaDriverLicense {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  licenseNumber?: string;
  dateOfBirth?: string;
  expirationDate?: string;
  issueDate?: string;
  gender?: string; // Male / Female / Unspecified
  eyeColor?: string;
  height?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  issuerIdentificationNumber?: string;
  rawAamvaText: string;
}

/**
 * Parses raw decoded string into structured AAMVA Driver's License fields.
 *
 * Handles all real-world variants:
 *   - Actual \r / \n control characters (standard AAMVA)
 *   - Literal <LF> / <CR> text (some decoder HRI modes)
 *   - Mixed whitespace padding on field values
 */
export function parseAamvaDriverLicense(rawText: string): AamvaDriverLicense | null {
  if (!rawText) return null;

  // Must look like an AAMVA payload
  const upper = rawText.toUpperCase();
  if (
    !upper.includes('ANSI ') &&
    !upper.includes('DLDCAD') &&
    !(rawText.startsWith('@') && upper.includes('DCS'))
  ) {
    return null;
  }

  // Normalize all delimiter variants to \n so we can split into lines
  const normalized = rawText
    .replace(/<CR>/gi, '\r')
    .replace(/<LF>/gi, '\n')
    .replace(/<GS>/gi, '\x1d')
    .replace(/<RS>/gi, '\x1e')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Split into lines and strip whitespace — each non-empty line is one field
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  // Build a lookup map: 3-char code → value
  const fieldMap: Record<string, string> = {};
  for (const line of lines) {
    // Match 3-letter/digit field code at the start of the line
    const match = line.match(/^([A-Z]{2,3})(.+)$/);
    if (match) {
      const code = match[1];
      const value = match[2].trim();
      if (code && value && !fieldMap[code]) {
        fieldMap[code] = value;
      }
    }
  }

  const get = (code: string): string | undefined => {
    const v = fieldMap[code];
    return v ? v.trim() : undefined;
  };

  const parseAamvaDate = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    const cleaned = dateStr.replace(/[^0-9]/g, '');
    if (cleaned.length === 8) {
      // YYYYMMDD
      if (cleaned.startsWith('19') || cleaned.startsWith('20')) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
      }
      // MMDDYYYY
      return `${cleaned.substring(4, 8)}-${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}`;
    }
    return dateStr;
  };

  const sexCode = get('DBC');
  let gender = 'Unspecified';
  if (sexCode === '1') gender = 'Male';
  else if (sexCode === '2') gender = 'Female';
  else if (sexCode) gender = sexCode;

  // First name: DAC is primary, DCT is alternate (some states put full name in DCT)
  let firstName = get('DAC') || get('DCT');
  let lastName = get('DCS') || get('DAB');

  // DCT sometimes holds "FIRST MIDDLE" — split if DAC not present
  if (!get('DAC') && get('DCT') && get('DAD')) {
    firstName = get('DCT');
  }

  const license: AamvaDriverLicense = {
    firstName,
    lastName,
    middleName: get('DAD'),
    licenseNumber: get('DAQ'),
    dateOfBirth: parseAamvaDate(get('DBB')),
    expirationDate: parseAamvaDate(get('DBA')),
    issueDate: parseAamvaDate(get('DBD')),
    gender,
    eyeColor: get('DAY'),
    height: get('DAU'),
    streetAddress: get('DAG'),
    city: get('DAI'),
    state: get('DAJ'),
    postalCode: get('DAK'),
    country: get('DCG') || 'USA',
    rawAamvaText: rawText,
  };

  if (!license.licenseNumber && !license.lastName && !license.firstName) {
    return null;
  }

  return license;
}


/**
 * Builds a standards-compliant AAMVA Driver's License PDF417 raw text payload.
 * Accepts all standard fields plus any extra arbitrary AAMVA code-value pairs
 * via the index signature (e.g. { DCF: 'NONE', ZNB: 'ENCRYPTED...' }).
 */
export function buildAamvaDriverLicensePayload(fields: {
  firstName: string;
  lastName: string;
  middleName?: string;
  licenseNumber: string;
  state: string;
  dateOfBirth: string;
  expirationDate: string;
  issueDate?: string;
  gender?: string;
  eyeColor?: string;
  height?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  [extraCode: string]: string | undefined;
}): string {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '01012026';
    const cleaned = dateStr.replace(/[^0-9]/g, '');
    if (cleaned.length === 8 && (dateStr.includes('-') || dateStr.includes('/'))) {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[1]}${parts[2]}${parts[0]}`;
      }
    }
    return cleaned.padEnd(8, '0');
  };

  const dob = formatDate(fields.dateOfBirth);
  const exp = formatDate(fields.expirationDate);
  const iss = fields.issueDate ? formatDate(fields.issueDate) : '01012022';

  // Sex: Male=1, Female=2, Not Specified=9
  let sex = '1';
  if (fields.gender === 'Female') sex = '2';
  else if (fields.gender === 'Not Specified') sex = '9';

  // Known standard JS property names — already mapped to AAMVA codes above
  const knownKeys = new Set([
    'firstName','lastName','middleName','licenseNumber','state',
    'dateOfBirth','expirationDate','issueDate','gender','eyeColor',
    'height','streetAddress','city','postalCode',
  ]);

  // Collect user-added custom field codes (2-3 uppercase letters only)
  const customLines: string[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (!knownKeys.has(key) && val && /^[A-Z]{2,3}$/.test(key)) {
      customLines.push(`${key}${val}`);
    }
  }

  const header = `@\n\x1e\rANSI 636001100402DL00410396ZN04370070DLDCAD     \r`;
  const subfileLines = [
    `DCBNONE`,
    `DCDNONE`,
    `DBA${exp}`,
    `DCS${fields.lastName.toUpperCase().padEnd(40, ' ')}`,
    `DAC${fields.firstName.toUpperCase().padEnd(40, ' ')}`,
    `DAD${(fields.middleName || '').toUpperCase().padEnd(40, ' ')}`,
    `DBD${iss}`,
    `DBB${dob}`,
    `DBC${sex}`,
    `DAY${(fields.eyeColor || 'BLU').toUpperCase()}`,
    `DAU${fields.height || '069 in'}`,
    `DAG${(fields.streetAddress || '123 MAIN STREET').toUpperCase().padEnd(35, ' ')}`,
    `DAI${(fields.city || 'ANYTOWN').toUpperCase().padEnd(20, ' ')}`,
    `DAJ${fields.state.toUpperCase()}`,
    `DAK${(fields.postalCode || '000000000').replace(/[^0-9]/g, '').padEnd(11, ' ')}`,
    `DAQ${fields.licenseNumber.toUpperCase().padEnd(25, ' ')}`,
    `DCFNONE`,
    `DCGUSA`,
    `DDEN`,
    `DDFN`,
    `DDGN`,
    ...customLines,
  ];

  return `${header}${subfileLines.join('\r')}`;
}
