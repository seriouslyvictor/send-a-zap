import { describe, it, expect } from 'vitest';
import {
  PHONE_CONFIG,
  normalizePhone,
  validatePhone,
  formatPhoneForDisplay,
  validatePhoneBatch,
  extractPhonesFromData,
  getValidAreaCodes,
  isValidAreaCode,
} from './phone-validator';

describe('Phone Validator', () => {
  describe('PHONE_CONFIG', () => {
    it('should have proper configuration constants', () => {
      expect(PHONE_CONFIG.MAX_INPUT_LENGTH).toBe(50);
      expect(PHONE_CONFIG.NORMALIZED_LENGTH).toBe(13);
      expect(PHONE_CONFIG.COUNTRY_CODE).toBe('55');
    });
  });

  describe('normalizePhone - DoS Protection', () => {
    it('should reject extremely long inputs', () => {
      const longInput = '9'.repeat(PHONE_CONFIG.MAX_INPUT_LENGTH + 1);
      expect(normalizePhone(longInput)).toBe('');
    });

    it('should accept inputs within limit', () => {
      const validInput = '(11) 99999-8888';
      expect(normalizePhone(validInput)).toBe('5511999998888');
    });

    it('should handle null and undefined', () => {
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
    });

    it('should handle non-string types', () => {
      expect(normalizePhone(11999998888 as unknown as string)).toBe('5511999998888');
      expect(normalizePhone(true as unknown as string)).toBe('');
    });
  });

  describe('normalizePhone - International Numbers', () => {
    it('should reject USA numbers', () => {
      expect(normalizePhone('+1-555-123-4567')).toBe('');
      expect(normalizePhone('1555123456')).toBe(''); // 10 digits starting with 1
    });

    it('should reject other international numbers', () => {
      expect(normalizePhone('+44 20 7946 0958')).toBe(''); // UK
      expect(normalizePhone('+33 1 42 86 82 00')).toBe(''); // France
    });

    it('should accept Brazilian numbers', () => {
      expect(normalizePhone('5511999998888')).toBe('5511999998888');
      expect(normalizePhone('+55 11 99999-8888')).toBe('5511999998888');
    });
  });

  describe('normalizePhone - Landline Rejection', () => {
    it('should reject 10-digit landline format', () => {
      expect(normalizePhone('1133334444')).toBe(''); // 10 digits = landline
      expect(normalizePhone('2133334444')).toBe(''); // Rio landline
    });

    it('should reject 12-digit landline format with country code', () => {
      expect(normalizePhone('551133334444')).toBe(''); // 12 digits = landline
    });

    it('should reject 8-digit number without area code', () => {
      expect(normalizePhone('33334444')).toBe(''); // Need area code
    });

    it('should reject 11-digit without 9 (landline)', () => {
      expect(normalizePhone('11833334444')).toBe(''); // 3rd digit is not 9
    });
  });

  describe('normalizePhone - No São Paulo Assumption', () => {
    it('should reject 9-digit number without area code', () => {
      expect(normalizePhone('999998888')).toBe(''); // Cannot assume SP
    });

    it('should require full 11 digits with area code', () => {
      expect(normalizePhone('21999998888')).toBe('5521999998888'); // Rio - OK
      expect(normalizePhone('11999998888')).toBe('5511999998888'); // SP - OK
    });
  });

  describe('normalizePhone - Valid Formats', () => {
    it('should normalize already correct format', () => {
      expect(normalizePhone('5511999998888')).toBe('5511999998888');
    });

    it('should normalize with parentheses and dashes', () => {
      expect(normalizePhone('(11) 99999-8888')).toBe('5511999998888');
      expect(normalizePhone('(21) 98888-7777')).toBe('5521988887777');
    });

    it('should normalize with country code prefix', () => {
      expect(normalizePhone('+55 11 99999-8888')).toBe('5511999998888');
      expect(normalizePhone('+55 21 98888-7777')).toBe('5521988887777');
    });

    it('should normalize with leading zero', () => {
      expect(normalizePhone('011999998888')).toBe('5511999998888');
      expect(normalizePhone('021988887777')).toBe('5521988887777');
    });

    it('should normalize 11-digit mobile format', () => {
      expect(normalizePhone('11999998888')).toBe('5511999998888');
      expect(normalizePhone('21988887777')).toBe('5521988887777');
    });

    it('should handle spaces and special characters', () => {
      expect(normalizePhone('(11) 9 9999-8888')).toBe('5511999998888');
      expect(normalizePhone('11.99999.8888')).toBe('5511999998888');
      expect(normalizePhone('11-99999-8888')).toBe('5511999998888');
    });
  });

  describe('normalizePhone - Emergency Numbers', () => {
    it('should block police (190)', () => {
      expect(normalizePhone('190')).toBe('');
    });

    it('should block ambulance (192)', () => {
      expect(normalizePhone('192')).toBe('');
    });

    it('should block fire department (193)', () => {
      expect(normalizePhone('193')).toBe('');
    });
  });

  describe('validatePhone - Area Code Validation', () => {
    it('should accept valid São Paulo area codes', () => {
      expect(validatePhone('5511999998888').isValid).toBe(true);
      expect(validatePhone('5512999998888').isValid).toBe(true);
      expect(validatePhone('5519999998888').isValid).toBe(true);
    });

    it('should accept valid Rio area codes', () => {
      expect(validatePhone('5521999998888').isValid).toBe(true);
      expect(validatePhone('5522999998888').isValid).toBe(true);
      expect(validatePhone('5524999998888').isValid).toBe(true);
    });

    it('should accept valid area codes from all regions', () => {
      expect(validatePhone('5531999998888').isValid).toBe(true); // MG
      expect(validatePhone('5541999998888').isValid).toBe(true); // PR
      expect(validatePhone('5551999998888').isValid).toBe(true); // RS
      expect(validatePhone('5561999998888').isValid).toBe(true); // DF
      expect(validatePhone('5571999998888').isValid).toBe(true); // BA
      expect(validatePhone('5581999998888').isValid).toBe(true); // PE
      expect(validatePhone('5591999998888').isValid).toBe(true); // PA
    });

    it('should reject invalid area codes', () => {
      expect(validatePhone('5520999998888').isValid).toBe(false); // 20 doesn't exist
      expect(validatePhone('5530999998888').isValid).toBe(false); // 30 doesn't exist
      expect(validatePhone('5590999998888').isValid).toBe(false); // 90 doesn't exist
      expect(validatePhone('5510999998888').isValid).toBe(false); // 10 doesn't exist
      expect(validatePhone('5501999998888').isValid).toBe(false); // 01 doesn't exist
    });

    it('should provide clear error for invalid area code', () => {
      const result = validatePhone('5520999998888');
      expect(result.error).toContain('Invalid area code: 20');
    });
  });

  describe('validatePhone - Mobile Format Validation', () => {
    it('should require 9 as 5th digit (after area code)', () => {
      expect(validatePhone('5511899998888').isValid).toBe(false); // 8 instead of 9
      expect(validatePhone('5511799998888').isValid).toBe(false); // 7 instead of 9
      expect(validatePhone('5511999998888').isValid).toBe(true); // Correct
    });

    it('should require 6-9 as 6th digit', () => {
      expect(validatePhone('5511900001111').isValid).toBe(false); // 90
      expect(validatePhone('5511910001111').isValid).toBe(false); // 91
      expect(validatePhone('5511920001111').isValid).toBe(false); // 92
      expect(validatePhone('5511930001111').isValid).toBe(false); // 93
      expect(validatePhone('5511940001111').isValid).toBe(false); // 94
      expect(validatePhone('5511950001111').isValid).toBe(false); // 95
      expect(validatePhone('5511960001111').isValid).toBe(true); // 96 ✓
      expect(validatePhone('5511970001111').isValid).toBe(true); // 97 ✓
      expect(validatePhone('5511980001111').isValid).toBe(true); // 98 ✓
      expect(validatePhone('5511990001111').isValid).toBe(true); // 99 ✓
    });

    it('should provide clear error for invalid mobile format', () => {
      const result = validatePhone('5511950001111');
      expect(result.error).toContain('digit after 9 must be 6-9');
    });
  });

  describe('validatePhone - Fake Number Detection', () => {
    it('should detect all same digits', () => {
      expect(validatePhone('5511999999999').isValid).toBe(false);
      expect(validatePhone('5511988888888').isValid).toBe(false);
      expect(validatePhone('5511977777777').isValid).toBe(false);
      expect(validatePhone('5511966666666').isValid).toBe(false);
    });

    it('should detect all same last 8 digits', () => {
      expect(validatePhone('5511900000000').isValid).toBe(false);
      expect(validatePhone('5511911111111').isValid).toBe(false);
    });

    it('should detect sequential patterns', () => {
      expect(validatePhone('5511912345678').isValid).toBe(false);
      expect(validatePhone('5511987654321').isValid).toBe(false);
      expect(validatePhone('5511901234567').isValid).toBe(false);
    });

    it('should detect excessive repetition', () => {
      expect(validatePhone('5511900000000').isValid).toBe(false); // 7+ zeros
      expect(validatePhone('5511911111111').isValid).toBe(false); // 7+ ones
      expect(validatePhone('5511988888880').isValid).toBe(false); // 7 eights
    });

    it('should provide clear error for fake numbers', () => {
      const result1 = validatePhone('5511999999999');
      expect(result1.error).toContain('Suspicious number');

      const result2 = validatePhone('5511912345678'); // Has sequential pattern
      // But this gets caught by 6th digit validation first (1 is not 6-9)
      expect(result2.isValid).toBe(false);

      const result3 = validatePhone('5511987654321'); // Sequential but valid format
      expect(result3.error).toContain('Sequential number pattern');
    });

    it('should accept legitimate numbers', () => {
      expect(validatePhone('5511987654320').isValid).toBe(true);
      expect(validatePhone('5511987651234').isValid).toBe(true);
      expect(validatePhone('5511998765432').isValid).toBe(true);
      expect(validatePhone('5511999998888').isValid).toBe(true); // Realistic pattern
      expect(validatePhone('5521988887777').isValid).toBe(true);
    });
  });

  describe('validatePhone - International Rejection', () => {
    it('should reject international numbers', () => {
      const result = validatePhone('+1-555-123-4567');
      expect(result.isValid).toBe(false);
      // Error message varies based on detection point
      expect(result.error).toBeDefined();
    });
  });

  describe('validatePhone - Landline Rejection', () => {
    it('should reject landlines', () => {
      const result1 = validatePhone('1133334444');
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBeDefined();

      const result2 = validatePhone('33334444');
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBeDefined();
    });
  });

  describe('validatePhone - Error Messages', () => {
    it('should handle empty input', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should handle too short input', () => {
      const result = validatePhone('123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should preserve original input', () => {
      const result = validatePhone('(11) 99999-8888');
      expect(result.original).toBe('(11) 99999-8888');
    });
  });

  describe('formatPhoneForDisplay', () => {
    it('should format normalized phone correctly', () => {
      expect(formatPhoneForDisplay('5511999998888')).toBe('+55 11 99999-8888');
      expect(formatPhoneForDisplay('5521988887777')).toBe('+55 21 98888-7777');
    });

    it('should format from various inputs', () => {
      expect(formatPhoneForDisplay('11999998888')).toBe('+55 11 99999-8888');
      expect(formatPhoneForDisplay('(11) 99999-8888')).toBe('+55 11 99999-8888');
    });

    it('should return original for invalid inputs', () => {
      expect(formatPhoneForDisplay('')).toBe('');
      expect(formatPhoneForDisplay('invalid')).toBe('invalid');
    });

    it('should handle null and undefined', () => {
      expect(formatPhoneForDisplay(null)).toBe('');
      expect(formatPhoneForDisplay(undefined)).toBe('');
    });
  });

  describe('validatePhoneBatch', () => {
    it('should validate multiple phones', () => {
      const phones = ['5511999998888', '5521988887777', '5531977776666'];

      const result = validatePhoneBatch(phones);

      expect(result.stats.total).toBe(3);
      expect(result.stats.validCount).toBe(3);
      expect(result.stats.invalidCount).toBe(0);
      expect(result.valid).toHaveLength(3);
    });

    it('should separate valid and invalid', () => {
      const phones = [
        '5511999998888', // Valid
        '1133334444', // Invalid - landline
        '5521988887777', // Valid
        'invalid', // Invalid
      ];

      const result = validatePhoneBatch(phones);

      expect(result.stats.validCount).toBe(2);
      expect(result.stats.invalidCount).toBe(2);
      expect(result.valid[0].normalized).toBe('5511999998888');
      expect(result.valid[1].normalized).toBe('5521988887777');
    });

    it('should detect duplicates', () => {
      const phones = [
        '5511999998888',
        '(11) 99999-8888', // Same as first
        '5521988887777',
      ];

      const result = validatePhoneBatch(phones);

      expect(result.stats.duplicateCount).toBe(1);
      expect(result.stats.validCount).toBe(2); // Only 2 unique valid
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toBe('Duplicate phone number');
    });

    it('should optionally disable duplicate checking', () => {
      const phones = ['5511999998888', '5511999998888'];

      const result = validatePhoneBatch(phones, false);

      expect(result.stats.duplicateCount).toBe(0);
      expect(result.stats.validCount).toBe(2); // Both counted as valid
    });

    it('should handle empty array', () => {
      const result = validatePhoneBatch([]);

      expect(result.stats.total).toBe(0);
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('should handle mixed types', () => {
      const phones = [
        '5511999998888', // string - valid
        '5521988887777', // string - valid
        null, // null - invalid
        undefined, // undefined - invalid
      ] as unknown as string[];

      const result = validatePhoneBatch(phones);

      expect(result.stats.validCount).toBe(2); // First two valid
      expect(result.stats.invalidCount).toBe(2); // Last two invalid
    });
  });

  describe('extractPhonesFromData - Case Insensitive', () => {
    it('should extract phones with exact column match', () => {
      const data = [
        { phone: '11999998888', name: 'John' },
        { phone: '21988887777', name: 'Jane' },
      ];

      const result = extractPhonesFromData(data, 'phone');

      expect(result).toHaveLength(2);
      expect(result[0].phone).toBe('11999998888');
      expect(result[0].rowIndex).toBe(0);
      expect(result[1].phone).toBe('21988887777');
      expect(result[1].rowIndex).toBe(1);
    });

    it('should match case-insensitively', () => {
      const data = [
        { Phone: '11999998888', name: 'John' },
        { PHONE: '21988887777', name: 'Jane' },
        { phone: '31977776666', name: 'Bob' },
      ];

      const result = extractPhonesFromData(data, 'phone');

      expect(result).toHaveLength(3);
      expect(result[0].phone).toBe('11999998888');
      expect(result[1].phone).toBe('21988887777');
      expect(result[2].phone).toBe('31977776666');
    });

    it('should trim whitespace in phone values', () => {
      const data = [
        { phone: '  11999998888  ', name: 'John' },
        { phone: '21988887777  ', name: 'Jane' },
      ];

      const result = extractPhonesFromData(data, 'phone');

      expect(result[0].phone).toBe('11999998888');
      expect(result[1].phone).toBe('21988887777');
    });

    it('should skip empty phone values', () => {
      const data = [
        { phone: '11999998888', name: 'John' },
        { phone: '', name: 'Jane' }, // Empty
        { phone: '  ', name: 'Bob' }, // Whitespace only
        { phone: '31977776666', name: 'Alice' },
      ];

      const result = extractPhonesFromData(data, 'phone');

      expect(result).toHaveLength(2);
      expect(result[0].phone).toBe('11999998888');
      expect(result[1].phone).toBe('31977776666');
    });

    it('should return empty array if column not found', () => {
      const data = [
        { telefone: '11999998888', name: 'John' },
        { telefone: '21988887777', name: 'Jane' },
      ];

      const result = extractPhonesFromData(data, 'phone');

      expect(result).toEqual([]);
    });

    it('should preserve row indices correctly', () => {
      const data = [
        { phone: '11999998888', name: 'John' }, // 0
        { phone: '', name: 'Jane' }, // 1 - skipped
        { phone: '21988887777', name: 'Bob' }, // 2
      ];

      const result = extractPhonesFromData(data, 'phone');

      expect(result).toHaveLength(2);
      expect(result[0].rowIndex).toBe(0);
      expect(result[1].rowIndex).toBe(2); // Not 1!
    });
  });

  describe('getValidAreaCodes', () => {
    it('should return sorted list of area codes', () => {
      const codes = getValidAreaCodes();

      expect(codes.length).toBeGreaterThan(60); // Brazil has 60+ area codes
      expect(codes).toContain('11'); // São Paulo
      expect(codes).toContain('21'); // Rio
      expect(codes).toContain('31'); // BH
      expect(codes).toContain('41'); // Curitiba
      expect(codes).toContain('51'); // Porto Alegre
      expect(codes).toContain('61'); // Brasília
      expect(codes).toContain('71'); // Salvador
      expect(codes).toContain('81'); // Recife
      expect(codes).toContain('91'); // Belém

      // Should be sorted
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    it('should not contain invalid area codes', () => {
      const codes = getValidAreaCodes();

      expect(codes).not.toContain('20');
      expect(codes).not.toContain('30');
      expect(codes).not.toContain('90');
    });
  });

  describe('isValidAreaCode', () => {
    it('should validate area codes correctly', () => {
      expect(isValidAreaCode('11')).toBe(true);
      expect(isValidAreaCode('21')).toBe(true);
      expect(isValidAreaCode('31')).toBe(true);

      expect(isValidAreaCode('20')).toBe(false);
      expect(isValidAreaCode('30')).toBe(false);
      expect(isValidAreaCode('90')).toBe(false);
    });
  });

  describe('Edge Cases and Real-World Scenarios', () => {
    it('should handle Excel-exported phones', () => {
      // Excel sometimes formats numbers with quotes or scientific notation
      expect(validatePhone('="11999998888"').isValid).toBe(true);
    });

    it('should handle phones with country code variations', () => {
      expect(validatePhone('0055 11 99999-8888').isValid).toBe(true);
      expect(validatePhone('055 11 99999-8888').isValid).toBe(true);
    });

    it('should handle valid phones from all major cities', () => {
      const majorCities = [
        '5511999998888', // São Paulo
        '5521999998888', // Rio de Janeiro
        '5531999998888', // Belo Horizonte
        '5541999998888', // Curitiba
        '5551999998888', // Porto Alegre
        '5561999998888', // Brasília
        '5571999998888', // Salvador
        '5581999998888', // Recife
        '5585999998888', // Fortaleza
        '5591999998888', // Belém
      ];

      majorCities.forEach((phone) => {
        expect(validatePhone(phone).isValid).toBe(true);
      });
    });
  });
});
