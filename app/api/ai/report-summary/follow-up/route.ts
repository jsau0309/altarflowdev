// app/api/ai/report-summary/follow-up/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { captureLLMEvent } from '@/lib/posthog/server';
import {
    getTopDonorsThisMonth,
    getMostUsedPaymentMethodThisMonth,
    getBiggestDonationThisMonth,
    getExpenseTrendData,
    getDonationTrendData,
    getActiveMemberList,
    getVisitorList,
} from '@/lib/actions/reports.actions';
import { getUserSubscriptionPlan } from "@/lib/stripe/subscription";
// import type { User } from "@clerk/backend"; // Not used in this endpoint
import { getChurchByClerkOrgId } from '@/lib/actions/church.actions';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = getAuth(req);
        const body = await req.json();
        const { questionKey, churchId, language = 'en' } = body;

        if (!userId || !orgId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!churchId) {
            return new NextResponse('Church ID is required', { status: 400 });
        }

        if (!questionKey) {
            return new NextResponse('Question key is required', { status: 400 });
        }

        const church = await getChurchByClerkOrgId(churchId);
        if (!church || church.clerkOrgId !== orgId) { // Use clerkOrgId for comparison
            return new NextResponse("Unauthorized or Church not found", { status: 403 });
        }

        // const clerkUser = { id: userId } as User; // Not used in this endpoint
        const subscriptionPlan = await getUserSubscriptionPlan(userId, orgId); // Use userId string
        if (!subscriptionPlan.isPro) { // Use isPro property from placeholder interface
            return new NextResponse('Pro plan required for AI report features.', { status: 403 });
        }

        let fetchedData: unknown;
        let questionTextForLLM = "";
        let noDataMessage = "";

        switch (questionKey) {
            case 'topDonors':
                fetchedData = await getTopDonorsThisMonth(church.id);
                questionTextForLLM = language === 'es' ? "¿Quiénes fueron los 3 principales donantes este mes?" : "Who were the top 3 donors this month?";
                noDataMessage = language === 'es' ? "No hay datos de donantes principales para este mes." : "No top donor data available for this month.";
                if (!fetchedData || (Array.isArray(fetchedData) && fetchedData.length === 0)) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'mostUsedPaymentMethod':
                fetchedData = await getMostUsedPaymentMethodThisMonth(church.id);
                questionTextForLLM = language === 'es' ? "¿Cuál fue el método de pago más utilizado por los donantes este mes?" : "What was the most used payment method by donors this month?";
                noDataMessage = language === 'es' ? "No hay datos sobre los métodos de pago para este mes." : "No data available on payment methods for this month.";
                if (!fetchedData) { // Check if fetchedData is null or empty
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'biggestDonation':
                fetchedData = await getBiggestDonationThisMonth(church.id);
                questionTextForLLM = language === 'es' ? "¿Cuál fue la donación individual más grande este mes y quién la hizo, si se sabe?" : "What was the biggest single donation this month, and who made it if known?";
                noDataMessage = language === 'es' ? "No se registraron donaciones este mes para determinar la más grande." : "There were no donations recorded this month to determine the largest one.";
                if (!fetchedData) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'expenseTrend':
                fetchedData = await getExpenseTrendData(church.id);
                questionTextForLLM = language === 'es' ? "¿Cuál es la tendencia de gastos en los últimos 6 meses?" : "What is the expense trend over the last 6 months?";
                noDataMessage = language === 'es' ? "No hay suficientes datos de gastos para determinar una tendencia en los últimos 6 meses. Con más datos en el futuro, podremos ofrecer un análisis de tendencias más claro." : "There isn't enough expense data to determine a trend for the last 6 months yet. As more data becomes available over time, we'll be able to provide a clearer trend analysis.";
                if (!fetchedData || (Array.isArray(fetchedData) && (fetchedData.length === 0 || fetchedData.every((d: { totalExpenses: number }) => d.totalExpenses === 0)))) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'donationTrend':
                fetchedData = await getDonationTrendData(church.id);
                questionTextForLLM = language === 'es' ? "¿Cuál es la tendencia de donaciones en los últimos 6 meses?" : "What is the donation trend over the last 6 months?";
                noDataMessage = language === 'es' ? "No hay suficientes datos de donaciones para determinar una tendencia en los últimos 6 meses. Con más datos en el futuro, podremos ofrecer un análisis de tendencias más claro." : "There isn't enough donation data to determine a trend for the last 6 months yet. As more data becomes available over time, we'll be able to provide a clearer trend analysis.";
                 if (!fetchedData || (Array.isArray(fetchedData) && (fetchedData.length === 0 || fetchedData.every((d: { totalDonations: number }) => d.totalDonations === 0)))) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'activeMembers':
                fetchedData = await getActiveMemberList(church.id);
                questionTextForLLM = language === 'es' ? "¿Puedes listar nuestros miembros activos?" : "Can you list our active members?";
                noDataMessage = language === 'es' ? "Actualmente no hay miembros activos listados." : "There are currently no active members listed.";
                if (!fetchedData || (Array.isArray(fetchedData) && fetchedData.length === 0)) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'visitorList':
                fetchedData = await getVisitorList(church.id);
                questionTextForLLM = language === 'es' ? "¿Puedes listar nuestros visitantes recientes?" : "Can you list our recent visitors?";
                noDataMessage = language === 'es' ? "Actualmente no hay visitantes recientes listados." : "There are currently no recent visitors listed.";
                if (!fetchedData || (Array.isArray(fetchedData) && fetchedData.length === 0)) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            default:
                return new NextResponse('Invalid question key', { status: 400 });
        }

        // Enhanced prompt for more natural, conversational responses
        const churchName = church?.name || "the church";
        const systemPrompt = `You are a trusted ministry advisor for ${churchName}, helping leaders understand what the data reveals about their community and ministry.

CONVERSATION STYLE:
- Speak like a wise friend, not a report generator
- Use "you," "your," and the church's name naturally
- Ask rhetorical questions that prompt reflection
- Vary your sentence structure - some short, some flowing
- Lead with insight, not just numbers
- End with encouragement and a forward-looking thought

LANGUAGE & TONE:
- Write entirely in ${language === 'es' ? 'Spanish' : 'English'}
- Be warm and pastoral, celebrating wins and empathizing with challenges
- Keep it conversational (2-3 paragraphs max)
- Use $ for all currency amounts (e.g., $1,500)

ANALYTICAL APPROACH:
- Patterns: What story do these numbers tell?
- Context: Consider timing, seasons, and ministry rhythms
- Impact: Connect data to real people and ministry outcomes
- Action: Gently suggest 1-2 practical next steps
- Hope: Even in challenges, point toward possibilities

When you analyze trends:
- "This upward pattern suggests..." not "The data shows an increase"
- "Your community's giving reflects..." not "Donations increased by..."
- Frame setbacks as learning opportunities or seasonal shifts

Remember: Church leaders don't just want numbers explained - they want to understand what God might be doing in their community and how they can steward it well. Be that insightful partner.`;

        const userPrompt = `The leadership team at ${churchName} wants to understand: "${questionTextForLLM}"

Here's the relevant data:
${JSON.stringify(fetchedData, null, 2)}

Help them see what this data reveals. Tell the story, provide context, and offer your thoughtful perspective. Make it feel like a conversation, not a data dump.`;

        const startTime = performance.now();
        const stream = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001', // Claude Haiku 4.5 - fastest, most cost-effective with excellent coding
            stream: true,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7, // More natural, conversational tone
            max_tokens: 500, // Slightly more room for thoughtful responses
        });

        // Track token usage for streaming
        let inputTokens = 0;
        let outputTokens = 0;

        // Create a custom streaming response for Claude
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        // Track token usage from message_start event
                        if (chunk.type === 'message_start') {
                            inputTokens = chunk.message.usage.input_tokens;
                        }

                        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                            const text = chunk.delta.text;
                            // Format as Vercel AI SDK expects
                            const formattedChunk = `0:${JSON.stringify(text)}\n`;
                            controller.enqueue(encoder.encode(formattedChunk));
                        }

                        // Track final token usage from message_delta
                        if (chunk.type === 'message_delta') {
                            outputTokens = chunk.usage.output_tokens;
                        }
                    }
                    // Send completion signal
                    controller.enqueue(encoder.encode('2:"[DONE]"\n'));

                    // Track LLM usage after stream completes
                    const latencyMs = performance.now() - startTime;
                    // Claude Haiku 4.5 pricing: $1.00 per 1M input tokens, $5.00 per 1M output tokens
                    const inputCost = (inputTokens / 1_000_000) * 1.00;
                    const outputCost = (outputTokens / 1_000_000) * 5.00;

                    captureLLMEvent({
                        distinctId: userId,
                        traceId: `report_follow_up_${Date.now()}_${userId}`,
                        model: 'claude-haiku-4-5-20251001',
                        provider: 'anthropic',
                        inputTokens,
                        outputTokens,
                        totalCostUsd: inputCost + outputCost,
                        latencyMs,
                        properties: {
                            feature: 'report_follow_up',
                            question_key: questionKey,
                            language,
                            streaming: true,
                        },
                        groups: { company: orgId },
                    });

                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('[AI_REPORT_FOLLOW_UP_ERROR]', error);
        if (error instanceof Anthropic.APIError) {
            return new NextResponse(error.message || 'Anthropic API Error', { status: error.status || 500 });
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
    return new NextResponse(null, { 
        status: 200,
        headers: {
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept-Language',
        }
    });
}
