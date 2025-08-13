import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { ResendEmailService } from "@/lib/email/resend-service";

// This endpoint should be called by a cron job service (e.g., Vercel Cron, Railway, or external service)
// Recommended: Run every 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron job
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all campaigns that are scheduled and ready to send
    const now = new Date();
    const scheduledCampaigns = await prisma.emailCampaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: {
          lte: now, // Scheduled time has passed
        },
      },
      include: {
        recipients: {
          include: {
            member: true,
          },
        },
        church: true,
      },
    });

    console.log(`Found ${scheduledCampaigns.length} scheduled campaigns to send`);

    const results = [];

    for (const campaign of scheduledCampaigns) {
      try {
        // Update campaign status to SENDING
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            status: "SENDING",
            totalRecipients: campaign.recipients.length,
          },
        });

        // Filter recipients and prepare emails
        const emailsToSend = [];
        const unsubscribedRecipients = [];
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';

        for (const recipient of campaign.recipients) {
          // Get or create email preference
          let emailPreference = await prisma.emailPreference.findUnique({
            where: { memberId: recipient.memberId },
          });

          if (!emailPreference) {
            emailPreference = await prisma.emailPreference.create({
              data: {
                memberId: recipient.memberId,
                email: recipient.email,
                isSubscribed: true,
              },
            });
          }

          // Skip if unsubscribed
          if (!emailPreference.isSubscribed) {
            unsubscribedRecipients.push(recipient.id);
            continue;
          }

          let html = campaign.htmlContent || "";
          
          // Add preview text if provided
          if (campaign.previewText) {
            const hiddenPreviewText = `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${campaign.previewText}</div>`;
            html = hiddenPreviewText + html;
          }

          // Add unsubscribe footer
          const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${emailPreference.unsubscribeToken}`;
          
          const unsubscribeFooter = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0 0 8px 0;">
                <strong>${campaign.church.name}</strong>
              </p>
              ${campaign.church.address ? `<p style="margin: 0 0 8px 0;">${campaign.church.address}</p>` : ''}
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
              </p>
            </div>
          `;
          
          // Add unsubscribe footer to HTML
          html = html.replace('</body>', `${unsubscribeFooter}</body>`);
          if (!html.includes('</body>')) {
            html += unsubscribeFooter;
          }
          
          emailsToSend.push({
            to: recipient.email,
            subject: campaign.subject,
            html: html,
          });
        }

        // Update unsubscribed recipients
        if (unsubscribedRecipients.length > 0) {
          await prisma.emailRecipient.updateMany({
            where: {
              id: { in: unsubscribedRecipients },
            },
            data: {
              status: "UNSUBSCRIBED",
              unsubscribedAt: new Date(),
            },
          });
        }

        // Send emails if any
        if (emailsToSend.length > 0) {
          await ResendEmailService.sendBulkEmails({
            emails: emailsToSend,
            churchId: campaign.churchId,
            campaignId: campaign.id,
          });

          results.push({
            campaignId: campaign.id,
            subject: campaign.subject,
            recipientCount: emailsToSend.length,
            unsubscribedCount: unsubscribedRecipients.length,
            success: true,
          });
        } else {
          // No emails to send, just update status
          await prisma.emailCampaign.update({
            where: { id: campaign.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
              unsubscribedCount: unsubscribedRecipients.length,
            },
          });

          results.push({
            campaignId: campaign.id,
            subject: campaign.subject,
            recipientCount: 0,
            unsubscribedCount: unsubscribedRecipients.length,
            success: true,
            message: "All recipients were unsubscribed",
          });
        }
      } catch (error) {
        console.error(`Failed to send campaign ${campaign.id}:`, error);
        
        // Update campaign status to FAILED
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            status: "FAILED",
          },
        });

        results.push({
          campaignId: campaign.id,
          subject: campaign.subject,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: scheduledCampaigns.length,
      results,
    });
  } catch (error) {
    console.error("Error processing scheduled campaigns:", error);
    return NextResponse.json(
      { 
        error: "Failed to process scheduled campaigns",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}