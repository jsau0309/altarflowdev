import { LegalPageLayout } from "@/components/landing/legal-page-layout"

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <LegalPageLayout title="Privacy Policy">
      <div className="text-sm text-gray-600 mb-8">
        <p><strong>Effective Date:</strong> {currentDate}</p>
      </div>

      {/* Section 1 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
      <p className="mb-4">
        AU Sigma LLC ("we," "us," or "our") operates Altarflow, a church management platform ("Service"). 
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="font-semibold mb-2">Contact Information:</p>
        <ul className="space-y-1">
          <li>• Company: AU Sigma LLC</li>
          <li>• Email: <a href="mailto:hola@altarflow.com" className="text-[#3B82F6] hover:underline">hola@altarflow.com</a></li>
          <li>• Address: San Francisco, CA</li>
        </ul>
      </div>

      {/* Section 2 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
      
      <h3 className="text-xl font-semibold mb-3 mt-6">Personal Information</h3>
      <p className="mb-2">We collect the following personal information when you register and use our Service:</p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Full name (first and last name)</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Mailing address</li>
        <li>Organization information (church name, nonprofit status)</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3">Financial Information</h3>
      <ul className="list-disc pl-6 space-y-2 mb-4">
        <li>Donation amounts and payout data</li>
        <li>Processing fees</li>
      </ul>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <p className="text-sm font-semibold text-blue-800">
          Note: We do not store credit card information or billing addresses. All payment processing is handled securely by Stripe.
        </p>
      </div>

      <h3 className="text-xl font-semibold mb-3">Usage Information</h3>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Account activity and feature usage</li>
        <li>Communication logs within the platform</li>
        <li>Error reports and performance data (via Sentry)</li>
        <li>Analytics data about how you use our Service (via PostHog)</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3">Content You Upload</h3>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Photos and images for newsletters</li>
        <li>Church member information you choose to store</li>
        <li>Communication content and records</li>
      </ul>

      {/* Section 3 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
      <p className="mb-2">We use your information to:</p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Provide and maintain our Service</li>
        <li>Process donations and manage payouts through Stripe</li>
        <li>Authenticate your account (via Clerk)</li>
        <li>Send service-related communications</li>
        <li>Provide customer support</li>
        <li>Improve our Service through analytics</li>
        <li>Send marketing communications (with your consent)</li>
        <li>Comply with legal obligations</li>
      </ul>

      {/* Section 4 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">4. Information Sharing and Disclosure</h2>
      <p className="mb-4">We may share your information with:</p>

      <h3 className="text-xl font-semibold mb-3">Service Providers</h3>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><strong>Stripe:</strong> Payment processing and Connect account management</li>
        <li><strong>Clerk:</strong> User authentication and account management</li>
        <li><strong>Supabase:</strong> Database hosting and management</li>
        <li><strong>HubSpot:</strong> Customer relationship management</li>
        <li><strong>Resend:</strong> Email delivery services</li>
        <li><strong>Topol:</strong> Newsletter creation tools</li>
        <li><strong>Sentry:</strong> Error monitoring and debugging</li>
        <li><strong>PostHog:</strong> Analytics and user behavior insights</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3">Legal Requirements</h3>
      <p className="mb-6">
        We may disclose your information if required by law, legal process, or government request.
      </p>

      <h3 className="text-xl font-semibold mb-3">Business Transfers</h3>
      <p className="mb-4">
        In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
      </p>
      
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <p className="font-semibold text-green-800">
          We do not sell, rent, or trade your personal information to third parties.
        </p>
      </div>

      {/* Section 5 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
      <p className="mb-2">We implement appropriate security measures to protect your information, including:</p>
      <ul className="list-disc pl-6 space-y-2 mb-4">
        <li>Encryption of data in transit and at rest</li>
        <li>Regular security assessments</li>
        <li>Access controls and authentication</li>
        <li>Secure hosting infrastructure</li>
      </ul>
      <p className="mb-6 text-gray-600">
        However, no method of transmission over the internet is 100% secure.
      </p>

      {/* Section 6 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Retention</h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><strong>Active accounts:</strong> We retain your information while your account is active</li>
        <li><strong>Deleted accounts:</strong> We retain your information for 120 days after account deletion</li>
        <li><strong>Legal compliance:</strong> Some information may be retained longer if required by law</li>
      </ul>

      {/* Section 7 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>

      <h3 className="text-xl font-semibold mb-3 mt-6">California Residents (CCPA)</h3>
      <p className="mb-2">If you are a California resident, you have the right to:</p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Know what personal information we collect, use, and disclose</li>
        <li>Request deletion of your personal information</li>
        <li>Opt-out of the sale of personal information (we do not sell information)</li>
        <li>Non-discrimination for exercising your rights</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3">All Users</h3>
      <p className="mb-2">You may:</p>
      <ul className="list-disc pl-6 space-y-2 mb-4">
        <li>Access and update your account information</li>
        <li>Request deletion of your account</li>
        <li>Opt-out of marketing communications</li>
        <li>Contact us with privacy concerns</li>
      </ul>
      <p className="mb-6">
        To exercise these rights, contact us at <a href="mailto:hola@altarflow.com" className="text-[#3B82F6] hover:underline">hola@altarflow.com</a>.
      </p>

      {/* Section 8 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">8. Cookies and Tracking</h2>
      <p className="mb-2">
        We use cookies and similar tracking technologies. Please see our Cookie Policy for detailed information about:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Types of cookies we use</li>
        <li>How to manage cookie preferences</li>
        <li>Third-party tracking (PostHog, Sentry)</li>
      </ul>

      {/* Section 9 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">9. Age Requirements</h2>
      <p className="mb-6">
        Our Service is intended for users 18 years of age and older. We do not knowingly collect information from children under 18.
      </p>

      {/* Section 10 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">10. International Users</h2>
      <p className="mb-6">
        Our Service is currently available only to users in the United States and U.S. territories. 
        By using our Service, you consent to the transfer and processing of your information in the United States.
      </p>

      {/* Section 11 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to This Policy</h2>
      <p className="mb-2">We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Posting the updated policy on our website</li>
        <li>Sending email notification to your registered email address</li>
      </ul>

      {/* Section 12 */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact Us</h2>
      <p className="mb-4">If you have questions about this Privacy Policy, please contact us:</p>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <ul className="space-y-2">
          <li>Email: <a href="mailto:hola@altarflow.com" className="text-[#3B82F6] hover:underline">hola@altarflow.com</a></li>
          <li>Subject Line: "Privacy Policy Inquiry"</li>
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="font-semibold">AU Sigma LLC</p>
          <p>San Francisco, CA</p>
        </div>
      </div>

      {/* Final Statement */}
      <div className="mt-12 pt-8 border-t-2 border-gray-200">
        <div className="bg-blue-50 rounded-lg p-6">
          <p className="text-center font-semibold">
            By using Altarflow, you acknowledge that you have read, understood, and agree to this Privacy Policy.
          </p>
        </div>
      </div>
    </LegalPageLayout>
  )
}