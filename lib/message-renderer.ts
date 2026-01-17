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
 * Configuration constants
 */
export const MESSAGE_CONFIG = {
  /** Maximum WhatsApp message length (practical limit) */
  MAX_MESSAGE_LENGTH: 4096,
  /** Maximum number of placeholders allowed per template (DoS prevention) */
  MAX_PLACEHOLDERS: 100,
  /** Maximum template length */
  MAX_TEMPLATE_LENGTH: 10000,
} as const;

/**
 * Pattern to match placeholders: {{fieldName}}
 * Supports: {{name}}, {{phone}}, {{custom-field}}, {{field_123}}, {{José}}
 * Now supports: letters, numbers, underscores, dashes, and international characters
 */
function createPlaceholderPattern(): RegExp {
  // Create new instance each time to avoid global state issues
  return /\{\{([\w\-\u00C0-\u024F\u1E00-\u1EFF]+)\}\}/g;
}

/**
 * Normalize a string for case-insensitive matching
 */
function normalize(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Create a case-insensitive lookup map from data
 */
function createLookupMap(
  data: Record<string, string | number | boolean | undefined | null>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = normalize(key);
    // Convert to string, handling various types
    if (value !== undefined && value !== null) {
      map.set(normalizedKey, String(value));
    }
  }
  return map;
}

/**
 * Validate template syntax for malformed placeholders
 *
 * @param template - Template string to validate
 * @returns Validation result
 */
export interface TemplateSyntaxValidation {
  isValid: boolean;
  errors: string[];
}

export function validateTemplateSyntax(
  template: string
): TemplateSyntaxValidation {
  const errors: string[] = [];

  if (!template || typeof template !== 'string') {
    errors.push('Template must be a non-empty string');
    return { isValid: false, errors };
  }

  if (template.length > MESSAGE_CONFIG.MAX_TEMPLATE_LENGTH) {
    errors.push(
      `Template exceeds maximum length of ${MESSAGE_CONFIG.MAX_TEMPLATE_LENGTH} characters`
    );
  }

  // Check for unmatched opening braces
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push(
      `Unmatched braces: ${openBraces} opening {{ and ${closeBraces} closing }}`
    );
  }

  // Check for empty placeholders {{}}
  if (/\{\{\s*\}\}/.test(template)) {
    errors.push('Empty placeholders {{}} are not allowed');
  }

  // Check for nested placeholders {{{...}}}
  if (/\{\{\{/.test(template) || /\}\}\}/.test(template)) {
    errors.push('Nested placeholders are not allowed');
  }

  // Check for invalid placeholder content
  const pattern = createPlaceholderPattern();
  const validPlaceholders = template.match(pattern) || [];
  const allBracePairs = template.match(/\{\{[^}]*\}\}/g) || [];

  if (allBracePairs.length > validPlaceholders.length) {
    const invalid = allBracePairs.filter((p) => !pattern.test(p));
    errors.push(
      `Invalid placeholder syntax: ${invalid.join(', ')}. Use only letters, numbers, dashes, and underscores.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract all placeholder names from a template
 *
 * @param template - Message template with {{placeholders}}
 * @returns Array of unique placeholder names
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders = new Set<string>();
  const pattern = createPlaceholderPattern();
  let match;

  while ((match = pattern.exec(template)) !== null) {
    placeholders.add(match[1]);

    // Safety check to prevent infinite loops
    if (placeholders.size > MESSAGE_CONFIG.MAX_PLACEHOLDERS) {
      throw new Error(
        `Template exceeds maximum of ${MESSAGE_CONFIG.MAX_PLACEHOLDERS} unique placeholders`
      );
    }
  }

  return Array.from(placeholders);
}

/**
 * Render a message by replacing placeholders with actual values
 * Uses case-insensitive matching for field names
 *
 * @param template - Message template with {{placeholders}}
 * @param data - Object containing field values (supports string, number, boolean)
 * @param options - Rendering options
 * @returns Rendered message
 */
export interface RenderOptions {
  /** Value to use when placeholder data is missing (default: empty string) */
  fallback?: string;
  /** Whether to treat empty strings as missing data (default: false) */
  treatEmptyAsMissing?: boolean;
  /** Whether to validate message length (default: true) */
  validateLength?: boolean;
}

export function renderMessage(
  template: string,
  data: Record<string, string | number | boolean | undefined | null>,
  options: RenderOptions = {}
): string {
  const {
    fallback = '',
    treatEmptyAsMissing = false,
    validateLength = true,
  } = options;

  // Create case-insensitive lookup
  const lookup = createLookupMap(data);
  const pattern = createPlaceholderPattern();

  const rendered = template.replace(pattern, (match, fieldName) => {
    const normalizedField = normalize(fieldName);
    const value = lookup.get(normalizedField);

    if (value === undefined || (treatEmptyAsMissing && value === '')) {
      return fallback;
    }

    return value;
  });

  // Validate length if requested
  if (validateLength && rendered.length > MESSAGE_CONFIG.MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Rendered message length (${rendered.length}) exceeds WhatsApp limit of ${MESSAGE_CONFIG.MAX_MESSAGE_LENGTH} characters`
    );
  }

  return rendered;
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
  /** Actual length of rendered message */
  length: number;
  /** Whether message exceeds WhatsApp limit */
  exceedsLimit: boolean;
}

