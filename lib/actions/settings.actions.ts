"use server"; // Add the 'use server' directive

// import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { FormConfiguration, defaultServiceTimes, defaultMinistries, defaultSettings } from "@/components/member-form/types"; // Import types and defaults
import { Prisma } from '@prisma/client'; // Import Prisma namespace

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
 * Fetches the Connect Form configuration associated with the active organization.
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
        const church = await prisma.church.findUnique({
            where: { clerkOrgId: orgId },
            select: {
                serviceTimesJson: true,
                ministriesJson: true,
                settingsJson: true,
            },
        });

        if (!church) {
             console.warn(`No Church record found for orgId ${orgId} when fetching form config. Returning defaults.`);
             // Return default configuration if church record doesn't exist yet
             return {
                serviceTimes: defaultServiceTimes,
                ministries: defaultMinistries,
                customFields: [], // Assuming no custom fields by default
                settings: defaultSettings,
            };
        }

        // Safely parse JSON fields, falling back to defaults
        let serviceTimes = defaultServiceTimes;
        if (church.serviceTimesJson) {
            try {
                const parsed = JSON.parse(JSON.stringify(church.serviceTimesJson)); // Basic parsing
                if (Array.isArray(parsed)) { // Add basic validation
                     serviceTimes = parsed;
                }
            } catch (e) {
                console.error(`Error parsing serviceTimesJson for org ${orgId}:`, e);
            }
        }

        let ministries = defaultMinistries;
        if (church.ministriesJson) {
            try {
                const parsed = JSON.parse(JSON.stringify(church.ministriesJson));
                 if (Array.isArray(parsed)) {
                     ministries = parsed;
                 }
            } catch (e) {
                console.error(`Error parsing ministriesJson for org ${orgId}:`, e);
            }
        }

        let settings = defaultSettings;
        if (church.settingsJson) {
            try {
                const parsed = JSON.parse(JSON.stringify(church.settingsJson));
                if (typeof parsed === 'object' && parsed !== null) { // Basic validation
                     // Merge parsed settings with defaults to ensure all keys exist
                     settings = { ...defaultSettings, ...parsed };
                }
            } catch (e) {
                console.error(`Error parsing settingsJson for org ${orgId}:`, e);
            }
        }
        
        // Assuming customFields are managed elsewhere or not stored in these fields
        const customFields: any[] = []; 

        return {
            serviceTimes,
            ministries,
            customFields,
            settings,
        };

    } catch (error) {
        console.error(`Error fetching form configuration for org ${orgId}:`, error);
        // Throw a generic error or return defaults?
        throw new Error("Failed to fetch form configuration."); 
        // Alternative: return defaults on error
        // return {
        //    serviceTimes: defaultServiceTimes,
        //    ministries: defaultMinistries,
        //    customFields: [],
        //    settings: defaultSettings,
        // };
    }
}

/**
 * Saves the Connect Form configuration for the active organization.
 * @param config - The configuration object containing serviceTimes, ministries, and settings.
 */
export async function saveFormConfiguration(
    config: Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'> // Exclude fields not saved here
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

    // Optional: Add role check (e.g., only admins can save)
    // const { orgRole } = await auth();
    // if (orgRole !== 'admin') { ... return { success: false, message: "Forbidden" }; }

    // TODO: Add validation for the incoming config object if needed (e.g., using Zod)

    try {
        const updateResult = await prisma.church.updateMany({ 
            where: { clerkOrgId: orgId },
            data: {
                // Explicitly stringify data before saving to JSON fields
                serviceTimesJson: JSON.stringify(config.serviceTimes),
                ministriesJson: JSON.stringify(config.ministries),
                settingsJson: JSON.stringify(config.settings),
            },
        });
        
        if (updateResult.count === 0) {
             console.error(`saveFormConfiguration Error: Church not found for orgId ${orgId}. No update performed.`);
             // This indicates a potential sync issue or trying to save to a non-existent org
             return { success: false, message: "Organization profile not found." };
        }

        console.log(`Form configuration saved successfully for org ${orgId}`);
        return { success: true };

    } catch (error) {
        console.error(`Error saving form configuration for org ${orgId}:`, error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "Failed to save configuration."
        };
    }
} 