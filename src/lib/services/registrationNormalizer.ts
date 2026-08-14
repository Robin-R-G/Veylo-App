/**
 * Normalizes vehicle registration strings.
 * Examples:
 * "KL 16 P 78"   => "KL16P78"
 * "KL-16-P-78"  => "KL16P78"
 * "kl 16 p 78"   => "KL16P78"
 * "MH 02 CK 1234" => "MH02CK1234"
 */
export function normalizeRegistrationNumber(rawReg: string): string {
  if (!rawReg) return '';
  return rawReg
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Formats normalized registration string into clean display format.
 * "KL16P78" => "KL 16 P 78"
 */
export function formatRegistrationDisplay(normalizedReg: string): string {
  const norm = normalizeRegistrationNumber(normalizedReg);
  if (!norm) return '';
  
  // Indian vehicle format regex match (e.g., KL16P78, MH02CK1234)
  const match = norm.match(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  
  return norm;
}
