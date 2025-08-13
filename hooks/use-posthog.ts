import { getPostHog } from '@/lib/posthog/client'

export function usePostHog() {
  const posthog = getPostHog()

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.capture(eventName, properties)
    }
  }

  const trackDonation = (amount: number, donationType: string, paymentMethod: string, churchSlug?: string) => {
    trackEvent('donation_completed', {
      amount,
      donation_type: donationType,
      payment_method: paymentMethod,
      church_slug: churchSlug,
    })
  }

  const trackExpense = (amount: number, category: string) => {
    trackEvent('expense_created', {
      amount,
      category,
    })
  }

  const trackEmailCampaign = (action: 'created' | 'sent' | 'scheduled', recipientCount?: number) => {
    trackEvent(`email_campaign_${action}`, {
      recipient_count: recipientCount,
    })
  }

  const trackMemberAction = (action: 'created' | 'updated' | 'deleted') => {
    trackEvent(`member_${action}`)
  }

  const trackReportGenerated = (reportType: string) => {
    trackEvent('report_generated', {
      report_type: reportType,
    })
  }

  const trackFeatureUsed = (featureName: string) => {
    trackEvent('feature_used', {
      feature_name: featureName,
    })
  }

  return {
    trackEvent,
    trackDonation,
    trackExpense,
    trackEmailCampaign,
    trackMemberAction,
    trackReportGenerated,
    trackFeatureUsed,
  }
}