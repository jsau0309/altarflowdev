"use server";

import { prisma } from "@/lib/db";
import { auth } from '@clerk/nextjs/server';
import { FormConfiguration, defaultSettings } from "@/components/member-form/types"; // Adjust path if necessary
import { FlowType, Prisma } from '@prisma/client'; // Import Prisma namespace for Prisma.JsonObject and FlowType
import { authorizeChurchAccess } from '@/lib/auth/authorize-church-access';
import type { ServiceTime, Ministry, LifeStage, RelationshipStatus } from '../../components/member-form/types'; // Ensure MemberFormData is imported if used
import { Resend } from 'resend'; // Import Resend
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getEmailDomain } from '@/lib/logger/middleware';
import { generateNewMemberWelcomeHtml, NewMemberWelcomeData } from '@/lib/email/templates/new-member-welcome';
import { generatePrayerRequestNotificationHtml, PrayerRequestNotificationData } from '@/lib/email/templates/prayer-request-notification';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Zod schema for submitFlow input validation
const SubmitFlowInputSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    email: z.string().email('Invalid email format').max(255).transform(val => val.toLowerCase().trim()),
    phone: z.string().min(1, 'Phone is required').max(30),
    relationshipStatus: z.enum(['visitor', 'regular', 'member']),
    smsConsent: z.boolean().optional(),
    language: z.string().min(1).max(10),
    serviceTimes: z.array(z.string()).optional(),
    interestedMinistries: z.array(z.string()).optional(),
    lifeStage: z.enum(['child', 'teen', 'young_adult', 'adult', 'senior']).optional(),
    referralSource: z.string().max(255).optional(),
    prayerRequested: z.boolean().optional(),
    prayerRequest: z.string().max(2000).optional(),
});

// Helper to sanitize church name for email headers (prevent header injection)
function sanitizeForEmailHeader(value: string): string {
    return value.replace(/[\r\n\t]/g, ' ').substring(0, 100).trim();
}

// Define the specific input type expected by the submitFlow action
// Based on the Zod schema in ConnectForm.tsx
interface SubmitFlowInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string; // Required now
    relationshipStatus: RelationshipStatus;
    smsConsent?: boolean; // Add optional consent flag
    language: string;    // Add language
    // Include optional fields that might be passed
    serviceTimes?: string[];
    interestedMinistries?: string[];
    lifeStage?: LifeStage;
    referralSource?: string;
    prayerRequested?: boolean;
    prayerRequest?: string;
}

// --- Helper function to send welcome email ---
// Define types for service times and ministries if not already globally available
// Assuming they are similar to what's in '../../components/member-form/types'
interface EmailServiceTime {
    day: string;
    time: string;
    // isActive is used for filtering before passing, so not strictly needed here
}

interface EmailMinistry {
    name: string;
    // isActive is used for filtering before passing
}

async function sendWelcomeEmail(
    recipientEmail: string,
    firstName: string,
    churchName: string,
    language: string, // Added language parameter
    churchLogoUrl?: string, 
    serviceTimes?: EmailServiceTime[],
    ministries?: EmailMinistry[],
    churchEmail?: string,
    churchPhone?: string,
    churchAddress?: string
): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        logger.error('RESEND_API_KEY missing in environment. Cannot send email.', { operation: 'flows.email.error' });
        return;
    }
    if (!process.env.YOUR_VERIFIED_RESEND_DOMAIN) {
        logger.error('YOUR_VERIFIED_RESEND_DOMAIN missing in environment. Cannot send email.', { operation: 'flows.email.error' });
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Prepare email data
    const emailData: NewMemberWelcomeData = {
        firstName,
        churchName,
        churchLogoUrl,
        churchEmail: churchEmail || '',
        churchPhone: churchPhone || '',
        churchAddress: churchAddress || '',
        serviceTimes,
        ministries,
        language: (language === 'es' ? 'es' : 'en')
    };

    // Generate email HTML using the template
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';
    const emailHtmlBody = generateNewMemberWelcomeHtml(emailData, appUrl);

    // Subject based on language (sanitize churchName to prevent header injection)
    const sanitizedChurchName = sanitizeForEmailHeader(churchName);
    const subjectText = language === 'es' ? `¡Bienvenido(a) a ${sanitizedChurchName}!` : `Welcome to ${sanitizedChurchName}!`;

    try {
        logger.info(`Attempting to send welcome email to ${getEmailDomain(recipientEmail)} for ${churchName} in ${language}.`, { operation: 'flows.email.info' });
        const { error } = await resend.emails.send({
            from: `${sanitizeForEmailHeader(churchName)} <notifications@${process.env.YOUR_VERIFIED_RESEND_DOMAIN}>`,
            to: recipientEmail,
            subject: subjectText,
            html: emailHtmlBody,
        });

        if (error) {
            logger.error(`Failed to send welcome email to ${getEmailDomain(recipientEmail)}:`, { operation: 'flows.email.error' }, error instanceof Error ? error : new Error(String(error)));
            return; 
        }

        logger.info(`Welcome email sent successfully to ${getEmailDomain(recipientEmail)}.`, { operation: 'flows.email.info' });

    } catch (exception) {
        logger.error(`Exception during sending welcome email to ${getEmailDomain(recipientEmail)}:`, { operation: 'flows.email.error' }, exception instanceof Error ? exception : new Error(String(exception)));
        // Optionally, re-throw or handle more gracefully
    }
}


