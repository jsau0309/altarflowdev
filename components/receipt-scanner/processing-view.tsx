"use client"

import { Loader2 } from "lucide-react"

export function ProcessingView() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="relative mb-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-primary"></div>
        </div>
      </div>
      <h3 className="text-lg font-medium mb-2">Processing Receipt</h3>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Extracting expense details</p>
        <p className="text-xs text-muted-foreground">This may take a few moments...</p>
      </div>
    </div>
  )
}
