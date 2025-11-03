import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetryTransaction } from '@/lib/db';
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

    // Get campaign with recipients and their members in a single optimized query
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: id,
        churchId: church.id,
      },
      include: {
        EmailRecipient: {
          select: {
            id: true,
            email: true,
            memberId: true,
            status: true,
            Member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
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
    if (campaign.EmailRecipient.length === 0) {
      return NextResponse.json(
        { error: "Campaign has no recipients" },
        { status: 400 }
      );
    }

    // Optimize email preparation with efficient batch operations
    const preferencesMap = await withRetryTransaction(async (tx) => {
      // Update campaign status to SENDING in parallel with preference queries
      const [, existingPreferences] = await Promise.all([
        tx.emailCampaign.update({
          where: { id: id },
          data: {
            status: "SENDING",
            totalRecipients: campaign.EmailRecipient.length,
          },
        }),
        // Fix N+1 query: Get all email preferences in one optimized query
        tx.emailPreference.findMany({
          where: {
            memberId: { in: campaign.EmailRecipient.map(r => r.memberId) }
          },
          select: {
            id: true,
            memberId: true,
            email: true,
            isSubscribed: true,
            isEmailValid: true,
            unsubscribeToken: true,
          },
        }),
      ]);

      // Create efficient lookup map
      const preferencesMap = new Map(
        existingPreferences.map(pref => [pref.memberId, pref])
      );

      // Batch create missing email preferences efficiently
      const recipientsNeedingPreferences = campaign.EmailRecipient.filter(
        recipient => !preferencesMap.has(recipient.memberId)
      );

      if (recipientsNeedingPreferences.length > 0) {
        // Use createMany for bulk insert (much faster than individual creates)
        const { v4: uuidv4 } = require('uuid');
        await tx.emailPreference.createMany({
          data: recipientsNeedingPreferences.map(recipient => ({
            memberId: recipient.memberId,
            email: recipient.email,
            isSubscribed: true,
            unsubscribeToken: uuidv4(),
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        });

        // Efficiently fetch newly created preferences
        const createdPreferences = await tx.emailPreference.findMany({
          where: {
            memberId: { in: recipientsNeedingPreferences.map(r => r.memberId) }
          },
          select: {
            id: true,
            memberId: true,
            email: true,
            isSubscribed: true,
            isEmailValid: true,
            unsubscribeToken: true,
          },
        });

        // Add to lookup map
        createdPreferences.forEach(pref => {
          preferencesMap.set(pref.memberId, pref);
        });
      }

      return preferencesMap;
    });

    // Optimize email preparation with bulk processing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';
    const baseHtml = campaign.htmlContent || "";
    
    // Pre-process HTML template with preview text (do once instead of per email)
    let processedHtml = baseHtml;
    if (campaign.previewText) {
      const escapedPreviewText = escapeHtml(campaign.previewText);
      const hiddenPreviewText = `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapedPreviewText}</div>`;
      processedHtml = hiddenPreviewText + processedHtml;
    }

    // Pre-generate church footer template
    const churchFooterTemplate = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0 0 8px 0;">
          <strong>${escapeHtml(church.name)}</strong>
        </p>
        ${church.address ? `<p style="margin: 0 0 8px 0;">${escapeHtml(church.address)}</p>` : ''}
        <p style="margin: 0;">
          <a href="{{UNSUBSCRIBE_URL}}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `;

    // Bulk process recipients (much faster than individual processing)
    const emailsToSend: EmailToSend[] = [];
    const unsubscribedRecipients: string[] = [];
    const invalidEmailRecipients: InvalidEmailRecipient[] = [];

    // Process all recipients in parallel batches for better performance
    const processBatch = (recipients: typeof campaign.EmailRecipient) => {
      const batch = {
        emails: [] as EmailToSend[],
        unsubscribed: [] as string[],
        invalid: [] as InvalidEmailRecipient[],
      };

      for (const recipient of recipients) {
        // Fast email validation
        const emailValidation = validateEmail(recipient.email);
        if (!emailValidation.isValid) {
          batch.invalid.push({
            recipientId: recipient.id,
            email: recipient.email,
            reason: emailValidation.reason,
          });
          continue;
        }

        // O(1) lookup from our pre-built map
        const emailPreference = preferencesMap.get(recipient.memberId);
        if (!emailPreference) {
          console.error(`Email preference not found for member ${recipient.memberId}`);
          continue;
        }

        // Fast unsubscribe check
        if (!emailPreference.isSubscribed) {
          batch.unsubscribed.push(recipient.id);
          continue;
        }

        // Fast HTML processing with template replacement
        const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${escapeUrl(emailPreference.unsubscribeToken)}`;
        const finalFooter = churchFooterTemplate.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl);
        
        let finalHtml = processedHtml;
        if (finalHtml.includes('</body>')) {
          finalHtml = finalHtml.replace('</body>', `${finalFooter}</body>`);
        } else {
          finalHtml += finalFooter;
        }
        
        batch.emails.push({
          to: emailValidation.email,
          subject: campaign.subject,
          html: finalHtml,
        });
      }

      return batch;
    };

    // Process recipients (could be parallelized further if needed)
    const result = processBatch(campaign.EmailRecipient);
    emailsToSend.push(...result.emails);
    unsubscribedRecipients.push(...result.unsubscribed);
    invalidEmailRecipients.push(...result.invalid);

    // Optimized batch updates with parallel execution
    if (unsubscribedRecipients.length > 0 || invalidEmailRecipients.length > 0) {
      await withRetryTransaction(async (tx) => {
        const updates: Promise<unknown>[] = [];

        // Batch update unsubscribed recipients
        if (unsubscribedRecipients.length > 0) {
          updates.push(
            tx.emailRecipient.updateMany({
              where: {
                id: { in: unsubscribedRecipients },
              },
              data: {
                status: "UNSUBSCRIBED",
                unsubscribedAt: new Date(),
              },
            })
          );
        }

        // Batch update invalid email recipients
        if (invalidEmailRecipients.length > 0) {
          const invalidRecipientIds = invalidEmailRecipients.map(r => r.recipientId);
          const invalidMemberIds = campaign.EmailRecipient
            .filter(r => invalidEmailRecipients.some(ir => ir.recipientId === r.id))
            .map(r => r.memberId);

          updates.push(
            tx.emailRecipient.updateMany({
              where: {
                id: { in: invalidRecipientIds },
              },
              data: {
                status: "FAILED",
                failureReason: "Invalid email address",
              },
            })
          );

          // Update email preferences to mark emails as invalid
          if (invalidMemberIds.length > 0) {
            updates.push(
              tx.emailPreference.updateMany({
                where: {
                  memberId: { in: invalidMemberIds },
                },
                data: {
                  isEmailValid: false,
                },
              })
            );
          }
        }

        // Execute all updates in parallel for better performance
        await Promise.all(updates);
      });
    }

    // Early return optimization for zero-send campaigns
    if (emailsToSend.length === 0) {
      // Use withRetry for this database operation
      await withRetryTransaction(async (tx) => {
        await tx.emailCampaign.update({
          where: { id: id },
          data: {
            status: "SENT",
            unsubscribedCount: unsubscribedRecipients.length,
          },
        });
      });

      return NextResponse.json({
        success: true,
        sentCount: 0,
        unsubscribedCount: unsubscribedRecipients.length,
        invalidEmailCount: invalidEmailRecipients.length,
        message: "No valid recipients to send to",
      });
    }

    try {
      // Send emails with optimized bulk processing
      console.log(`Starting bulk email send for ${emailsToSend.length} recipients`);
      const startTime = Date.now();
      
      const result = await ResendEmailService.sendBulkEmails({
        emails: emailsToSend,
        churchId: church.id,
        campaignId: campaign.id,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`Bulk email send completed in ${duration}ms (${(duration / emailsToSend.length).toFixed(2)}ms per email)`);

      return NextResponse.json({
        success: true,
        sentCount: result.sentCount,
        campaignId: campaign.id,
        unsubscribedCount: unsubscribedRecipients.length,
        invalidEmailCount: invalidEmailRecipients.length,
        processingTimeMs: duration,
      });
    } catch (emailError) {
      // If email sending fails, update campaign status with retry logic
      console.error('Email sending failed:', emailError);
      
      await withRetryTransaction(async (tx) => {
        await tx.emailCampaign.update({
          where: { id: id },
          data: {
            status: "FAILED",
          },
        });
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