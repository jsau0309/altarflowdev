import { escapeHtml, escapeUrl } from '@/lib/email/escape-html';

export interface NewMemberWelcomeData {
  firstName: string;
  churchName: string;
  churchLogoUrl?: string;
  churchEmail: string;
  churchPhone: string;
  churchAddress: string;
  serviceTimes?: { day: string; time: string }[];
  ministries?: { name: string }[];
  language: 'en' | 'es';
}

export function generateNewMemberWelcomeHtml(data: NewMemberWelcomeData, appUrl: string = ''): string {
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
  const subjectText = isSpanish ? `¡Bienvenido(a) a ${data.churchName}!` : `Welcome to ${data.churchName}!`;
  const greetingText = isSpanish ? `Hola ${data.firstName},` : `Hello ${data.firstName},`;
  const thankYouText = isSpanish 
    ? `Gracias por conectarte con ${data.churchName}. ¡Estamos emocionados de que te unas a nuestra comunidad!` 
    : `Thank you for connecting with ${data.churchName}. We're thrilled to have you join our community!`;
  const getInvolvedTitle = isSpanish ? `Formas de Participar` : `Ways to Get Involved`;
  const serviceTimesTitle = isSpanish ? `Horarios de Servicio` : `Service Times`;
  const ministriesTitle = isSpanish ? `Ministerios y Grupos` : `Ministries & Groups`;
  const _stayConnectedTitle = isSpanish ? `Mantente Conectado` : `Stay Connected`;
  const questionsTitle = isSpanish ? `¿Tienes Preguntas?` : `Have Questions?`;
  const questionsText = isSpanish 
    ? `Estamos aquí para ayudarte. No dudes en contactarnos si tienes alguna pregunta o necesitas más información.`
    : `We're here to help! Feel free to reach out if you have any questions or need more information.`;
  const blessingsText = isSpanish ? `Bendiciones,` : `Blessings,`;
  const teamText = isSpanish ? `El Equipo de ${data.churchName}` : `The ${data.churchName} Team`;

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
    
    .welcome-title {
      color: #333;
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .content {
      padding: 40px;
    }
    
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
      font-weight: 500;
    }
    
    .intro-text {
      font-size: 16px;
      color: #555;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    
    .section {
      margin-bottom: 35px;
      padding: 25px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #5a67d8;
    }
    
    .section-title {
      color: #333;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
    }
    
    .service-times-list, .ministries-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .service-times-list li, .ministries-list li {
      padding: 8px 0;
      font-size: 15px;
      color: #555;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .service-times-list li:last-child, .ministries-list li:last-child {
      border-bottom: none;
    }
    
    .service-time-day {
      font-weight: 600;
      color: #333;
    }
    
    .contact-section {
      background-color: #eff6ff;
      padding: 25px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .contact-info {
      font-size: 15px;
      line-height: 1.8;
      color: #555;
      margin-top: 10px;
    }
    
    .contact-info a {
      color: #5a67d8;
      text-decoration: none;
    }
    
    .closing {
      font-size: 16px;
      color: #333;
      margin-top: 30px;
    }
    
    .signature {
      font-weight: 600;
      color: #333;
      margin-top: 5px;
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
      
      .section {
        padding: 20px;
      }
      
      .welcome-title {
        font-size: 24px;
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
      ${data.churchLogoUrl ? `<img src="${data.churchLogoUrl}" alt="${data.churchName}" class="logo">` : ''}
      <h1 class="welcome-title">${subjectText}</h1>
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="greeting">${greetingText}</p>
      
      <p class="intro-text">${thankYouText}</p>
      
      <!-- Get Involved Section -->
      ${(data.serviceTimes && data.serviceTimes.length > 0) || (data.ministries && data.ministries.length > 0) ? `
      <div class="section">
        <h2 class="section-title">${getInvolvedTitle}</h2>
        
        ${data.serviceTimes && data.serviceTimes.length > 0 ? `
        <h3 style="font-size: 16px; color: #555; margin-bottom: 10px; font-weight: 600;">${serviceTimesTitle}</h3>
        <ul class="service-times-list">
          ${data.serviceTimes.map(st => `
          <li>
            <span class="service-time-day">${escapeHtml(st.day)}:</span> ${escapeHtml(st.time)}
          </li>
          `).join('')}
        </ul>
        ` : ''}
        
        ${data.ministries && data.ministries.length > 0 ? `
        <h3 style="font-size: 16px; color: #555; margin-top: 20px; margin-bottom: 10px; font-weight: 600;">${ministriesTitle}</h3>
        <ul class="ministries-list">
          ${data.ministries.map(m => `<li>${escapeHtml(m.name)}</li>`).join('')}
        </ul>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Contact Section -->
      <div class="contact-section">
        <h2 class="section-title" style="margin-bottom: 10px;">${questionsTitle}</h2>
        <p style="font-size: 15px; color: #555; margin-bottom: 15px;">${questionsText}</p>
        <div class="contact-info">
          ${data.churchEmail ? `<a href="mailto:${escapeUrl(data.churchEmail)}">${escapeHtml(data.churchEmail)}</a><br>` : ''}
          ${data.churchPhone ? `${escapeHtml(formatPhoneNumber(data.churchPhone))}<br>` : ''}
          ${data.churchAddress ? `${escapeHtml(data.churchAddress).replace(/\n/g, '<br>')}` : ''}
        </div>
      </div>
      
      <div class="closing">
        <p>${blessingsText}</p>
        <p class="signature">${teamText}</p>
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