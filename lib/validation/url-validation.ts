/**
 * URL Validation Utilities
 * Provides secure URL validation for user-provided links
 */

/**
 * Validates that a URL uses only http or https protocol
 * @param url - The URL string to validate
 * @returns The validated URL or null if invalid
 */
export function validateAndSanitizeUrl(url: string | null | undefined): string | null {
  if (!url || url.trim().length === 0) {
    return null;
  }

  const trimmedUrl = url.trim();

  try {
    const parsed = new URL(trimmedUrl);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Validates multiple URLs in an object
 * @param urls - Object containing URL strings
 * @returns Object with validated URLs (invalid ones set to null)
 */
export function validateUrlObject(urls: Record<string, string | null | undefined>): Record<string, string | null> {
  const validated: Record<string, string | null> = {};

  for (const [key, url] of Object.entries(urls)) {
    validated[key] = validateAndSanitizeUrl(url);
  }

  return validated;
}

/**
 * Checks if a URL is valid without sanitizing
 * @param url - The URL to check
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string | null | undefined): boolean {
  return validateAndSanitizeUrl(url) !== null;
}
