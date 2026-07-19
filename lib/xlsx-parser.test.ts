import * as ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import {
  getPreviewData,
  getUniqueColumnValues,
  parseXLSXFile,
} from './xlsx-parser';

async function workbookFile(
  rows: (string | number | null)[][],
  filename = 'contacts.xlsx'
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Contacts');
  rows.forEach((row) => worksheet.addRow(row));
  const contents = await workbook.xlsx.writeBuffer();

  return new File([contents], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('spreadsheet parsing', () => {
  it('parses the first worksheet into trimmed contact records', async () => {
    const file = await workbookFile([
      [' Nome ', 'Telefone', 'Turma'],
      [' Ana ', 11987654320, ' A '],
      ['Bruno', 21988887777, 'B'],
    ]);

    await expect(parseXLSXFile(file)).resolves.toMatchObject({
      headers: ['Nome', 'Telefone', 'Turma'],
      data: [
        { Nome: 'Ana', Telefone: '11987654320', Turma: 'A' },
        { Nome: 'Bruno', Telefone: '21988887777', Turma: 'B' },
      ],
      totalRows: 2,
    });
  });

  it('keeps duplicate columns addressable and skips empty rows', async () => {
    const file = await workbookFile([
      ['Nome', 'Telefone', 'Telefone'],
      ['Ana', '11987654320', '21988887777'],
      ['', '', ''],
    ]);

    await expect(parseXLSXFile(file)).resolves.toMatchObject({
      headers: ['Nome', 'Telefone', 'Telefone_2'],
      data: [
        {
          Nome: 'Ana',
          Telefone: '11987654320',
          Telefone_2: '21988887777',
        },
      ],
      totalRows: 1,
    });
  });

  it('rejects unsupported files before parsing', async () => {
    const file = new File(['not a workbook'], 'contacts.txt', {
      type: 'text/plain',
    });

    await expect(parseXLSXFile(file)).resolves.toMatchObject({
      headers: [],
      data: [],
      totalRows: 0,
      error: 'Invalid file type. Please upload an XLSX, XLS, or CSV file.',
    });
  });

  it('provides preview and unique-column views of parsed data', () => {
    const contacts = [
      { nome: 'Ana', turma: 'A' },
      { nome: 'Bia', turma: 'B' },
      { nome: 'Caio', turma: 'A' },
    ];

    expect(getPreviewData(contacts, 2)).toEqual(contacts.slice(0, 2));
    expect(getUniqueColumnValues(contacts, 'turma')).toEqual(['A', 'B']);
  });
});
