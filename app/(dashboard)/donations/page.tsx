// import { DashboardLayout } from "@/components/dashboard-layout"
import DonationsContent from "@/components/donations-content";
import { getAvailableDonationTypes } from "@/lib/actions/donations.actions";

export default async function DonationsPage() {
  // Fetch available donation types (Tithe, Offering, and all active campaigns)
  const availableDonationTypes: string[] = await getAvailableDonationTypes();

  return <DonationsContent propDonationTypes={availableDonationTypes} />;
}