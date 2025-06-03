import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NewMemberFlowSettingsSkeleton() {
  return (
    <div className="w-full overflow-x-hidden">
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-full" />    {/* Description */}
        </CardHeader>
        <CardContent>
          {/* Form URL Section Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-4 w-1/4 mb-2" /> {/* Label */}
            <div className="flex mt-1.5">
              <Skeleton className="h-10 flex-1" /> {/* Input */}
              <Skeleton className="h-10 w-20 ml-2" /> {/* Copy Button */}
              <Skeleton className="h-10 w-28 ml-2" /> {/* Preview Button */}
            </div>
            <Skeleton className="h-4 w-1/2 mt-2" /> {/* Description */}
          </div>

          {/* Tabs Skeleton */}
          <Skeleton className="h-10 w-full mb-4" /> {/* TabsList */}

          {/* Tab Content Skeleton (approximating one tab's content) */}
          <div className="space-y-4 mt-4">
            <div>
              <Skeleton className="h-6 w-1/3 mb-1" /> {/* Section Title */}
              <Skeleton className="h-4 w-3/4" />    {/* Section Description */}
            </div>

            {/* List Items Skeleton (e.g., Service Times or Ministries) */}
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-6" /> {/* Switch */}
                    <Skeleton className="h-4 w-32" /> {/* Item Text */}
                  </div>
                  <Skeleton className="h-8 w-8" /> {/* Remove Button */}
                </div>
              ))}
            </div>

            {/* Add New Item Skeleton */}
            <div className="flex space-x-2">
              <Skeleton className="h-10 flex-1" /> {/* Input */}
              <Skeleton className="h-10 flex-1" /> {/* Input */}
              <Skeleton className="h-10 w-24" />   {/* Add Button */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
