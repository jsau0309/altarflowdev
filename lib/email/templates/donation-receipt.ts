import { escapeHtml, escapeHtmlAttribute, escapeUrl, escapeAndValidateUrl } from '@/lib/email/escape-html';

// Import translation files
import receiptsEn from '@/locales/en/receipts.json';
import receiptsEs from '@/locales/es/receipts.json';

export interface DonationReceiptData {
  transactionId: string;
  confirmationNumber: string;
  datePaid: string;
  amountPaid: string;
  currency: string;
  paymentMethod: string;
  cardLastFour?: string;
  cardBrand?: string;
  churchName: string;
  churchEin: string;
  churchAddress: string;
  churchEmail: string;
  churchPhone: string;
  churchLogoUrl?: string;
  donorName: string;
  donorEmail: string;
  donorAddress: string;
  donorPhone?: string;
  donationCampaign: string;
  donationFrequency: 'one-time' | 'monthly' | 'weekly';
  language: 'en' | 'es';
}

// Helper function to get translations based on language with validation
function getReceiptTranslations(language: 'en' | 'es') {
  const translations = language === 'es' ? receiptsEs : receiptsEn;

  // Validate that essential translation keys exist
  if (!translations || !translations.header || !translations.greeting || !translations.thankYouMessage) {
    console.error(`[Receipt] Missing critical translations for language: ${language}, falling back to English`);
    return receiptsEn; // Fallback to English
  }

  return translations;
}

