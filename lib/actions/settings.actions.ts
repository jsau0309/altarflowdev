import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Fetches the church profile associated with the currently authenticated user.
 * Throws an error if user is not authenticated, profile/church association is missing,
 * or the church record itself is not found.
 */
export async function getAuthenticatedChurchProfile() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("getAuthenticatedChurchProfile Auth Error:", authError);
        throw new Error("Unauthorized"); // Throw error for server component to handle
    }

    // Find the user's profile to get their churchId
    const userProfile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { churchId: true },
    });

    if (!userProfile || !userProfile.churchId) {
        console.error(`User ${user.id} profile or churchId not found.`);
        // Consider a more user-friendly error message if possible
        throw new Error("User profile is not associated with a church.");
    }

    // Fetch the church details using the churchId
    const church = await prisma.church.findUnique({
        where: { id: userProfile.churchId },
        select: {
            name: true,
            phone: true,
            address: true,
            website: true,
        },
    });

    if (!church) {
        console.error(`Church not found for churchId: ${userProfile.churchId}`);
        throw new Error("Associated church record not found.");
    }

    return church;
} 