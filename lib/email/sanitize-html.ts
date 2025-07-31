import DOMPurify from 'isomorphic-dompurify';

// Define allowed tags and attributes for email content
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'i', 'b',
  'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead',
  'blockquote', 'hr', 'pre', 'code', 'center', 'font',
  // Email-specific tags
  'mj-section', 'mj-column', 'mj-text', 'mj-image', 'mj-button',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'style', 'class', 'id',
  'width', 'height', 'align', 'valign', 'bgcolor', 'color',
  'cellpadding', 'cellspacing', 'border', 'target', 'rel',
  // Email-specific attributes
  'data-*', 'mc:*', 'mj-*'
];

export function sanitizeEmailHtml(html: string): string {
  // Configure DOMPurify for email content
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true, // Allow data attributes for email builders
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onfocus', 'onblur'],
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: true,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    IN_PLACE: false
  });

  return clean;
}

// Helper function to sanitize subject lines (remove any HTML/scripts)
export function sanitizeEmailSubject(subject: string): string {
  return DOMPurify.sanitize(subject, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}