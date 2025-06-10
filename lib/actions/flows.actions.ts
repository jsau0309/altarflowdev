"use server";

import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { FormConfiguration, defaultServiceTimes, defaultMinistries, defaultSettings } from "@/components/member-form/types"; // Adjust path if necessary
import { FlowType, Prisma } from '@prisma/client'; // Import Prisma namespace for Prisma.JsonObject and FlowType
import type { ServiceTime, Ministry, LifeStage, RelationshipStatus, MemberFormData } from '../../components/member-form/types'; // Ensure MemberFormData is imported if used
import { Resend } from 'resend'; // Import Resend

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
    ministries?: EmailMinistry[]
): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.error("[Resend Email] RESEND_API_KEY missing in environment. Cannot send email.");
        return;
    }
    if (!process.env.YOUR_VERIFIED_RESEND_DOMAIN) {
        console.error("[Resend Email] YOUR_VERIFIED_RESEND_DOMAIN missing in environment. Cannot send email.");
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Translations
    const isSpanish = language.toLowerCase().startsWith('es');

    const subjectText = isSpanish ? `¡Bienvenido(a) a ${churchName}!` : `Welcome to ${churchName}!`;
    const greetingText = isSpanish ? `Hola ${firstName},` : `Hi ${firstName},`;
    const thankYouText = isSpanish ? `Gracias por conectarte con ${churchName}. ¡Estamos emocionados de que te unas a nuestra comunidad!` : `Thank you for connecting with ${churchName}. We're thrilled to have you join our community!`;
    const getInvolvedTitle = isSpanish ? `Aquí te Mostramos Cómo Puedes Participar:` : `Here's How You Can Get Involved:`;
    const serviceTimesTitle = isSpanish ? `🗓️ Nuestros Horarios de Servicio:` : `🗓️ Our Service Times:`;
    const ministriesTitle = isSpanish ? `🤝 Ministerios y Grupos:` : `🤝 Ministries & Groups:`;
    const moreInfoText = isSpanish ? `Pronto nos pondremos en contacto contigo con más información. Si tienes alguna pregunta inmediata, no dudes en contactarnos.` : `We'll be in touch soon with more information. If you have any immediate questions, please don't hesitate to contact us.`;
    const blessingsText = isSpanish ? `Bendiciones,` : `Blessings,`;
    const teamText = isSpanish ? `El Equipo de ${churchName}` : `The Team at ${churchName}`; 
    const automatedMessageText = isSpanish ? `Este es un mensaje automático. Por favor, no respondas directamente a este correo.` : `This is an automated message. Please do not reply directly to this email.`;

    // Enhanced HTML email body
    const emailHtmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          ${churchLogoUrl ? `<div style="text-align: center; margin-bottom: 25px;"><img src="${churchLogoUrl}" alt="${churchName} Logo" style="max-width: 200px; max-height: 70px; height: auto;"></div>` : ''}
          <h2 style="color: #0056b3; text-align: center; margin-bottom: 20px;">${subjectText}</h2>
          <p>${greetingText}</p>
          <p>${thankYouText}</p>
          
          ${(serviceTimes && serviceTimes.length > 0) || (ministries && ministries.length > 0) ? `
          <div style="margin-top: 25px; margin-bottom: 25px; padding: 15px; background-color: #f0f8ff; border-radius: 5px;">
            <h3 style="color: #004a8c; margin-top: 0; margin-bottom: 15px;">${getInvolvedTitle}</h3>
            ${serviceTimes && serviceTimes.length > 0 ? `
              <p style="margin-bottom: 5px;"><strong>${serviceTimesTitle}</strong></p>
              <ul style="list-style-type: none; padding-left: 0; margin-top: 0;">
                ${serviceTimes.map(st => `<li style="margin-bottom: 3px;"><strong>${isSpanish ? st.day : st.day}:</strong> ${st.time}</li>`).join('')} 
              </ul>` : ''}
            ${ministries && ministries.length > 0 ? `
              <p style="margin-top: ${serviceTimes && serviceTimes.length > 0 ? '15px' : '0'}; margin-bottom: 5px;"><strong>${ministriesTitle}</strong></p>
              <ul style="list-style-type: none; padding-left: 0; margin-top: 0;">
                ${ministries.map(m => `<li style="margin-bottom: 3px;">${m.name}</li>`).join('')}
              </ul>` : ''}
          </div>
          ` : ''}

          <p>${moreInfoText}</p>
          <p>${blessingsText}</p>
          <p><strong>${teamText}</strong></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.9em; color: #777; text-align: center;">
            ${automatedMessageText}<br>
            ${churchName} <!-- You can add address or contact info here if desired -->
          </p>
        </div>
      </div>
    `;

    try {
        console.log(`[Resend Email] Attempting to send welcome email to ${recipientEmail} for ${churchName} in ${language}.`);
        const { data, error } = await resend.emails.send({
            from: `${churchName} <connect@${process.env.YOUR_VERIFIED_RESEND_DOMAIN}>`, // Using a more specific 'from' name
            to: recipientEmail,
            subject: subjectText, // Use translated subject
            html: emailHtmlBody,
        });

        if (error) {
            console.error(`[Resend Email] Failed to send welcome email to ${recipientEmail}:`, error);
            return; 
        }

        console.log(`[Resend Email] Welcome email sent successfully to ${recipientEmail}. Message ID: ${data?.id}`);

    } catch (exception) {
        console.error(`[Resend Email] Exception during sending welcome email to ${recipientEmail}:`, exception);
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
        console.error("getFlowConfiguration Auth Error: No Clerk userId found.");
        throw new Error("Unauthorized");
    }
    if (!orgId) {
        console.error(`User ${userId} has no active organization selected.`);
        throw new Error("No active organization selected."); 
    }

    try {
        const flow = await prisma.flow.findFirst({
            where: { 
                type: flowType, 
                church: { 
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
             console.warn(`No ${flowType} flow found for orgId ${orgId}. Returning default settings with empty lists.`);
             return {
                serviceTimes: [], 
                ministries: [],   
                settings: defaultSettings,
                slug: null
            };
        }
        
        if (!flow.configJson || typeof flow.configJson !== 'object' || flow.configJson === null) {
            console.warn(`Valid configJson not found for ${flowType} flow (ID: ${flow.id}) for orgId ${orgId}. Returning default settings with empty lists.`);
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
            serviceTimes: serviceTimes as any[], 
            ministries: ministries as any[],
            settings: settings,
            slug: flow.slug
        };

    } catch (error) {
        console.error(`Error fetching ${flowType} configuration for org ${orgId}:`, error);
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
        console.error("saveFlowConfiguration Auth Error: No Clerk userId found.");
        return { success: false, message: "Unauthorized" };
    }
    if (!orgId) {
        console.error(`User ${userId} has no active organization selected for saving config.`);
        return { success: false, message: "No active organization selected." };
    }

    let churchId: string;
    try {
        const church = await prisma.church.findUniqueOrThrow({
            where: { clerkOrgId: orgId },
            select: { id: true }
        });
        churchId = church.id;
    } catch (error) {
         console.error(`saveFlowConfiguration Error: Church not found for orgId ${orgId}.`);
         return { success: false, message: "Associated church record not found." };
    }

    const configToSave = {
        serviceTimes: config.serviceTimes,
        ministries: config.ministries,
        settings: config.settings,
    };
    const flowName = `${flowType.charAt(0) + flowType.slice(1).toLowerCase().replace(/_/g, ' ')} Flow`;
    const flowSlug = `connect-${orgId}`; 

    try {
        const createdFlow = await prisma.flow.create({
            data: {
                churchId: churchId,
                type: flowType,
                name: flowName,
                slug: flowSlug,
                configJson: configToSave as unknown as Prisma.JsonObject,
                isEnabled: true,
            },
            select: { id: true }
        });
        console.log(`${flowType} configuration created successfully for org ${orgId} (Flow ID: ${createdFlow.id})`);
        return { success: true, slug: flowSlug };

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             console.log(`Create failed (P2002), assuming flow exists for org ${orgId}, type ${flowType}. Attempting update.`);
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
                    },
                });
                console.log(`${flowType} configuration updated successfully for org ${orgId} (Flow ID: ${existingFlow.id})`);
                return { success: true, slug: flowSlug };

            } catch (updateError) {
                 console.error(`Error updating existing ${flowType} configuration for org ${orgId} after create failed:`, updateError);
                 const target = (error.meta?.target as string[]) || [];
                 if (target.includes('slug')) {
                     console.error(`Original P2002 likely due to Slug conflict for org ${orgId}. Slug: ${flowSlug}`);
                     return { success: false, message: "Failed to generate unique URL for the flow. Please contact support." };
                 }
                 return { success: false, message: "Failed to update existing configuration after initial save attempt." };
            }
        } else {
             console.error(`Error creating ${flowType} configuration for org ${orgId}:`, error);
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
    configJson: Prisma.JsonValue;
    churchName: string;
} | null> {
    if (!slug) {
        console.log("getPublicFlowBySlug: No slug provided.");
        return null;
    }
    try {
        const flow = await prisma.flow.findUnique({
            where: { slug: slug, isEnabled: true },
            select: {
                id: true,
                configJson: true,
                church: { select: { name: true } }
            },
        });

        if (!flow) {
            console.log(`getPublicFlowBySlug: Flow not found or not enabled for slug: ${slug}`);
            return null;
        }
        if (!flow.church) {
            console.error(`getPublicFlowBySlug: Flow ${flow.id} found, but related church is missing for slug: ${slug}`);
            return null;
        }
        return {
            id: flow.id,
            configJson: flow.configJson,
            churchName: flow.church.name,
        };
    } catch (error) {
        console.error(`Error fetching public flow configuration for slug ${slug}:`, error);
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
//     console.warn(`Could not format phone number to E.164: ${phone}`);
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
  language: 'en' | 'es' = 'en' // Default to English
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendDomain = process.env.YOUR_VERIFIED_RESEND_DOMAIN;

  if (!resendApiKey) {
    console.error("[Resend Prayer Email] RESEND_API_KEY is not configured. Email not sent.");
    return;
  }
  if (!resendDomain) {
    console.error("[Resend Prayer Email] YOUR_VERIFIED_RESEND_DOMAIN is not configured. Email not sent.");
    return;
  }

  const resend = new Resend(resendApiKey);

  const subject = language === 'es' 
    ? `Nueva Petición de Oración de ${submitterName} para ${churchName}` 
    : `New Prayer Request from ${submitterName} for ${churchName}`;

  // Construct the logo URL dynamically
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const altarflowLogoUrl = `${siteUrl}/images/Altarflow.png`; // Assuming this is the correct path to your logo

  // Titles and text based on language
  const emailTitleText = language === 'es' ? 'Nueva Petición de Oración' : 'New Prayer Request';
  const receivedForText = language === 'es' ? `Has recibido una nueva petición de oración para ${churchName}:` : `You have received a new prayer request for ${churchName}:`;
  const memberNameLabel = language === 'es' ? 'Nombre del Miembro:' : 'Member\'s Name:';
  const memberEmailLabel = language === 'es' ? 'Email del Miembro:' : 'Member\'s Email:';
  const memberPhoneLabel = language === 'es' ? 'Teléfono del Miembro:' : 'Member\'s Phone:';
  const requestTitle = language === 'es' ? 'Petición:' : 'Request:';
  const automatedMessageFooter = language === 'es' ? 'Este es un correo electrónico automatizado enviado desde Altarflow.' : 'This is an automated email sent from Altarflow.';

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 25px;">
        <img src="${altarflowLogoUrl}" alt="Altarflow Logo" style="max-width: 200px; max-height: 70px; height: auto;">
      </div>
      <h2 style="color: #0056b3; text-align: center; margin-bottom: 20px;">${emailTitleText}</h2>
      <p>${receivedForText}</p>
      
      <div style="margin-top: 20px; margin-bottom: 20px; padding: 15px; background-color: #f0f8ff; border-radius: 5px;">
        <ul style="list-style-type: none; padding-left: 0; margin-top: 0;">
          <li style="margin-bottom: 8px;"><strong>${memberNameLabel}</strong> ${submitterName}</li>
          <li style="margin-bottom: 8px;"><strong>${memberEmailLabel}</strong> ${submitterEmail}</li>
          ${submitterPhone ? `<li style="margin-bottom: 8px;"><strong>${memberPhoneLabel}</strong> ${submitterPhone}</li>` : ''}
        </ul>
      </div>
      
      <h3 style="color: #004a8c; margin-top: 20px;">${requestTitle}</h3>
      <div style="padding: 10px; border-left: 3px solid #0056b3; background-color: #f8f9fa; margin-bottom: 20px;">
        <p style="margin: 0;">${prayerRequestText.replace(/\n/g, '<br>')}</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 0.9em; color: #777; text-align: center;">
        ${automatedMessageFooter}<br>
        ${churchName}
      </p>
    </div>
  </div>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Altarflow Notificaciones <notifications@${resendDomain}>`,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error(`[Resend Prayer Email] Error sending prayer request email to ${toEmail}:`, error);
      return; // Don't throw, just log and continue
    }
    console.log(`[Resend Prayer Email] Prayer request email sent successfully to ${toEmail}. Message ID: ${data?.id}`);
  } catch (e) {
    // Catch any other unexpected errors during the Resend API call
    console.error(`[Resend Prayer Email] Unexpected error sending prayer request email to ${toEmail}:`, e);
  }
}

