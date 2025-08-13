import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { 
  WebhookEvent, 
  OrganizationMembershipWebhookEvent 
} from '@clerk/nextjs/server'

// Import Prisma client
import { prisma } from '@/lib/db'; // Use named import
import { Role } from '@prisma/client'; // Import the Role enum
import { format } from 'date-fns';
import { getQuotaLimit } from '@/lib/subscription-helpers';

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
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred -- verifying webhook', {
      status: 400
    })
  }

  // Get the ID and type
  const eventType = evt.type;

  console.log(`Webhook received: ${eventType}`)

  // --- Handle specific events --- 

  if (eventType === 'user.created') {
    const { id, first_name, last_name } = evt.data;
    console.log(`Processing user.created for user ID: ${id}`);
    try {
      await prisma.profile.create({
        data: {
          id: id, // Use Clerk user ID as Profile ID
          firstName: first_name,
          lastName: last_name,
          // Initialize other Profile fields as needed
          role: 'STAFF', // Default role
          onboardingComplete: false,
          // churchId can be linked later (e.g., via invite acceptance)
        }
      });
      console.log(`Successfully created profile for user ${id}`);
    } catch (error) {
      console.error(`Error creating profile for user ${id}:`, error);
      // Return error response to Clerk so it knows the webhook failed
      return new Response('Error occurred -- creating profile', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, first_name, last_name } = evt.data;
    console.log(`Processing user.updated for user ID: ${id}`);
    try {
      await prisma.profile.update({
        where: { id: id },
        data: {
          firstName: first_name,
          lastName: last_name,
          // Update other fields if necessary (e.g., image_url if you add it to Profile)
        }
      });
      console.log(`Successfully updated profile for user ${id}`);
    } catch (error) {
      console.error(`Error updating profile for user ${id}:`, error);
      // Return error response to Clerk
      return new Response('Error occurred -- updating profile', { status: 500 });
    }
  }

  // Handle organization creation
  if (eventType === 'organization.created') {
    // Explicitly check the type again for TypeScript narrowing
    if (evt.type === 'organization.created') {
      const { id: orgId, name, created_by: createdByUserId } = evt.data; // Access data safely now

      console.log(`Processing organization.created for Org ID: ${orgId}`);
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
            console.error(`User ${createdByUserId} already has a church (is ADMIN). Preventing duplicate organization creation.`);
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
          console.error(`Church already exists for Org ID: ${orgId}. Skipping duplicate creation.`);
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


        const newChurch = await prisma.church.create({
          data: {
            clerkOrgId: orgId,
            name: name, // Original name from Clerk
            slug: slug, // Generated slug
            // Initialize with free status
            subscriptionStatus: 'free',
            // Initialize onboarding state
            onboardingCompleted: false,
            onboardingStep: 2, // Start at step 2 since org is already created
            // Add other default Church fields if necessary
          }
        });
        console.log(`Successfully created church for Org ID: ${orgId} with internal ID: ${newChurch.id} - Free plan activated`);

        // Create initial email quota for the new church
        const currentMonthYear = format(new Date(), 'yyyy-MM');
        const quotaLimit = getQuotaLimit(newChurch); // Will return 4 for free churches
        
        await prisma.emailQuota.create({
          data: {
            churchId: newChurch.id,
            monthYear: currentMonthYear,
            quotaLimit,
            emailsSent: 0, // Tracks campaigns sent, not individual emails
          },
        });
        console.log(`Successfully created email quota for church ID: ${newChurch.id} with limit: ${quotaLimit} campaigns/month`);

        // Now, create default donation types for the new church
        const defaultDonationTypesData = [
          {
            name: "Tithe",
            description: "Regular giving to support the church's mission and ministries.",
            churchId: newChurch.id, // Link to the newly created church
            isRecurringAllowed: true,
          },
          {
            name: "Offering",
            description: "General contributions and special one-time gifts.",
            churchId: newChurch.id, // Link to the newly created church
            isRecurringAllowed: true,
          },
        ];

        await prisma.donationType.createMany({
          data: defaultDonationTypesData,
          skipDuplicates: true, // Good practice, though should not happen for new church
        });
        console.log(`Successfully created default donation types for church ID: ${newChurch.id}`);

        // Fix race condition: Update the creator's role to ADMIN immediately
        if (createdByUserId) {
          try {
            await prisma.profile.update({
              where: { id: createdByUserId },
              data: { role: 'ADMIN' }
            });
            console.log(`Updated organization creator ${createdByUserId} to ADMIN role`);
          } catch (profileError) {
            // Log but don't fail the webhook - the organizationMembership.created event will fix this
            console.warn(`Could not update creator's role immediately (profile might not exist yet):`, profileError);
          }
        }
      } catch (error) {
        console.error(`Error in organization.created processing for Org ID ${orgId} (church or default donation types):`, error);
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
        console.error('User ID missing in organizationMembership.created event');
        return new Response('Error occurred -- missing user ID', { status: 400 });
      }

      console.log(`Processing organizationMembership.created for Org ID: ${orgId}, User ID: ${userId}`);

      try {
        // Find the corresponding Church using the Clerk Org ID
        const church = await prisma.church.findUnique({
          where: { clerkOrgId: orgId },
          select: { id: true } // Only select the ID
        });

        if (!church) {
          console.error(`Church not found for Org ID: ${orgId}`);
          // Optionally, retry or handle cases where the Church might not be created yet
          // For now, return an error
          return new Response('Error occurred -- church not found', { status: 404 });
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

        await prisma.profile.update({
          where: { id: userId },
          data: updateData,
        });

        console.log(`Successfully updated profile for User ID: ${userId} in Org ID: ${orgId}`);

      } catch (error) {
        console.error(`Error updating profile for User ID ${userId} in Org ID ${orgId}:`, error);
        // Check if the error is due to the profile not existing yet (race condition with user.created)
        if ((error as Error & { code?: string }).code === 'P2025') { // Prisma code for RecordNotFound
          console.warn(`Profile for User ID ${userId} not found. Might be a race condition. Webhook will likely retry.`);
          // Return 500 to signal Clerk to retry
          return new Response('Error occurred -- profile not found, retry needed', { status: 500 });
        } else {
          return new Response('Error occurred -- updating profile', { status: 500 });
        }
      }
    } // End inner type check
  }

  // Handle organization membership updates (role changes)
  if (eventType === 'organizationMembership.updated') {
    // Explicitly check the type again for TypeScript narrowing
    if (evt.type === 'organizationMembership.updated') {
      const { organization, public_user_data, role } = evt.data;
      const orgId = organization.id;
      const userId = public_user_data?.user_id;

      if (!userId) {
        console.error('User ID missing in organizationMembership.updated event');
        return new Response('Error occurred -- missing user ID', { status: 400 });
      }

      console.log(`Processing organizationMembership.updated for Org ID: ${orgId}, User ID: ${userId}, New Role: ${role}`);

      try {
        // Map Clerk's role to our application role
        const prismaRole: Role = role === 'org:admin' ? Role.ADMIN : Role.STAFF;

        // Update the user's role in the profile
        await prisma.profile.update({
          where: { id: userId },
          data: { role: prismaRole }
        });

        console.log(`Successfully updated role for User ID: ${userId} to ${prismaRole}`);
      } catch (error) {
        console.error(`Error updating role for User ID ${userId}:`, error);
        if ((error as Error & { code?: string }).code === 'P2025') {
          console.warn(`Profile for User ID ${userId} not found. Might be a race condition.`);
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
      console.error('User ID missing in organizationMembership.deleted event');
      // Return 400, as we cannot identify which profile to delete
      return new Response('Error occurred -- missing user ID', { status: 400 });
    }

    console.log(`Processing organizationMembership.deleted for Org ID: ${orgId || 'N/A'}, User ID: ${userId}`);

    try {
      // Attempt to delete the corresponding profile
      await prisma.profile.delete({
        where: { id: userId },
      });
      console.log(`Successfully deleted profile for User ID: ${userId} due to org membership deletion.`);
    
    } catch (error) {
       // Handle cases where the profile might not exist (e.g., already deleted)
       // Prisma throws P2025 for record not found on delete
      if ((error as Error & { code?: string }).code === 'P2025') { 
        console.warn(`Profile deletion skipped: Profile for User ID ${userId} not found (might be already deleted).`);
        // Return 200 OK because the desired state (no profile link) is achieved
        return new Response('', { status: 200 });
      } else {
        // Handle other potential database errors
        console.error(`Error deleting profile for User ID ${userId} after org membership deletion:`, error);
        return new Response('Error occurred -- deleting profile', { status: 500 });
      }
    }
  }
  
  // TODO: Handle user.deleted event if needed later
  // TODO: Handle organization.updated/deleted events if needed

  // Return 200 OK to Clerk to acknowledge receipt
  return new Response('', { status: 200 })
} 