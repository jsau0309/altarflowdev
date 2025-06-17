// import { DashboardLayout } from "@/components/dashboard-layout"
import DonationsContent from "@/components/donations-content";
import { getDistinctDonorsForFilter, DonorFilterItem } from "@/lib/actions/donations.actions";

export default async function DonationsPage() {
  // The DonationsContent component now fetches its own donations.
  // We only need to pass the members and campaigns lists.

  // Fetch distinct donors for the filter
  const donorsForFilter: DonorFilterItem[] = await getDistinctDonorsForFilter();

  return <DonationsContent propDonors={donorsForFilter} />; // Renaming propMembers to propDonors here, will update in DonationsContent next
}