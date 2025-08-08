"use client"

// import { DashboardLayout } from "@/components/dashboard-layout"
import { BankingContent } from "@/components/banking-content"
import { Suspense } from "react"
import LoaderOne from "@/components/ui/loader-one"

export default function BankingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <LoaderOne />
      </div>
    }>
      <BankingContent />
    </Suspense>
  )
}
