import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { EmailStatus, RecipientStatus } from '@prisma/client';
import { getQuotaLimit } from '@/lib/subscription-helpers';
import { sanitizeEmailHtml, sanitizeEmailSubject } from './sanitize-html';
import { validateEmail } from './validate-email';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  churchId: string;
  campaignId?: string;
}

export interface SendBulkEmailParams {
  emails: {
    to: string;
    subject: string;
    html: string;
  }[];
  from?: string;
  churchId: string;
  campaignId: string;
}

export class ResendEmailService {
  private static FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AltarFlow <hello@altarflow.com>';


  /**
   * Get or create email quota for current month
   */
  private static async getOrCreateQuota(churchId: string) {
    const monthYear = format(new Date(), 'yyyy-MM');
    
    let quota = await prisma.emailQuota.findFirst({
      where: {
        churchId,
        monthYear,
      },
    });

    if (!quota) {
      // Get church subscription status
      const church = await prisma.church.findUnique({
        where: { id: churchId },
        select: { 
          subscriptionStatus: true,
          subscriptionPlan: true,
          subscriptionEndsAt: true,
        },
      });

      // Determine quota limit based on subscription status
      const quotaLimit = church ? getQuotaLimit(church) : 4;

      quota = await prisma.emailQuota.create({
        data: {
          churchId,
          monthYear,
          quotaLimit,
        },
      });
    }

    return quota;
  }

