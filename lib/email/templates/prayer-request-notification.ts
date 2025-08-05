import { escapeHtml, escapeHtmlAttribute, escapeUrl, escapeAndValidateUrl } from '@/lib/email/escape-html';

export interface PrayerRequestNotificationData {
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string;
  prayerRequest: string;
  churchName: string;
  churchLogoUrl?: string;
  language: 'en' | 'es';
  submittedAt: string;
}

export function generatePrayerRequestNotificationHtml(data: PrayerRequestNotificationData, appUrl: string = ''): string {
  const isSpanish = data.language === 'es';

  // Format phone number to (xxx) xxx-xxxx
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone; // Return original if not 10 digits
  };

  // Translations
  const subjectText = isSpanish 
    ? `Nueva Petición de Oración - ${escapeHtml(data.submitterName)}` 
    : `New Prayer Request - ${escapeHtml(data.submitterName)}`;
  
  const headerTitle = isSpanish ? `Nueva Petición de Oración` : `New Prayer Request`;
  const receivedText = isSpanish 
    ? `Has recibido una nueva petición de oración:` 
    : `You have received a new prayer request:`;
  
  const detailsTitle = isSpanish ? `Detalles del Solicitante` : `Requester Details`;
  const nameLabel = isSpanish ? `Nombre` : `Name`;
  const emailLabel = isSpanish ? `Correo Electrónico` : `Email`;
  const phoneLabel = isSpanish ? `Teléfono` : `Phone`;
  const submittedLabel = isSpanish ? `Enviado` : `Submitted`;
  
  const requestTitle = isSpanish ? `Petición de Oración` : `Prayer Request`;
  
  const instructionsTitle = isSpanish ? `Próximos Pasos` : `Next Steps`;
  const instructionsText = isSpanish 
    ? `Por favor, incluye esta petición en tus oraciones y considera contactar al miembro si es apropiado.`
    : `Please include this request in your prayers and consider reaching out to the member if appropriate.`;
  
  const confidentialityNote = isSpanish
    ? `Esta información es confidencial y debe ser tratada con respeto y discreción.`
    : `This information is confidential and should be handled with care and discretion.`;

  // Format the submitted date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(isSpanish ? 'es' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return `
<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectText}</title>
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
      border-bottom: 3px solid #5a67d8;
    }
    
    .logo {
      max-width: 180px;
      max-height: 72px;
      margin-bottom: 20px;
    }
    
    .header-title {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #333;
    }
    
    .header-subtitle {
      font-size: 16px;
      color: #666;
    }
    
    .content {
      padding: 40px;
    }
    
    .intro-text {
      font-size: 16px;
      color: #555;
      margin-bottom: 30px;
    }
    
    .details-card {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 30px;
      border: 1px solid #e0e0e0;
    }
    
    .details-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
    }
    
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      flex: 0 0 140px;
      font-weight: 600;
      color: #555;
      font-size: 14px;
    }
    
    .detail-value {
      flex: 1;
      color: #333;
      font-size: 14px;
    }
    
    .detail-value a {
      color: #5a67d8;
      text-decoration: none;
    }
    
    .prayer-request-section {
      background-color: #fff8f1;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 30px;
      border: 2px solid #fbbf24;
    }
    
    .prayer-icon {
      text-align: center;
      font-size: 40px;
      margin-bottom: 15px;
    }
    
    .prayer-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .prayer-text {
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      border-left: 4px solid #fbbf24;
      white-space: pre-wrap;
    }
    
    .instructions {
      background-color: #eff6ff;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .instructions-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }
    
    .instructions-text {
      font-size: 14px;
      color: #555;
      line-height: 1.6;
    }
    
    .confidentiality {
      background-color: #fef3c7;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
      font-size: 13px;
      color: #92400e;
      margin-top: 20px;
    }
    
    .footer {
      padding: 30px 40px;
      background-color: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      text-align: center;
    }
    
    .footer-text {
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
        padding: 30px 20px;
      }
      
      .detail-row {
        flex-direction: column;
      }
      
      .detail-label {
        margin-bottom: 5px;
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
      <h1 class="header-title">${headerTitle}</h1>
      <p class="header-subtitle">${escapeHtml(data.churchName)}</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="intro-text">${receivedText}</p>
      
      <!-- Requester Details -->
      <div class="details-card">
        <h2 class="details-title">${detailsTitle}</h2>
        <div class="detail-row">
          <div class="detail-label">${nameLabel}:</div>
          <div class="detail-value">${escapeHtml(data.submitterName)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">${emailLabel}:</div>
          <div class="detail-value">
            <a href="mailto:${escapeUrl(data.submitterEmail)}">${escapeHtml(data.submitterEmail)}</a>
          </div>
        </div>
        ${data.submitterPhone ? `
        <div class="detail-row">
          <div class="detail-label">${phoneLabel}:</div>
          <div class="detail-value">${escapeHtml(formatPhoneNumber(data.submitterPhone))}</div>
        </div>
        ` : ''}
        <div class="detail-row">
          <div class="detail-label">${submittedLabel}:</div>
          <div class="detail-value">${formatDate(data.submittedAt)}</div>
        </div>
      </div>
      
      <!-- Prayer Request -->
      <div class="prayer-request-section">
        <div class="prayer-icon">🙏</div>
        <h2 class="prayer-title">${requestTitle}</h2>
        <div class="prayer-text">${escapeHtml(data.prayerRequest)}</div>
      </div>
      
      <!-- Instructions -->
      <div class="instructions">
        <h3 class="instructions-title">${instructionsTitle}</h3>
        <p class="instructions-text">${instructionsText}</p>
      </div>
      
      <!-- Confidentiality Note -->
      <div class="confidentiality">
        ⚠️ ${confidentialityNote}
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
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