import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import Image from 'next/image'; 
import DonationForm from "@/components/donation/donation-form";
import { LanguageToggle } from "@/components/language-toggle"; // Added import
import { getChurchBySlug } from '@/lib/actions/church.actions'; 

interface DonatePageProps {
  params: {
    churchSlug: string;
  };
}

export async function generateMetadata({ params }: DonatePageProps): Promise<Metadata> {
  const churchData = await getChurchBySlug(params.churchSlug);
  if (!churchData) {
    return {
      title: "Church Not Found | Altarflow",
      description: "The requested church could not be found.",
    };
  }
  return {
    title: `Donate to ${churchData.church.name} | Altarflow`,
    description: `Support ${churchData.church.name} with your generous donation.`,
  };
}

export default async function DonatePage({ params }: DonatePageProps) {
  const { churchSlug } = params;
  const churchData = await getChurchBySlug(churchSlug);

  if (!churchData) {
    notFound();
  }

  const { church, donationTypes } = churchData;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900"> {/* Added 'relative' */}
      <div className="absolute top-6 right-6 z-50"> {/* Container for LanguageToggle */}
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md space-y-8">
        {/* New Header Structure */}
        <div className="flex flex-col items-center space-y-4"> 
          <Image
            src="/images/Altarflow.svg"
            alt="Altarflow Logo"
            width={240} 
            height={80}  
            priority 
          />
          <span className="text-xl font-semibold text-gray-700 dark:text-gray-300"> 
            Donate to {church.name}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 px-6 py-8 rounded-lg shadow-md">
          <DonationForm
            churchId={church.id}
            churchName={church.name}
            donationTypes={donationTypes}
          />
        </div>
      </div>
    </div>
  );
}
