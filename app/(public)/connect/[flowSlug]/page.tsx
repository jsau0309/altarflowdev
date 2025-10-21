import { notFound } from 'next/navigation';
import { getPublicFlowBySlug } from '@/lib/actions/flows.actions';
import ConnectForm from '@/components/connect/connect-form';
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';

// Ensure page is dynamically rendered
export const dynamic = "force-dynamic"; 

interface ConnectPageProps {
  params: Promise<{
    flowSlug: string;
  }>;
}

export default async function ConnectFlowPage({ params }: ConnectPageProps) {
  const { flowSlug } = await params;

  if (!flowSlug) {
    console.log("ConnectFlowPage: No flowSlug in params.");
    notFound(); // Slug is required
  }

  const flowData = await getPublicFlowBySlug(flowSlug);

  // Handle flow not found or disabled
  if (!flowData) {
    console.log(`ConnectFlowPage: Flow not found or disabled for slug: ${flowSlug}`);
    notFound();
  }

  // Get church information and landing config
  const church = await prisma.church.findUnique({
    where: { id: flowData.churchId },
    select: {
      id: true,
      LandingPageConfig: true
    }
  });

  // Get background style from landing config or use default
  const backgroundStyle = church?.LandingPageConfig
    ? getBackgroundStyle(church.LandingPageConfig.backgroundType, church.LandingPageConfig.backgroundValue)
    : 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';

  // TODO: Proper parsing and validation of configJson before passing to client
  let parsedConfig: any;
  try {
    if (typeof flowData.configJson === 'object' && flowData.configJson !== null) {
      // Assuming configJson is already an object from Prisma JSON type
      parsedConfig = flowData.configJson;
    } else {
      throw new Error("Invalid configJson format");
    }
  } catch (error) {
    console.error(`ConnectFlowPage: Error parsing configJson for slug ${flowSlug}:`, error);
    // Handle parsing error - maybe show a generic error message
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="bg-white text-gray-900 p-8 rounded-lg shadow-md max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form Configuration</h1>
          <p className="text-gray-600">There was a problem loading the form settings. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 flex flex-col justify-center sm:py-12"
      style={{ background: backgroundStyle }}
    >
      <div className="container mx-auto">
        {/* Render the new ConnectForm client component, passing required props */}
        <ConnectForm 
          flowId={flowData.id}
          churchName={flowData.churchName}
          // Pass the parsed config safely
          config={parsedConfig} 
        />
      </div>
    </div>
  );
}