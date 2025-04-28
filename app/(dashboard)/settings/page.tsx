// import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsContent } from "@/components/settings-content"
import { getAuthenticatedChurchProfile } from "@/lib/actions/settings.actions";

// Make the component async
export default async function SettingsPage() {
  let initialProfileData = null;
  let fetchError = null;

  try {
    initialProfileData = await getAuthenticatedChurchProfile();
  } catch (error) {
    console.error("Error fetching church profile for settings page:", error);
    fetchError = error instanceof Error ? error.message : "An unknown error occurred while loading settings.";
    // Optionally, you could redirect or show a more specific error UI based on the error type
  }

  // Handle fetch error state - display an error message within the layout
  if (fetchError) {
    return (
      <div className="container mx-auto py-6 text-destructive">
        <h1 className="text-2xl font-bold mb-4">Error Loading Settings</h1>
        <p>{fetchError}</p>
        <p>Please try again later or contact support.</p>
      </div>
    );
  }

  // If data fetched successfully, render SettingsContent with the data
  // The check for initialProfileData is technically redundant because getAuthenticatedChurchProfile throws, 
  // but it adds safety.
  if (initialProfileData) {
    return <SettingsContent initialChurchProfile={initialProfileData} />
  } else {
     // This case should ideally not be reached if errors are thrown correctly
     return <div className="container mx-auto py-6">Could not load church profile data.</div>; 
  }

}