  /**
   * Send a single email
   */
  static async sendEmail(params: SendEmailParams) {
    try {
      const { to, subject, html, from, replyTo, tags = [], churchId, campaignId } = params;

      // Check church exists
      const church = await prisma.church.findUnique({
        where: { id: churchId },
        select: { id: true, name: true },
      });

      if (!church) {
        throw new Error('Church not found');
      }

      // Note: Single emails don't count against campaign quota
      // This is for transactional emails like password resets, etc.
      // Only campaign sends count against the quota

      // Sanitize HTML content to prevent XSS attacks
      const sanitizedHtml = sanitizeEmailHtml(html);
      const sanitizedSubject = sanitizeEmailSubject(subject);

      // Generate plain text from sanitized HTML
      const plainText = sanitizedHtml
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Send email via Resend
      const response = await resend.emails.send({
        from: from || this.FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject: sanitizedSubject,
        html: sanitizedHtml,
        text: plainText,
        replyTo: replyTo,
        tags: [
          ...tags,
          { name: 'church_id', value: churchId.replace(/[^a-zA-Z0-9_-]/g, '_') },
          { name: 'campaign_id', value: (campaignId || 'direct').replace(/[^a-zA-Z0-9_-]/g, '_') },
        ],
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Don't update quota for single emails - only campaigns count

      return { success: true, id: response.data?.id || '' };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails (for campaigns)
   */
  static async sendBulkEmails(params: SendBulkEmailParams) {
    console.log('=== sendBulkEmails START ===');
    console.log('Campaign ID:', params.campaignId);
    console.log('Email count:', params.emails.length);
    
    let quotaReservation: { quota: any; quotaId: string } | null = null;
    
    try {
      const { emails, from, churchId, campaignId } = params;

      // Check church exists
      const church = await prisma.church.findUnique({
        where: { id: churchId },
        select: { id: true, name: true },
      });

      if (!church) {
        throw new Error('Church not found');
      }

      // Perform atomic quota check and reservation using a transaction
      quotaReservation = await prisma.$transaction(async (tx) => {
        // Get or create quota with a lock to prevent concurrent modifications
        const monthYear = format(new Date(), 'yyyy-MM');
        let quota = await tx.emailQuota.findFirst({
          where: {
            churchId,
            monthYear,
          },
        });

        if (!quota) {
          // Get church subscription status
          const churchData = await tx.church.findUnique({
            where: { id: churchId },
            select: { 
              subscriptionStatus: true,
              subscriptionPlan: true,
              subscriptionEndsAt: true,
            },
          });

          // Determine quota limit based on subscription status
          const quotaLimit = churchData ? getQuotaLimit(churchData) : 4;

          quota = await tx.emailQuota.create({
            data: {
              churchId,
              monthYear,
              quotaLimit,
              emailsSent: 0,
            },
          });
        }

        // Check if we have quota available
        if (quota.emailsSent >= quota.quotaLimit) {
          throw new Error(`Campaign quota exceeded. You have sent ${quota.emailsSent} of ${quota.quotaLimit} campaigns this month.`);
        }

        // Reserve the quota by incrementing immediately
        const updatedQuota = await tx.emailQuota.update({
          where: { id: quota.id },
          data: {
            emailsSent: {
              increment: 1,
            },
          },
        });

        // Update campaign status to SENDING to prevent duplicate sends
        await tx.emailCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'SENDING' as EmailStatus,
          },
        });

        console.log(`Campaign quota reserved: ${updatedQuota.emailsSent} of ${updatedQuota.quotaLimit} campaigns used`);
        
        return { quota: updatedQuota, quotaId: quota.id };
      });

      // Send emails in batches via Resend
      const batchSize = 100; // Resend recommends batches of 100
      const results = [];
      const emailCount = emails.length;

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize + 1)}, emails: ${batch.length}`);
        
        // Validate emails in this batch
        const validBatch = batch.filter(email => {
          const validation = validateEmail(email.to);
          if (!validation.isValid) {
            console.error(`Skipping invalid email: ${email.to} - ${validation.reason}`);
            return false;
          }
          return true;
        });

        if (validBatch.length === 0) {
          console.log(`Batch ${Math.floor(i / batchSize + 1)} has no valid emails, skipping`);
          continue;
        }

        const batchResponse = await resend.batch.send(
          validBatch.map(email => {
            // Sanitize HTML content and subject to prevent XSS attacks
            const sanitizedHtml = sanitizeEmailHtml(email.html);
            const sanitizedSubject = sanitizeEmailSubject(email.subject);
            
            // Generate plain text from sanitized HTML
            const plainText = sanitizedHtml
              .replace(/<[^>]+>/g, '') // Remove HTML tags
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
            
            return {
              from: from || this.FROM_EMAIL,
              to: email.to,
              subject: sanitizedSubject,
              html: sanitizedHtml,
              text: plainText,
              tags: [
                { name: 'church_id', value: churchId.replace(/[^a-zA-Z0-9_-]/g, '_') },
                { name: 'campaign_id', value: campaignId.replace(/[^a-zA-Z0-9_-]/g, '_') },
                { name: 'batch', value: `${Math.floor(i / batchSize + 1)}` },
              ],
            };
          })
        );

        console.log('Batch response received:', {
          hasError: !!batchResponse.error,
          hasData: !!batchResponse.data,
          dataLength: batchResponse.data && Array.isArray(batchResponse.data) ? batchResponse.data.length : 0,
        });

        if (batchResponse.error) {
          throw new Error(batchResponse.error.message);
        }

        // Handle batch response
        if (batchResponse.data) {
          // The batch API returns a data property with an array
          const batchResults = 'data' in batchResponse.data ? (batchResponse.data as any).data : batchResponse.data;
          
          if (Array.isArray(batchResults)) {
            results.push(...batchResults);
            
            // Update recipient status
            for (let index = 0; index < batch.length; index++) {
              const email = batch[index];
              const result = batchResults[index];
              
              console.log(`Processing email ${index}:`, {
                to: email.to,
                resultType: result ? typeof result : 'null',
                hasId: result && 'id' in result,
                resultId: result && 'id' in result ? result.id : 'NO_ID',
              });
              
              if (result && 'id' in result) {
                // Update recipient as sent
                // Extract email address (email.to could be string or array)
                const recipientEmail = Array.isArray(email.to) ? email.to[0] : email.to;
                
                console.log(`Updating recipient: ${recipientEmail} with resendEmailId: ${result.id}`);
                
                const updateResult = await prisma.emailRecipient.updateMany({
                  where: {
                    campaignId,
                    email: recipientEmail,
                  },
                  data: {
                    status: 'SENT' as RecipientStatus,
                    sentAt: new Date(),
                    resendEmailId: result.id,
                  },
                });
                
                console.log(`Update result for ${recipientEmail}:`, {
                  count: updateResult.count,
                  campaignId,
                  resendEmailId: result.id,
                });
              }
            }
          }
        }
      }

      // Update campaign status to SENT
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'SENT' as EmailStatus,
          sentAt: new Date(),
          sentCount: emailCount,
        },
      });

      console.log('=== sendBulkEmails SUCCESS ===');
      console.log('Total emails sent:', emailCount);
      console.log('Results count:', results.length);

      return { success: true, sentCount: emailCount, results };
    } catch (error) {
      console.error('=== sendBulkEmails ERROR ===');
      console.error('Error sending bulk emails:', error);
      
      // If we reserved quota but failed to send, rollback the reservation
      if (quotaReservation && params.campaignId) {
        try {
          await prisma.$transaction(async (tx) => {
            // Rollback the quota increment
            await tx.emailQuota.update({
              where: { id: quotaReservation.quotaId },
              data: {
                emailsSent: {
                  decrement: 1,
                },
              },
            });
            
            // Update campaign status to failed
            await tx.emailCampaign.update({
              where: { id: params.campaignId },
              data: {
                status: 'FAILED' as EmailStatus,
              },
            });
          });
          
          console.log('Quota reservation rolled back due to send failure');
        } catch (rollbackError) {
          console.error('Failed to rollback quota reservation:', rollbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Send test email (doesn't count against quota)
   */
  static async sendTestEmail(params: {
    to: string;
    subject: string;
    html: string;
    churchName: string;
  }) {
    try {
      // Generate plain text from HTML
      const plainText = params.html
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      const response = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: params.to,
        subject: `[TEST] ${params.subject}`,
        html: params.html,
        text: plainText,
        tags: [
          { name: 'type', value: 'test' },
          { name: 'church_name', value: params.churchName.replace(/[^a-zA-Z0-9_-]/g, '_') },
        ],
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return { success: true, id: response.data?.id || '' };
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }

  /**
   * Get email statistics for a church
   */
  static async getEmailStats(churchId: string) {
    const monthYear = format(new Date(), 'yyyy-MM');
    
    const quota = await prisma.emailQuota.findFirst({
      where: {
        churchId,
        monthYear,
      },
    });

    const campaigns = await prisma.emailCampaign.findMany({
      where: {
        churchId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      select: {
        sentCount: true,
        deliveredCount: true,
        bouncedCount: true,
      },
    });

    const stats = campaigns.reduce(
      (acc, campaign) => ({
        sent: acc.sent + campaign.sentCount,
        delivered: acc.delivered + campaign.deliveredCount,
        bounced: acc.bounced + campaign.bouncedCount,
      }),
      { sent: 0, delivered: 0, bounced: 0 }
    );

    // Count campaigns sent this month
    const campaignsSentThisMonth = await prisma.emailCampaign.count({
      where: {
        churchId,
        status: { in: ['SENT', 'SENDING'] },
        sentAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
    });

    return {
      ...stats,
      quota: {
        used: campaignsSentThisMonth,
        limit: quota?.quotaLimit || 4,
        remaining: (quota?.quotaLimit || 4) - campaignsSentThisMonth,
      },
    };
  }

  // Webhook handling has been moved to /api/webhooks/resend/route.ts
  // This provides better separation of concerns and proper webhook verification
}