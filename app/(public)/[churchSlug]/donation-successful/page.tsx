// app/[churchSlug]/donation-successful/page.tsx
import { use as useReact } from 'react';
import { notFound } from 'next/navigation';
import { getChurchBySlug } from '@/lib/actions/church.actions';
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';
import { DonationSuccessfulContent } from '@/components/donation/donation-successful-content';


interface PageProps {
  params: Promise<{
    churchSlug: string;
  }>;
}

export default function DonationSuccessfulPage(props: PageProps) {
  const params = useReact(props.params);
  const churchSlug = params.churchSlug;

  // Fetch church and landing config
  const churchDataPromise = getChurchBySlug(churchSlug);
  const churchData = useReact(churchDataPromise);

  if (!churchData) {
    notFound();
  }

  const { church } = churchData;

  // Fetch landing page configuration for branding
  const landingConfigPromise = prisma.landingPageConfig.findUnique({
    where: { churchId: church.id }
  });
  const landingConfig = useReact(landingConfigPromise);

  // Get background style from landing config or use default
  const backgroundStyle = landingConfig
    ? getBackgroundStyle(landingConfig.backgroundType, landingConfig.backgroundValue)
    : 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';

  // Get church logo from landing config or use default
  const logoUrl = landingConfig?.logoUrl || '/images/Altarflow.svg';

  // Get display title - use customTitle from landing config or fall back to church name
  const displayTitle = landingConfig?.customTitle || church.name;

  return (
    <DonationSuccessfulContent
      churchSlug={churchSlug}
      backgroundStyle={backgroundStyle}
      logoUrl={logoUrl}
      displayTitle={displayTitle}
    />
  );
}
