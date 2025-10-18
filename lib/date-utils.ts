/**
 * Parses a date string (YYYY-MM-DD) into a Date object at UTC midnight.
 * This ensures consistent date-only comparisons regardless of server timezone.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at midnight UTC, or null if invalid
 */
export function parseDateOnly(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr);
  if (!m) return new Date(dateStr);
  const [y, mo, d] = dateStr.split('-').map(Number);
  // Use Date.UTC to create date at midnight UTC, avoiding timezone issues
  return new Date(Date.UTC(y, mo - 1, d));
}

/**
 * Strips time from a Date object, returning a new Date at UTC midnight.
 * Used for date-only comparisons (e.g., campaign start/end dates).
 *
 * @param date - Date object to convert
 * @returns New Date object at UTC midnight with same calendar date
 */
export function toDateOnly(date: Date | null | undefined): Date | null {
  if (!date) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Gets current date at UTC midnight (strips time component).
 * Use this for comparing against campaign dates.
 *
 * @returns Current date at UTC midnight
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function toIsoOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}