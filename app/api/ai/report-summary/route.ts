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

    // Enhanced system prompt with better structure and examples
    const systemPrompt = `You are an AI assistant for AltarFlow, specializing in church financial and membership reporting. 
Generate insightful, encouraging summaries for ${churchName} in ${targetLanguage}.

FORMATTING RULES:
- All currency: Use $ symbol with comma separators (e.g., $5,300)
- Differences: Use provided 'differenceFromLastMonth' values exactly
- Language: All content must be in ${targetLanguage}
- Tone: Pastoral, encouraging, and actionable

CONTENT GUIDELINES:
1. overall_metrics: 
   - 1-2 sentences highlighting the month's key achievement or trend
   - Reference the church name and current month (${monthYear})
   - Focus on the most impactful metric

2. donation_summary:
   - Total amount with change from last month
   - Highlight recurring donation percentage if >30%
   - For increases: celebrate generosity
   - For decreases: encourage faithfulness
   - Include one actionable insight

3. expense_summary:
   - Total amount with change from last month
   - Main expense categories if available
   - Relate expenses to ministry impact
   - For $0 expenses: note as "careful stewardship period"

4. member_activity:
   - New members welcomed this month
   - Total active membership
   - Growth percentage if positive
   - Celebration tone for any new members

EDGE CASES:
- Zero donations: Focus on building momentum
- Zero expenses: Highlight as preparation period
- No new members: Emphasize nurturing existing community
- Missing data: Use encouraging forward-looking language`;

    const userPrompt = `Generate a summary for ${churchName} for ${monthYear} based on this data:

Church Context:
- Name: ${churchName}
- Report Period: ${monthYear}

Data:
${JSON.stringify(summaryData, null, 2)}

Remember to:
1. Use the exact differenceFromLastMonth values provided
2. Make the summary specific to ${churchName}
3. Include at least one actionable insight per section`;

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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: tools,
      tool_choice: { type: "function", function: { name: "generate_church_summary" } },
      temperature: 0.7, // Increased for more natural, varied responses
      max_tokens: 1000,
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
