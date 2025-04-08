import type { Metadata } from "next"
import DonationForm from "@/components/donation/donation-form"

export const metadata: Metadata = {
  title: "Donate | Altarflow",
  description: "Support our church with your donation",
}

export default function DonatePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white p-2 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Altarflow</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 px-6 py-8 rounded-lg shadow-md">
          <DonationForm />
        </div>
      </div>
    </div>
  )
}
