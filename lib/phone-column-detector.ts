/**
 * Phone Column Detector
 *
 * Intelligently detects which column contains phone numbers by analyzing
 * the actual data content instead of relying on header names.
 */

import { validatePhone } from "./phone-validator";

/**
 * Result of phone column detection
 */
export interface PhoneColumnDetectionResult {
  /** Name of the detected phone column */
  columnName: string | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Number of valid phones found in sample */
  validCount: number;
  /** Number of samples checked */
  sampleSize: number;
  /** All candidates sorted by confidence */
  candidates: Array<{
    columnName: string;
    confidence: number;
    validCount: number;
    sampleSize: number;
  }>;
}

/**
 * Detect which column contains phone numbers by analyzing data content
 *
 * @param data - Parsed data from XLSX
 * @param headers - Column headers
 * @param sampleSize - Number of rows to sample per column (default 20)
 * @param minConfidence - Minimum confidence threshold (default 0.5 = 50%)
 * @returns Detection result with best phone column
 */
export function detectPhoneColumn(
  data: Record<string, string>[],
  headers: string[],
  sampleSize: number = 20,
  minConfidence: number = 0.5
): PhoneColumnDetectionResult {
  if (data.length === 0 || headers.length === 0) {
    return {
      columnName: null,
      confidence: 0,
      validCount: 0,
      sampleSize: 0,
      candidates: [],
    };
  }

  const candidates: Array<{
    columnName: string;
    confidence: number;
    validCount: number;
    sampleSize: number;
  }> = [];

  // For each column, sample rows and check if they contain valid phone numbers
  for (const header of headers) {
    // Skip empty headers
    if (!header.trim()) continue;

    // Determine how many rows to sample (up to sampleSize, but not more than available)
    const actualSampleSize = Math.min(sampleSize, data.length);

    // Sample rows evenly distributed across the dataset
    const step = Math.max(1, Math.floor(data.length / actualSampleSize));
    const sampledIndices = [];
    for (let i = 0; i < data.length && sampledIndices.length < actualSampleSize; i += step) {
      sampledIndices.push(i);
    }

    // Count valid phones in the sampled rows
    let validPhoneCount = 0;
    let nonEmptyCount = 0;

    for (const index of sampledIndices) {
      const row = data[index];
      const value = row[header];

      // Skip empty values
      if (!value || !value.trim()) continue;

      nonEmptyCount++;

      // Check if this value looks like a phone number
      const validation = validatePhone(value);
      if (validation.isValid) {
        validPhoneCount++;
      }
    }

    // Calculate confidence score
    // Confidence = (valid phones / non-empty values)
    // Only consider if we have at least some non-empty values
    const confidence = nonEmptyCount > 0 ? validPhoneCount / nonEmptyCount : 0;

    // Add to candidates if confidence is above threshold or if we have any valid phones
    if (confidence >= minConfidence || validPhoneCount > 0) {
      candidates.push({
        columnName: header,
        confidence,
        validCount: validPhoneCount,
        sampleSize: nonEmptyCount,
      });
    }
  }

  // Sort candidates by confidence (highest first)
  candidates.sort((a, b) => {
    // Primary sort by confidence
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Secondary sort by valid count (if confidence is tied)
    return b.validCount - a.validCount;
  });

  // Return the best candidate
  const bestCandidate = candidates[0];

  return {
    columnName: bestCandidate?.columnName || null,
    confidence: bestCandidate?.confidence || 0,
    validCount: bestCandidate?.validCount || 0,
    sampleSize: bestCandidate?.sampleSize || 0,
    candidates,
  };
}

/**
 * Quick check if a column name LOOKS like it should contain phones
 * This is just a hint, actual detection should use content analysis
 */
export function columnNameLooksLikePhone(columnName: string): boolean {
  const normalized = columnName.toLowerCase().trim();
  const phoneKeywords = [
    'phone',
    'telefone',
    'celular',
    'whatsapp',
    'zap',
    'zapzap',
    'número',
    'numero',
    'mobile',
    'tel',
    'contact',
    'contato',
  ];

  return phoneKeywords.some((keyword) => normalized.includes(keyword));
}

/**
 * Get a descriptive message about phone column detection result
 */
export function getDetectionMessage(result: PhoneColumnDetectionResult): string {
  if (!result.columnName) {
    return "Nenhuma coluna com números de telefone válidos foi encontrada";
  }

  const percentValid = Math.round(result.confidence * 100);

  if (result.confidence >= 0.9) {
    return `Coluna "${result.columnName}" detectada como telefones (${percentValid}% válidos)`;
  } else if (result.confidence >= 0.7) {
    return `Coluna "${result.columnName}" parece conter telefones (${percentValid}% válidos)`;
  } else if (result.confidence >= 0.5) {
    return `Coluna "${result.columnName}" pode conter telefones (${percentValid}% válidos) - verifique os dados`;
  } else {
    return `Coluna "${result.columnName}" tem alguns telefones (${percentValid}% válidos) - qualidade baixa`;
  }
}
