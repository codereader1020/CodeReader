/**
 * Security & Sanitization Utilities
 */

/**
 * Escapes HTML characters to prevent XSS attacks when displaying decoded content.
 */
export function escapeHtml(unsafeStr: string): string {
  if (!unsafeStr) return '';
  return unsafeStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Protects CSV cells against CSV Formula Injection (=, +, -, @, \t, \r)
 */
export function sanitizeCsvCell(cellValue: string | number | undefined | null): string {
  if (cellValue === undefined || cellValue === null) return '';
  const str = String(cellValue).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Validates whether a string is a safe HTTP or HTTPS URL
 */
export function isValidWebUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
