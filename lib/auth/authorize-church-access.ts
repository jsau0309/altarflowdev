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

    // Step 2: Look up the church by the provided identifier
    // Try both clerkOrgId and internal id to handle different calling patterns
    const church = await prisma.church.findFirst({
      where: {
        OR: [
          { clerkOrgId: churchIdentifier },
          { id: churchIdentifier }
        ]
      },
      select: {
        id: true,
        clerkOrgId: true
      }
    })

    if (!church) {
      return {
        success: false,
        error: 'Church not found'
      }
    }

    // Step 3: Verify that the user's organization owns this church
    if (church.clerkOrgId !== orgId) {
      // This is the horizontal privilege escalation attempt
      console.warn('[SECURITY] Authorization failed:', {
        userId,
        userOrgId: orgId,
        requestedChurch: churchIdentifier,
        actualChurchOrg: church.clerkOrgId,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        error: 'Forbidden: You do not have access to this church'
      }
    }

    // Step 4: Authorization successful
    return {
      success: true,
      churchId: church.id,
      clerkOrgId: church.clerkOrgId
    }

  } catch (error) {
    console.error('[AUTH] Authorization error:', error)
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
