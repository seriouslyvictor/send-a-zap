import { describe, it, expect } from 'vitest';
import * as ExcelJS from 'exceljs';
import {
  parseXLSXFile,
  getPreviewData,
  getUniqueColumnValues,
} from './xlsx-parser';

/**
 * Helper function to create a mock Excel file from data
 */
async function createMockXLSXFile(
  data: (string | number | boolean | null | undefined)[][],
  filename: string = 'test.xlsx',
  mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): Promise<File> {
  // Create a workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Add rows
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Convert to binary buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: mimeType });

  // Create File from Blob
  return new File([blob], filename, { type: mimeType });
}

/**
 * Helper to create a large file for size testing
 */
function createLargeFile(sizeMB: number): File {
  const sizeBytes = sizeMB * 1024 * 1024;
  const buffer = new ArrayBuffer(sizeBytes);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new File([blob], 'large.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseXLSXFile', () => {
  describe('File Size Validation', () => {
    it('should reject files larger than default 10MB limit', async () => {
      const largeFile = createLargeFile(15); // 15MB

      const result = await parseXLSXFile(largeFile);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('exceeds maximum allowed size');
      expect(result.error).toContain('15.00MB');
      expect(result.headers).toEqual([]);
      expect(result.data).toEqual([]);
    });

    it('should accept files within default 10MB limit', async () => {
      const smallFile = await createMockXLSXFile([
        ['Name', 'Email'],
        ['John', 'john@example.com'],
      ]);

      const result = await parseXLSXFile(smallFile);

      expect(result.error).toBeUndefined();
      expect(result.headers).toEqual(['Name', 'Email']);
    });

    it('should accept custom file size limits', async () => {
      const file = createLargeFile(15); // 15MB

      // Reject with 10MB limit
      const result1 = await parseXLSXFile(file, 10);
      expect(result1.error).toBeDefined();
      expect(result1.error).toContain('exceeds maximum allowed size');

      // Accept with 20MB limit (passes size check, may fail parsing)
      const result2 = await parseXLSXFile(file, 20);
      // Should not have the size error
      if (result2.error) {
        expect(result2.error).not.toContain('exceeds maximum allowed size');
      }
    });
  });

  describe('Duplicate Header Handling', () => {
    it('should handle duplicate headers by adding suffixes', async () => {
      const file = await createMockXLSXFile([
        ['Name', 'Email', 'Name', 'Name'],
        ['John', 'john@example.com', 'Doe', 'Middle'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.error).toBeUndefined();
      expect(result.headers).toEqual(['Name', 'Email', 'Name_2', 'Name_3']);
      expect(result.data[0]).toEqual({
        Name: 'John',
        Email: 'john@example.com',
        Name_2: 'Doe',
        Name_3: 'Middle',
      });
    });

    it('should preserve all data when headers are duplicated', async () => {
      const file = await createMockXLSXFile([
        ['ID', 'Value', 'ID', 'Value'],
        ['1', 'A', '2', 'B'],
        ['3', 'C', '4', 'D'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        ID: '1',
        Value: 'A',
        ID_2: '2',
        Value_2: 'B',
      });
      expect(result.data[1]).toEqual({
        ID: '3',
        Value: 'C',
        ID_2: '4',
        Value_2: 'D',
      });
    });

    it('should handle multiple duplicate occurrences', async () => {
      const file = await createMockXLSXFile([
        ['A', 'A', 'A', 'B', 'A'],
        ['1', '2', '3', '4', '5'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.headers).toEqual(['A', 'A_2', 'A_3', 'B', 'A_4']);
      expect(result.data[0]).toEqual({
        A: '1',
        A_2: '2',
        A_3: '3',
        B: '4',
        A_4: '5',
      });
    });
  });

  describe('Valid File Parsing', () => {
    it('should parse a valid XLSX file correctly', async () => {
      const file = await createMockXLSXFile([
        ['Name', 'Age', 'Email'],
        ['Alice', 30, 'alice@example.com'],
        ['Bob', 25, 'bob@example.com'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.error).toBeUndefined();
      expect(result.headers).toEqual(['Name', 'Age', 'Email']);
      expect(result.data).toHaveLength(2);
      expect(result.totalRows).toBe(2);
      expect(result.data[0]).toEqual({
        Name: 'Alice',
        Age: '30',
        Email: 'alice@example.com',
      });
    });

    it('should convert all values to strings', async () => {
      const file = await createMockXLSXFile([
        ['Text', 'Number', 'Boolean'],
        ['Hello', 123, true],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.data[0]).toEqual({
        Text: 'Hello',
        Number: '123',
        Boolean: 'true',
      });
    });

    it('should trim whitespace from headers and values', async () => {
      const file = await createMockXLSXFile([
        ['  Name  ', '  Email  '],
        ['  John  ', '  john@example.com  '],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.data[0]).toEqual({
        Name: 'John',
        Email: 'john@example.com',
      });
    });

    it('should skip completely empty rows', async () => {
      const file = await createMockXLSXFile([
        ['Name', 'Email'],
        ['John', 'john@example.com'],
        ['', ''], // Empty row
        ['Jane', 'jane@example.com'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.data).toHaveLength(2);
      expect(result.totalRows).toBe(2);
      expect(result.data[0].Name).toBe('John');
      expect(result.data[1].Name).toBe('Jane');
    });
  });

  describe('Invalid File Handling', () => {
    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      const result = await parseXLSXFile(invalidFile);

      expect(result.error).toBe(
        'Invalid file type. Please upload an XLSX, XLS, or CSV file.'
      );
      expect(result.headers).toEqual([]);
      expect(result.data).toEqual([]);
    });

    it('should accept files with valid extensions even if MIME type is wrong', async () => {
      // Some systems don't set correct MIME types
      const file = await createMockXLSXFile(
        [
          ['Name', 'Email'],
          ['John', 'john@example.com'],
        ],
        'test.xlsx',
        'application/octet-stream' // Generic MIME type
      );

      const result = await parseXLSXFile(file);

      // Should parse successfully based on extension
      expect(result.error).toBeUndefined();
      expect(result.headers).toEqual(['Name', 'Email']);
    });
  });

  describe('Empty File Handling', () => {
    it('should handle empty files', async () => {
      const file = await createMockXLSXFile([]);

      const result = await parseXLSXFile(file);

      expect(result.error).toBe('File is empty');
    });

    it('should handle files with only headers', async () => {
      const file = await createMockXLSXFile([['Name', 'Email']]);

      const result = await parseXLSXFile(file);

      expect(result.error).toBeUndefined();
      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.data).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it('should reject files with no valid headers', async () => {
      const file = await createMockXLSXFile([
        ['', '', ''], // All empty headers
        ['data1', 'data2', 'data3'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.error).toBe('No valid column headers found in first row');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed empty and valid headers', async () => {
      const file = await createMockXLSXFile([
        ['Name', '', 'Email', ''],
        ['John', 'ignored', 'john@example.com', 'ignored'],
      ]);

      const result = await parseXLSXFile(file);

      // Empty headers are filtered out from the validHeaders array
      expect(result.headers).toEqual(['Name', 'Email']);
      // Data should only include non-empty header columns
      expect(result.data[0]).toHaveProperty('Name');
      expect(result.data[0]).toHaveProperty('Email');
    });

    it('should handle null and undefined values', async () => {
      const file = await createMockXLSXFile([
        ['Name', 'Email'],
        ['John', null as unknown as string],
        [undefined as unknown as string, 'jane@example.com'],
      ]);

      const result = await parseXLSXFile(file);

      expect(result.data[0]).toEqual({
        Name: 'John',
        Email: '',
      });
      expect(result.data[1]).toEqual({
        Name: '',
        Email: 'jane@example.com',
      });
    });
  });
});

describe('getPreviewData', () => {
  const testData = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'David' },
    { id: '5', name: 'Eve' },
    { id: '6', name: 'Frank' },
  ];

  it('should return first 5 rows by default', () => {
    const preview = getPreviewData(testData);

    expect(preview).toHaveLength(5);
    expect(preview[0].name).toBe('Alice');
    expect(preview[4].name).toBe('Eve');
  });

  it('should return custom number of rows', () => {
    const preview = getPreviewData(testData, 3);

    expect(preview).toHaveLength(3);
    expect(preview[2].name).toBe('Charlie');
  });

  it('should return all rows if limit exceeds data length', () => {
    const preview = getPreviewData(testData, 100);

    expect(preview).toHaveLength(6);
  });

  it('should handle empty data', () => {
    const preview = getPreviewData([]);

    expect(preview).toEqual([]);
  });
});

describe('getUniqueColumnValues', () => {
  const testData = [
    { category: 'A', value: '1' },
    { category: 'B', value: '2' },
    { category: 'A', value: '3' },
    { category: 'C', value: '4' },
    { category: 'B', value: '5' },
  ];

  it('should return unique values from a column', () => {
    const unique = getUniqueColumnValues(testData, 'category');

    expect(unique).toHaveLength(3);
    expect(unique).toContain('A');
    expect(unique).toContain('B');
    expect(unique).toContain('C');
  });

  it('should handle non-existent columns', () => {
    const unique = getUniqueColumnValues(testData, 'nonexistent');

    expect(unique).toEqual([]);
  });

  it('should filter out empty values', () => {
    const dataWithEmpty = [
      { status: 'active' },
      { status: '' },
      { status: 'inactive' },
      { status: 'active' },
    ];

    const unique = getUniqueColumnValues(dataWithEmpty, 'status');

    expect(unique).toHaveLength(2);
    expect(unique).toContain('active');
    expect(unique).toContain('inactive');
    expect(unique).not.toContain('');
  });

  it('should handle empty data', () => {
    const unique = getUniqueColumnValues([], 'any');

    expect(unique).toEqual([]);
  });
});
