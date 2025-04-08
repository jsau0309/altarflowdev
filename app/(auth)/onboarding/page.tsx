import { redirect } from 'next/navigation'

export default function OnboardingRootPage() {
  // Redirect to the first step of the onboarding process
  redirect('/onboarding/step-1')
} 