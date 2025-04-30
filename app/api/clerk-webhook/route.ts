import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { 
  WebhookEvent, 
  OrganizationWebhookEvent, 
  OrganizationMembershipWebhookEvent 
} from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Import Prisma client
import { prisma } from '@/lib/prisma'; // Use named import
import { Role } from '@prisma/client'; // Import the Role enum

export async function POST(req: Request) {

  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = headers();
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
        await prisma.church.create({
          data: {
            clerkOrgId: orgId,
            name: name,
            // Add other default Church fields if necessary
          } 
        });
        console.log(`Successfully created church for Org ID: ${orgId}`);
      } catch (error) {
        console.error(`Error creating church for Org ID ${orgId}:`, error);
        return new Response('Error occurred -- creating church', { status: 500 });
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
        const updateData: any = {
          role: prismaRole,    // Set the application role
        };

        // If this membership is for the organization creator, mark onboarding complete
        if (userId === organization.created_by) {
          console.log(`Marking onboarding complete for creator User ID: ${userId} in Org ID: ${orgId}`);
          updateData.onboardingComplete = true;
        }

        await prisma.profile.update({
          where: { id: userId },
          data: updateData,
        });

        console.log(`Successfully updated profile for User ID: ${userId} in Org ID: ${orgId}`);

      } catch (error) {
        console.error(`Error updating profile for User ID ${userId} in Org ID ${orgId}:`, error);
        // Check if the error is due to the profile not existing yet (race condition with user.created)
        if ((error as any).code === 'P2025') { // Prisma code for RecordNotFound
          console.warn(`Profile for User ID ${userId} not found. Might be a race condition. Webhook will likely retry.`);
          // Return 500 to signal Clerk to retry
          return new Response('Error occurred -- profile not found, retry needed', { status: 500 });
        } else {
          return new Response('Error occurred -- updating profile', { status: 500 });
        }
      }
    } // End inner type check
  }

  // TODO: Handle user.deleted event if needed later
  // TODO: Handle organization.updated/deleted and membership.updated/deleted

  // Return 200 OK to Clerk to acknowledge receipt
  return new Response('', { status: 200 })
} 