/**
 * Fetches the configuration for a specific flow type 
 * associated with the active organization.
 * Returns default settings with empty lists if no configuration is found.
 * @param flowType - The type of flow to fetch configuration for (defaults to NEW_MEMBER).
 */
export async function getFlowConfiguration(
    flowType: FlowType = FlowType.NEW_MEMBER
): Promise<Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'> & { slug: string | null }> { 
    const { userId, orgId } = await auth();

    if (!userId) {
        logger.error('getFlowConfiguration Auth Error: No Clerk userId found.', { operation: 'flows.auth.error' });
        throw new Error("Unauthorized");
    }
    if (!orgId) {
        logger.error('User has no active organization selected.', { operation: 'flows.auth.no_org', userId });
        throw new Error("No active organization selected."); 
    }

    try {
        const flow = await prisma.flow.findFirst({
            where: {
                type: flowType,
                Church: {
                    clerkOrgId: orgId
                }
             },
            select: {
                id: true,
                configJson: true,
                slug: true
            },
        });

        if (!flow) {
             logger.warn(`No ${flowType} flow found for orgId ${orgId}. Returning default settings with empty lists.`, { operation: 'flows.config.warn' });
             return {
                serviceTimes: [], 
                ministries: [],   
                settings: defaultSettings,
                slug: null
            };
        }
        
        if (!flow.configJson || typeof flow.configJson !== 'object' || flow.configJson === null) {
            logger.warn(`Valid configJson not found for ${flowType} flow (ID: ${flow.id}) for orgId ${orgId}. Returning default settings with empty lists.`, { operation: 'flows.config.warn' });
             return {
                serviceTimes: [],
                ministries: [],
                settings: defaultSettings,
                slug: flow.slug
            };
        }

        const configData = flow.configJson as Prisma.JsonObject;
        const serviceTimes = Array.isArray(configData?.serviceTimes) ? configData.serviceTimes : [];
        const ministries = Array.isArray(configData?.ministries) ? configData.ministries : [];
        const currentSettings = (typeof configData?.settings === 'object' && configData.settings !== null)
                                ? configData.settings : {};
        const settings = { ...defaultSettings, ...currentSettings };

        return {
            serviceTimes: serviceTimes as unknown as ServiceTime[],
            ministries: ministries as unknown as Ministry[],
            settings: settings,
            slug: flow.slug
        };

    } catch (error) {
        logger.error(`Error fetching ${flowType} configuration for org ${orgId}:`, { operation: 'flows.error' }, error instanceof Error ? error : new Error(String(error)));
        if (error instanceof Error) {
             throw new Error(`Failed to fetch ${flowType} configuration: ${error.message}`);
        }
        throw new Error(`Failed to fetch ${flowType} configuration.`);
    }
}

/**
 * Saves (creates or updates) the configuration for a specific flow type 
 * for the active organization.
 */
