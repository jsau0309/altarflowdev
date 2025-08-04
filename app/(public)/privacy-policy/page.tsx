import { LegalPageLayout } from "@/components/landing/legal-page-layout"

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p>
        Welcome to Altarflow's Privacy Policy. This section is a placeholder. You can replace this text with your own
        privacy policy content.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
      <p>
        [Content coming soon] Please describe the types of information you collect from your users, such as personal
        data (name, email address), usage data, cookies, etc.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
      <p>
        [Content coming soon] Explain how you use the collected information. For example, to provide and maintain your
        service, to notify users about changes, to provide customer support, etc.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-4">3. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at support@altarflow.com.</p>
    </LegalPageLayout>
  )
}
