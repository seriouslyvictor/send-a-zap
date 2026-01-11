/**
 * Phone Number Validator and Normalizer
 *
 * Handles Brazilian MOBILE phone number formats and normalizes them
 * to the format required by Evolution API (5511999998888).
 *
 * IMPORTANT:
 * - Only validates MOBILE numbers (not landlines)
 * - Only accepts Brazilian numbers (rejects international)
 * - Detects fake/invalid patterns
 *
 * Supported input formats:
 * - (11) 99999-8888
 * - 011-99999-8888
 * - +55 11 99999-8888
 * - 5511999998888
 * - 11999998888
 */

/**
 * Configuration constants
 */
export const PHONE_CONFIG = {
  /** Maximum input length to prevent DoS */
  MAX_INPUT_LENGTH: 50,
  /** Expected normalized length */
  NORMALIZED_LENGTH: 13,
  /** Country code for Brazil */
  COUNTRY_CODE: '55',
} as const;

/**
 * Valid Brazilian area codes (DDD)
 * Source: ANATEL (Brazilian telecom regulator)
 */
const VALID_AREA_CODES = new Set([
  // São Paulo region
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  // Rio de Janeiro region
  '21', '22', '24', '27', '28',
  // Espírito Santo
  '27', '28',
  // Minas Gerais
  '31', '32', '33', '34', '35', '37', '38',
  // Paraná
  '41', '42', '43', '44', '45', '46',
  // Santa Catarina
  '47', '48', '49',
  // Rio Grande do Sul
  '51', '53', '54', '55',
  // Brasília and Central-West
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  // Bahia and Northeast
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  // North region
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

/**
 * Emergency and special service numbers to block
 */
const BLOCKED_PATTERNS = [
  /^190/, // Police
  /^192/, // Ambulance
  /^193/, // Fire department
  /^100/, // Phone company service
  /^102/, // Directory assistance
  /^180/, // Various services
];

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
  /** Warning message (valid but suspicious) */
  warning?: string;
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
 * Validate input type and length
 */
function validateInput(phone: unknown): string | null {
  // Type validation
  if (phone === null || phone === undefined) {
    return null;
  }

  // Convert to string
  const phoneStr = String(phone).trim();

  // Empty check
  if (!phoneStr) {
    return null;
  }

  // Length check (DoS prevention)
  if (phoneStr.length > PHONE_CONFIG.MAX_INPUT_LENGTH) {
    return null;
  }

  return phoneStr;
}

/**
 * Detect if input looks like an international number (non-Brazilian)
 */
function isInternationalNumber(digits: string): boolean {
  // Check if it starts with a country code other than 55
  // Note: Brazilian numbers are 10-11 digits without country code, or 12-13 with '55'

  // If more than 13 digits, definitely international
  if (digits.length > 13) {
    return true;
  }

  // If exactly 13 digits starting with 55, it's Brazilian
  if (digits.length === 13 && digits.startsWith('55')) {
    return false;
  }

  // If 12 digits starting with 55, it's Brazilian (old format or landline)
  if (digits.length === 12 && digits.startsWith('55')) {
    return false;
  }

  // If 10 or 11 digits, check if it's a valid Brazilian format
  if (digits.length === 10 || digits.length === 11) {
    // Check if first two digits could be a Brazilian area code
    const firstTwo = digits.slice(0, 2);
    const areaCodeNum = parseInt(firstTwo, 10);
    // Brazilian area codes are 11-99
    if (areaCodeNum >= 11 && areaCodeNum <= 99) {
      return false; // Likely Brazilian
    }
  }

  // If starts with country code format (12-15 digits, starts with 1-9 but not 55)
  if (digits.length >= 12 && digits.length <= 15) {
    const firstTwo = digits.slice(0, 2);
    if (firstTwo !== '55') {
      return true; // International
    }
  }

  return false;
}

/**
 * Normalize a phone number to Brazilian mobile format (5511999998888)
 *
 * @param phone - Phone number in any format
 * @returns Normalized phone number string or empty string if invalid
 */
export function normalizePhone(phone: unknown): string {
  const phoneStr = validateInput(phone);
  if (!phoneStr) return '';

  // Remove all non-digit characters
  let digits = phoneStr.replace(/\D/g, '');

  // Handle empty result
  if (!digits) return '';

  // Handle international prefix variations
  if (digits.startsWith('0055')) {
    // Format: 0055119999988888 -> 5511999998888
    digits = digits.slice(2); // Remove '00', keep '55...'
  } else if (digits.startsWith('055') && digits.length >= 13) {
    // Format: 055119999988888 -> 5511999998888 (old format)
    digits = digits.slice(1); // Remove first '0', keep '55...'
  } else if (digits.length === 12 && digits.startsWith('0')) {
    // Format: 011999998888 (12 digits with trunk prefix 0) -> could be Brazilian
    // Check if removing the 0 gives us 11 digits with valid area code
    const withoutZero = digits.slice(1);
    if (withoutZero.length === 11) {
      const areaCode = withoutZero.slice(0, 2);
      const areaCodeNum = parseInt(areaCode, 10);
      if (areaCodeNum >= 11 && areaCodeNum <= 99) {
        // It's Brazilian format with trunk prefix
        digits = withoutZero; // Remove the leading 0
      }
    }
  }

  // Check for international numbers (AFTER handling Brazilian prefixes)
  if (isInternationalNumber(digits)) {
    return ''; // Reject international numbers
  }

  // Block emergency/service numbers
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(digits)) {
      return '';
    }
  }

  // Handle common Brazilian mobile formats
  if (digits.length === 13 && digits.startsWith('55')) {
    // Already in full format: 5511999998888
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    // Old format without 9th digit: 551199998888
    // This is a LANDLINE format or old mobile - we need to check area code
    const areaCode = digits.slice(2, 4);
    if (!VALID_AREA_CODES.has(areaCode)) {
      return ''; // Invalid area code
    }
    // Check if 5th digit is already 9 (shouldn't be in 12-digit format)
    if (digits.charAt(4) === '9') {
      return ''; // Invalid format
    }
    // This is likely a landline (8 digits) - REJECT
    return '';
  }

  if (digits.length === 12 && digits.startsWith('0')) {
    // Format: 011999998888 (12 digits with leading 0) -> 5511999998888
    // Remove leading 0
    return '55' + digits.slice(1);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    // Format: 011999998888 (if somehow still 11) -> 5511999998888
    return '55' + digits.slice(1);
  }

  if (digits.length === 11) {
    // Format: 11999998888 -> 5511999998888
    // Validate it has 9 as 3rd digit (mobile indicator)
    if (digits.charAt(2) !== '9') {
      return ''; // Landline format - reject
    }
    return '55' + digits;
  }

  if (digits.length === 10) {
    // 10 digits without country code
    // This is LANDLINE format (2-digit area code + 8-digit number)
    // REJECT - we only accept mobiles
    return '';
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    // Just the mobile number without area code
    // We CANNOT assume São Paulo - require area code
    return '';
  }

  if (digits.length === 8) {
    // 8 digits = landline or old mobile without area code
    // REJECT - require full number with area code
    return '';
  }

  // Any other length - invalid
  return '';
}