export async function submitFlow(
    flowId: string, 
    formData: SubmitFlowInput
): Promise<{ success: boolean; message?: string }> {
    const validatedFormData = formData; 
    let churchId: string; 
    let memberId: string = "";
    const submissionTimestamp = new Date();
    // Ensure language is part of validatedFormData, if not, default or handle error
    // For now, assuming it's present as per SubmitFlowInput interface

    try {
        const flow = await prisma.flow.findUniqueOrThrow({
            where: { id: flowId },
            select: { churchId: true, configJson: true, church: { select: { name: true } } }
        });
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

        // --- Send Welcome Email --- 
        if (memberId) {
            const configData = flow.configJson as Prisma.JsonObject;
            const formConfig = configData as unknown as FormConfiguration;

            const activeServiceTimes = formConfig.serviceTimes?.filter(st => st.isActive).map(st => ({ day: st.day, time: st.time })) || [];
            const activeMinistries = formConfig.ministries?.filter(m => m.isActive).map(m => ({ name: m.name })) || [];
            
            // Construct the logo URL dynamically.
            // Ensure NEXT_PUBLIC_APP_URL is set in your environment variables.
            // For local development, it might be 'http://localhost:3000' or an ngrok URL.
            // For production, it will be your actual site URL.
            const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Use NEXT_PUBLIC_APP_URL
            const churchLogoUrl = `${siteUrl}/images/Altarflow.png`;

            // Call the helper function - this is non-blocking for the main flow
            sendWelcomeEmail(
                validatedFormData.email,
                validatedFormData.firstName,
                flow.church.name,
                validatedFormData.language, // Pass language
                churchLogoUrl,
                activeServiceTimes,
                activeMinistries
            ).catch(emailError => {
                // Catch any unhandled promise rejection from sendWelcomeEmail itself, though it already logs.
                console.error("[SubmitFlow] Error from sendWelcomeEmail promise:", emailError);
            });
        } else {
            console.error("[SubmitFlow] Critical Error: memberId not set before email attempt. Welcome email not sent.");
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
            console.log(`[SubmitFlow] Conditions met for prayer request email. Sending to: ${prayerNotificationEmail}`);
            sendPrayerRequestEmail(
              prayerNotificationEmail,
              `${validatedFormData.firstName} ${validatedFormData.lastName}`,
              validatedFormData.email,
              validatedFormData.phone,
              validatedFormData.prayerRequest,
              flow.church.name,
              validatedFormData.language as 'en' | 'es'
            ).catch(emailError => {
              console.error("[SubmitFlow] Error from sendPrayerRequestEmail promise:", emailError);
            });
          } else {
            if (!prayerEnabled) console.log("[SubmitFlow] Prayer requests not enabled for this flow.");
            if (!prayerNotificationEmail || prayerNotificationEmail.trim() === "") console.log("[SubmitFlow] Prayer request notification email not configured for this flow.");
          }
        } else {
          if (validatedFormData.prayerRequested && validatedFormData.prayerRequest) {
            console.log("[SubmitFlow] Prayer request was made, but memberId was not available. Prayer email not sent.");
          } else {
            // console.log("[SubmitFlow] No prayer request submitted or prayer request text empty."); // Optional: for debugging if needed
          }
        }

        // --- Create Submission Record --- 
        if (!memberId) {
            // This case should ideally not be reached if member creation/update is successful
            console.error("[SubmitFlow] memberId is unexpectedly missing before creating submission record.");
            throw new Error("Failed to obtain member ID for submission record."); 
        }
        
        await prisma.submission.create({
            data: {
                flowId: flowId,
                formDataJson: validatedFormData as unknown as Prisma.JsonObject, // Ensure data is Prisma.JsonObject compatible
                memberId: memberId 
            },
        });

        console.log(`[SubmitFlow] Submission successful for Flow ID: ${flowId}, linked to Member ID: ${memberId}`);
        return { success: true, message: "submissionSuccessMessage" };

    } catch (error) {
        console.error(`[SubmitFlow] Error during submitFlow process for flow ${flowId} and email ${validatedFormData.email}:`, error);
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
    const activeFlows = await prisma.flow.findMany({
      where: {
        churchId: churchId,
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
    console.error(`[getActiveFlowsByChurchId] Error fetching active flows for church ${churchId}:`, error);
    return []; // Return empty array on error
  }
}

// Keep other future actions below 