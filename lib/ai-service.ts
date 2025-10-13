import OpenAI from 'openai';
import { serverEnv } from '@/lib/env';
import { captureLLMEvent } from '@/lib/posthog/server';

// Initialize AI client
const openai = new OpenAI({
  apiKey: serverEnv.OPENAI_API_KEY,
});

export interface AITrackingContext {
  distinctId: string;
  traceId?: string;
  orgId?: string;
}

export type ToneOption = 'friendly' | 'formal' | 'urgent' | 'celebratory' | 'informative';

export interface SubjectLineSuggestion {
  text: string;
  characterCount: number;
  explanation: string;
  bestUseCase: string;
}

export interface PreviewTextSuggestion {
  text: string;
  characterCount: number;
  explanation: string;
}

interface GenerateSubjectLinesParams {
  emailContent: string;
  churchName: string;
  tone: ToneOption;
  eventType?: string;
  currentSubject?: string;
  trackingContext?: AITrackingContext;
}

interface GenerateEmailSuggestionsParams {
  currentSubject?: string;
  currentPreview?: string;
  emailContent: string;
  churchName: string;
  tone: ToneOption;
  language?: 'en' | 'es';
  trackingContext?: AITrackingContext;
}

export interface EmailSuggestion {
  subject: string;
  subjectCharCount: number;
  preview: string;
  previewCharCount: number;
}

export class AIService {
  static async generateSubjectLines({
    emailContent,
    churchName,
    tone,
    eventType,
    currentSubject,
    trackingContext,
  }: GenerateSubjectLinesParams): Promise<SubjectLineSuggestion[]> {
    const startTime = performance.now();
    try {
      const toneDescriptions = {
        friendly: 'warm, welcoming, and conversational',
        formal: 'professional, respectful, and traditional',
        urgent: 'important, time-sensitive, and action-oriented',
        celebratory: 'joyful, exciting, and uplifting',
        informative: 'clear, educational, and straightforward',
      };

      // Sanitize inputs to prevent prompt injection
      const sanitize = (input: string) => input.replace(/[<>{}]/g, '').trim();

      const prompt = `You are an expert email marketer for churches. Generate 5 compelling subject lines for a church email.

Context:
- Church: ${sanitize(churchName)}
- Tone: ${toneDescriptions[tone]}
- Email content summary: ${sanitize(emailContent.substring(0, 500))}...
${eventType ? `- Event type: ${sanitize(eventType)}` : ''}
${currentSubject ? `- User has started typing: "${sanitize(currentSubject)}" (build upon this context and complete/improve their idea)` : ''}

Best practices to follow:
- Keep under 50 characters for mobile optimization
- Avoid spam trigger words (FREE, CLICK HERE, etc.)
- Be specific and relevant to the content
- Create curiosity without being clickbait
- Use action words when appropriate
${currentSubject ? '- Build upon what the user has already typed, maintaining their intended topic' : ''}

For each subject line, provide a JSON object with:
- text: the subject line
- characterCount: number of characters
- explanation: why this subject line is effective (2-3 sentences)
- bestUseCase: when to use this type of subject line

Return only a JSON array of 5 suggestions.`;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000,
      });

