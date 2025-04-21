"use client"

import { Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Stepper } from "@/components/onboarding/stepper"
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { useRouter } from "next/navigation"
import { useTranslation } from 'react-i18next'

export default function CompletionStep() {
  const { data } = useOnboarding()
  const router = useRouter()
  const { t } = useTranslation()

  const goToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div>
      <Stepper />

      <div className="p-8 flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-primary" />
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2">{t('onboarding.step4.title', "You're all set!")}</h2>
        <p className="text-gray-600 text-center mb-10 max-w-md">
          {t('onboarding.step4.subtitle', 'Your Altarflow account is now configured and ready to use. You can start tracking donations, managing members, and more.')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl mb-10">
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="font-medium mb-1">{t('dashboard.recordDonation', 'Add Donations')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('onboarding.step4.donationsCard.description', 'Start recording contributions from your congregation.')}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="font-medium mb-1">{t('dashboard.addMember', 'Add Members')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('onboarding.step4.membersCard.description', 'Build your church member database for better management.')}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="font-medium mb-1">{t('campaigns.title', 'Set Up Campaigns')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('onboarding.step4.campaignsCard.description', 'Create fundraising campaigns for specific church needs.')}</p>
          </div>
        </div>

        <Button onClick={goToDashboard} className="px-6">
          {t('sidebar.dashboard', 'Dashboard')} <ArrowRight className="ml-2 w-4 h-4" />
        </Button>

        <p className="text-muted-foreground text-center">
          {t('onboarding.step4.completionNote', "Please don't close this window until the process is complete.")}
        </p>
      </div>
    </div>
  )
}
