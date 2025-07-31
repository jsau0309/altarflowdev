import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { RecipientStatus } from "@prisma/client";
import crypto from "crypto";

// Resend webhook event types
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    // For bounced events
    bounce_type?: string;
    bounce_description?: string;
    // For clicked events
    link?: string;
    // For complained events
    complaint_type?: string;
  };
}

/**
 * Verifies the authenticity of a webhook payload using HMAC SHA-256 and a shared secret.
 *
 * @param payload - The raw webhook payload as a string
 * @param signature - The signature provided with the webhook request
 * @param secret - The shared secret used to compute the HMAC
 * @returns True if the computed signature matches the provided signature; otherwise, false
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Handles POST requests for Resend webhook events, updating email recipient and campaign records based on event type.
 *
 * Verifies the webhook signature if a secret is configured, parses the event payload, and processes events such as sent, delivered, bounced, complained, opened, and clicked. Updates recipient status, campaign counters, and member subscription or email validity as appropriate. Returns a JSON response indicating receipt or an error status if processing fails.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const rawBody = await request.text();
    
    // Get headers
    const headersList = await headers();
    const signature = headersList.get("resend-signature");
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }
    
    // Parse the webhook event
    const event: ResendWebhookEvent = JSON.parse(rawBody);
    console.log(`Received Resend webhook: ${event.type}`, event.data.email_id);
    
    // Handle different event types
    switch (event.type) {
      case 'email.sent':
        // Update recipient status to SENT
        await prisma.emailRecipient.updateMany({
          where: { resendEmailId: event.data.email_id },
          data: {
            status: 'SENT' as RecipientStatus,
            sentAt: new Date(event.created_at),
          },
        });
        break;
        
      case 'email.delivered':
        // Update recipient status to DELIVERED
        console.log(`Looking for recipient with resendEmailId: ${event.data.email_id}`);
        
        const deliveredRecipient = await prisma.emailRecipient.findFirst({
          where: { resendEmailId: event.data.email_id },
          select: { campaignId: true, status: true },
        });
        
        if (!deliveredRecipient) {
          console.log(`No recipient found for email ID: ${event.data.email_id}`);
          // Let's check if any recipients exist with this email
          const recipientByEmail = await prisma.emailRecipient.findFirst({
            where: { email: event.data.to[0] },
            select: { 
              id: true, 
              campaignId: true, 
              resendEmailId: true,
              status: true,
              email: true
            },
          });
          if (recipientByEmail) {
            console.log('Found recipient by email:', {
              email: recipientByEmail.email,
              resendEmailId: recipientByEmail.resendEmailId,
              status: recipientByEmail.status,
              campaignId: recipientByEmail.campaignId
            });
          }
        }
        
        if (deliveredRecipient && deliveredRecipient.status !== 'DELIVERED') {
          await prisma.emailRecipient.updateMany({
            where: { resendEmailId: event.data.email_id },
            data: {
              status: 'DELIVERED' as RecipientStatus,
              deliveredAt: new Date(event.created_at),
            },
          });
          
          // Update campaign delivered count
          await prisma.emailCampaign.update({
            where: { id: deliveredRecipient.campaignId },
            data: {
              deliveredCount: { increment: 1 },
            },
          });
        }
        break;
        
      case 'email.bounced':
        // Update recipient status to BOUNCED
        const bouncedRecipient = await prisma.emailRecipient.findFirst({
          where: { resendEmailId: event.data.email_id },
          select: { 
            campaignId: true, 
            memberId: true,
            status: true,
          },
        });
        
        if (bouncedRecipient && bouncedRecipient.status !== 'BOUNCED') {
          // Update recipient status
          await prisma.emailRecipient.updateMany({
            where: { resendEmailId: event.data.email_id },
            data: {
              status: 'BOUNCED' as RecipientStatus,
              bouncedAt: new Date(event.created_at),
              bounceReason: `${event.data.bounce_type}: ${event.data.bounce_description}`,
            },
          });
          
          // Update campaign bounce count
          await prisma.emailCampaign.update({
            where: { id: bouncedRecipient.campaignId },
            data: {
              bouncedCount: { increment: 1 },
            },
          });

          // Configuration constants
          const BOUNCE_THRESHOLD = parseInt(process.env.EMAIL_BOUNCE_THRESHOLD || '3');
          const HARD_BOUNCE_UNSUBSCRIBE = process.env.HARD_BOUNCE_UNSUBSCRIBE !== 'false';
          
          // Update member's email preference bounce count
          const emailPreference = await prisma.emailPreference.findUnique({
            where: { memberId: bouncedRecipient.memberId },
          });

          if (emailPreference) {
            const newBounceCount = emailPreference.bounceCount + 1;
            await prisma.emailPreference.update({
              where: { memberId: bouncedRecipient.memberId },
              data: {
                bounceCount: newBounceCount,
                lastBouncedAt: new Date(event.created_at),
                // Mark email as invalid if it bounces too many times
                isEmailValid: newBounceCount < BOUNCE_THRESHOLD,
                // Unsubscribe if hard bounce or too many bounces
                isSubscribed: (event.data.bounce_type === 'hard' && HARD_BOUNCE_UNSUBSCRIBE)
                  ? false
                  : (newBounceCount < BOUNCE_THRESHOLD),
              },
            });
          }
        }
        break;
        
      case 'email.complained':
        // Handle spam complaints - immediately unsubscribe
        const complainedRecipient = await prisma.emailRecipient.findFirst({
          where: { resendEmailId: event.data.email_id },
          select: { memberId: true },
        });
        
        if (complainedRecipient) {
          // Unsubscribe the member who complained
          await prisma.emailPreference.updateMany({
            where: { memberId: complainedRecipient.memberId },
            data: {
              isSubscribed: false,
              unsubscribedAt: new Date(event.created_at),
            },
          });
          
          // Log the complaint
          console.warn(`Spam complaint received for member ${complainedRecipient.memberId}`);
        }
        break;
        
      case 'email.opened':
        // Optional: Track email opens if needed in the future
        console.log(`Email opened: ${event.data.email_id}`);
        break;
        
      case 'email.clicked':
        // Optional: Track link clicks if needed in the future
        console.log(`Link clicked in email ${event.data.email_id}: ${event.data.link}`);
        break;
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}