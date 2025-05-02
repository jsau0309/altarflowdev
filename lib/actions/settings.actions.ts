"use server"; // Add the 'use server' directive

// import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { FormConfiguration, defaultServiceTimes, defaultMinistries, defaultSettings } from "@/components/member-form/types"; // Import types and defaults
import { Prisma } from '@prisma/client'; // Import Prisma namespace
import { FlowType } from '@prisma/client'; // Import FlowType from Prisma namespace

/**
 * Fetches the church profile associated with the currently authenticated user's active organization.
 * Throws an error if user is not authenticated, no org is active, or the church record is not found.
 */
export async function getAuthenticatedChurchProfile() {
    // Get user and organization context directly using auth()
    const { userId, orgId } = await auth();

    if (!userId) {
        console.error("getAuthenticatedChurchProfile Auth Error: No Clerk userId found.");
        throw new Error("Unauthorized"); // Throw error for server component/action handler
    }
    if (!orgId) {
        console.error(`User ${userId} has no active organization selected.`);
        // Depending on usage, might return null or throw specific error
        throw new Error("No active organization selected.");
    }

    // Remove profile fetch
    // const userProfile = await prisma.profile.findUnique(...);

    // Fetch the church details using the clerkOrgId
    const church = await prisma.church.findUnique({
        where: { clerkOrgId: orgId }, // Find using clerkOrgId
        select: {
            // Select fields needed by callers
            name: true,
            phone: true,
            address: true,
            website: true,
            // Consider selecting id and clerkOrgId too?
            // id: true,
            // clerkOrgId: true,
        },
    });

    if (!church) {
        console.error(`Church not found for clerkOrgId: ${orgId}`);
        // Indicates potential sync issue or org selected that doesn't exist locally
        throw new Error("Associated church record not found for the active organization.");
    }

    return church;
}

/**
 * Fetches the Connect Form configuration for the default NEW_MEMBER flow 
 * associated with the active organization.
 * Returns default values if no configuration is found or fields are missing/invalid.
 */
export async function getFormConfiguration(): Promise<Omit<FormConfiguration, 'churchId' | 'formVersion'>> {
    const { userId, orgId } = await auth();

    if (!userId) {
        console.error("getFormConfiguration Auth Error: No Clerk userId found.");
        throw new Error("Unauthorized");
    }
    if (!orgId) {
        console.error(`User ${userId} has no active organization selected.`);
        // Return defaults if no org is active, or throw? Throwing for now.
        throw new Error("No active organization selected."); 
    }

    try {
        // Add a log to check if prisma is defined
        console.log('[getFormConfiguration] Checking prisma instance:', typeof prisma);

        // Find the default NEW_MEMBER flow for the active organization
        const flow = await prisma.flow.findFirst({
            where: { 
                type: FlowType.NEW_MEMBER, 
                church: { 
                    clerkOrgId: orgId 
                }
             },
            select: {
                configJson: true,
            },
        });

        if (!flow || !flow.configJson) {
             console.warn(`No NEW_MEMBER flow or configJson found for orgId ${orgId}. Returning defaults.`);
             // Return default configuration if flow or config doesn't exist
             return {
                serviceTimes: defaultServiceTimes,
                ministries: defaultMinistries,
                customFields: [], // Assuming no custom fields by default
                settings: defaultSettings,
            };
        }

        // Safely parse the configJson field from the Flow model
        let configData: any = {}; 
        try {
            // Attempt to parse the stored JSON
            configData = JSON.parse(JSON.stringify(flow.configJson));
        } catch (e) {
            console.error(`Error parsing configJson from Flow for org ${orgId}:`, e);
             // Return defaults if parsing fails
             return {
                serviceTimes: defaultServiceTimes,
                ministries: defaultMinistries,
                customFields: [],
                settings: defaultSettings,
            };
        }

        // Extract data, falling back to defaults if specific keys are missing/invalid
        const serviceTimes = Array.isArray(configData?.serviceTimes) 
                             ? configData.serviceTimes 
                             : defaultServiceTimes;
        const ministries = Array.isArray(configData?.ministries) 
                             ? configData.ministries 
                             : defaultMinistries;
        const settings = (typeof configData?.settings === 'object' && configData.settings !== null) 
                         ? { ...defaultSettings, ...configData.settings } // Merge with defaults
                         : defaultSettings;
        
        // Assuming customFields are not part of this MVP config
        const customFields: any[] = []; 

        return {
            serviceTimes,
            ministries,
            customFields,
            settings,
        };

    } catch (error) {
        console.error(`Error fetching form configuration for org ${orgId}:`, error);
        throw new Error("Failed to fetch flow configuration."); 
    }
}

/**
 * Saves the Connect Form configuration for the default NEW_MEMBER flow 
 * for the active organization.
 * @param config - The configuration object containing serviceTimes, ministries, and settings.
 */
export async function saveFormConfiguration(
    config: Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'> 
): Promise<{ success: boolean; message?: string }> {
    const { userId, orgId } = await auth();

    if (!userId) {
        console.error("saveFormConfiguration Auth Error: No Clerk userId found.");
        return { success: false, message: "Unauthorized" };
    }
    if (!orgId) {
        console.error(`User ${userId} has no active organization selected for saving config.`);
        return { success: false, message: "No active organization selected." };
    }

    // TODO: Add validation for the incoming config object

    try {
        // Construct the JSON data to save
        const configToSave = {
            serviceTimes: config.serviceTimes,
            ministries: config.ministries,
            settings: config.settings,
        };
        
        // Update the configJson field of the specific NEW_MEMBER flow
        const updateResult = await prisma.flow.updateMany({
            where: { 
                type: FlowType.NEW_MEMBER,
                church: { 
                    clerkOrgId: orgId 
                }
             },
            data: {
                configJson: configToSave as unknown as Prisma.JsonObject, // Store the combined config
            },
        });
        
        if (updateResult.count === 0) {
             console.error(`saveFormConfiguration Error: NEW_MEMBER Flow not found for orgId ${orgId}. No update performed.`);
             return { success: false, message: "Flow configuration record not found." };
        }

        console.log(`Flow configuration saved successfully for org ${orgId}`);
        return { success: true };

    } catch (error) {
        console.error(`Error saving flow configuration for org ${orgId}:`, error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "Failed to save configuration."
        };
    }
} 