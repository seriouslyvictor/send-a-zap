import { describe, expect, it } from 'vitest';

import {
  createPreview,
  extractPlaceholders,
  renderMessage,
  renderMessageWithMeta,
  validateTemplate,
} from './message-renderer';

describe('message rendering', () => {
  it('renders contact data with case-insensitive column matching', () => {
    expect(
      renderMessage('Olá {{nome}}, seu pedido {{PEDIDO_ID}} está pronto!', {
        Nome: 'João',
        pedido_id: 12345,
      })
    ).toBe('Olá João, seu pedido 12345 está pronto!');
  });

  it('uses the configured fallback for missing contact data', () => {
    expect(createPreview('Olá {{nome}}, turma {{turma}}', { nome: 'Ana' })).toBe(
      'Olá Ana, turma [missing]'
    );
  });

  it('reports missing data without exposing renderer internals', () => {
    expect(
      renderMessageWithMeta('Olá {{nome}} — {{curso}}', { nome: 'Bia' })
    ).toEqual({
      message: 'Olá Bia — ',
      placeholdersUsed: ['nome', 'curso'],
      missingData: ['curso'],
      complete: false,
      length: 10,
      exceedsLimit: false,
    });
  });

  it('validates placeholders against spreadsheet columns', () => {
    expect(
      validateTemplate('Olá {{nome}}, {{oferta}}', ['Nome', 'telefone'])
    ).toMatchObject({
      isValid: false,
      placeholders: ['nome', 'oferta'],
      unmatchedPlaceholders: ['oferta'],
      unusedColumns: ['telefone'],
    });
  });

  it('returns unique placeholders in their first-seen order', () => {
    expect(extractPlaceholders('{{nome}} / {{curso}} / {{nome}}')).toEqual([
      'nome',
      'curso',
    ]);
  });
});