export async function saveFlowConfiguration(
    flowType: FlowType,
    config: Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'> 
): Promise<{ success: boolean; message?: string; slug?: string }> {
    const { userId, orgId } = await auth();

    if (!userId) {
        logger.error('saveFlowConfiguration Auth Error: No Clerk userId found.', { operation: 'flows.auth.error' });
        return { success: false, message: "Unauthorized" };
    }
    if (!orgId) {
        logger.error('User has no active organization selected for saving config.', { operation: 'flows.auth.no_org', userId });
        return { success: false, message: "No active organization selected." };
    }

    let churchId: string;
    let churchSlug: string;
    try {
        const church = await prisma.church.findUniqueOrThrow({
            where: { clerkOrgId: orgId },
            select: { id: true, slug: true }
        });
        churchId = church.id;
        churchSlug = church.slug;
    } catch {
         logger.error(`saveFlowConfiguration Error: Church not found for orgId ${orgId}.`, { operation: 'flows.save_config.error' });
         return { success: false, message: "Associated church record not found." };
    }

    const configToSave = {
        serviceTimes: config.serviceTimes,
        ministries: config.ministries,
        settings: config.settings,
    };
    const flowName = `${flowType.charAt(0) + flowType.slice(1).toLowerCase().replace(/_/g, ' ')} Flow`;
    const flowSlug = churchSlug; // Use church slug as the default 

    try {
        const createdFlow = await prisma.flow.create({
            data: {
                churchId: churchId,
                type: flowType,
                name: flowName,
                slug: flowSlug,
                configJson: configToSave as unknown as Prisma.JsonObject,
                isEnabled: true,
                updatedAt: new Date(),
            },
            select: { id: true }
        });
        logger.info('Flow configuration created successfully', { operation: 'flows.save_config.created', flowType, orgId, flowId: createdFlow.id });
        return { success: true, slug: flowSlug };

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             logger.info('Create failed (P2002), attempting update', { operation: 'flows.save_config.p2002_retry', orgId, flowType });
             try {
                 const existingFlow = await prisma.flow.findFirstOrThrow({
                     where: { churchId: churchId, type: flowType },
                     select: { id: true }
                 });
                await prisma.flow.update({ // No need to assign to updatedFlow if not used
                    where: { id: existingFlow.id },
                    data: {
                        configJson: configToSave as unknown as Prisma.JsonObject,
                        name: flowName,
                        updatedAt: new Date(),
                    },
                });
                logger.info('Flow configuration updated successfully', { operation: 'flows.save_config.updated', flowType, orgId, flowId: existingFlow.id });
                return { success: true, slug: flowSlug };

            } catch (updateError) {
                 logger.error(`Error updating existing ${flowType} configuration for org ${orgId} after create failed:`, { operation: 'flows.update.error' }, updateError instanceof Error ? updateError : new Error(String(updateError)));
                 const target = (error.meta?.target as string[]) || [];
                 if (target.includes('slug')) {
                     logger.error(`Original P2002 likely due to Slug conflict for org ${orgId}. Slug: ${flowSlug}`, { operation: 'flows.slug_conflict.error' });
                     return { success: false, message: "Failed to generate unique URL for the flow. Please contact support." };
                 }
                 return { success: false, message: "Failed to update existing configuration after initial save attempt." };
            }
        } else {
             logger.error(`Error creating ${flowType} configuration for org ${orgId}:`, { operation: 'flows.error' }, error instanceof Error ? error : new Error(String(error)));
             return {
                 success: false,
                 message: error instanceof Error ? error.message : "Failed to save configuration."
             };
        }
    }
}

/**
 * Fetches the publicly accessible configuration for a specific flow by its slug.
 */