// Helper function to format date based on locale
function formatDate(dateString: string, language: 'en' | 'es'): string {
  try {
    const date = new Date(dateString);
    const locale = language === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function generateDonationReceiptHtml(data: DonationReceiptData, appUrl: string = ''): string {
  const t = getReceiptTranslations(data.language);

  // Format payment method display
  const formatPaymentMethod = () => {
    if (data.cardBrand && data.cardLastFour) {
      return `Card •••• ${data.cardLastFour}`;
    }
    return data.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format address for display
  const formatAddress = (address: string) => escapeHtml(address).replace(/\n/g, '<br>');

  // Generate confirmation number if not provided
  const confirmationNumber = data.confirmationNumber || data.transactionId.substring(0, 20).toUpperCase();

  // Format frequency display
  const formatFrequency = () => {
    const freq = data.donationFrequency;
    if (freq === 'one-time') return t.frequencies.oneTime;
    if (freq === 'monthly') return t.frequencies.monthly;
    if (freq === 'weekly') return t.frequencies.weekly;
    // Fallback for any unexpected values
    return t.frequencies.oneTime;
  };

  // Get donor first name for greeting
  const donorFirstName = data.donorName?.split(' ')?.[0] || 'there';

  // Format date with proper locale
  const formattedDate = formatDate(data.datePaid, data.language);

  return `
<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(t.header.title)} - ${escapeHtml(data.churchName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f8f9fa;
      padding: 20px 0;
    }

    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    .container {
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .header {
      text-align: center;
      padding: 48px 40px 32px;
      background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
      border-bottom: 1px solid #eef0f2;
    }

    .logo {
      max-width: 160px;
      max-height: 64px;
      margin-bottom: 24px;
    }

    .header-title {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .header-subtitle {
      font-size: 15px;
      color: #6b7280;
      font-weight: 400;
    }

    .content {
      padding: 40px;
    }

    .greeting {
      font-size: 16px;
      color: #1a1a1a;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .thank-you-message {
      font-size: 15px;
      color: #4b5563;
      line-height: 1.7;
      margin-bottom: 32px;
    }

    .receipt-card {
      background: #fafbfc;
      border: 1px solid #eef0f2;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid #e5e7eb;
      gap: 16px;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-size: 15px;
      color: #6b7280;
      font-weight: 400;
      flex-shrink: 0;
    }

    .detail-value {
      font-size: 15px;
      color: #1a1a1a;
      font-weight: 500;
      text-align: right;
      flex: 1;
      display: flex;
      justify-content: flex-end;
    }

    .confirmation-badge {
      background-color: #fff;
      border: 1px solid #e5e7eb;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 13px;
      color: #1a1a1a;
      font-weight: 500;
      display: inline-block;
    }

    .amount-highlight {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }

    .amount-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .amount-value {
      font-size: 36px;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .amount-currency {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      margin-left: 4px;
    }

    .billing-card {
      background: #fafbfc;
      border: 1px solid #eef0f2;
      border-radius: 8px;
      padding: 24px;
    }

    .billing-info {
      font-size: 15px;
      line-height: 1.7;
      color: #4b5563;
    }

    .billing-info strong {
      color: #1a1a1a;
      font-weight: 600;
      display: block;
      margin-bottom: 4px;
    }

    .billing-info a {
      color: #3b82f6;
      text-decoration: none;
    }

    .billing-info a:hover {
      text-decoration: underline;
    }

    .footer {
      padding: 32px 40px;
      background-color: #fafbfc;
      border-top: 1px solid #eef0f2;
      text-align: center;
    }

    .footer-branding {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 12px;
    }

    .footer-branding .heart {
      color: #ef4444;
    }

    .footer-logo {
      max-width: 120px;
      height: auto;
      margin: 0 auto 16px;
      display: block;
    }

    .footer-copyright {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 16px;
    }

    .footer-links {
      font-size: 13px;
    }

    .footer-links a {
      color: #6b7280;
      text-decoration: none;
      transition: color 0.2s;
    }

    .footer-links a:hover {
      color: #3b82f6;
    }

    .footer-links .separator {
      color: #d1d5db;
      margin: 0 12px;
    }

    .spacer {
      height: 20px;
    }

    @media only screen and (max-width: 600px) {
      body {
        padding: 0;
      }

      .container {
        border-radius: 0;
      }

      .header {
        padding: 32px 24px 24px;
      }

      .content {
        padding: 32px 24px;
      }

      .receipt-card,
      .billing-card {
        padding: 20px;
      }

      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        padding: 12px 0;
        gap: 8px;
      }

      .detail-value {
        margin-top: 0;
        text-align: left;
        max-width: 100%;
        display: block;
        justify-content: flex-start;
        width: 100%;
      }

      .amount-value {
        font-size: 32px;
      }

      .footer {
        padding: 24px;
      }

      .footer-links .separator {
        margin: 0 8px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        ${data.churchLogoUrl ? `<img src="${escapeAndValidateUrl(data.churchLogoUrl)}" alt="${escapeHtmlAttribute(data.churchName)}" class="logo">` : ''}
        <div class="header-title">${escapeHtml(t.header.title)}</div>
        <div class="header-subtitle">${escapeHtml(formattedDate)}</div>
      </div>

      <!-- Content -->
      <div class="content">
        <p class="greeting">${escapeHtml(t.greeting.replace('{{name}}', donorFirstName))}</p>

        <p class="thank-you-message">
          ${t.thankYouMessage.replace('{{churchName}}', `<strong>${escapeHtml(data.churchName)}</strong>`).replace(/<strong><strong>/g, '<strong>').replace(/<\/strong><\/strong>/g, '</strong>')}
        </p>

        <!-- Amount Highlight -->
        <div class="amount-highlight">
          <div class="amount-label">${escapeHtml(t.amountLabel)}</div>
          <div>
            <span class="amount-value">$${escapeHtml(data.amountPaid)}</span>
            <span class="amount-currency">${escapeHtml(data.currency.toUpperCase())}</span>
          </div>
        </div>

        <!-- Receipt Details -->
        <div class="receipt-card">
          <div class="card-title">${escapeHtml(t.transactionDetailsTitle)}</div>

          <div class="detail-row">
            <div class="detail-label">${escapeHtml(t.confirmationNumber)}:</div>
            <div class="detail-value">
              <span class="confirmation-badge">${escapeHtml(confirmationNumber)}</span>
            </div>
          </div>

          <div class="detail-row">
            <div class="detail-label">${escapeHtml(t.campus)}:</div>
            <div class="detail-value">${escapeHtml(t.mainCampus)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">${escapeHtml(t.fund)}:</div>
            <div class="detail-value">${escapeHtml(data.donationCampaign)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">${escapeHtml(t.frequency)}:</div>
            <div class="detail-value">${escapeHtml(formatFrequency())}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">${escapeHtml(t.paymentMethod)}:</div>
            <div class="detail-value">${escapeHtml(formatPaymentMethod())}</div>
          </div>
        </div>

        <!-- Billing Information -->
        <div class="billing-card">
          <div class="card-title">${escapeHtml(t.billingTitle)}</div>
          <div class="billing-info">
            <strong>${escapeHtml(data.donorName)}</strong>
            <a href="mailto:${escapeUrl(data.donorEmail)}">${escapeHtml(data.donorEmail)}</a><br>
            ${data.donorPhone ? `${escapeHtml(data.donorPhone)}<br>` : ''}
            ${formatAddress(data.donorAddress)}
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-branding">
          ${t.footer.branding.replace('❤', '<span class="heart">❤</span>')}
        </div>

        <img src="${appUrl}/images/email-logo.png" alt="Altarflow" class="footer-logo">

        <div class="footer-copyright">
          ${escapeHtml(t.footer.copyright)}
        </div>

        <div class="footer-links">
          <a href="${appUrl}/terms-of-service">${escapeHtml(t.footer.termsOfService)}</a>
          <span class="separator">•</span>
          <a href="${appUrl}/privacy-policy">${escapeHtml(t.footer.privacyPolicy)}</a>
          <span class="separator">•</span>
          <a href="mailto:hola@altarflow.com">${escapeHtml(t.footer.contactSupport)}</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
