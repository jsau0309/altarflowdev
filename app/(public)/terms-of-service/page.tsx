import { LegalPageLayout } from "@/components/landing/legal-page-layout"

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <p>
        Welcome to Altarflow. These are the terms and conditions for using our service. This section is a placeholder.
        You can replace this text with your own terms of service.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
      <p>
        [Content coming soon] By accessing or using our service, you agree to be bound by these Terms. If you disagree
        with any part of the terms, then you may not access the service.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-4">2. User Accounts</h2>
      <p>
        [Content coming soon] When you create an account with us, you must provide information that is accurate,
        complete, and current at all times. Failure to do so constitutes a breach of the Terms.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-4">3. Governing Law</h2>
      <p>
        [Content coming soon] These Terms shall be governed and construed in accordance with the laws of your
        jurisdiction, without regard to its conflict of law provisions.
      </p>
    </LegalPageLayout>
  )
}
