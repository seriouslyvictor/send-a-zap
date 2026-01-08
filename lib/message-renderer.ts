/**
 * Message Renderer Utility
 *
 * Handles template placeholder replacement for personalized messages.
 * Placeholders use the format: {{fieldName}}
 *
 * Example:
 *   Template: "Hello {{name}}, your course {{course}} starts soon!"
 *   Data: { name: "João", course: "JavaScript" }
 *   Result: "Hello João, your course JavaScript starts soon!"
 */

/**
 * Pattern to match placeholders: {{fieldName}}
 * Supports: {{name}}, {{phone}}, {{custom_field}}, {{field123}}
 */
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Extract all placeholder names from a template
 *
 * @param template - Message template with {{placeholders}}
 * @returns Array of unique placeholder names
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders = new Set<string>();
  let match;

  // Reset regex state
  PLACEHOLDER_PATTERN.lastIndex = 0;

  while ((match = PLACEHOLDER_PATTERN.exec(template)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Render a message by replacing placeholders with actual values
 *
 * @param template - Message template with {{placeholders}}
 * @param data - Object containing field values
 * @param fallback - Value to use when placeholder data is missing (default: empty string)
 * @returns Rendered message
 */
export function renderMessage(
  template: string,
  data: Record<string, string | undefined>,
  fallback: string = ''
): string {
  // Reset regex state
  PLACEHOLDER_PATTERN.lastIndex = 0;

  return template.replace(PLACEHOLDER_PATTERN, (match, fieldName) => {
    const value = data[fieldName];
    return value !== undefined && value !== null ? String(value) : fallback;
  });
}

/**
 * Result of message rendering with metadata
 */
export interface RenderResult {
  /** The rendered message */
  message: string;
  /** Placeholders that were found in template */
  placeholdersUsed: string[];
  /** Placeholders that had no data (used fallback) */
  missingData: string[];
  /** Whether all placeholders were successfully filled */
  complete: boolean;
}

/**
 * Render a message with detailed metadata about the rendering
 *
 * @param template - Message template with {{placeholders}}
 * @param data - Object containing field values
 * @param fallback - Value to use when placeholder data is missing
 * @returns Render result with metadata
 */
export function renderMessageWithMeta(
  template: string,
  data: Record<string, string | undefined>,
  fallback: string = ''
): RenderResult {
  const placeholdersUsed: string[] = [];
  const missingData: string[] = [];

  // Reset regex state
  PLACEHOLDER_PATTERN.lastIndex = 0;

  const message = template.replace(PLACEHOLDER_PATTERN, (match, fieldName) => {
    placeholdersUsed.push(fieldName);

    const value = data[fieldName];
    if (value === undefined || value === null || value === '') {
      missingData.push(fieldName);
      return fallback;
    }

    return String(value);
  });

  return {
    message,
    placeholdersUsed: [...new Set(placeholdersUsed)],
    missingData: [...new Set(missingData)],
    complete: missingData.length === 0,
  };
}

/**
 * Validate a template against available data columns
 *
 * @param template - Message template with {{placeholders}}
 * @param availableColumns - Array of available column names from XLS
 * @returns Validation result
 */
export interface TemplateValidationResult {
  /** Whether the template is valid */
  isValid: boolean;
  /** Placeholders found in template */
  placeholders: string[];
  /** Placeholders that don't match any column */
  unmatchedPlaceholders: string[];
  /** Columns that aren't used as placeholders */
  unusedColumns: string[];
  /** Error message if invalid */
  error?: string;
}

export function validateTemplate(
  template: string,
  availableColumns: string[]
): TemplateValidationResult {
  if (!template || !template.trim()) {
    return {
      isValid: false,
      placeholders: [],
      unmatchedPlaceholders: [],
      unusedColumns: availableColumns,
      error: 'Template is empty',
    };
  }

  const placeholders = extractPlaceholders(template);

  // Find placeholders that don't match any column
  const columnLower = availableColumns.map((c) => c.toLowerCase());
  const unmatchedPlaceholders = placeholders.filter((p) => {
    const pLower = p.toLowerCase();
    return !columnLower.includes(pLower) &&
           !['phone', 'name'].includes(pLower); // Built-in fields
  });

  // Find columns not used as placeholders
  const placeholderLower = placeholders.map((p) => p.toLowerCase());
  const unusedColumns = availableColumns.filter(
    (c) => !placeholderLower.includes(c.toLowerCase())
  );

  return {
    isValid: unmatchedPlaceholders.length === 0,
    placeholders,
    unmatchedPlaceholders,
    unusedColumns,
    error: unmatchedPlaceholders.length > 0
      ? `Unknown placeholders: ${unmatchedPlaceholders.join(', ')}`
      : undefined,
  };
}

/**
 * Create a preview of a message using sample data
 *
 * @param template - Message template with {{placeholders}}
 * @param sampleRow - Sample data row for preview
 * @returns Preview message
 */
export function createPreview(
  template: string,
  sampleRow: Record<string, string>
): string {
  return renderMessage(template, sampleRow, '[missing]');
}

/**
 * Estimate the final message length after rendering
 * Useful for WhatsApp message length validation
 *
 * @param template - Message template
 * @param averageFieldLength - Average length of placeholder values (default 15)
 * @returns Estimated message length
 */
export function estimateMessageLength(
  template: string,
  averageFieldLength: number = 15
): number {
  const placeholders = extractPlaceholders(template);
  const placeholderTotalLength = placeholders.length * '{{x}}'.length +
    placeholders.reduce((sum, p) => sum + p.length, 0);

  return template.length - placeholderTotalLength +
    placeholders.length * averageFieldLength;
}
