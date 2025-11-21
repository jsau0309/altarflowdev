/**
 * Authorization utility for server actions
 *
 * Prevents horizontal privilege escalation by verifying that the authenticated
 * user's organization owns the requested church before allowing data access.
 *
 * Usage in server actions:
 * ```typescript
 * import { authorizeChurchAccess } from '@/lib/auth/authorize-church-access'
 *
 * export async function getTopDonorsThisMonth(churchId: string) {
 *   // Verify authorization BEFORE any database queries
 *   const authorized = await authorizeChurchAccess(churchId)
 *   if (!authorized.success) {
 *     throw new Error(authorized.error)
 *   }
 *
 *   // Now safe to query with authorized.churchId
 *   const donors = await prisma.donationTransaction.findMany({
 *     where: { churchId: authorized.churchId }
 *   })
 * }
 * ```
 */

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export interface AuthorizationResult {
  success: boolean
  churchId?: string  // Internal database ID
  clerkOrgId?: string  // Clerk organization ID
  error?: string
}

/**
 * Verifies that the authenticated user has access to the requested church
 *
 * @param churchIdentifier - Can be either clerkOrgId or internal churchId
 * @returns Authorization result with churchId if successful
 */
export async function authorizeChurchAccess(
  churchIdentifier: string
): Promise<AuthorizationResult> {
  try {
    // Step 1: Verify user is authenticated
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return {
        success: false,
        error: 'Unauthorized: No active session'
      }
    }

    // Step 2 & 3 (Combined for atomicity): Look up church AND verify authorization
    // This prevents race conditions by making the authorization check atomic
    // The database will only return the church if BOTH conditions are met:
    // 1. The identifier matches (either clerkOrgId or internal id)
    // 2. The church's clerkOrgId matches the user's orgId

    // Determine if the identifier is a UUID (internal ID) or clerkOrgId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(churchIdentifier)

    const church = await prisma.church.findFirst({
      where: {
        AND: [
          isUuid
            ? { id: churchIdentifier }  // If UUID, match by internal ID
            : { clerkOrgId: churchIdentifier },  // Otherwise, match by clerkOrgId
          { clerkOrgId: orgId }  // Atomic authorization check
        ]
      },
      select: {
        id: true,
        clerkOrgId: true
      }
    })

    if (!church) {
      // Church either doesn't exist OR user doesn't have access
      // Log potential security violation for monitoring
      logger.warn('Authorization failed - potential privilege escalation attempt', {
        operation: 'security.authorization_failed',
        userId,
        userOrgId: orgId,
        requestedChurch: churchIdentifier,
        identifierType: isUuid ? 'uuid' : 'clerkOrgId',
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: 'Church not found or access denied'
      }
    }

    // Step 4: Authorization successful
    return {
      success: true,
      churchId: church.id,
      clerkOrgId: church.clerkOrgId || undefined  // Convert null to undefined
    }

  } catch (error) {
    logger.error('Authorization error', {
      operation: 'security.authorization_error',
      requestedChurch: churchIdentifier
    }, error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: 'Internal server error during authorization'
    }
  }
}

/**
 * Convenience function that throws an error if authorization fails
 * Use this when you want to fail-fast with an exception
 *
 * @param churchIdentifier - Church ID to authorize
 * @returns The internal churchId if successful
 * @throws Error if authorization fails
 */
export async function requireChurchAccess(
  churchIdentifier: string
): Promise<string> {
  const result = await authorizeChurchAccess(churchIdentifier)

  if (!result.success) {
    throw new Error(result.error || 'Authorization failed')
  }

  return result.churchId!
}
