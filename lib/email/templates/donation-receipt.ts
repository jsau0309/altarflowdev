import { escapeHtml, escapeHtmlAttribute, escapeUrl, escapeAndValidateUrl } from '@/lib/email/escape-html';

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
  disclaimer?: string;
}

export function generateDonationReceiptHtml(data: DonationReceiptData, appUrl: string = ''): string {
  // Format payment method display
  const formatPaymentMethod = () => {
    if (data.cardBrand && data.cardLastFour) {
      return `${data.cardBrand} - ${data.cardLastFour}`;
    }
    return data.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format address for display
  const formatAddress = (address: string) => escapeHtml(address).replace(/\n/g, '<br>');

  // Generate confirmation number if not provided
  const confirmationNumber = data.confirmationNumber || data.transactionId.substring(0, 20).toUpperCase();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for your contribution to ${escapeHtml(data.churchName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
    }
    
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background-color: #ffffff;
    }
    
    .logo {
      max-width: 180px;
      max-height: 72px;
      margin-bottom: 20px;
    }
    
    .overflow-title {
      color: #e74c3c;
      font-size: 32px;
      font-weight: 400;
      margin-bottom: 30px;
    }
    
    .content {
      padding: 0 40px 40px;
    }
    
    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    
    .thank-you {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    
    .thank-you strong {
      font-weight: 600;
    }
    
    .receipt-notice {
      font-size: 16px;
      color: #333;
      margin-bottom: 40px;
    }
    
    .details-section {
      margin-bottom: 30px;
    }
    
    .detail-row {
      display: table;
      width: 100%;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .detail-label {
      display: table-cell;
      width: 40%;
      font-size: 15px;
      color: #666;
      vertical-align: top;
    }
    
    .detail-value {
      display: table-cell;
      width: 60%;
      font-size: 15px;
      color: #333;
      font-weight: 500;
      text-align: right;
      vertical-align: top;
    }
    
    .confirmation-number {
      background-color: #f8f9fa;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
    
    .total-row {
      border-bottom: 2px solid #333;
      padding: 16px 0;
      margin-top: 10px;
    }
    
    .total-row .detail-value {
      font-size: 18px;
      font-weight: 600;
    }
    
    .billing-section {
      margin-top: 30px;
    }
    
    .billing-info {
      font-size: 15px;
      line-height: 1.8;
      color: #333;
    }
    
    .billing-info a {
      color: #5a67d8;
      text-decoration: none;
    }
    
    .footer {
      padding: 30px 40px;
      background-color: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }
    
    .overflow-text {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
      margin-bottom: 10px;
    }
    
    .footer-copyright {
      font-size: 12px;
      color: #999;
      margin-bottom: 15px;
    }
    
    .footer-links {
      margin-top: 20px;
      font-size: 13px;
    }
    
    .footer-links a {
      color: #5a67d8;
      text-decoration: none;
    }
    
    .footer-links .separator {
      color: #999;
      margin: 0 10px;
      font-size: 12px;
    }
    
    @media only screen and (max-width: 600px) {
      .content {
        padding: 0 20px 30px;
      }
      
      .detail-label, .detail-value {
        display: block;
        width: 100%;
        text-align: left;
      }
      
      .detail-value {
        margin-top: 5px;
        font-weight: 600;
      }
      
      .footer {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${data.churchLogoUrl ? `<img src="${escapeAndValidateUrl(data.churchLogoUrl)}" alt="${escapeHtmlAttribute(data.churchName)}" class="logo">` : ''}
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="greeting">Hello ${escapeHtml(data.donorName?.split(' ')?.[0] || 'Friend')},</p>
      
      <p class="thank-you">
        Thank you for your donation to <strong>${escapeHtml(data.churchName)}!</strong>
      </p>
      
      <p class="receipt-notice">
        Below you'll find a copy of your receipt and donation confirmation. Please keep it for your records.
      </p>
      
      <!-- Receipt Details -->
      <div class="details-section">
        <div class="detail-row">
          <div class="detail-label">Confirmation No.</div>
          <div class="detail-value">
            <span class="confirmation-number">${escapeHtml(confirmationNumber)}</span>
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Campus</div>
          <div class="detail-value">Main Campus</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Fund</div>
          <div class="detail-value">${escapeHtml(data.donationCampaign)}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Frequency</div>
          <div class="detail-value">${escapeHtml(data.donationFrequency === 'one-time' ? 'One Time' : data.donationFrequency.charAt(0).toUpperCase() + data.donationFrequency.slice(1))}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Card</div>
          <div class="detail-value">${escapeHtml(formatPaymentMethod())}</div>
        </div>
        
        <div class="detail-row total-row">
          <div class="detail-label">Total</div>
          <div class="detail-value">$${escapeHtml(data.amountPaid)} ${escapeHtml(data.currency.toUpperCase())}</div>
        </div>
      </div>
      
      <!-- Billing Information -->
      <div class="billing-section">
        <div class="detail-row">
          <div class="detail-label">Billing</div>
          <div class="detail-value">
            <div class="billing-info">
              <strong>${escapeHtml(data.donorName)}</strong><br>
              <a href="mailto:${escapeUrl(data.donorEmail)}">${escapeHtml(data.donorEmail)}</a><br>
              ${data.donorPhone ? `${escapeHtml(data.donorPhone)}<br>` : ''}
              ${formatAddress(data.donorAddress)}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="overflow-text">
        Built with ❤️ for churches worldwide
      </div>
      
      <div class="footer-copyright">
        ©2025 Altarflow. All rights reserved.
      </div>
      
      <div class="footer-links">
        <a href="${appUrl}/terms-of-service">Terms of Service</a>
        <span class="separator">•</span>
        <a href="${appUrl}/privacy-policy">Privacy Policy</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}