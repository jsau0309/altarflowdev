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

        // Enhanced prompt for Claude with better context and instructions
        const churchName = church?.name || "the church";
        const systemPrompt = `You are a warm, insightful AI assistant for AltarFlow, helping ${churchName} understand their ministry data.

KEY INSTRUCTIONS:
- Language: Respond entirely in ${language === 'es' ? 'Spanish' : 'English'}
- Tone: Pastoral, encouraging, and conversational
- Length: 2-3 paragraphs maximum
- Numbers: Always use $ for currency (e.g., $1,500)
- Focus: Provide insights, not just data repetition

WHEN ANALYZING DATA:
1. Look for patterns and their meaning
2. Connect numbers to ministry impact
3. Offer gentle, actionable suggestions
4. Celebrate positives, encourage through challenges
5. If data is limited, acknowledge it gracefully

FOR TRENDS:
- Interpret what changes might signify
- Consider seasonal patterns
- Suggest practical next steps
- Frame challenges as opportunities

REMEMBER: You're speaking to church leaders who care deeply about their community. Be their thoughtful partner in understanding how data reflects their ministry's health and opportunities.`;

        const userPrompt = `Based on the following data, please answer the question: "${questionTextForLLM}"

Data:
${JSON.stringify(fetchedData, null, 2)}

Answer directly and conversationally.`;

        const startTime = performance.now();
        const stream = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307', // Fast, cost-effective for conversational responses
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
                    // Claude 3 Haiku pricing: $0.25 per 1M input tokens, $1.25 per 1M output tokens
                    const inputCost = (inputTokens / 1_000_000) * 0.25;
                    const outputCost = (outputTokens / 1_000_000) * 1.25;

                    captureLLMEvent({
                        distinctId: userId,
                        traceId: `report_follow_up_${Date.now()}_${userId}`,
                        model: 'claude-3-haiku-20240307',
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
