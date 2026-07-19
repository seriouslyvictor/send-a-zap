import { describe, expect, it } from 'vitest';

import {
  columnNameLooksLikePhone,
  detectPhoneColumn,
  getDetectionMessage,
} from './phone-column-detector';

describe('phone-column detection', () => {
  it('selects a column by valid phone content rather than its name', () => {
    const result = detectPhoneColumn(
      [
        { contato: '11987654320', telefone: 'Ana' },
        { contato: '21988887777', telefone: 'Bia' },
        { contato: '31976541234', telefone: 'Caio' },
      ],
      ['telefone', 'contato']
    );

    expect(result).toMatchObject({
      columnName: 'contato',
      confidence: 1,
      validCount: 3,
      sampleSize: 3,
    });
    expect(result.candidates).toEqual([
      {
        columnName: 'contato',
        confidence: 1,
        validCount: 3,
        sampleSize: 3,
      },
    ]);
  });

  it('reports no match when sampled values contain no valid phones', () => {
    expect(
      detectPhoneColumn(
        [
          { nome: 'Ana', referência: 'ABC-1' },
          { nome: 'Bia', referência: 'ABC-2' },
        ],
        ['nome', 'referência']
      )
    ).toEqual({
      columnName: null,
      confidence: 0,
      validCount: 0,
      sampleSize: 0,
      candidates: [],
    });
  });

  it('exposes header hints and an operator-facing confidence message', () => {
    expect(columnNameLooksLikePhone('Número do WhatsApp')).toBe(true);
    expect(columnNameLooksLikePhone('Nome completo')).toBe(false);
    expect(
      getDetectionMessage({
        columnName: 'Celular',
        confidence: 0.75,
        validCount: 3,
        sampleSize: 4,
        candidates: [],
      })
    ).toBe('Coluna "Celular" parece conter telefones (75% válidos)');
  });
});
