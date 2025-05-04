"use server";

import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { FormConfiguration, defaultServiceTimes, defaultMinistries, defaultSettings } from "@/components/member-form/types"; // Adjust path if necessary
import { FlowType, Prisma } from '@prisma/client'; // Import Prisma namespace for Prisma.JsonObject and FlowType
import type { ServiceTime, Ministry, LifeStage, RelationshipStatus, MemberFormData } from '../../components/member-form/types'; // Ensure MemberFormData is imported if used

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

        // If no flow exists, return defaults with empty lists and null slug
        if (!flow) {
             console.warn(`No ${flowType} flow found for orgId ${orgId}. Returning default settings with empty lists.`);
             return {
                serviceTimes: [], 
                ministries: [],   
                settings: defaultSettings,
                slug: null
            };
        }
        
        // If flow exists but configJson is invalid/missing
        if (!flow.configJson || typeof flow.configJson !== 'object' || flow.configJson === null) {
            console.warn(`Valid configJson not found for ${flowType} flow (ID: ${flow.id}) for orgId ${orgId}. Returning default settings with empty lists.`);
             return {
                serviceTimes: [],
                ministries: [],
                settings: defaultSettings,
                slug: flow.slug
            };
        }

        // --- Parse existing configJson --- 
        const configData = flow.configJson as Prisma.JsonObject;

        // Extract data, falling back to EMPTY arrays if specific keys are missing/invalid
        const serviceTimes = Array.isArray(configData?.serviceTimes) 
                             ? configData.serviceTimes 
                             : []; // Default to empty array
        const ministries = Array.isArray(configData?.ministries) 
                             ? configData.ministries 
                             : []; // Default to empty array
                             
        // Ensure settings is an object before merging, default to defaultSettings
        const currentSettings = (typeof configData?.settings === 'object' && configData.settings !== null)
                                ? configData.settings
                                : {}; // Start with empty object if settings field is invalid/missing
        
        const settings = { ...defaultSettings, ...currentSettings }; // Merge ensures all default keys exist

        return {
            // Prisma JsonValue needs type assertion here if ServiceTime/Ministry types aren't directly compatible
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
 * Attempts to create first, then updates if creation fails due to existing record.
 * @param flowType - The type of flow to save configuration for.
 * @param config - The configuration object containing serviceTimes, ministries, and settings.
 */
export async function saveFlowConfiguration(
    flowType: FlowType,
    config: Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'> 
): Promise<{ success: boolean; message?: string }> {
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
        // 1. Get the internal church ID
        const church = await prisma.church.findUniqueOrThrow({
            where: { clerkOrgId: orgId },
            select: { id: true }
        });
        churchId = church.id;
    } catch (error) {
         console.error(`saveFlowConfiguration Error: Church not found for orgId ${orgId}.`);
         return { success: false, message: "Associated church record not found." };
    }

    // 2. Prepare data
    const configToSave = {
        serviceTimes: config.serviceTimes,
        ministries: config.ministries,
        settings: config.settings,
    };
    const flowName = `${flowType.charAt(0) + flowType.slice(1).toLowerCase().replace(/_/g, ' ')} Flow`;
    const flowSlug = `connect-${orgId}`; 

    try {
        // 3. Attempt to CREATE the flow
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
        return { success: true };

    } catch (error) {
        // 4. Handle potential errors, specifically P2002 (Unique Constraint Violation)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             console.log(`Create failed (P2002), assuming flow exists for org ${orgId}, type ${flowType}. Attempting update.`);
             try {
                 // 5. If P2002 on create, assume record exists - find its ID and UPDATE
                 // Use findFirstOrThrow for robustness
                 const existingFlow = await prisma.flow.findFirstOrThrow({
                     where: { 
                         churchId: churchId,
                         type: flowType 
                     },
                     select: { id: true }
                 });

                const updatedFlow = await prisma.flow.update({
                    where: { id: existingFlow.id },
                    data: {
                        configJson: configToSave as unknown as Prisma.JsonObject,
                        name: flowName, // Keep name updated
                    },
                     select: { id: true }
                });
                console.log(`${flowType} configuration updated successfully for org ${orgId} (Flow ID: ${updatedFlow.id})`);
                return { success: true };

            } catch (updateError) {
                 // This catch block handles errors during the findFirstOrThrow/update attempt
                 console.error(`Error updating existing ${flowType} configuration for org ${orgId} after create failed:`, updateError);
                 // Check if the original P2002 was actually about the slug (less likely path now)
                 const target = (error.meta?.target as string[]) || [];
                 if (target.includes('slug')) {
                     console.error(`Original P2002 likely due to Slug conflict for org ${orgId}. Slug: ${flowSlug}`);
                     return { success: false, message: "Failed to generate unique URL for the flow. Please contact support." };
                 }
                 // Otherwise, it's likely an issue with the update itself or finding the record
                 return { success: false, message: "Failed to update existing configuration after initial save attempt." };
            }
        } else {
             // Handle other non-P2002 errors from the initial create attempt
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
 * Does not require authentication.
 * Returns null if the flow is not found or not enabled.
 * @param slug - The unique slug of the flow.
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
            where: { 
                slug: slug,
                isEnabled: true, // Only fetch enabled flows
            },
            select: {
                id: true,
                configJson: true,
                church: { // Select the related church's name
                    select: { 
                        name: true 
                    }
                }
            },
        });

        if (!flow) {
            console.log(`getPublicFlowBySlug: Flow not found or not enabled for slug: ${slug}`);
            return null;
        }

        // Ensure the church relation was successful
        if (!flow.church) {
            console.error(`getPublicFlowBySlug: Flow ${flow.id} found, but related church is missing for slug: ${slug}`);
            return null; // Or throw an internal server error?
        }

        return {
            id: flow.id,
            configJson: flow.configJson,
            churchName: flow.church.name,
        };

    } catch (error) {
        console.error(`Error fetching public flow configuration for slug ${slug}:`, error);
        // Depending on desired behavior, could return null or re-throw
        // Returning null for public pages might be safer to prevent error pages
        return null; 
    }
}