/**
 * Render a message with detailed metadata about the rendering
 * Uses case-insensitive matching for field names
 *
 * @param template - Message template with {{placeholders}}
 * @param data - Object containing field values
 * @param options - Rendering options
 * @returns Render result with metadata
 */
export function renderMessageWithMeta(
  template: string,
  data: Record<string, string | number | boolean | undefined | null>,
  options: RenderOptions = {}
): RenderResult {
  const {
    fallback = '',
    treatEmptyAsMissing = false,
  } = options;

  const placeholdersUsed: string[] = [];
  const missingData: string[] = [];

  // Create case-insensitive lookup
  const lookup = createLookupMap(data);
  const pattern = createPlaceholderPattern();

  const message = template.replace(pattern, (match, fieldName) => {
    placeholdersUsed.push(fieldName);

    const normalizedField = normalize(fieldName);
    const value = lookup.get(normalizedField);

    if (value === undefined || (treatEmptyAsMissing && value === '')) {
      missingData.push(fieldName);
      return fallback;
    }

    return value;
  });

  return {
    message,
    placeholdersUsed: [...new Set(placeholdersUsed)],
    missingData: [...new Set(missingData)],
    complete: missingData.length === 0,
    length: message.length,
    exceedsLimit: message.length > MESSAGE_CONFIG.MAX_MESSAGE_LENGTH,
  };
}

/**
 * Validate a template against available data columns
 * Uses case-insensitive matching
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
  /** Syntax validation errors */
  syntaxErrors: string[];
  /** Error message if invalid */
  error?: string;
}

export function validateTemplate(
  template: string,
  availableColumns: string[]
): TemplateValidationResult {
  // First check syntax
  const syntaxValidation = validateTemplateSyntax(template);

  if (!template || !template.trim()) {
    return {
      isValid: false,
      placeholders: [],
      unmatchedPlaceholders: [],
      unusedColumns: availableColumns,
      syntaxErrors: ['Template is empty'],
      error: 'Template is empty',
    };
  }

  if (!syntaxValidation.isValid) {
    return {
      isValid: false,
      placeholders: [],
      unmatchedPlaceholders: [],
      unusedColumns: availableColumns,
      syntaxErrors: syntaxValidation.errors,
      error: syntaxValidation.errors.join('; '),
    };
  }

  let placeholders: string[];
  try {
    placeholders = extractPlaceholders(template);
  } catch (error) {
    return {
      isValid: false,
      placeholders: [],
      unmatchedPlaceholders: [],
      unusedColumns: availableColumns,
      syntaxErrors: [error instanceof Error ? error.message : 'Unknown error'],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Case-insensitive matching
  const columnLowerMap = new Map(
    availableColumns.map((c) => [normalize(c), c])
  );

  const unmatchedPlaceholders = placeholders.filter((p) => {
    const pLower = normalize(p);
    return !columnLowerMap.has(pLower);
  });

  // Find columns not used as placeholders
  const placeholderLowerSet = new Set(
    placeholders.map((p) => normalize(p))
  );
  const unusedColumns = availableColumns.filter(
    (c) => !placeholderLowerSet.has(normalize(c))
  );

  return {
    isValid: unmatchedPlaceholders.length === 0,
    placeholders,
    unmatchedPlaceholders,
    unusedColumns,
    syntaxErrors: [],
    error:
      unmatchedPlaceholders.length > 0
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
  sampleRow: Record<string, string | number | boolean>
): string {
  return renderMessage(template, sampleRow, {
    fallback: '[missing]',
    validateLength: false,
  });
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

  // Calculate actual placeholder length in template: {{fieldName}} = fieldName.length + 4
  const placeholderTotalLength = placeholders.reduce(
    (sum, p) => sum + p.length + 4,
    0
  );

  // Subtract placeholder syntax, add estimated value lengths
  return (
    template.length -
    placeholderTotalLength +
    placeholders.length * averageFieldLength
  );
}

/**
 * Batch render messages for multiple recipients
 * Returns results with error handling per message
 *
 * @param template - Message template
 * @param dataRows - Array of data objects (one per recipient)
 * @param options - Rendering options
 * @returns Array of render results
 */
export interface BatchRenderResult {
  /** Successfully rendered message */
  message?: string;
  /** Error if rendering failed */
  error?: string;
  /** Row index in original data */
  rowIndex: number;
  /** Metadata about the rendering */
  meta?: RenderResult;
}

export function batchRenderMessages(
  template: string,
  dataRows: Record<string, string | number | boolean | undefined | null>[],
  options: RenderOptions = {}
): BatchRenderResult[] {
  // Validate template syntax once
  const syntaxValidation = validateTemplateSyntax(template);
  if (!syntaxValidation.isValid) {
    // Return error for all rows
    return dataRows.map((_, index) => ({
      error: `Template syntax error: ${syntaxValidation.errors.join('; ')}`,
      rowIndex: index,
    }));
  }

  // Render each row
  return dataRows.map((data, index) => {
    try {
      const meta = renderMessageWithMeta(template, data, options);
      return {
        message: meta.message,
        rowIndex: index,
        meta,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        rowIndex: index,
      };
    }
  });
}
