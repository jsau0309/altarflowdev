import { Resend } from 'resend';
import { prisma, withRetryTransaction } from '@/lib/db';
import { format } from 'date-fns';
import { EmailStatus, RecipientStatus } from '@prisma/client';
import { getQuotaLimit } from '@/lib/subscription-helpers';
import { sanitizeEmailHtml, sanitizeEmailSubject } from './sanitize-html';
import { validateEmail } from './validate-email';
import { serverEnv } from '@/lib/env';
import { randomUUID } from 'crypto';

// Initialize Resend client
const resend = new Resend(serverEnv.RESEND_API_KEY);

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
  private static FROM_EMAIL = serverEnv.RESEND_FROM_EMAIL;


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
          id: randomUUID(),
          churchId,
          monthYear,
          quotaLimit,
          updatedAt: new Date(),
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

      // Optimized atomic quota check and reservation using withRetryTransaction
      quotaReservation = await withRetryTransaction(async (tx) => {
        // Get or create quota with optimized query
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
              id: randomUUID(),
              churchId,
              monthYear,
              quotaLimit,
              emailsSent: 0,
              updatedAt: new Date(),
            },
          });
        }

        // Check if we have quota available
        if (quota.emailsSent >= quota.quotaLimit) {
          throw new Error(`Campaign quota exceeded. You have sent ${quota.emailsSent} of ${quota.quotaLimit} campaigns this month.`);
        }

        // Execute quota reservation and campaign status update in parallel
        const [updatedQuota] = await Promise.all([
          tx.emailQuota.update({
            where: { id: quota.id },
            data: {
              emailsSent: {
                increment: 1,
              },
            },
          }),
          tx.emailCampaign.update({
            where: { id: campaignId },
            data: {
              status: 'SENDING' as EmailStatus,
            },
          }),
        ]);

        console.log(`Campaign quota reserved: ${updatedQuota.emailsSent} of ${updatedQuota.quotaLimit} campaigns used`);
        
        return { quota: updatedQuota, quotaId: quota.id };
      });

      // Optimized batch sending with improved performance
      const batchSize = 100; // Resend recommends batches of 100
      const results = [];
      const emailCount = emails.length;
      
      // Pre-validate all emails to avoid processing invalid ones
      const validEmails = emails.filter(email => {
        const validation = validateEmail(email.to);
        if (!validation.isValid) {
          console.error(`Skipping invalid email: ${email.to} - ${validation.reason}`);
          return false;
        }
        return true;
      });
      
      console.log(`Processing ${validEmails.length} valid emails out of ${emails.length} total`);
      
      // Pre-process all email content for faster batch sending
      const processedEmails = validEmails.map(email => {
        const sanitizedHtml = sanitizeEmailHtml(email.html);
        const sanitizedSubject = sanitizeEmailSubject(email.subject);
        const plainText = sanitizedHtml
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        return {
          ...email,
          sanitizedHtml,
          sanitizedSubject,
          plainText,
        };
      });

      // Send emails in optimized batches
      for (let i = 0; i < processedEmails.length; i += batchSize) {
        const batch = processedEmails.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize + 1);
        console.log(`Processing batch ${batchNumber}/${Math.ceil(processedEmails.length / batchSize)}, emails: ${batch.length}`);
        
        // Build batch payload efficiently
        const batchPayload = batch.map((email, index) => ({
          from: from || this.FROM_EMAIL,
          to: email.to,
          subject: email.sanitizedSubject,
          html: email.sanitizedHtml,
          text: email.plainText,
          tags: [
            { name: 'church_id', value: churchId.replace(/[^a-zA-Z0-9_-]/g, '_') },
            { name: 'campaign_id', value: campaignId.replace(/[^a-zA-Z0-9_-]/g, '_') },
            { name: 'batch', value: batchNumber.toString() },
            { name: 'batch_index', value: index.toString() },
          ],
        }));

        const batchResponse = await resend.batch.send(batchPayload);

        if (batchResponse.error) {
          throw new Error(`Batch ${batchNumber} failed: ${batchResponse.error.message}`);
        }

        // Process batch response efficiently
        if (batchResponse.data) {
          const batchResults = 'data' in batchResponse.data ? (batchResponse.data as any).data : batchResponse.data;
          
          if (Array.isArray(batchResults)) {
            results.push(...batchResults);
            
            // Batch update all recipients at once instead of one by one (MAJOR PERFORMANCE IMPROVEMENT)
            const recipientUpdates: Array<{
              email: string;
              resendEmailId: string;
              sentAt: Date;
            }> = [];
            const currentTime = new Date();
            
            for (let index = 0; index < Math.min(batch.length, batchResults.length); index++) {
              const email = batch[index];
              const result = batchResults[index];
              
              if (result && 'id' in result) {
                const recipientEmail = Array.isArray(email.to) ? email.to[0] : email.to;
                recipientUpdates.push({
                  email: recipientEmail,
                  resendEmailId: result.id,
                  sentAt: currentTime,
                });
              }
            }
            
            // Execute all recipient updates in a single transaction (HUGE PERFORMANCE GAIN)
            if (recipientUpdates.length > 0) {
              await withRetryTransaction(async (tx) => {
                const updatePromises = recipientUpdates.map(update => 
                  tx.emailRecipient.updateMany({
                    where: {
                      campaignId,
                      email: update.email,
                    },
                    data: {
                      status: 'SENT' as RecipientStatus,
                      sentAt: update.sentAt,
                      resendEmailId: update.resendEmailId,
                    },
                  })
                );
                
                await Promise.all(updatePromises);
              });
              
              console.log(`Batch ${batchNumber}: Updated ${recipientUpdates.length} recipients`);
            }
          }
        }
      }

      // Update campaign status to SENT with retry logic
      await withRetryTransaction(async (tx) => {
        await tx.emailCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'SENT' as EmailStatus,
            sentAt: new Date(),
            sentCount: emailCount,
          },
        });
      });

      console.log('=== sendBulkEmails SUCCESS ===');
      console.log('Total emails sent:', emailCount);
      console.log('Results count:', results.length);

      return { success: true, sentCount: emailCount, results };
    } catch (error) {
      console.error('=== sendBulkEmails ERROR ===');
      console.error('Error sending bulk emails:', error);
      
      // If we reserved quota but failed to send, rollback the reservation
      if (quotaReservation?.quotaId && params.campaignId) {
        const quotaId = quotaReservation.quotaId;
        try {
          await withRetryTransaction(async (tx) => {
            // Execute rollback operations in parallel for better performance
            await Promise.all([
              tx.emailQuota.update({
                where: { id: quotaId },
                data: {
                  emailsSent: {
                    decrement: 1,
                  },
                },
              }),
              tx.emailCampaign.update({
                where: { id: params.campaignId },
                data: {
                  status: 'FAILED' as EmailStatus,
                },
              }),
            ]);
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