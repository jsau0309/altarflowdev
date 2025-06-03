import { notFound } from 'next/navigation';
import { getPublicFlowBySlug } from '@/lib/actions/flows.actions';
import ConnectForm from '@/components/connect/connect-form'; // Adjust path if created elsewhere

// Ensure page is dynamically rendered
export const dynamic = "force-dynamic"; 

interface ConnectPageProps {
  params: {
    flowSlug: string;
  };
}

export default async function ConnectFlowPage({ params }: ConnectPageProps) {
  const { flowSlug } = params;

  if (!flowSlug) {
    console.log("ConnectFlowPage: No flowSlug in params.");
    notFound(); // Slug is required
  }

  const flowData = await getPublicFlowBySlug(flowSlug);

  // Handle flow not found or disabled
  if (!flowData) {
    console.log(`ConnectFlowPage: Flow not found or disabled for slug: ${flowSlug}`);
    // You could render a specific "Not Found" component here
    // or use Next.js notFound() to render the default 404 page.
    notFound();
  }

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
      <div className="container mx-auto py-8 text-center text-destructive">
        <h1>Error Loading Form Configuration</h1>
        <p>There was a problem loading the form settings. Please try again later.</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-8 flex flex-col justify-center sm:py-12" 
      style={{ background: 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)' }}
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