      // Track LLM usage with PostHog
      if (trackingContext && response.usage) {
        const latencyMs = performance.now() - startTime;
        // GPT-4o-mini pricing: $0.150 per 1M input tokens, $0.600 per 1M output tokens
        const inputCost = (response.usage.prompt_tokens / 1_000_000) * 0.150;
        const outputCost = (response.usage.completion_tokens / 1_000_000) * 0.600;

        captureLLMEvent({
          distinctId: trackingContext.distinctId,
          traceId: trackingContext.traceId || `email_subject_${Date.now()}`,
          model: 'gpt-4o-mini',
          provider: 'openai',
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalCostUsd: inputCost + outputCost,
          latencyMs,
          properties: {
            feature: 'email_subject_lines',
            tone,
            event_type: eventType,
          },
          groups: trackingContext.orgId ? { company: trackingContext.orgId } : undefined,
        });
      }

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      // Extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure we return an array
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions;
      } else if (parsed.subject_lines && Array.isArray(parsed.subject_lines)) {
        return parsed.subject_lines;
      } else {
        // Try to extract array from the response
        const values = Object.values(parsed);
        const arrayValue = values.find(v => Array.isArray(v));
        if (arrayValue) {
          return arrayValue as SubjectLineSuggestion[];
        }
      }
      
      throw new Error('Invalid response format from AI');
    } catch (error) {
      console.error('Error generating subject lines:', error);
      // Fallback suggestions
      return [
        {
          text: `${churchName} Weekly Update`,
          characterCount: `${churchName} Weekly Update`.length,
          explanation: 'A simple, clear subject line that members will recognize.',
          bestUseCase: 'Regular weekly newsletters',
        },
        {
          text: 'Join Us This Sunday!',
          characterCount: 20,
          explanation: 'Direct call-to-action that encourages attendance.',
          bestUseCase: 'Event invitations or service reminders',
        },
      ];
    }
  }

  static async generateEmailSuggestions({
    currentSubject,
    currentPreview,
    emailContent,
    churchName,
    tone,
    language = 'en',
    trackingContext,
  }: GenerateEmailSuggestionsParams): Promise<EmailSuggestion[]> {
    const startTime = performance.now();
    try{
      const toneDescriptions = {
        en: {
          friendly: 'warm, welcoming, and conversational',
          formal: 'professional, respectful, and traditional',
          urgent: 'important, time-sensitive, and action-oriented',
          celebratory: 'joyful, exciting, and uplifting',
          informative: 'clear, educational, and straightforward',
        },
        es: {
          friendly: 'cálido, acogedor y conversacional',
          formal: 'profesional, respetuoso y tradicional',
          urgent: 'importante, urgente y orientado a la acción',
          celebratory: 'alegre, emocionante y edificante',
          informative: 'claro, educativo y directo',
        },
      };

      const prompt = language === 'es' 
        ? `Eres un experto en marketing para iglesias. Crea 5 sugerencias de campañas de email convincentes para ${churchName} EN ESPAÑOL.

${currentSubject ? `El usuario está trabajando en: "${currentSubject}"
Crea 5 variaciones estratégicas usando técnicas probadas de marketing por email para iglesias:` : 'Crea 5 sugerencias para campañas de email efectivas para iglesias:'}`
        : `You are a church marketing expert. Create 5 compelling email campaign suggestions for ${churchName}.

${currentSubject ? `The user is working on: "${currentSubject}"
Create 5 strategic variations using proven church email marketing techniques:` : 'Create 5 suggestions for effective church email campaigns:'}`;

      const prompt2 = `
${language === 'es' 
        ? `Aplica estos principios de marketing para iglesias:
1. Conexión Comunitaria - Fomenta pertenencia y comunión
2. Impacto Espiritual - Destaca transformación y crecimiento
3. Llamado a la Acción Claro - ¿Qué paso específico deben tomar?
4. Toque Personal - Haz que los destinatarios se sientan vistos y valorados
5. Enfoque Ministerial - Conecta con la misión de tu iglesia`
        : `Apply these church marketing principles:
1. Community Connection - Foster belonging and fellowship
2. Spiritual Impact - Highlight transformation and growth
3. Clear Call-to-Action - What specific step should they take?
4. Personal Touch - Make recipients feel seen and valued
5. Ministry Focus - Connect to your church's mission`}

Tone: ${toneDescriptions[language][tone]}

${language === 'es'
        ? `Cada sugerencia debe usar diferentes enfoques:
- Ángulo de testimonio/historia
- Ángulo de emoción por evento
- Ángulo de crecimiento espiritual
- Ángulo de servicio comunitario
- Ángulo de invitación personal`
        : `Each suggestion should use different approaches:
- Testimonial/Story angle
- Event excitement angle  
- Spiritual growth angle
- Community service angle
- Personal invitation angle`}

${language === 'es'
        ? `Formatea cada uno con:
- Línea de asunto convincente (<50 caracteres) usando palabras poderosas
- Texto de vista previa (35-90 caracteres) que cree curiosidad
- Ambos trabajando juntos para aumentar las tasas de apertura`
        : `Format each with:
- Compelling subject line (<50 chars) using power words
- Preview text (35-90 chars) that creates curiosity
- Both working together to increase open rates`}

${language === 'es' ? 'Devuelve EXACTAMENTE este formato JSON con 5 sugerencias EN ESPAÑOL:' : 'Return EXACTLY this JSON format with 5 suggestions:'}
{
  "suggestions": [
    {"subject": "...", "subjectCharCount": n, "preview": "...", "previewCharCount": n},
    {"subject": "...", "subjectCharCount": n, "preview": "...", "previewCharCount": n},
    {"subject": "...", "subjectCharCount": n, "preview": "...", "previewCharCount": n},
    {"subject": "...", "subjectCharCount": n, "preview": "...", "previewCharCount": n},
    {"subject": "...", "subjectCharCount": n, "preview": "...", "previewCharCount": n}
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Better quality for marketing suggestions
        messages: [{
          role: 'system',
          content: 'You are an expert church marketing consultant who creates compelling, emotionally resonant email campaigns.'
        }, {
          role: 'user',
          content: prompt + prompt2 + (language === 'es' ? '\n\nIMPORTANTE: Todas las sugerencias deben estar en español.' : '')
        }],
        temperature: 0.9, // Higher creativity
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      // Track LLM usage with PostHog
      if (trackingContext && response.usage) {
        const latencyMs = performance.now() - startTime;
        const inputCost = (response.usage.prompt_tokens / 1_000_000) * 0.150;
        const outputCost = (response.usage.completion_tokens / 1_000_000) * 0.600;

        captureLLMEvent({
          distinctId: trackingContext.distinctId,
          traceId: trackingContext.traceId || `email_suggestions_${Date.now()}`,
          model: 'gpt-4o-mini',
          provider: 'openai',
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalCostUsd: inputCost + outputCost,
          latencyMs,
          properties: {
            feature: 'email_campaign_suggestions',
            tone,
            language,
          },
          groups: trackingContext.orgId ? { company: trackingContext.orgId } : undefined,
        });
      }

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      // Parse JSON response (with response_format, it should be valid JSON)
      const parsed = JSON.parse(content);
      
      // Handle both array and object with suggestions property
      let suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || parsed.items || []);
      
      // Validate and return
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return suggestions.slice(0, 5).map(item => ({
          subject: item.subject || '',
          subjectCharCount: item.subjectCharCount || item.subject?.length || 0,
          preview: item.preview || '',
          previewCharCount: item.previewCharCount || item.preview?.length || 0,
        }));
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error generating email suggestions:', error);
      // Fallback suggestions
      if (language === 'es') {
        const fallbackSubject = currentSubject || `Actualización de ${churchName}`;
        return [
          {
            subject: fallbackSubject,
            subjectCharCount: fallbackSubject.length,
            preview: 'Únete a nosotros para adoración y próximos eventos',
            previewCharCount: 49,
          },
          {
            subject: `Esta Semana en ${churchName}`,
            subjectCharCount: `Esta Semana en ${churchName}`.length,
            preview: 'Anuncios importantes y peticiones de oración',
            previewCharCount: 44,
          },
        ];
      } else {
        const fallbackSubject = currentSubject || `${churchName} Update`;
        return [
          {
            subject: fallbackSubject,
            subjectCharCount: fallbackSubject.length,
            preview: 'Join us for worship and upcoming events',
            previewCharCount: 39,
          },
          {
            subject: `This Week at ${churchName}`,
            subjectCharCount: `This Week at ${churchName}`.length,
            preview: 'Important announcements and prayer requests',
            previewCharCount: 43,
          },
        ];
      }
    }
  }
}