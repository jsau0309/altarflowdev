import { redirect } from 'next/navigation';

interface NfcLandingPageProps {
  params: Promise<{
    churchSlug: string;
  }>;
}

// Redirect old NFC landing page URL to new landing page
export default async function NfcLandingPage({ params }: NfcLandingPageProps) {
  const { churchSlug } = await params;
  redirect(`/${churchSlug}`);
}
