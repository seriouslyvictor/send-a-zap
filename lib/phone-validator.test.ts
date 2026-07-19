import { describe, expect, it } from 'vitest';

import {
  formatPhoneForDisplay,
  validatePhone,
  validatePhoneBatch,
} from './phone-validator';

describe('phone validation', () => {
  it('normalizes common Brazilian mobile formats', () => {
    expect(validatePhone('(11) 98765-4320')).toMatchObject({
      isValid: true,
      normalized: '5511987654320',
      original: '(11) 98765-4320',
    });
    expect(validatePhone('+55 21 98888-7777')).toMatchObject({
      isValid: true,
      normalized: '5521988887777',
    });
  });

  it('rejects numbers that are not Brazilian mobiles', () => {
    expect(validatePhone('11 3333-4444')).toMatchObject({
      isValid: false,
      normalized: '',
    });
    expect(validatePhone('+1 415 555 2671')).toMatchObject({
      isValid: false,
      normalized: '',
    });
    expect(validatePhone('20 98765-4320')).toMatchObject({
      isValid: false,
      error: expect.stringContaining('Invalid area code'),
    });
  });

  it('formats a validated number for display', () => {
    expect(formatPhoneForDisplay('11987654320')).toBe('+55 11 98765-4320');
  });

  it('separates invalid and duplicate recipients in a batch', () => {
    const result = validatePhoneBatch([
      '11987654320',
      '(11) 98765-4320',
      '1133334444',
      '21988887777',
    ]);

    expect(result.stats).toEqual({
      total: 4,
      validCount: 2,
      invalidCount: 2,
      duplicateCount: 1,
    });
    expect(result.valid.map(({ normalized }) => normalized)).toEqual([
      '5511987654320',
      '5521988887777',
    ]);
    expect(result.invalid.map(({ error }) => error)).toContain(
      'Duplicate phone number'
    );
  });
});
