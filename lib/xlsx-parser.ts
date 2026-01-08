/**
 * XLSX Parser Utility
 *
 * Client-side utility for parsing Excel files using SheetJS.
 * Designed to be used in React components for file uploads.
 *
 * Usage:
 *   const { headers, data, error } = await parseXLSXFile(file);
 */

import * as XLSX from 'xlsx';

/**
 * Result of parsing an XLSX file
 */
export interface ParsedXLSXResult {
  /** Column headers from first row */
  headers: string[];
  /** Data rows as array of objects */
  data: Record<string, string>[];
  /** Raw data as 2D array (for preview) */
  rawData: (string | number | null)[][];
  /** Number of total rows (excluding header) */
  totalRows: number;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Parse an XLSX/XLS file and extract headers and data
 *
 * @param file - File object from input or drag-drop
 * @returns Promise with parsed data or error
 */
export function parseXLSXFile(file: File): Promise<ParsedXLSXResult> {
  return new Promise((resolve) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    const isValidExtension = /\.(xlsx|xls|csv)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isValidExtension) {
      resolve({
        headers: [],
        data: [],
        rawData: [],
        totalRows: 0,
        error: 'Invalid file type. Please upload an XLSX, XLS, or CSV file.',
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer) {
          throw new Error('Failed to read file');
        }

        // Parse workbook
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('No sheets found in the file');
        }

        const sheet = workbook.Sheets[sheetName];

        // Convert to 2D array (raw data)
        const rawData = XLSX.utils.sheet_to_json<(string | number | null)[]>(
          sheet,
          { header: 1, defval: '' }
        );

        if (rawData.length === 0) {
          throw new Error('File is empty');
        }

        // Extract headers from first row
        const headers = (rawData[0] as (string | number)[]).map((h) =>
          String(h || '').trim()
        );

        // Filter out empty headers
        const validHeaders = headers.filter((h) => h.length > 0);

        if (validHeaders.length === 0) {
          throw new Error('No valid column headers found in first row');
        }

        // Convert remaining rows to objects
        const data: Record<string, string>[] = [];

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i] as (string | number | null)[];

          // Skip completely empty rows
          const hasData = row.some((cell) => cell !== null && cell !== '');
          if (!hasData) continue;

          const obj: Record<string, string> = {};
          headers.forEach((header, index) => {
            if (header) {
              const value = row[index];
              obj[header] = value !== null && value !== undefined
                ? String(value).trim()
                : '';
            }
          });

          data.push(obj);
        }

        resolve({
          headers: validHeaders,
          data,
          rawData,
          totalRows: data.length,
        });
      } catch (error) {
        resolve({
          headers: [],
          data: [],
          rawData: [],
          totalRows: 0,
          error: error instanceof Error ? error.message : 'Failed to parse file',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        headers: [],
        data: [],
        rawData: [],
        totalRows: 0,
        error: 'Failed to read file',
      });
    };

    // Read as ArrayBuffer for better compatibility
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate a preview of the first N rows
 *
 * @param data - Parsed data array
 * @param limit - Number of rows to preview (default 5)
 * @returns Preview data array
 */
export function getPreviewData(
  data: Record<string, string>[],
  limit: number = 5
): Record<string, string>[] {
  return data.slice(0, limit);
}

/**
 * Extract unique values from a column (useful for validation)
 *
 * @param data - Parsed data array
 * @param column - Column name to extract
 * @returns Array of unique values
 */
export function getUniqueColumnValues(
  data: Record<string, string>[],
  column: string
): string[] {
  const values = new Set<string>();
  data.forEach((row) => {
    const value = row[column];
    if (value) {
      values.add(value);
    }
  });
  return Array.from(values);
}
