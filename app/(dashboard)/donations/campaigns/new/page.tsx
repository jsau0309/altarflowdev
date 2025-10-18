import { redirect } from 'next/navigation';

export default function NewCampaignPage() {
  redirect('/donations?tab=campaigns');
}
