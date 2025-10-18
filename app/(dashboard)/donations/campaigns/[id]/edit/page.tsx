import { redirect } from 'next/navigation';

export default function EditCampaignPage() {
  redirect('/donations?tab=campaigns');
}
