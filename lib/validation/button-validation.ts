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
    console.warn('Button configuration is not an array, returning empty array');
    return [];
  }

  const validButtons = json.filter((item) => {
    const isValid = isButtonConfig(item);
    if (!isValid) {
      console.warn('Invalid button configuration found:', item);
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
    console.warn('Unexpected button JSON format:', typeof buttonsJson);
    return [];
  } catch (error) {
    console.error('Failed to parse button configuration:', error);
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
