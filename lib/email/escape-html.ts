/**
 * HTML escape utility for email templates
 * Prevents HTML/JavaScript injection through dynamic content
 */

const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/**
 * Escapes HTML special characters to prevent injection attacks
 * @param text - The text to escape
 * @returns The escaped text safe for HTML insertion
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  
  // Convert to string if not already
  const str = String(text);
  
  // Replace all HTML special characters
  return str.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Escapes HTML attributes (more strict than content escaping)
 * @param text - The text to escape for attribute usage
 * @returns The escaped text safe for HTML attribute insertion
 */
export function escapeHtmlAttribute(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  
  // Convert to string and escape
  const escaped = escapeHtml(text);
  
  // Additionally escape backticks and equals for attribute safety
  return escaped
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#61;');
}

/**
 * Escapes text for use in URLs (query parameters)
 * @param text - The text to escape for URL usage
 * @returns The URL-encoded text
 */
export function escapeUrl(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  
  return encodeURIComponent(String(text));
}

/**
 * Creates a safe HTML string with escaped dynamic content
 * @param strings - Template literal strings
 * @param values - Values to be escaped and inserted
 * @returns Safe HTML string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export function safeHtml(strings: TemplateStringsArray, ...values: any[]): string {
  let result = strings[0];
  
  for (let i = 0; i < values.length; i++) {
    result += escapeHtml(values[i]) + strings[i + 1];
  }
  
  return result;
}

/**
 * Validates and escapes a URL
 * @param url - The URL to validate and escape
 * @returns The escaped URL or empty string if invalid
 */
export function escapeAndValidateUrl(url: string | null | undefined): string {
  if (!url) {
    return '';
  }
  
  const str = String(url);
  
  // Basic URL validation - must start with http:// or https://
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return '';
  }
  
  // Check for javascript: protocol injection
  if (str.toLowerCase().includes('javascript:')) {
    return '';
  }
  
  // Return the URL with any HTML entities escaped
  return escapeHtml(str);
}