// Use MemberFormData for stricter typing if applicable, or keep as any/Partial<FormData>
// Type for data structure within the action
interface SubmissionData extends Partial<FormData> { 
     firstName: string;
     lastName: string;
     email: string;
     phone?: string; // Add optional phone field
     relationshipStatus: RelationshipStatus; 
}

export async function submitFlow(
    flowId: string, 
    formData: SubmissionData // Use a more specific type if possible
): Promise<{ success: boolean; message?: string }> {
    
    // --- 1. Validation (Placeholder - Zod validation happens before calling usually) ---
    // Assuming formData is already validated by Zod resolver on client, 
    // but adding basic checks here for safety.
    if (!formData || typeof formData !== 'object' || !formData.email || !formData.firstName || !formData.lastName || !formData.relationshipStatus) {
        console.error("submitFlow Error: Invalid or incomplete form data received.", formData);
        return { success: false, message: "Invalid form data submitted." };
    }
    if (!flowId) {
        return { success: false, message: "Missing flow identifier." };
    }
    // Use validated data directly
    const validatedFormData = formData; 

    let churchId: string;
    let memberId: string;
    const submissionTimestamp = new Date(); // Use consistent timestamp

    try {
        // --- 2. Get Church ID from Flow ID ---
         const flow = await prisma.flow.findUniqueOrThrow({
             where: { id: flowId },
             select: { churchId: true }
         });
         churchId = flow.churchId;

        // --- 3. Find Existing Member --- 
        console.log(`Searching for member with email ${validatedFormData.email} in church ${churchId}`);
        const existingMember = await prisma.member.findFirst({
            where: { 
                // Use lowercased email for case-insensitive comparison if desired & schema allows
                // email: validatedFormData.email.toLowerCase(), 
                email: validatedFormData.email,
                churchId: churchId 
            },
            select: { id: true } // Only need the ID
        });

        // --- 4. Create or Update Member --- 
        if (existingMember) {
            // Member Found - Update
            console.log(`Found existing member (ID: ${existingMember.id}). Updating...`);
            const updatedMember = await prisma.member.update({
                where: { id: existingMember.id },
                data: {
                    // Overwrite specific fields based on Plan (Option A)
                    firstName: validatedFormData.firstName,
                    lastName: validatedFormData.lastName,
                    phone: validatedFormData.phone || null, // Use null if phone is empty/undefined
                    lastSubmittedConnectFormAt: submissionTimestamp,
                     // Do NOT update membershipStatus based on submission
                },
                select: { id: true }
            });
            memberId = updatedMember.id;
            console.log(`Member ${memberId} updated successfully.`);

        } else {
            // Member Not Found - Create
            console.log(`No existing member found for email ${validatedFormData.email}. Creating new member...`);
            // Map form status to DB status - adjust strings as needed for your Member model
            const initialStatus = validatedFormData.relationshipStatus === 'regular' ? 'Regular Attendee' : 'Visitor';
            
            const createdMember = await prisma.member.create({
                data: {
                    churchId: churchId,
                    firstName: validatedFormData.firstName,
                    lastName: validatedFormData.lastName,
                    email: validatedFormData.email, // Store original case or lowercase?
                    phone: validatedFormData.phone || null,
                    membershipStatus: initialStatus, 
                    lastSubmittedConnectFormAt: submissionTimestamp,
                    // Ensure all other non-nullable Member fields have defaults or are handled
                    // language: ??? // Need a default or pass from form?
                    // smsConsent: false, // Default likely set in schema?
                },
                select: { id: true }
            });
            memberId = createdMember.id;
            console.log(`New member ${memberId} created successfully.`);
        }

        // --- 5. Create Submission Record with Link to Member ---
        await prisma.submission.create({
            data: {
                flowId: flowId,
                formDataJson: validatedFormData as unknown as Prisma.JsonObject,
                memberId: memberId // Link to the created/updated member
            },
        });

        console.log(`Submission successful for Flow ID: ${flowId}, linked to Member ID: ${memberId}`);
        return { success: true, message: "Submission received successfully!" };

    } catch (error) {
        console.error(`Error during submitFlow process for flow ${flowId} and email ${validatedFormData.email}:`, error);
        // Provide a more generic error to the frontend
        return { 
            success: false, 
            message: "An error occurred while processing your submission. Please try again or contact support."
        };
    }
}

// Keep other future actions below 