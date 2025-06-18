// app/api/ai/report-summary/follow-up/route.ts
import { NextRequest, NextResponse } from 'next/server'; // Added NextRequest
import { getAuth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
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
import type { User } from "@clerk/backend"; // Changed User import
import { getChurchByClerkOrgId } from '@/lib/actions/church.actions';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) { // Changed req type
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

        const clerkUser = { id: userId } as User; // Casting to User type for compatibility
        const subscriptionPlan = await getUserSubscriptionPlan(userId, orgId); // Use userId string
        if (!subscriptionPlan.isPro) { // Use isPro property from placeholder interface
            return new NextResponse('Pro plan required for AI report features.', { status: 403 });
        }

        let fetchedData: any;
        let questionTextForLLM = "";
        let noDataMessage = "";

        switch (questionKey) {
            case 'topDonors':
                fetchedData = await getTopDonorsThisMonth(church.id);
                questionTextForLLM = language === 'es' ? "¿Quiénes fueron los 3 principales donantes este mes?" : "Who were the top 3 donors this month?";
                noDataMessage = language === 'es' ? "No hay datos de donantes principales para este mes." : "No top donor data available for this month.";
                if (!fetchedData || fetchedData.length === 0) {
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
                if (!fetchedData || fetchedData.length === 0 || fetchedData.every((d: { totalExpenses: number }) => d.totalExpenses === 0)) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'donationTrend':
                fetchedData = await getDonationTrendData(church.id);
                questionTextForLLM = language === 'es' ? "¿Cuál es la tendencia de donaciones en los últimos 6 meses?" : "What is the donation trend over the last 6 months?";
                noDataMessage = language === 'es' ? "No hay suficientes datos de donaciones para determinar una tendencia en los últimos 6 meses. Con más datos en el futuro, podremos ofrecer un análisis de tendencias más claro." : "There isn't enough donation data to determine a trend for the last 6 months yet. As more data becomes available over time, we'll be able to provide a clearer trend analysis.";
                 if (!fetchedData || fetchedData.length === 0 || fetchedData.every((d: { totalDonations: number }) => d.totalDonations === 0)) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'activeMembers':
                fetchedData = await getActiveMemberList(church.id);
                questionTextForLLM = language === 'es' ? "¿Puedes listar nuestros miembros activos?" : "Can you list our active members?";
                noDataMessage = language === 'es' ? "Actualmente no hay miembros activos listados." : "There are currently no active members listed.";
                if (!fetchedData || fetchedData.length === 0) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            case 'visitorList':
                fetchedData = await getVisitorList(church.id);
                questionTextForLLM = language === 'es' ? "¿Puedes listar nuestros visitantes recientes?" : "Can you list our recent visitors?";
                noDataMessage = language === 'es' ? "Actualmente no hay visitantes recientes listados." : "There are currently no recent visitors listed.";
                if (!fetchedData || fetchedData.length === 0) {
                    return new NextResponse(noDataMessage, { status: 200 });
                }
                break;
            default:
                return new NextResponse('Invalid question key', { status: 400 });
        }

        const systemPrompt = `You are a helpful AI assistant for a church management application called AltarFlow. Your role is to provide concise, natural, and pastorally-toned answers to specific questions about church reports. The user is asking a follow-up question to an initial summary. Respond in ${language === 'es' ? 'Spanish' : 'English'}. Be empathetic and clear. Focus on a conversational answer. When mentioning monetary amounts, please use the dollar sign (e.g., $100). When discussing trends (like donation or expense trends): briefly interpret what the trend might signify (e.g., positive growth, areas for attention, the impact of recent events if evident from data patterns). If data is sparse or a trend is just emerging, you can mention that more data over time will provide a clearer picture. For example, if donations are increasing, you might say, 'It's encouraging to see this positive trend in generosity, perhaps reflecting recent efforts or a growing spirit of giving!' Avoid simply restating the data; aim to provide a brief, insightful comment that offers a pastoral perspective or a point for reflection.`;

        const userPrompt = `Based on the following data, please answer the question: "${questionTextForLLM}"

Data:
${JSON.stringify(fetchedData, null, 2)}

Answer directly and conversationally.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.4, // Adjusted for a balance of natural and factual
            max_tokens: 350, 
        });

        const stream = OpenAIStream(response as any); // Reverted: 'as any' still needed for base response type
        return new StreamingTextResponse(stream);

    } catch (error) {
        console.error('[AI_REPORT_FOLLOW_UP_ERROR]', error);
        if (error instanceof OpenAI.APIError) {
            return new NextResponse(error.message || 'OpenAI API Error', { status: error.status || 500 });
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
