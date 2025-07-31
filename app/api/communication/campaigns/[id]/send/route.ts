import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ResendEmailService } from "@/lib/email/resend-service";

/**
 * Handles sending an email campaign to its recipients.
 *
 * Authenticates the user and organization, retrieves the specified campaign and its recipients, and ensures the campaign is eligible to be sent. Filters out unsubscribed recipients, prepares personalized email content with unsubscribe links, and sends emails in bulk. Updates campaign and recipient statuses accordingly and returns a JSON response indicating the result.
 *
 * @returns A JSON response with the outcome of the send operation, including sent and unsubscribed counts, or an error message with appropriate HTTP status.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church data including address
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { 
        id: true, 
        name: true,
        address: true,
      },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Get campaign with recipients and their members
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: id,
        churchId: church.id,
      },
      include: {
        recipients: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Check campaign status
    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Campaign has already been sent or is being processed" },
        { status: 400 }
      );
    }

    // Check if campaign has recipients
    if (campaign.recipients.length === 0) {
      return NextResponse.json(
        { error: "Campaign has no recipients" },
        { status: 400 }
      );
    }

    // Update campaign status to SENDING
    await prisma.emailCampaign.update({
      where: { id: id },
      data: {
        status: "SENDING",
        totalRecipients: campaign.recipients.length,
      },
    });

    // Filter recipients and prepare emails for bulk sending
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

      // Add unsubscribe footer with church address
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${emailPreference.unsubscribeToken}`;
      
      const unsubscribeFooter = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0 0 8px 0;">
            <strong>${church.name}</strong>
          </p>
          ${church.address ? `<p style="margin: 0 0 8px 0;">${church.address}</p>` : ''}
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

    // Check if we have any emails to send
    if (emailsToSend.length === 0) {
      await prisma.emailCampaign.update({
        where: { id: id },
        data: {
          status: "SENT",
          unsubscribedCount: unsubscribedRecipients.length,
        },
      });

      return NextResponse.json({
        success: true,
        sentCount: 0,
        unsubscribedCount: unsubscribedRecipients.length,
        message: "All recipients have unsubscribed",
      });
    }

    try {
      // Send emails
      const result = await ResendEmailService.sendBulkEmails({
        emails: emailsToSend,
        churchId: church.id,
        campaignId: campaign.id,
      });

      return NextResponse.json({
        success: true,
        sentCount: result.sentCount,
        campaignId: campaign.id,
      });
    } catch (emailError) {
      // If email sending fails, update campaign status
      await prisma.emailCampaign.update({
        where: { id: id },
        data: {
          status: "FAILED",
        },
      });

      throw emailError;
    }
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to send campaign",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}