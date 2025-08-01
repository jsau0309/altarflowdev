import { Suspense } from "react";
import { UnsubscribeContent } from "./unsubscribe-content";
import { Loader2 } from "lucide-react";

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-12">
      <Suspense 
        fallback={
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}