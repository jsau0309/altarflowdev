export function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AltarFlow",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Bilingual church management software for Hispanic churches. Manage donations, track expenses, organize members, and send communications.",
    "url": "https://altarflow.com",
    "image": "https://altarflow.com/og-image.png",
    "screenshot": "https://altarflow.com/screenshot.png",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "30-day free trial"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    },
    "provider": {
      "@type": "Organization",
      "name": "AltarFlow",
      "url": "https://altarflow.com",
      "logo": "https://altarflow.com/logo.png",
      "sameAs": [
        "https://twitter.com/altarflow",
        "https://facebook.com/altarflow",
        "https://linkedin.com/company/altarflow"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@altarflow.com",
        "availableLanguage": ["English", "Spanish"]
      }
    },
    "featureList": [
      "Donation Management",
      "Expense Tracking",
      "Member Database",
      "Email Campaigns",
      "Financial Reporting",
      "Bilingual Support",
      "Stripe Integration",
      "Multi-church Support"
    ],
    "softwareVersion": "1.0.0",
    "datePublished": "2024-01-01",
    "dateModified": "2025-01-17"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is AltarFlow?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AltarFlow is a comprehensive church management platform designed specifically for Hispanic churches in the United States. It helps churches manage donations, track expenses, organize member information, and send email communications - all in one bilingual platform."
        }
      },
      {
        "@type": "Question",
        "name": "Is AltarFlow available in Spanish?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! AltarFlow is fully bilingual, supporting both English and Spanish. Users can switch between languages at any time, making it perfect for Hispanic churches serving diverse congregations."
        }
      },
      {
        "@type": "Question",
        "name": "How much does AltarFlow cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AltarFlow offers flexible pricing plans starting with a 30-day free trial. After the trial, churches can choose between monthly or annual subscriptions based on their needs and congregation size."
        }
      },
      {
        "@type": "Question",
        "name": "Can AltarFlow handle online donations?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, AltarFlow integrates with Stripe to process online donations securely. Churches can accept one-time and recurring donations, track donor information, and automatically send tax-deductible receipts."
        }
      },
      {
        "@type": "Question",
        "name": "Is my church data secure with AltarFlow?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. AltarFlow uses enterprise-grade security with encrypted data storage, secure authentication through Clerk, and compliant payment processing through Stripe. Your church and member data is protected with industry-standard security measures."
        }
      }
    ]
  };

  return (
    <>
      <script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema)
        }}
      />
      <script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema)
        }}
      />
    </>
  );
}