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
 * Parses raw decoded string into structured AAMVA Driver's License fields
 */
export function parseAamvaDriverLicense(rawText: string): AamvaDriverLicense | null {
  if (!rawText) return null;

  // AAMVA barcodes start with '@' and contain 'ANSI ' or 'DL' header
  if (!rawText.startsWith('@') && !rawText.includes('ANSI ') && !rawText.includes('DLDCAD')) {
    return null;
  }

  const getField = (code: string): string | undefined => {
    // Search for 3-letter code followed by value up to line return or next field code
    const regex = new RegExp(`${code}([^\\r\\n]+)`, 'g');
    const match = regex.exec(rawText);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  };

  const parseAamvaDate = (dateStr?: string): string | undefined => {
    if (!dateStr || dateStr.length < 8) return dateStr;
    // Format MMDDYYYY or YYYYMMDD to YYYY-MM-DD
    const cleaned = dateStr.replace(/[^0-9]/g, '');
    if (cleaned.length === 8) {
      // Check if starts with 19 or 20 (YYYYMMDD)
      if (cleaned.startsWith('19') || cleaned.startsWith('20')) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
      }
      // Else assume MMDDYYYY
      return `${cleaned.substring(4, 8)}-${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}`;
    }
    return dateStr;
  };

  const sexCode = getField('DBC');
  let gender = 'Unspecified';
  if (sexCode === '1') gender = 'Male';
  else if (sexCode === '2') gender = 'Female';
  else if (sexCode) gender = sexCode;

  const license: AamvaDriverLicense = {
    firstName: getField('DAC') || getField('DCT'),
    lastName: getField('DCS') || getField('DAB'),
    middleName: getField('DAD'),
    licenseNumber: getField('DAQ'),
    dateOfBirth: parseAamvaDate(getField('DBB')),
    expirationDate: parseAamvaDate(getField('DBA')),
    issueDate: parseAamvaDate(getField('DBD')),
    gender,
    eyeColor: getField('DAY'),
    height: getField('DAU'),
    streetAddress: getField('DAG'),
    city: getField('DAI'),
    state: getField('DAJ'),
    postalCode: getField('DAK'),
    country: getField('DCG') || 'USA',
    rawAamvaText: rawText,
  };

  if (!license.licenseNumber && !license.lastName && !license.firstName) {
    return null;
  }

  return license;
}

/**
 * Builds a standards-compliant AAMVA Driver's License PDF417 raw text payload
 */
export function buildAamvaDriverLicensePayload(fields: {
  firstName: string;
  lastName: string;
  middleName?: string;
  licenseNumber: string;
  state: string;
  dateOfBirth: string; // YYYY-MM-DD or MMDDYYYY
  expirationDate: string;
  issueDate?: string;
  gender?: string;
  eyeColor?: string;
  height?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
}): string {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '01012026';
    const cleaned = dateStr.replace(/[^0-9]/g, '');
    if (cleaned.length === 8 && (dateStr.includes('-') || dateStr.includes('/'))) {
      // YYYY-MM-DD -> MMDDYYYY
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
  const sex = fields.gender === 'Female' ? '2' : '1';

  // Standard AAMVA 2020/2016 Header & Subfile structure
  const header = `@\n\x1e\rANSI 636001100402DL00410396ZN04370070DLDCAD     \r`;
  const subfile = [
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
    `DAK${(fields.postalCode || '123450000').replace(/[^0-9]/g, '').padEnd(11, ' ')}`,
    `DAQ${fields.licenseNumber.toUpperCase().padEnd(25, ' ')}`,
    `DCFNONE`,
    `DCGUSA`,
    `DDEN`,
    `DDFN`,
    `DDGN`,
    `DDK1 ZNZNAMOTORIST`,
    `ZNBENCRYPTED ELEMENT GOES HERE`,
  ].join('\r');

  return `${header}${subfile}`;
}
