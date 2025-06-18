import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getAiSummaryData } from "@/lib/actions/reports.actions";

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

    let targetLanguageDescription = 'English';
    if (language === 'es') {
      targetLanguageDescription = 'Spanish';
    }

    const systemPrompt = `You are an AI assistant for church admin reporting. Your primary task is to generate the content for the fields of the 'generate_church_summary' function.
When generating this content, adhere strictly to the following guidelines for each field:

Overall Guidelines for all text fields:
- Generate all text content in ${targetLanguageDescription}.
- Maintain a clear, encouraging, professional, and pastoral tone.
- For any financial numbers, always prefix with a '$' sign (e.g., $5,300).
- Use commas as thousands separators for numbers (e.g., $5,300, not $5300).
- If data for 'change from last month' is available and relevant to the field, clearly mention it (e.g., "up from $2,000" or "a decrease of $150").
- Critically, ensure that the very first word of the text generated for each field is a complete, correctly spelled word, and that all sentences start cleanly without typos or artifacts.

Specific instructions for each field of the 'generate_church_summary' function:

1.  'overall_metrics':
    - Provide a 1-2 sentence general overview of the month's performance and key highlights.

2.  'donation_summary':
    - State the total donation amount.
    - Mention the change from last month.
    - Include recurring donation percentage if available.
    - Maintain an encouraging tone.

3.  'expense_summary':
    - State the total expense amount.
    - Briefly describe the primary use of funds (e.g., operations, outreach, specific projects).
    - If there are no expenses, state this positively.

4.  'member_activity':
    - Report the number of new members this month and the total current members.
    - Use welcoming and inclusive language.

Remember, you are populating a structured JSON object via the 'generate_church_summary' function. The content you generate for each field in that function must follow these rules.`;

    const userPrompt = `Please generate a summary based on the following data:\n${JSON.stringify(summaryData, null, 2)}`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "generate_church_summary",
          description: "Generate a structured summary of church metrics, including financial values and insights about member activity. All textual content should be in the requested language.",
          parameters: {
            type: "object" as const,
            properties: {
              overall_metrics: {
                type: "string" as const,
                description: "A concise, one or two-sentence high-level overview of the month's performance and key highlights. Maintain an encouraging and pastoral tone."
              },
              donation_summary: {
                type: "string" as const,
                description: "Detailed insights about donations. Include total amounts with currency symbols (e.g., $). Mention trends compared to the previous month if applicable. Maintain an encouraging tone."
              },
              expense_summary: {
                type: "string" as const,
                description: "Detailed insights about expenses. Include total amounts with currency symbols (e.g., $). Mention key spending areas. If there are no expenses, state that positively."
              },
              member_activity: {
                type: "string" as const,
                description: "Summary of member activity, such as new members welcomed and total membership numbers. Highlight growth or positive trends."
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
      temperature: 0.5,
      max_tokens: 1000, 
    });

    const message = response.choices[0].message;
    if (message.tool_calls && message.tool_calls[0].function) {
      const functionArguments = JSON.parse(message.tool_calls[0].function.arguments);
      return NextResponse.json({ summary: functionArguments });
    } else {
      console.error("[AI_SUMMARY_ERROR] OpenAI response did not include expected function call:", response);
      return new NextResponse("Failed to generate structured summary from AI.", { status: 500 });
    }


  } catch (error) {
    console.error("[AI_SUMMARY_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
