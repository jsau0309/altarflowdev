import { redirect } from 'next/navigation';

export default function CampaignsPage() {
  redirect('/donations?tab=campaigns');
}
