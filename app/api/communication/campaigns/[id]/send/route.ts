import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';
import { ResendEmailService } from "@/lib/email/resend-service";
import { validateEmail } from "@/lib/email/validate-email";
import { escapeHtml, escapeUrl } from "@/lib/email/escape-html";

// Type definitions
interface InvalidEmailRecipient {
  recipientId: string;
  email: string;
  reason: string | undefined;
}

interface EmailToSend {
  to: string;
  subject: string;
  html: string;
}

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

    // Check if user is admin or staff
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const emailsToSend: EmailToSend[] = [];
    const unsubscribedRecipients: string[] = [];
    const invalidEmailRecipients: InvalidEmailRecipient[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';

    for (const recipient of campaign.recipients) {
      // Validate email address
      const emailValidation = validateEmail(recipient.email);
      if (!emailValidation.isValid) {
        console.log(`Invalid email for recipient ${recipient.memberId}: ${recipient.email} - ${emailValidation.reason}`);
        invalidEmailRecipients.push({
          recipientId: recipient.id,
          email: recipient.email,
          reason: emailValidation.reason,
        });
        continue;
      }
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
        const escapedPreviewText = escapeHtml(campaign.previewText);
        const hiddenPreviewText = `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapedPreviewText}</div>`;
        html = hiddenPreviewText + html;
      }

      // Add unsubscribe footer with church address
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${escapeUrl(emailPreference.unsubscribeToken)}`;
      
      const unsubscribeFooter = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0 0 8px 0;">
            <strong>${escapeHtml(church.name)}</strong>
          </p>
          ${church.address ? `<p style="margin: 0 0 8px 0;">${escapeHtml(church.address)}</p>` : ''}
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
        to: emailValidation.email, // Use validated/normalized email
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

    // Update invalid email recipients
    if (invalidEmailRecipients.length > 0) {
      await prisma.emailRecipient.updateMany({
        where: {
          id: { in: invalidEmailRecipients.map(r => r.recipientId) },
        },
        data: {
          status: "FAILED",
          failureReason: "Invalid email address",
        },
      });

      // Update email preferences to mark emails as invalid
      const memberIds = campaign.recipients
        .filter(r => invalidEmailRecipients.some(ir => ir.recipientId === r.id))
        .map(r => r.memberId);
      
      await prisma.emailPreference.updateMany({
        where: {
          memberId: { in: memberIds },
        },
        data: {
          isEmailValid: false,
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
        unsubscribedCount: unsubscribedRecipients.length,
        invalidEmailCount: invalidEmailRecipients.length,
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