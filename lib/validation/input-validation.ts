/**
 * Input Validation Utilities
 * Provides length and format validation for user inputs
 */

// Maximum length constraints
export const INPUT_LIMITS = {
  DESCRIPTION: 500,
  CUSTOM_TITLE: 100,
  BUTTON_LABEL: 50,
  URL: 2048, // Standard URL max length
} as const;

/**
 * Validates text input length
 * @param text - The text to validate
 * @param maxLength - Maximum allowed length
 * @returns Object with isValid and optional error message
 */
export function validateTextLength(
  text: string | null | undefined,
  maxLength: number
): { isValid: boolean; error?: string } {
  if (!text) {
    return { isValid: true };
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      error: `Text exceeds maximum length of ${maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validates description field
 */
export function validateDescription(description: string | null | undefined) {
  return validateTextLength(description, INPUT_LIMITS.DESCRIPTION);
}

/**
 * Validates custom title field
 */
export function validateCustomTitle(title: string | null | undefined) {
  return validateTextLength(title, INPUT_LIMITS.CUSTOM_TITLE);
}

/**
 * Validates button label
 */
export function validateButtonLabel(label: string | null | undefined) {
  return validateTextLength(label, INPUT_LIMITS.BUTTON_LABEL);
}

/**
 * Sanitizes text by trimming whitespace and limiting length
 * @param text - Text to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized text
 */
export function sanitizeText(
  text: string | null | undefined,
  maxLength: number
): string | null {
  if (!text) return null;

  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  return trimmed.substring(0, maxLength);
}
