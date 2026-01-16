/**
 * XLSX Parser Utility
 *
 * Client-side utility for parsing Excel files using ExcelJS.
 * Designed to be used in React components for file uploads.
 *
 * Usage:
 *   const { headers, data, error } = await parseXLSXFile(file);
 */

import * as ExcelJS from 'exceljs';

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
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @returns Promise with parsed data or error
 */
export function parseXLSXFile(
  file: File,
  maxSizeMB: number = 10
): Promise<ParsedXLSXResult> {
  return new Promise((resolve) => {
    // Validate file size (prevent memory issues)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      resolve({
        headers: [],
        data: [],
        rawData: [],
        totalRows: 0,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB.`,
      });
      return;
    }

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

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
          throw new Error('Failed to read file');
        }

        // Parse workbook using ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // Get first sheet
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('No sheets found in the file');
        }

        // Convert to 2D array (raw data)
        const rawData: (string | number | null)[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          // ExcelJS row.values is 1-indexed, index 0 is undefined
          const values = row.values as (string | number | null)[];
          // Slice to remove the undefined at index 0
          rawData.push(values.slice(1));
        });

        if (rawData.length === 0) {
          throw new Error('File is empty');
        }

        // Extract headers from first row
        const rawHeaders = (rawData[0] as (string | number)[]).map((h) =>
          String(h || '').trim()
        );

        // Handle duplicate headers by adding suffixes
        const headers: string[] = [];
        const headerCounts = new Map<string, number>();

        rawHeaders.forEach((header) => {
          if (!header) {
            // Keep empty headers as empty for index mapping
            headers.push('');
            return;
          }

          const count = headerCounts.get(header) || 0;
          headerCounts.set(header, count + 1);

          if (count > 0) {
            // Duplicate found - add suffix
            headers.push(`${header}_${count + 1}`);
          } else {
            // First occurrence
            headers.push(header);
          }
        });

        // Filter out empty headers for validation
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
export function getPreviewData<T extends Record<string, string>>(
  data: T[],
  limit: number = 5
): T[] {
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
