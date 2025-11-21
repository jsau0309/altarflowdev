import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { sanitizeEmailHtml, sanitizeEmailSubject } from './sanitize-html';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

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

export class ResendEmailService {
  private static FROM_EMAIL = serverEnv.RESEND_FROM_EMAIL;

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
      logger.error('Error sending email', { operation: 'email.send_error', churchId: params.churchId, subject: params.subject, recipient: Array.isArray(params.to) ? params.to[0] : params.to }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Error sending test email', { operation: 'email.send_test_error', to: params.to, subject: params.subject }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
