import * as z from "zod"

export const memberFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.any().optional(), // Make as generic as possible to avoid inferring HTML attributes
  smsConsent: z.boolean().optional(),
  serviceTimes: z.array(z.string()).optional(),
  relationshipStatus: z.enum(["visitor", "regular"] as const),
  lifeStage: z.enum(["teens", "20s", "30s", "40s", "50s", "60s", "70plus"] as const),
  interestedMinistries: z.array(z.string()).optional(),
  referralSource: z.string().optional(),
  prayerRequested: z.boolean().default(false),
  prayerRequest: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  joinDate: z.date().optional(),
})

export type MemberFormValues = z.infer<typeof memberFormSchema>
