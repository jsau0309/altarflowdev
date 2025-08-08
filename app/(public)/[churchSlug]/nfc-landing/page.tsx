import { getChurchBySlug } from '@/lib/actions/church.actions';
import { getActiveFlowsByChurchId } from '@/lib/actions/flows.actions';
import { getTranslationsForServer } from '@/lib/i18n.server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';

interface NfcLandingPageProps {
  params: Promise<{
    churchSlug: string;
  }>;
}

async function NfcLandingContent({ churchSlug }: { churchSlug: string }) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('NEXT_LOCALE');
  const locale = langCookie?.value === 'es' ? 'es' : 'en'; // Default to 'en' if cookie is not 'es' or not set
  const t = await getTranslationsForServer(locale, 'nfc');

  const churchData = await getChurchBySlug(churchSlug);
  if (!churchData || !churchData.church) {
    return <p>Church not found.</p>; 
  }
  const { church } = churchData;

  // Check if church has a Stripe account and if it's active
  const stripeAccount = await prisma.stripeConnectAccount.findUnique({
    where: { churchId: church.clerkOrgId || '' }
  });

  const hasActiveStripeAccount = stripeAccount && 
    stripeAccount.chargesEnabled && 
    stripeAccount.payoutsEnabled && 
    stripeAccount.detailsSubmitted;

  // Get landing page settings
  const settings = (church.settingsJson as { landing?: { showDonateButton?: boolean; showConnectButton?: boolean } }) || {};
  const showDonateButton = settings.landing?.showDonateButton ?? true;
  const showConnectButton = settings.landing?.showConnectButton ?? true;

  // Only show donate button if enabled AND Stripe account is active
  const shouldShowDonateButton = showDonateButton && hasActiveStripeAccount;

  const activeFlows = await getActiveFlowsByChurchId(church.id);
  const firstActiveFlow = activeFlows && activeFlows.length > 0 ? activeFlows[0] : null;
  const connectUrl = firstActiveFlow && firstActiveFlow.slug ? `/connect/${firstActiveFlow.slug}` : null;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const altarflowLogoUrl = `${siteUrl}/images/Altarflow.svg`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-gray-400 flex flex-col items-center justify-center p-4 text-white">
      <div className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        <div className="mb-8">
          <Image src={altarflowLogoUrl} alt="Altarflow Logo" width={225} height={75} className="mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-6 text-blue-700">
          {t('nfcWelcomeMessage', { churchName: church.name })}
        </h1>
        <div className="space-y-4">
          {shouldShowDonateButton && (
            <Link 
              href={`/${churchSlug}`} 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out"
            >
              {t('nfcDonateButton')}
            </Link>
          )}
          {showConnectButton && connectUrl && (
            <Link 
              href={connectUrl} 
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out"
            >
              {t('nfcConnectButton')}
            </Link>
          )}
          {!shouldShowDonateButton && !showConnectButton && (
            <p className="text-gray-600">
              {t('nfcNoActionsAvailable', 'No actions available at this time.')}
            </p>
          )}
        </div>
      </div>
      <footer className="text-center text-xs py-4 text-white text-opacity-80">
        {new Date().getFullYear()} Altarflow. All rights reserved.
      </footer>
    </div>
  );
}

export default async function NfcLandingPage({ params }: NfcLandingPageProps) {
  const { churchSlug } = await params;
  return <NfcLandingContent churchSlug={churchSlug} />;
}

// Metadata export for page title
export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('NEXT_LOCALE');
  const locale = langCookie?.value === 'es' ? 'es' : 'en'; // Default to 'en'
  const t = await getTranslationsForServer(locale, 'nfc');
  return {
    title: t('nfcLandingPageTitle'),
  };
}
