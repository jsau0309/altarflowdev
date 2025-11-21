import { Webhook } from 'svix'
import { headers } from 'next/headers'
import {
  WebhookEvent,
  OrganizationMembershipWebhookEvent
} from '@clerk/nextjs/server'

// Import Prisma client
import { prisma } from '@/lib/db'; // Use named import
import { Role } from '@prisma/client'; // Import the Role enum
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {

  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.error('Missing webhook headers', { operation: 'webhook.clerk.missing_headers', has_svix_id: !!svix_id, has_svix_timestamp: !!svix_timestamp, has_svix_signature: !!svix_signature });
    return new Response('Error occurred -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    logger.error('Error verifying webhook', { operation: 'webhook.clerk.verification_error' }, err instanceof Error ? err : new Error(String(err)));
    logger.error('Webhook verification details', { operation: 'webhook.clerk.verification_details', webhook_secret_length: WEBHOOK_SECRET.length, webhook_secret_prefix: WEBHOOK_SECRET.substring(0, 10), svix_id, svix_timestamp, signature_length: svix_signature?.length });
    return new Response('Error occurred -- verifying webhook', {
      status: 400
    })
  }

  // Get the ID and type
  const eventType = evt.type;

  logger.info('Webhook received', { operation: 'webhook.clerk.received', eventType });

  // --- Handle specific events --- 

  if (eventType === 'user.created') {
    const { id, first_name, last_name } = evt.data;
    logger.info('Processing user.created event', { operation: 'webhook.clerk.user_created', userId: id });
    try {
      // Use upsert to handle duplicate webhook calls gracefully
      await prisma.profile.upsert({
        where: { id: id },
        create: {
          // If profile doesn't exist, create with these values
          id: id, // Use Clerk user ID as Profile ID
          firstName: first_name,
          lastName: last_name,
          // Initialize other Profile fields as needed
          role: 'STAFF', // Default role
          onboardingComplete: false,
          // churchId can be linked later (e.g., via invite acceptance)
        },
        update: {
          // If profile exists (duplicate webhook), only update safe fields
          firstName: first_name,
          lastName: last_name,
          // Don't update role or onboardingComplete to preserve existing values
        }
      });
      logger.info('Successfully created/updated profile', { operation: 'webhook.clerk.profile_upserted', userId: id });
    } catch (error) {
      logger.error('Error creating/updating profile', { operation: 'webhook.clerk.profile_upsert_error', userId: id }, error instanceof Error ? error : new Error(String(error)));
      // Return error response to Clerk so it knows the webhook failed
      return new Response('Error occurred -- creating/updating profile', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, first_name, last_name } = evt.data;
    logger.info('Processing user.updated event', { operation: 'webhook.clerk.user_updated', userId: id });
    try {
      await prisma.profile.update({
        where: { id: id },
        data: {
          firstName: first_name,
          lastName: last_name,
          // Update other fields if necessary (e.g., image_url if you add it to Profile)
        }
      });
      logger.info('Successfully updated profile', { operation: 'webhook.clerk.profile_updated', userId: id });
    } catch (error) {
      logger.error('Error updating profile', { operation: 'webhook.clerk.profile_update_error', userId: id }, error instanceof Error ? error : new Error(String(error)));
      // Return error response to Clerk
      return new Response('Error occurred -- updating profile', { status: 500 });
    }
  }

  // Handle organization creation
  if (eventType === 'organization.created') {
    // Explicitly check the type again for TypeScript narrowing
    if (evt.type === 'organization.created') {
      const { id: orgId, name, created_by: createdByUserId } = evt.data; // Access data safely now

      logger.info('Processing organization.created event', { operation: 'webhook.clerk.org_created', orgId });
      try {
        // Check if the creator already has a church/organization
        if (createdByUserId) {
          // First, check if this user is already an admin of any organization
          const existingProfile = await prisma.profile.findUnique({
            where: { id: createdByUserId },
            select: { role: true }
          });

          // Check if user already has an admin role (meaning they already have a church)
          if (existingProfile?.role === 'ADMIN') {
            logger.warn('User already has a church, preventing duplicate', { operation: 'webhook.clerk.org_duplicate', userId: createdByUserId });
            // We can't really prevent Clerk from creating the org, but we won't create a Church record
            // This will effectively make the Clerk org unusable in our system
            return new Response('User already has a church', { status: 200 }); // Return 200 to not retry
          }
        }

        // Also check if a church with this Clerk org ID already exists (defensive programming)
        const existingChurch = await prisma.church.findUnique({
          where: { clerkOrgId: orgId }
        });

        if (existingChurch) {
          logger.warn('Church already exists, skipping duplicate creation', { operation: 'webhook.clerk.church_duplicate', orgId });
          return new Response('Church already exists', { status: 200 });
        }
        // Generate slug from organization name
        let slug = name
          .toString()        // Ensure name is a string
          .toLowerCase()     // Convert to lowercase
          .trim()            // Remove leading/trailing whitespace
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/[^\w-]+/g, '') // Remove all non-word chars (keeps alphanumeric, _, -)
          .replace(/--+/g, '-');      // Replace multiple hyphens with a single hyphen

        // Fallback for empty slug (e.g., if name was purely special characters or empty)
        if (!slug) {
          // Create a simple slug from the organization ID part (e.g., org_123xyz -> org-123xyz)
          slug = `org-${orgId.startsWith('org_') ? orgId.substring(4) : orgId}`;
        }
        // Note: Prisma's @unique constraint on 'slug' will handle collisions.
        // A more advanced system might check for existing slugs and append a counter if a collision occurs.


        // Calculate trial end date (30 days from now)
        // FIXED: Calculate without date mutation to avoid bugs
        const now = new Date();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const trialEnd = new Date(now.getTime() + thirtyDaysInMs);

        const newChurch = await prisma.church.create({
          data: {
            clerkOrgId: orgId,
            name: name, // Original name from Clerk
            slug: slug, // Generated slug
            // AUTO-START 30-DAY FREE TRIAL for all new churches
            subscriptionStatus: 'trial',
            setupFeePaid: true, // Mark as "paid" to skip manual setup fee call
            freeTrialStartedAt: now,
            trialEndsAt: trialEnd,
            // Initialize onboarding state
            onboardingCompleted: false,
            onboardingStep: 2, // Start at step 2 since org is already created
            // Add other default Church fields if necessary
          }
        });
        logger.info('Successfully created church with trial', { operation: 'webhook.clerk.church_created', orgId, churchId: newChurch.id, trial: '30-day' });

        // Now, create default donation types for the new church
        const defaultDonationTypesData = [
          {
            name: "Tithe",
            description: "Regular giving to support the church's mission and ministries.",
            churchId: newChurch.id, // Link to the newly created church
            isRecurringAllowed: true,
            isCampaign: false,
            isSystemType: true,
            isDeletable: false,
          },
          {
            name: "Offering",
            description: "General contributions and special one-time gifts.",
            churchId: newChurch.id, // Link to the newly created church
            isRecurringAllowed: true,
            isCampaign: false,
            isSystemType: true,
            isDeletable: false,
          },
        ];

        await prisma.donationType.createMany({
          data: defaultDonationTypesData,
          skipDuplicates: true, // Good practice, though should not happen for new church
        });
        logger.info('Successfully created default donation types', { operation: 'webhook.clerk.donation_types_created', churchId: newChurch.id });

        // Create default donation payment methods for the new church
        const defaultPaymentMethodsData = [
          {
            name: "Cash",
            color: "#10B981", // Green
            churchId: newChurch.id,
            isSystemMethod: true,
            isDeletable: false,
          },
          {
            name: "Check",
            color: "#3B82F6", // Blue
            churchId: newChurch.id,
            isSystemMethod: true,
            isDeletable: false,
          },
          {
            name: "Card",
            color: "#000000", // Black
            churchId: newChurch.id,
            isSystemMethod: true,
            isDeletable: false,
          },
          {
            name: "Link",
            color: "#000000", // Black
            churchId: newChurch.id,
            isSystemMethod: true,
            isDeletable: false,
          },
          {
            name: "Bank Transfer",
            color: "#F59E0B", // Amber
            churchId: newChurch.id,
            isSystemMethod: true,
            isDeletable: false,
          },
        ];

        await prisma.donationPaymentMethod.createMany({
          data: defaultPaymentMethodsData,
          skipDuplicates: true,
        });
        logger.info('Successfully created default payment methods', { operation: 'webhook.clerk.payment_methods_created', churchId: newChurch.id });

        // Create default expense categories for the new church
        const defaultExpenseCategoriesData = [
          {
            name: "Utilities",
            color: "#EF4444", // Red
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Salaries",
            color: "#3B82F6", // Blue
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Maintenance",
            color: "#F97316", // Orange
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Office Supplies",
            color: "#10B981", // Green
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Ministry",
            color: "#8B5CF6", // Purple
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Building",
            color: "#F59E0B", // Amber
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Events",
            color: "#EC4899", // Pink
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Technology",
            color: "#06B6D4", // Cyan
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Transportation",
            color: "#84CC16", // Lime
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Insurance",
            color: "#6366F1", // Indigo
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
          {
            name: "Other",
            color: "#6B7280", // Gray
            churchId: newChurch.id,
            isSystemCategory: true,
            isDeletable: false,
          },
        ];

        await prisma.expenseCategory.createMany({
          data: defaultExpenseCategoriesData,
          skipDuplicates: true,
        });
        logger.info('Successfully created default expense categories', { operation: 'webhook.clerk.expense_categories_created', churchId: newChurch.id });

        // Fix race condition: Update the creator's role to ADMIN immediately
        if (createdByUserId) {
          try {
            await prisma.profile.update({
              where: { id: createdByUserId },
              data: { role: 'ADMIN' }
            });
            logger.info('Updated organization creator to ADMIN role', { operation: 'webhook.clerk.creator_promoted', userId: createdByUserId });
          } catch (profileError) {
            // Log but don't fail the webhook - the organizationMembership.created event will fix this
            logger.warn('Could not update creator role immediately', { operation: 'webhook.clerk.creator_role_delay', error: profileError instanceof Error ? profileError.message : String(profileError) });
          }
        }
      } catch (error) {
        logger.error('Error in organization.created processing', { operation: 'webhook.clerk.org_created_error', orgId }, error instanceof Error ? error : new Error(String(error)));
        return new Response('Error occurred -- processing organization.created event', { status: 500 });
      }
    }
  }

  // Handle organization membership creation
  if (eventType === 'organizationMembership.created') {
    // Explicitly check the type again for TypeScript narrowing
    if (evt.type === 'organizationMembership.created') {
      const { organization, public_user_data, role } = evt.data; // Access data safely now
      const orgId = organization.id;
      const userId = public_user_data?.user_id; // Use optional chaining

      if (!userId) {
        logger.error('User ID missing in organizationMembership.created event', { operation: 'webhook.clerk.membership_created_no_user' });
        return new Response('Error occurred -- missing user ID', { status: 400 });
      }

      logger.info('Processing organizationMembership.created event', { operation: 'webhook.clerk.membership_created', orgId, userId });

      try {
        // Find the corresponding Church using the Clerk Org ID
        let church = await prisma.church.findUnique({
          where: { clerkOrgId: orgId },
          select: { id: true } // Only select the ID
        });

        if (!church) {
          logger.error('Church not found for organization', { operation: 'webhook.clerk.church_not_found', orgId });

          // RACE CONDITION FIX: The organization.created webhook may not have processed yet
          // Implement retry logic with exponential backoff
          const maxRetries = 3;
          const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            logger.debug('Retrying church lookup', { operation: 'webhook.clerk.church_lookup_retry', orgId, attempt: attempt + 1, maxRetries });

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));

            // Try to find church again
            church = await prisma.church.findUnique({
              where: { clerkOrgId: orgId },
              select: { id: true }
            });

            if (church) {
              logger.info('Church found on retry', { operation: 'webhook.clerk.church_found_retry', attempt: attempt + 1 });
              break;
            }
          }

          if (!church) {
            // After all retries, still not found - ask Clerk to retry the webhook later
            logger.warn('Church not yet created after retries', { operation: 'webhook.clerk.church_retry_exhausted', orgId, maxRetries });
            return new Response('Accepted - retry later', { status: 202 });
          }
        }

        // Determine the application-specific role based on the Clerk role
        // Map Clerk's 'org:admin' to your ADMIN enum, otherwise default to STAFF
        const prismaRole: Role = role === 'org:admin' ? Role.ADMIN : Role.STAFF; // Check for 'org:admin'

        // Update the user's Profile
        const updateData: { role: Role } = {
          role: prismaRole,    // Set the application role
        };

        // Don't mark onboarding complete anymore - they need to go through the full flow
        // This ensures all users complete the onboarding process

        // Use upsert to handle race condition where user.created webhook hasn't fired yet
        await prisma.profile.upsert({
          where: { id: userId },
          update: updateData,
          create: {
            id: userId,
            role: prismaRole,
            firstName: public_user_data?.first_name || '',
            lastName: public_user_data?.last_name || '',
            email: '', // This will be updated by user.created webhook when it arrives
          },
        });

        logger.info('Successfully updated/created profile for membership', { operation: 'webhook.clerk.membership_profile_upserted', userId, orgId });

      } catch (error) {
        logger.error('Error updating profile for membership', { operation: 'webhook.clerk.membership_profile_error', userId, orgId }, error instanceof Error ? error : new Error(String(error)));
        // Check if the error is due to the profile not existing yet (race condition with user.created)
        if ((error as Error & { code?: string }).code === 'P2025') { // Prisma code for RecordNotFound
          logger.warn('Profile not found, possible race condition', { operation: 'webhook.clerk.profile_race_condition', userId });
          // Return 500 to signal Clerk to retry
          return new Response('Error occurred -- profile not found, retry needed', { status: 500 });
        } else {
          return new Response('Error occurred -- updating profile', { status: 500 });
        }
      }
    } // End inner type check
  }

  if (eventType === 'organization.updated') {
    if (evt.type === 'organization.updated') {
      const { id: orgId, name } = evt.data;

      if (!orgId) {
        logger.error('organization.updated event missing organization id', { operation: 'webhook.clerk.org_updated_no_id' });
        return new Response('Error occurred -- missing organization id', { status: 400 });
      }

      logger.info('Processing organization.updated event', { operation: 'webhook.clerk.org_updated', orgId });

      try {
        const church = await prisma.church.findUnique({
          where: { clerkOrgId: orgId },
        });

        if (!church) {
          logger.warn('Church not found for organization update', { operation: 'webhook.clerk.org_update_church_not_found', orgId });
          return new Response('Accepted - retry later', { status: 202 });
        }

        const updateData: Prisma.ChurchUpdateInput = {
          updatedAt: new Date(),
        };

        if (typeof name === 'string' && name.trim().length > 0 && church.name !== name) {
          updateData.name = name;
        }

        if (Object.keys(updateData).length === 1) {
          logger.debug('No changes needed for church on org update', { operation: 'webhook.clerk.org_update_no_changes', churchId: church.id });
          return new Response('', { status: 200 });
        }

        await prisma.church.update({
          where: { id: church.id },
          data: updateData,
        });

        logger.info('Successfully updated church from org update', { operation: 'webhook.clerk.church_updated', churchId: church.id });
      } catch (error) {
        logger.error('Error processing organization.updated', { operation: 'webhook.clerk.org_update_error', orgId }, error instanceof Error ? error : new Error(String(error)));
        return new Response('Error occurred -- processing organization.updated', { status: 500 });
      }
    }
  }

  // Handle organization membership updates (role changes)
  if (eventType === 'organizationMembership.updated') {
    // Explicitly check the type again for TypeScript narrowing
    if (evt.type === 'organizationMembership.updated') {
      const { organization, public_user_data, role } = evt.data;
      const orgId = organization.id;
      const userId = public_user_data?.user_id;

      if (!userId) {
        logger.error('User ID missing in organizationMembership.updated event', { operation: 'webhook.clerk.membership_updated_no_user' });
        return new Response('Error occurred -- missing user ID', { status: 400 });
      }

      logger.info('Processing organizationMembership.updated event', { operation: 'webhook.clerk.membership_updated', orgId, userId, newRole: role });

      try {
        // First fetch the church to get the churchId
        const church = await prisma.church.findUnique({
          where: { clerkOrgId: orgId },
          select: { id: true }
        });

        if (!church) {
          logger.error('Church not found for membership update', { operation: 'webhook.clerk.membership_update_church_not_found', orgId });
          return new Response('Church not found', { status: 404 });
        }

        // Map Clerk's role to our application role
        const prismaRole: Role = role === 'org:admin' ? Role.ADMIN : Role.STAFF;

        // Update the user's role in the profile (use upsert in case of race conditions)
        await prisma.profile.upsert({
          where: { id: userId },
          update: { role: prismaRole },
          create: {
            id: userId,
            role: prismaRole,
            firstName: public_user_data?.first_name || '',
            lastName: public_user_data?.last_name || '',
            email: '',
          }
        });

        logger.info('Successfully updated user role', { operation: 'webhook.clerk.role_updated', userId, newRole: prismaRole });
      } catch (error) {
        logger.error('Error updating user role', { operation: 'webhook.clerk.role_update_error', userId }, error instanceof Error ? error : new Error(String(error)));
        if ((error as Error & { code?: string }).code === 'P2025') {
          logger.warn('Profile not found for role update, possible race condition', { operation: 'webhook.clerk.role_update_race_condition', userId });
          return new Response('Error occurred -- profile not found', { status: 500 });
        }
        return new Response('Error occurred -- updating role', { status: 500 });
      }
    }
  }

  // Handle organization membership deletion
  if (eventType === 'organizationMembership.deleted') {
    // Cast event to the specific type for safety, though data structure might be simpler
    // Check Clerk docs if OrganizationMembershipWebhookEvent covers deleted structure accurately
    const membershipEvent = evt as OrganizationMembershipWebhookEvent; 
    const userId = membershipEvent.data.public_user_data?.user_id;
    const orgId = membershipEvent.data.organization?.id; // Get orgId for logging

    if (!userId) {
      logger.error('User ID missing in organizationMembership.deleted event', { operation: 'webhook.clerk.membership_deleted_no_user' });
      // Return 400, as we cannot identify which profile to delete
      return new Response('Error occurred -- missing user ID', { status: 400 });
    }

    logger.info('Processing organizationMembership.deleted event', { operation: 'webhook.clerk.membership_deleted', orgId: orgId || 'N/A', userId });

    try {
      // Attempt to delete the corresponding profile
      await prisma.profile.delete({
        where: { id: userId },
      });
      logger.info('Successfully deleted profile for membership deletion', { operation: 'webhook.clerk.profile_deleted', userId });
    
    } catch (error) {
       // Handle cases where the profile might not exist (e.g., already deleted)
       // Prisma throws P2025 for record not found on delete
      if ((error as Error & { code?: string }).code === 'P2025') { 
        logger.warn('Profile deletion skipped, already deleted', { operation: 'webhook.clerk.profile_delete_skip', userId });
        // Return 200 OK because the desired state (no profile link) is achieved
        return new Response('', { status: 200 });
      } else {
        // Handle other potential database errors
        logger.error('Error deleting profile for membership deletion', { operation: 'webhook.clerk.profile_delete_error', userId }, error instanceof Error ? error : new Error(String(error)));
        return new Response('Error occurred -- deleting profile', { status: 500 });
      }
    }
  }
  
  // TODO: Handle user.deleted event if needed later
  // TODO: Handle organization.deleted event if needed

  // Return 200 OK to Clerk to acknowledge receipt
  return new Response('', { status: 200 })
} 