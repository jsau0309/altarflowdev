import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getAiSummaryData } from "@/lib/actions/reports.actions";
import { getChurchByClerkOrgId } from "@/lib/actions/church.actions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return new NextResponse("Unauthorized: No organization ID found", { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse("Missing OPENAI_API_KEY", { status: 500 });
    }

    // Fetch church details for context
    const church = await getChurchByClerkOrgId(orgId);
    const churchName = church?.name || "Your Church";

    // 1. Fetch aggregated data using the server action
    const summaryData = await getAiSummaryData(orgId);

    // Detect language from request headers
    const acceptLanguageHeader = req.headers.get('accept-language');
    let language = 'en'; // Default to English
    if (acceptLanguageHeader) {
      const preferredLanguage = acceptLanguageHeader.split(',')[0].split('-')[0].toLowerCase();
      if (['en', 'es'].includes(preferredLanguage)) { // Support English and Spanish
        language = preferredLanguage;
      }
    }

    const targetLanguage = language === 'es' ? 'Spanish' : 'English';
    
    // Get current month and year for context
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    // Enhanced system prompt for more natural, conversational output
    const systemPrompt = `You are a warm, insightful ministry partner for ${churchName}, helping church leaders understand their month at a glance.

Your role is to translate numbers into meaningful stories that inspire action and celebrate progress.

WRITING STYLE:
- Conversational and warm, like a trusted advisor
- Use "you" and "your" to speak directly to church leaders
- Vary sentence structure - mix short impactful statements with flowing descriptions
- Lead with the most meaningful insight, not just the biggest number
- Connect data points to tell a story

TONE GUIDELINES:
- Growth or positive change: Celebrate with genuine excitement
- Decline or challenges: Encourage with empathy and practical hope
- Stable periods: Highlight consistency and faithful stewardship
- Always end sections with forward momentum

FORMATTING RULES:
- Currency: ALWAYS format as $ with commas (e.g., $5,300) - NEVER use raw numbers
- Changes from last month: Format as natural language (e.g., "an increase of $2,230" NOT "differenceFromLastMonth of 2230")
- NEVER use JSON key names like "differenceFromLastMonth", "changeFromLastMonth" in your output
- Language: Write entirely in ${targetLanguage}
- Length: Keep each section concise but meaningful (2-3 sentences)

CONTENT APPROACH:

overall_metrics:
Write a compelling opening that captures ${monthYear}'s story in 1-2 sentences. What's the headline? What should leadership notice first?

donation_summary:
Tell the generosity story. Don't just report totals - help them understand what this means for ministry. Include the change from last month naturally in the narrative. If recurring giving is strong (>30%), highlight this as a sign of community commitment. When campaign donations or international donors are present in the data, mention them to celebrate global reach and focused giving efforts.

expense_summary:
Frame spending through the lens of ministry impact. What did these expenses enable? Connect the numbers to real ministry work when possible. If expenses were low or zero, position this thoughtfully.

member_activity:
Celebrate people, not just numbers. If you welcomed new members, express genuine joy. If growth was slow, emphasize the depth of existing relationships and opportunities ahead.

Remember: Numbers tell stories. Your job is to help church leaders see the story clearly and feel encouraged to lead well.`;

    const userPrompt = `Create a meaningful summary for ${churchName}'s ${monthYear} ministry activities.

Here's the data:
${JSON.stringify(summaryData, null, 2)}

Bring this data to life:
- Tell the story behind the numbers
- When describing changes from last month, use natural phrases like "an increase of $X" or "up $X from last month" - NEVER use raw field names
- Format ALL dollar amounts with $ symbol and commas
- Speak directly to church leaders ("your community," "you welcomed," etc.)
- End each section with an encouraging note or gentle suggestion
- Make every sentence count - be concise but warm`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "generate_church_summary",
          description: "Generate a structured summary of church metrics with personalized insights",
          parameters: {
            type: "object" as const,
            properties: {
              overall_metrics: {
                type: "string" as const,
                description: "High-level overview mentioning the church name and most significant metric for the month"
              },
              donation_summary: {
                type: "string" as const,
                description: "Donation insights with total, trend, recurring percentage, and one actionable suggestion"
              },
              expense_summary: {
                type: "string" as const,
                description: "Expense insights with total, main categories, and ministry impact connection"
              },
              member_activity: {
                type: "string" as const,
                description: "Member growth summary with new members, total count, and welcoming message"
              }
            },
            required: ["overall_metrics", "donation_summary", "expense_summary", "member_activity"]
          }
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini-2025-08-07",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: tools,
      tool_choice: { type: "function", function: { name: "generate_church_summary" } },
      // GPT-5 only supports temperature: 1 (default), so we omit it
      max_completion_tokens: 6000, // GPT-5 needs room for reasoning tokens + structured output
    });

    const message = response.choices[0].message;
    if (message.tool_calls && message.tool_calls[0].function) {
      const functionArguments = JSON.parse(message.tool_calls[0].function.arguments);
      
      // Add metadata to response
      const enrichedResponse = {
        summary: functionArguments,
        metadata: {
          churchName,
          reportPeriod: monthYear,
          language,
          generatedAt: new Date().toISOString()
        }
      };
      
      return NextResponse.json(enrichedResponse);
    } else {
      console.error("[AI_SUMMARY_ERROR] OpenAI response did not include expected function call:", response);
      return new NextResponse("Failed to generate structured summary from AI.", { status: 500 });
    }


  } catch (error) {
    console.error("[AI_SUMMARY_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
