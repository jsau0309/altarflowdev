"use server";

import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { FormConfiguration, defaultServiceTimes, defaultMinistries, defaultSettings } from "@/components/member-form/types"; // Adjust path if necessary
import { FlowType, Prisma } from '@prisma/client'; // Import Prisma namespace for Prisma.JsonObject and FlowType
import type { ServiceTime, Ministry, LifeStage, RelationshipStatus, MemberFormData } from '../../components/member-form/types'; // Ensure MemberFormData is imported if used

// Define the specific input type expected by the submitFlow action
// Based on the Zod schema in ConnectForm.tsx
interface SubmitFlowInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string; // Required now
    relationshipStatus: RelationshipStatus;
    // Include optional fields that might be passed
    serviceTimes?: string[];
    interestedMinistries?: string[];
    lifeStage?: LifeStage;
    referralSource?: string;
    prayerRequested?: boolean;
    prayerRequest?: string;
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

export async function submitFlow(
    flowId: string, 
    // Use the specific input type
    formData: SubmitFlowInput 
): Promise<{ success: boolean; message?: string }> {
    
    // Basic validation can be simplified as type guarantees required fields
    if (!formData || typeof formData !== 'object') {
        console.error("submitFlow Error: Invalid form data object received.", formData);
        return { success: false, message: "Invalid form data submitted." };
    }
     if (!flowId) {
        return { success: false, message: "Missing flow identifier." };
    }

    // No need for basic checks on required fields like email, phone etc.
    // as the type SubmitFlowInput enforces their presence.
    const validatedFormData = formData; 

    let churchId: string;
    let memberId: string;
    const submissionTimestamp = new Date();

    try {
        // --- 2. Get Church ID from Flow ID ---
         const flow = await prisma.flow.findUniqueOrThrow({
             where: { id: flowId },
             select: { churchId: true }
         });
         churchId = flow.churchId;

        // --- 3. Find Existing Member --- 
        // Accessing formData fields is now type-safe
        const existingMember = await prisma.member.findFirst({ 
            where: { email: validatedFormData.email, churchId: churchId }, 
            select: { id: true } 
        });

        // --- 4. Create or Update Member --- 
        if (existingMember) {
            // Member Found - Update
            const updatedMember = await prisma.member.update({
                where: { id: existingMember.id },
                data: {
                    firstName: validatedFormData.firstName,
                    lastName: validatedFormData.lastName,
                    phone: validatedFormData.phone, // Known to be string
                    lastSubmittedConnectFormAt: submissionTimestamp,
                },
                select: { id: true }
            });
            memberId = updatedMember.id;
            console.log(`Member ${memberId} updated successfully.`);

        } else {
            // Member Not Found - Create
            const initialStatus = validatedFormData.relationshipStatus === 'regular' ? 'Regular Attendee' : 'Visitor';
            const createdMember = await prisma.member.create({
                data: {
                    churchId: churchId,
                    firstName: validatedFormData.firstName,
                    lastName: validatedFormData.lastName,
                    email: validatedFormData.email,
                    phone: validatedFormData.phone, // Known to be string
                    membershipStatus: initialStatus, 
                    lastSubmittedConnectFormAt: submissionTimestamp,
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
                // Pass the full validated form data for storage
                formDataJson: validatedFormData as unknown as Prisma.JsonObject,
                memberId: memberId 
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