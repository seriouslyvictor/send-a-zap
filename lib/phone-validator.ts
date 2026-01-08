/**
 * Phone Number Validator and Normalizer
 *
 * Handles Brazilian phone number formats and normalizes them
 * to the format required by Evolution API (5511999998888).
 *
 * Supported input formats:
 * - (11) 99999-8888
 * - 011-99999-8888
 * - +55 11 99999-8888
 * - 5511999998888
 * - 11999998888
 * - And many more variations
 */

/**
 * Result of phone validation
 */
export interface PhoneValidationResult {
  /** Whether the phone is valid */
  isValid: boolean;
  /** Normalized phone number (5511999998888 format) */
  normalized: string;
  /** Original input */
  original: string;
  /** Error message if invalid */
  error?: string;
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  /** Valid phone numbers */
  valid: PhoneValidationResult[];
  /** Invalid phone numbers */
  invalid: PhoneValidationResult[];
  /** Summary statistics */
  stats: {
    total: number;
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
  };
}

/**
 * Normalize a phone number to Brazilian format (5511999998888)
 *
 * @param phone - Phone number in any format
 * @returns Normalized phone number string
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle empty result
  if (!digits) return '';

  // Handle common Brazilian formats
  if (digits.length === 13 && digits.startsWith('55')) {
    // Already in full format: 5511999998888
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    // Missing the 9: 551199998888 -> 5511999998888
    // Insert 9 after area code (position 4)
    return digits.slice(0, 4) + '9' + digits.slice(4);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    // Format: 011999998888 -> 5511999998888
    return '55' + digits.slice(1);
  }

  if (digits.length === 11) {
    // Format: 11999998888 -> 5511999998888
    return '55' + digits;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    // Format: 0119999888 -> 551199998888 (8-digit, needs 9)
    return '55' + digits.slice(1, 3) + '9' + digits.slice(3);
  }

  if (digits.length === 10) {
    // Format: 1199998888 -> 5511999998888 (8-digit, needs 9)
    return '55' + digits.slice(0, 2) + '9' + digits.slice(2);
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    // Just the number without area code, assume São Paulo (11)
    // 999998888 -> 5511999998888
    return '5511' + digits;
  }

  if (digits.length === 8) {
    // Old format without 9, assume São Paulo
    // 99998888 -> 5511999998888
    return '5511' + '9' + digits;
  }

  // Return as-is if no matching pattern
  return digits;
}

/**
 * Validate if a phone number is a valid Brazilian mobile number
 *
 * @param phone - Phone number (can be in any format)
 * @returns Validation result with normalized number
 */
export function validatePhone(phone: string): PhoneValidationResult {
  const original = phone;
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return {
      isValid: false,
      normalized: '',
      original,
      error: 'Phone number is empty',
    };
  }

  // Brazilian mobile numbers:
  // - 13 digits: 55 + 2-digit area code + 9 + 8-digit number
  // - Format: 5511999998888
  if (!/^55\d{11}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      original,
      error: `Invalid format: expected 13 digits starting with 55, got ${normalized.length} digits`,
    };
  }

  // Extract parts for validation
  const areaCode = normalized.slice(2, 4);
  const ninthDigit = normalized.charAt(4);
  const number = normalized.slice(5);

  // Validate area code (11-99 are valid Brazilian area codes)
  const areaCodeNum = parseInt(areaCode, 10);
  if (areaCodeNum < 11 || areaCodeNum > 99) {
    return {
      isValid: false,
      normalized,
      original,
      error: `Invalid area code: ${areaCode}`,
    };
  }

  // Mobile numbers should start with 9
  if (ninthDigit !== '9') {
    return {
      isValid: false,
      normalized,
      original,
      error: 'Mobile numbers should have 9 as the first digit after area code',
    };
  }

  // Validate the 8-digit number (shouldn't be all same digits)
  if (/^(\d)\1{7}$/.test(number)) {
    return {
      isValid: false,
      normalized,
      original,
      error: 'Invalid number: all digits are the same',
    };
  }

  return {
    isValid: true,
    normalized,
    original,
  };
}

/**
 * Format a normalized phone for display
 *
 * @param phone - Normalized phone (5511999998888)
 * @returns Formatted phone (+55 11 99999-8888)
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 13) return phone;

  return `+${normalized.slice(0, 2)} ${normalized.slice(2, 4)} ${normalized.slice(4, 9)}-${normalized.slice(9)}`;
}

/**
 * Validate a batch of phone numbers
 *
 * @param phones - Array of phone numbers to validate
 * @param checkDuplicates - Whether to check for duplicates (default true)
 * @returns Batch validation result
 */
export function validatePhoneBatch(
  phones: string[],
  checkDuplicates: boolean = true
): BatchValidationResult {
  const valid: PhoneValidationResult[] = [];
  const invalid: PhoneValidationResult[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const phone of phones) {
    const result = validatePhone(phone);

    // Check for duplicates
    if (checkDuplicates && result.isValid) {
      if (seen.has(result.normalized)) {
        duplicateCount++;
        invalid.push({
          ...result,
          isValid: false,
          error: 'Duplicate phone number',
        });
        continue;
      }
      seen.add(result.normalized);
    }

    if (result.isValid) {
      valid.push(result);
    } else {
      invalid.push(result);
    }
  }

  return {
    valid,
    invalid,
    stats: {
      total: phones.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicateCount,
    },
  };
}

/**
 * Extract phone numbers from parsed XLS data
 *
 * @param data - Parsed XLS data
 * @param phoneColumn - Name of the column containing phone numbers
 * @returns Array of phone strings
 */
export function extractPhonesFromData(
  data: Record<string, string>[],
  phoneColumn: string
): string[] {
  return data
    .map((row) => row[phoneColumn] || '')
    .filter((phone) => phone.length > 0);
}