export async function getPublicFlowBySlug(slug: string): Promise<{
    id: string;
    churchId: string;
    configJson: Prisma.JsonValue;
    churchName: string;
    name: string;
} | null> {
    if (!slug) {
        logger.debug('getPublicFlowBySlug: No slug provided.', { operation: 'flows.public.debug' });
        return null;
    }
    try {
        // First try to find by customSlug, then fall back to slug
        let flow = await prisma.flow.findFirst({
            where: {
                customSlug: slug,
                isEnabled: true
            },
            select: {
                id: true,
                churchId: true,
                configJson: true,
                name: true,
                Church: { select: { name: true } }
            },
        });

        // If not found by customSlug, try the regular slug
        if (!flow) {
            flow = await prisma.flow.findUnique({
                where: { slug: slug, isEnabled: true },
                select: {
                    id: true,
                    churchId: true,
                    configJson: true,
                    name: true,
                    Church: { select: { name: true } }
                },
            });
        }

        if (!flow) {
            logger.debug('getPublicFlowBySlug: Flow not found or not enabled for', { operation: 'flows.public.debug', slug });
            return null;
        }
        if (!flow.Church) {
            logger.error(`getPublicFlowBySlug: Flow ${flow.id} found, but related church is missing for`, { operation: 'flows.public.error', slug });
            return null;
        }
        return {
            id: flow.id,
            churchId: flow.churchId,
            configJson: flow.configJson,
            churchName: flow.Church.name,
            name: flow.name,
        };
    } catch (error) {
        logger.error(`Error fetching public flow configuration for slug ${slug}:`, { operation: 'flows.error' }, error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

// Helper function to format service times (example) - Not used in submitFlow currently
// function formatServiceTimes(serviceTimes: ServiceTime[]): string {
//     const activeTimes = serviceTimes?.filter(st => st.isActive) ?? [];
//     if (activeTimes.length === 0) return "No scheduled services found.";
//     return activeTimes.map(st => `${st.day} at ${st.time}`).join(', ');
// }

// Helper function for E.164 format (basic North America example) - Not used in submitFlow currently
// function formatE164(phone: string): string {
//     const digits = phone.replace(/\D/g, '');
//     if (digits.length === 10) {
//         return `+1${digits}`;
//     }
//     logger.warn(`Could not format phone number to E.164: ${phone}`, { operation: 'flows.config.warn' });
//     return phone;
// }


// --- Helper function to send Prayer Request Email ---
async function sendPrayerRequestEmail(
  toEmail: string,
  submitterName: string,
  submitterEmail: string,
  submitterPhone: string | undefined,
  prayerRequestText: string,
  churchName: string,
  language: 'en' | 'es' = 'en', // Default to English
  churchLogoUrl?: string
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendDomain = process.env.YOUR_VERIFIED_RESEND_DOMAIN;

  if (!resendApiKey) {
    logger.error('RESEND_API_KEY is not configured. Email not sent.', { operation: 'flows.prayer_email.error' });
    return;
  }
  if (!resendDomain) {
    logger.error('YOUR_VERIFIED_RESEND_DOMAIN is not configured. Email not sent.', { operation: 'flows.prayer_email.error' });
    return;
  }

  const resend = new Resend(resendApiKey);

  // Prepare email data
  const emailData: PrayerRequestNotificationData = {
    submitterName,
    submitterEmail,
    submitterPhone,
    prayerRequest: prayerRequestText,
    churchName,
    churchLogoUrl,
    language,
    submittedAt: new Date().toISOString()
  };

  // Generate email HTML using the template
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';
  const htmlContent = generatePrayerRequestNotificationHtml(emailData, appUrl);

  // Sanitize names to prevent email header injection
  const sanitizedSubmitterName = sanitizeForEmailHeader(submitterName);
  const sanitizedChurchName = sanitizeForEmailHeader(churchName);
  const subject = language === 'es'
    ? `Nueva Petición de Oración - ${sanitizedSubmitterName}`
    : `New Prayer Request - ${sanitizedSubmitterName}`;

  // Note: sanitizedChurchName is used in the 'from' field below

  try {
    const { error } = await resend.emails.send({
      from: `${sanitizedChurchName} <notifications@${resendDomain}>`,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      logger.error(`Error sending prayer request email to ${getEmailDomain(toEmail)}:`, { operation: 'flows.prayer_email.error' }, error instanceof Error ? error : new Error(String(error)));
      return; // Don't throw, just log and continue
    }
    logger.info(`Prayer request email sent successfully to ${getEmailDomain(toEmail)}.`, { operation: 'flows.prayer_email.info' });
  } catch (e) {
    // Catch any other unexpected errors during the Resend API call
    logger.error(`Unexpected error sending prayer request email to ${getEmailDomain(toEmail)}:`, { operation: 'flows.prayer_email.error' }, e instanceof Error ? e : new Error(String(e)));
  }
}

// Simple in-memory rate limiting (replace with Redis in production)
const submissionCache = new Map<string, number[]>();

// Cleanup old entries every hour to prevent memory leak
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 10000; // Maximum number of email entries

// Cleanup function
function cleanupSubmissionCache() {
  const hourAgo = Date.now() - (60 * 60 * 1000);
  const entriesToDelete: string[] = [];
  
  // Find entries to delete
  for (const [email, timestamps] of submissionCache.entries()) {
    const recentTimestamps = timestamps.filter(time => time > hourAgo);
    
    if (recentTimestamps.length === 0) {
      entriesToDelete.push(email);
    } else if (recentTimestamps.length < timestamps.length) {
      // Update with only recent timestamps
      submissionCache.set(email, recentTimestamps);
    }
  }
  
  // Delete old entries
  for (const email of entriesToDelete) {
    submissionCache.delete(email);
  }
  
  // If cache is still too large, remove oldest entries
  if (submissionCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(submissionCache.entries())
      .sort((a, b) => Math.max(...a[1]) - Math.max(...b[1]));
    
    // Remove oldest 20% of entries
    const entriesToRemove = Math.floor(submissionCache.size * 0.2);
    for (let i = 0; i < entriesToRemove; i++) {
      submissionCache.delete(sortedEntries[i][0]);
    }
  }
  
  logger.debug(`Cache cleanup completed. Current size: ${submissionCache.size}`, { operation: 'flows.rate_limit.debug' });
}

// Schedule periodic cleanup with proper cleanup on module unload
let cleanupInterval: NodeJS.Timeout | null = null;

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'development') {
  cleanupInterval = setInterval(cleanupSubmissionCache, CLEANUP_INTERVAL);
  
  // Clean up on process termination
  process.on('SIGTERM', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  });
  
  process.on('SIGINT', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  });
}

export async function submitFlow(
    flowId: string,
    formData: SubmitFlowInput
): Promise<{ success: boolean; message?: string }> {
    // Validate UUID format for flowId
    if (!UUID_REGEX.test(flowId)) {
        logger.warn('Invalid flowId format received', { operation: 'flows.submit.validation', flowId: flowId.substring(0, 20) });
        return { success: false, message: 'Invalid form identifier.' };
    }

    // Validate and sanitize input data with Zod
    const parseResult = SubmitFlowInputSchema.safeParse(formData);
    if (!parseResult.success) {
        logger.warn('Input validation failed for submitFlow', {
            operation: 'flows.submit.validation',
            errors: parseResult.error.flatten().fieldErrors
        });
        return { success: false, message: 'Invalid form data. Please check your inputs.' };
    }
    const validatedFormData = parseResult.data;

    let churchId: string;
    let memberId: string = "";
    const submissionTimestamp = new Date();

    // Simple rate limiting by email (5 submissions per hour)
    // Note: Email is already normalized (lowercase/trimmed) by Zod schema
    const hourAgo = Date.now() - (60 * 60 * 1000);
    const emailSubmissions = submissionCache.get(validatedFormData.email) || [];
    const recentSubmissions = emailSubmissions.filter(time => time > hourAgo);

    if (recentSubmissions.length >= 5) {
        logger.warn(`[SubmitFlow] Rate limit exceeded for email domain: ${getEmailDomain(validatedFormData.email)}`, { operation: 'flows.rate_limit.warn' });
        return {
            success: false,
            message: "Too many submissions. Please try again later."
        };
    }

    // Update submission cache
    recentSubmissions.push(Date.now());
    submissionCache.set(validatedFormData.email, recentSubmissions);

    try {
        // Check that flow exists AND is enabled (public-facing check)
        const flow = await prisma.flow.findFirst({
            where: { id: flowId, isEnabled: true },
            select: {
                churchId: true,
                configJson: true,
                Church: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        address: true
                    }
                }
            }
        });

        if (!flow) {
            logger.warn('Flow not found or not enabled', { operation: 'flows.submit.not_found', flowId });
            return { success: false, message: 'This form is currently unavailable.' };
        }
        churchId = flow.churchId;

        const existingMember = await prisma.member.findFirst({ 
            where: { email: validatedFormData.email, churchId: churchId }, 
            select: { id: true } 
        });

        if (existingMember) {
            const updatedMember = await prisma.member.update({
                where: { id: existingMember.id },
                data: {
                    firstName: validatedFormData.firstName,
                    lastName: validatedFormData.lastName,
                    phone: validatedFormData.phone, 
                    lastSubmittedConnectFormAt: submissionTimestamp,
                    smsConsent: validatedFormData.smsConsent ?? false,
                    life_stage: validatedFormData.lifeStage || null,
                    ministry_interests: validatedFormData.interestedMinistries || [],
                    preferred_service_times: validatedFormData.serviceTimes || []
                },
                select: { id: true }
            });
            memberId = updatedMember.id;
        } else {
            const initialStatus = validatedFormData.relationshipStatus === 'regular' ? 'Member' : 'Visitor';
            const createdMember = await prisma.member.create({
                data: {
                    churchId: churchId,
                    firstName: validatedFormData.firstName,
                    lastName: validatedFormData.lastName,
                    email: validatedFormData.email,
                    phone: validatedFormData.phone, 
                    membershipStatus: initialStatus, 
                    joinDate: submissionTimestamp, // Set joinDate for new members
                    lastSubmittedConnectFormAt: submissionTimestamp,
                    smsConsent: validatedFormData.smsConsent ?? false,
                    life_stage: validatedFormData.lifeStage || null,
                    ministry_interests: validatedFormData.interestedMinistries || [],
                    preferred_service_times: validatedFormData.serviceTimes || []
                },
                select: { id: true }
            });
            memberId = createdMember.id;
        }

        // Use default Altarflow logo (church logo feature not yet implemented)
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const churchLogoUrl = `${siteUrl}/images/Altarflow.png`;

        // --- Send Welcome Email --- 
        if (memberId) {
            const configData = flow.configJson as Prisma.JsonObject;
            const formConfig = configData as unknown as FormConfiguration;

            const activeServiceTimes = formConfig.serviceTimes?.filter(st => st.isActive).map(st => ({ day: st.day, time: st.time })) || [];
            const activeMinistries = formConfig.ministries?.filter(m => m.isActive).map(m => ({ name: m.name })) || [];

            // Call the helper function - this is non-blocking for the main flow
            sendWelcomeEmail(
                validatedFormData.email,
                validatedFormData.firstName,
                flow.Church.name,
                validatedFormData.language, // Pass language
                churchLogoUrl,
                activeServiceTimes,
                activeMinistries,
                flow.Church.email || undefined,
                flow.Church.phone || undefined,
                flow.Church.address || undefined
            ).catch(emailError => {
                // Catch any unhandled promise rejection from sendWelcomeEmail itself, though it already logs.
                logger.error('Error from sendWelcomeEmail promise:', { operation: 'flows.submit.error' }, emailError instanceof Error ? emailError : new Error(String(emailError)));
            });
        } else {
            logger.error('Critical Error: memberId not set before email attempt. Welcome email not sent.', { operation: 'flows.submit.error' });
        }
        

        // --- Send Prayer Request Email (if applicable) --- 
        if (memberId && validatedFormData.prayerRequested && validatedFormData.prayerRequest) {
          // Re-parse configJson as FormConfiguration to access settings
          // This was already done for welcome email, but ensure it's scoped or re-done if needed.
          // Assuming 'formConfig' is still in scope and correctly typed from welcome email section.
          // If not, uncomment and adjust: 
          const configDataForPrayer = flow.configJson as Prisma.JsonObject;
          const formConfigForPrayer = configDataForPrayer as unknown as FormConfiguration;

          const prayerEnabled = formConfigForPrayer.settings?.enablePrayerRequests === true;
          const prayerNotificationEmail = formConfigForPrayer.settings?.prayerRequestNotificationEmail;

          if (prayerEnabled && prayerNotificationEmail && prayerNotificationEmail.trim() !== "") {
            logger.info(`Conditions met for prayer request email. Sending to: ${getEmailDomain(prayerNotificationEmail)}`, { operation: 'flows.submit.info' });
            sendPrayerRequestEmail(
              prayerNotificationEmail,
              `${validatedFormData.firstName} ${validatedFormData.lastName}`,
              validatedFormData.email,
              validatedFormData.phone,
              validatedFormData.prayerRequest,
              flow.Church.name,
              (validatedFormData.language === 'es' ? 'es' : 'en'),
              churchLogoUrl
            ).catch(emailError => {
              logger.error('Error from sendPrayerRequestEmail promise:', { operation: 'flows.submit.error' }, emailError instanceof Error ? emailError : new Error(String(emailError)));
            });
          } else {
            if (!prayerEnabled) logger.debug('Prayer requests not enabled for this flow.', { operation: 'flows.submit.debug' });
            if (!prayerNotificationEmail || prayerNotificationEmail.trim() === "") logger.debug('Prayer request notification email not configured for this flow.', { operation: 'flows.submit.debug' });
          }
        } else {
          if (validatedFormData.prayerRequested && validatedFormData.prayerRequest) {
            logger.debug('Prayer request was made, but memberId was not available. Prayer email not sent.', { operation: 'flows.submit.debug' });
          } else {
            // logger.debug('No prayer request submitted or prayer request text empty.', { operation: 'flows.submit.debug' }); // Optional: for debugging if needed
          }
        }

        // --- Create Submission Record --- 
        if (!memberId) {
            // This case should ideally not be reached if member creation/update is successful
            logger.error('memberId is unexpectedly missing before creating submission record.', { operation: 'flows.submit.error' });
            throw new Error("Failed to obtain member ID for submission record."); 
        }
        
        await prisma.submission.create({
            data: {
                flowId: flowId,
                formDataJson: validatedFormData as unknown as Prisma.JsonObject, // Ensure data is Prisma.JsonObject compatible
                memberId: memberId 
            },
        });

        logger.info(`Submission successful for Flow ID: ${flowId}, linked to Member ID: ${memberId}`, { operation: 'flows.submit.info' });
        return { success: true, message: "submissionSuccessMessage" };

    } catch (error) {
        logger.error(`Error during submitFlow process for flow ${flowId} and email domain ${getEmailDomain(validatedFormData.email)}:`, { operation: 'flows.submit.error' }, error instanceof Error ? error : new Error(String(error)));
        let userMessage = "An error occurred while processing your submission. Please try again or contact support.";
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // More specific error for known DB issues if desired, but often generic is better for users
            userMessage = "A database error occurred. Please try again.";
        } else if (error instanceof Error) {
            // Potentially use error.message if it's safe and user-friendly
            // For now, stick to generic.
        }
        return {
            success: false,
            message: userMessage
        };
    }
}


// Fetches all active flows for a given church ID.
export async function getActiveFlowsByChurchId(churchId: string): Promise<{ id: string; slug: string; name?: string | null; type?: FlowType | null }[]> {
  try {
    // Authorization check - verify user has access to this church
    const authResult = await authorizeChurchAccess(churchId);
    if (!authResult.success) {
      logger.error('Authorization failed', { operation: 'flows.get_active.error', error: authResult.error });
      return [];
    }

    const activeFlows = await prisma.flow.findMany({
      where: {
        churchId: authResult.churchId,
        isEnabled: true, // Use 'isEnabled' field from Flow model
      },
      select: {
        id: true,
        slug: true,
        name: true, // Optional: if needed by the caller
        type: true, // Optional: if needed by the caller
      },
      orderBy: {
        createdAt: 'asc', // Optional: to get a consistent order, e.g., oldest first
      },
    });
    return activeFlows;
  } catch (error) {
    logger.error(`Error fetching active flows for church ${churchId}:`, { operation: 'flows.get_active.error' }, error instanceof Error ? error : new Error(String(error)));
    return []; // Return empty array on error
  }
}

// Keep other future actions below 