/**
 * Detect fake/suspicious number patterns
 */
function detectFakePatterns(number: string): string | null {
  const lastEight = number.slice(-8);

  // Check if all 8 digits are the same
  if (/^(\d)\1{7}$/.test(lastEight)) {
    return 'All digits are the same';
  }

  // Check if full 11 digits (after country code) are the same
  const fullNumber = number.slice(2); // Remove '55'
  if (/^(\d)\1{10}$/.test(fullNumber)) {
    return 'All digits in number are the same';
  }

  // Check for obvious sequential patterns
  if (
    /12345678/.test(number) ||
    /87654321/.test(number) ||
    /01234567/.test(number)
  ) {
    return 'Sequential number pattern detected';
  }

  // Check for excessive repetition (7+ repeated digits in a row)
  if (/(\d)\1{6,}/.test(lastEight)) {
    return 'Too many repeated digits';
  }

  // Check for all zeros or all ones in last 8 digits
  if (/^0{8}$/.test(lastEight) || /^1{8}$/.test(lastEight)) {
    return 'Invalid number pattern';
  }

  return null;
}

/**
 * Validate if a phone number is a valid Brazilian mobile number
 *
 * @param phone - Phone number (can be in any format)
 * @returns Validation result with normalized number
 */
export function validatePhone(phone: unknown): PhoneValidationResult {
  const phoneStr = validateInput(phone);
  const original = phoneStr || String(phone);

  // Type/length validation
  if (!phoneStr) {
    return {
      isValid: false,
      normalized: '',
      original,
      error:
        phoneStr === null
          ? 'Phone number is required'
          : 'Phone number exceeds maximum length',
    };
  }

  const normalized = normalizePhone(phoneStr);

  if (!normalized) {
    // Check specific rejection reasons
    const digits = phoneStr.replace(/\D/g, '');

    if (isInternationalNumber(digits)) {
      return {
        isValid: false,
        normalized: '',
        original,
        error: 'International numbers are not accepted (Brazil only)',
      };
    }

    if (digits.length === 10 || digits.length === 8) {
      return {
        isValid: false,
        normalized: '',
        original,
        error: 'Landline numbers are not accepted (mobile only)',
      };
    }

    if (digits.length < 8) {
      return {
        isValid: false,
        normalized: '',
        original,
        error: 'Phone number is too short (minimum 11 digits required)',
      };
    }

    return {
      isValid: false,
      normalized: '',
      original,
      error: 'Phone number could not be normalized to valid format',
    };
  }

  // Brazilian mobile numbers validation
  // Format: 55 (country) + DD (area code) + 9XXXX-XXXX (mobile)
  if (!/^55\d{11}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      original,
      error: `Invalid format: expected 13 digits (55 + area code + 9 digits), got ${normalized.length}`,
    };
  }

  // Extract and validate parts
  const areaCode = normalized.slice(2, 4);
  const fifthDigit = normalized.charAt(4); // Should be 9 for mobile

  // Validate area code against official list
  if (!VALID_AREA_CODES.has(areaCode)) {
    return {
      isValid: false,
      normalized,
      original,
      error: `Invalid area code: ${areaCode} (not a valid Brazilian DDD)`,
    };
  }

  // Mobile numbers MUST start with 9 after area code
  if (fifthDigit !== '9') {
    return {
      isValid: false,
      normalized,
      original,
      error: 'Mobile numbers must have 9 as the first digit after area code (landlines not accepted)',
    };
  }

  // Detect fake patterns
  const fakePattern = detectFakePatterns(normalized);
  if (fakePattern) {
    return {
      isValid: false,
      normalized,
      original,
      error: `Suspicious number: ${fakePattern}`,
    };
  }

  // All validations passed
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
export function formatPhoneForDisplay(phone: unknown): string {
  const phoneStr = validateInput(phone);
  if (!phoneStr) return '';

  const normalized = normalizePhone(phoneStr);
  if (!normalized || normalized.length !== PHONE_CONFIG.NORMALIZED_LENGTH) {
    return phoneStr; // Return original if can't normalize
  }

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
  phones: unknown[],
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
 * Uses case-insensitive column matching
 *
 * @param data - Parsed XLS data
 * @param phoneColumn - Name of the column containing phone numbers
 * @returns Array of phone strings with row indices
 */
export interface ExtractedPhone {
  phone: string;
  rowIndex: number;
}

export function extractPhonesFromData(
  data: Record<string, string>[],
  phoneColumn: string
): ExtractedPhone[] {
  // Create case-insensitive column lookup
  const normalizedColumnName = phoneColumn.toLowerCase().trim();

  return data
    .map((row, index) => {
      // Find matching column (case-insensitive)
      const matchingKey = Object.keys(row).find(
        (key) => key.toLowerCase().trim() === normalizedColumnName
      );

      const phone = matchingKey ? row[matchingKey] : '';
      return {
        phone: phone?.trim() || '',
        rowIndex: index,
      };
    })
    .filter((item) => item.phone.length > 0);
}

/**
 * Get list of all valid Brazilian area codes
 * Useful for UI dropdowns or validation
 */
export function getValidAreaCodes(): string[] {
  return Array.from(VALID_AREA_CODES).sort();
}

/**
 * Check if an area code is valid
 */
export function isValidAreaCode(areaCode: string): boolean {
  return VALID_AREA_CODES.has(areaCode);
}
