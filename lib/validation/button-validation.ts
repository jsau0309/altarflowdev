import { logger } from '@/lib/logger';
/**
 * Button Configuration Type Guards
 * Provides runtime validation for button configurations stored as JSON
 */

export interface ButtonConfig {
  id: string;
  type: 'preset' | 'custom';
  label: string;
  url?: string;
  enabled: boolean;
  order: number;
}

/**
 * Type guard to check if an object is a valid ButtonConfig
 */
export function isButtonConfig(obj: unknown): obj is ButtonConfig {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const button = obj as Record<string, unknown>;

  return (
    typeof button.id === 'string' &&
    (button.type === 'preset' || button.type === 'custom') &&
    typeof button.label === 'string' &&
    typeof button.enabled === 'boolean' &&
    typeof button.order === 'number' &&
    (button.url === undefined || typeof button.url === 'string')
  );
}

/**
 * Validates and parses button array from JSON
 * @param json - JSON data to parse
 * @returns Validated button array or empty array if invalid
 */
export function parseButtonArray(json: unknown): ButtonConfig[] {
  if (!Array.isArray(json)) {
    logger.warn('Button configuration invalid format', { operation: 'validation.button.not_array' });
    return [];
  }

  const validButtons = json.filter((item) => {
    const isValid = isButtonConfig(item);
    if (!isValid) {
      logger.warn('Invalid button configuration found', { operation: 'validation.button.invalid_item', item });
    }
    return isValid;
  });

  return validButtons as ButtonConfig[];
}

/**
 * Safely extracts buttons from Prisma JSON field
 * @param buttonsJson - JSON field from database
 * @returns Validated button array
 */
export function safeParseButtons(buttonsJson: unknown): ButtonConfig[] {
  try {
    // If it's already an array (Prisma sometimes returns parsed JSON)
    if (Array.isArray(buttonsJson)) {
      return parseButtonArray(buttonsJson);
    }

    // If it's a string, parse it first
    if (typeof buttonsJson === 'string') {
      const parsed = JSON.parse(buttonsJson);
      return parseButtonArray(parsed);
    }

    // Unknown format
    logger.warn('Unexpected button JSON format', { operation: 'validation.button.unexpected_type', type: typeof buttonsJson });
    return [];
  } catch (error) {
    logger.error('Failed to parse button configuration', { operation: 'validation.button.parse_error' }, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Validates button configuration before saving
 * @param buttons - Button array to validate
 * @returns Validation result with errors
 */
export function validateButtons(buttons: unknown): {
  isValid: boolean;
  errors: string[];
  validButtons: ButtonConfig[];
} {
  const errors: string[] = [];

  if (!Array.isArray(buttons)) {
    errors.push('Buttons must be an array');
    return { isValid: false, errors, validButtons: [] };
  }

  const validButtons: ButtonConfig[] = [];

  buttons.forEach((button, index) => {
    if (!isButtonConfig(button)) {
      errors.push(`Button at index ${index} has invalid structure`);
      return;
    }

    // Additional validation
    if (button.label.trim().length === 0) {
      errors.push(`Button at index ${index} has empty label`);
      return;
    }

    if (button.type === 'custom' && button.enabled) {
      if (!button.url || button.url.trim().length === 0) {
        errors.push(`Custom button at index ${index} requires a URL`);
        return;
      }
    }

    validButtons.push(button);
  });

  return {
    isValid: errors.length === 0,
    errors,
    validButtons,
  };
}
