"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { submitFlow } from '@/lib/actions/flows.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ServiceTime, Ministry, LifeStage, RelationshipStatus } from '../member-form/types'; // Adjust path if needed
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Define the expected shape of the config prop
interface ConnectFormConfig {
    serviceTimes: ServiceTime[];
    ministries: Ministry[];
    settings: {
        enablePrayerRequests: boolean;
        enableReferralTracking: boolean;
        enableLifeStage: boolean;
        // Add other potential settings if needed
    };
}

interface ConnectFormProps {
    flowId: string;
    churchName: string;
    config: ConnectFormConfig;
}

// --- Zod Schema Factory (to use t function) ---
const createFormSchema = (t: (key: string) => string) => z.object({
    // Use t function for validation messages
    firstName: z.string().min(1, { message: t('common:errors.required') }),
    lastName: z.string().min(1, { message: t('common:errors.required') }),
    email: z.string().email({ message: t('common:errors.invalidEmail') }),
    phone: z.string().optional(), 
    relationshipStatus: z.enum(["visitor", "regular"], { message: t('connect-form:validationRelationshipStatusRequired') }),
    serviceTimes: z.array(z.string()).optional(),
    interestedMinistries: z.array(z.string()).optional(),
    lifeStage: z.enum(["teens", "20s", "30s", "40s", "50s", "60s", "70plus"]).optional(),
    referralSource: z.string().optional(),
    prayerRequested: z.boolean().optional().default(false),
    // Add validation for prayerRequest if prayerRequested is true
    prayerRequest: z.string().optional(),
}).refine(data => !data.prayerRequested || (data.prayerRequested && data.prayerRequest && data.prayerRequest.length > 0), {
    message: t('common:errors.required'), // Reuse common required message
    path: ["prayerRequest"], // Apply validation to prayerRequest field
});

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function ConnectForm({ flowId, churchName, config }: ConnectFormProps) {
    const { t, i18n } = useTranslation(['connect-form', 'common']); // Use hook with namespaces
    const formSchema = createFormSchema(t); // Create schema instance with t function

    const [isSubmitting, startSubmitTransition] = useTransition();
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message?: string } | null>(null);
    const [showPrayerInput, setShowPrayerInput] = useState(false);
    const currentLanguage = i18n.language.split('-')[0]; // Get base language (e.g., 'en' from 'en-US')

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            relationshipStatus: undefined,
            serviceTimes: [],
            interestedMinistries: [],
            lifeStage: undefined,
            referralSource: "",
            prayerRequested: false,
            prayerRequest: "",
        },
    });

    const { settings, serviceTimes, ministries } = config;

    // Filter active items for display
    const activeServiceTimes = serviceTimes?.filter(st => st.isActive) ?? [];
    const activeMinistries = ministries?.filter(m => m.isActive) ?? [];

    const onSubmit = (data: FormData) => {
        setSubmitResult(null);
        startSubmitTransition(async () => {
            try {
                 // Prepare data for submission - include conditional fields only if enabled
                 const dataToSubmit: Partial<FormData> = {
                     firstName: data.firstName,
                     lastName: data.lastName,
                     email: data.email,
                     phone: data.phone,
                     relationshipStatus: data.relationshipStatus,
                 };

                 if (activeServiceTimes.length > 0) dataToSubmit.serviceTimes = data.serviceTimes;
                 if (activeMinistries.length > 0) dataToSubmit.interestedMinistries = data.interestedMinistries;
                 if (settings.enableLifeStage) dataToSubmit.lifeStage = data.lifeStage;
                 if (settings.enableReferralTracking) dataToSubmit.referralSource = data.referralSource;
                 if (settings.enablePrayerRequests) {
                     dataToSubmit.prayerRequested = data.prayerRequested;
                     dataToSubmit.prayerRequest = data.prayerRequested ? data.prayerRequest : undefined;
                 }

                const result = await submitFlow(flowId, dataToSubmit);
                setSubmitResult(result);

                if (result.success) {
                    // Optionally reset form on success
                    // form.reset(); 
                    // setShowPrayerInput(false);
                }
            } catch (error) { 
                console.error("Submission Error:", error);
                setSubmitResult({ success: false, message: "An unexpected error occurred during submission." });
            }
        });
    };

    const handleLanguageChange = (lang: string) => {
        if (lang && lang !== currentLanguage) {
            i18n.changeLanguage(lang);
            // Optional: Force re-render if needed, though i18next usually handles it
        }
    };

    // If submission was successful, show message and hide form
    if (submitResult?.success) {
        return (
             <Card className="w-full max-w-lg mx-auto">
                 <CardHeader>
                     <CardTitle>{t('connect-form:successCardTitle')}</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <Alert variant="default">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>{t('common:successTitle')}</AlertTitle>
                       <AlertDescription>
                         {submitResult.message || t('connect-form:successMessage')}
                       </AlertDescription>
                    </Alert>
                 </CardContent>
             </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                {/* Language Toggle */} 
                <ToggleGroup 
                    type="single" 
                    defaultValue={currentLanguage} 
                    onValueChange={handleLanguageChange}
                    className="justify-end mb-2"
                    aria-label="Language selection"
                >
                    <ToggleGroupItem value="en" aria-label="Select English">
                        EN
                    </ToggleGroupItem>
                    <ToggleGroupItem value="es" aria-label="Select Spanish">
                        ES
                    </ToggleGroupItem>
                </ToggleGroup>
                
                <CardTitle>{t('connect-form:title', { churchName: churchName })}</CardTitle>
                <CardDescription>{t('connect-form:description')}</CardDescription>
            </CardHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {/* --- Standard Fields --- */} 
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t('connect-form:labelFirstName')}</Label>
                            <Input id="firstName" {...form.register("firstName")} />
                            {form.formState.errors.firstName && <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lastName">{t('connect-form:labelLastName')}</Label>
                            <Input id="lastName" {...form.register("lastName")} />
                            {form.formState.errors.lastName && <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('common:email')}</Label>
                        <Input id="email" type="email" {...form.register("email")} />
                         {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">{t('common:phone')} ({t('common:optional')})</Label>
                        <Input id="phone" type="tel" {...form.register("phone")} />
                         {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                         <Label>{t('connect-form:labelRelationshipStatus')}</Label>
                        <RadioGroup 
                            onValueChange={(value) => form.setValue("relationshipStatus", value as RelationshipStatus)}
                            defaultValue={form.watch("relationshipStatus")}
                            className="flex space-x-4"
                         >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="visitor" id="visitor" />
                                <Label htmlFor="visitor">{t('connect-form:optionVisitor')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="regular" id="regular" />
                                <Label htmlFor="regular">{t('connect-form:optionRegular')}</Label>
                            </div>
                        </RadioGroup>
                         {form.formState.errors.relationshipStatus && <p className="text-sm text-destructive">{form.formState.errors.relationshipStatus.message}</p>}
                    </div>

                     {/* --- Conditional Fields --- */}

                    {/* Service Times */} 
                    {activeServiceTimes.length > 0 && (
                        <div className="space-y-2">
                             <Label>{t('connect-form:labelServiceAttended')}</Label>
                             {activeServiceTimes.map((st) => (
                                <div key={st.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`service-${st.id}`}
                                        value={st.id}
                                        onCheckedChange={(checked) => {
                                            const currentSelection = form.getValues("serviceTimes") || [];
                                            const newSelection = checked
                                                ? [...currentSelection, st.id]
                                                : currentSelection.filter(id => id !== st.id);
                                            form.setValue("serviceTimes", newSelection);
                                        }}
                                    />
                                    <Label htmlFor={`service-${st.id}`}>{st.day} {st.time}</Label>
                                </div>
                             ))}
                             {/* Add error display if needed */}
                        </div>
                    )}

                     {/* Ministries */} 
                     {activeMinistries.length > 0 && (
                        <div className="space-y-2">
                             <Label>{t('connect-form:labelMinistryInterest')}</Label>
                             {activeMinistries.map((m) => (
                                <div key={m.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                         id={`ministry-${m.id}`}
                                         value={m.id}
                                        onCheckedChange={(checked) => {
                                            const currentSelection = form.getValues("interestedMinistries") || [];
                                            const newSelection = checked
                                                ? [...currentSelection, m.id]
                                                : currentSelection.filter(id => id !== m.id);
                                            form.setValue("interestedMinistries", newSelection);
                                        }}
                                     />
                                    <Label htmlFor={`ministry-${m.id}`}>{m.name}</Label>
                                </div>
                             ))}
                             {/* Add error display if needed */}
                        </div>
                    )}

                    {/* Life Stage */} 
                    {settings.enableLifeStage && (
                        <div className="space-y-2">
                            <Label>{t('connect-form:labelLifeStage')}</Label>
                             <RadioGroup 
                                onValueChange={(value) => form.setValue("lifeStage", value as LifeStage)}
                                defaultValue={form.watch("lifeStage")}
                                className="grid grid-cols-2 gap-2"
                             >
                                 {(["teens", "20s", "30s", "40s", "50s", "60s", "70plus"] as LifeStage[]).map(stage => (
                                    <div key={stage} className="flex items-center space-x-2">
                                        <RadioGroupItem value={stage} id={`lifeStage-${stage}`} />
                                        <Label htmlFor={`lifeStage-${stage}`} className="capitalize">
                                            {t(`connect-form:optionLifeStage${stage.charAt(0).toUpperCase() + stage.slice(1)}`, stage === '70plus' ? '70+' : stage)}
                                        </Label>
                                    </div>
                                 ))}
                             </RadioGroup>
                             {form.formState.errors.lifeStage && <p className="text-sm text-destructive">{form.formState.errors.lifeStage.message}</p>}
                        </div>
                    )}
                    
                    {/* Referral Source */} 
                    {settings.enableReferralTracking && (
                        <div className="space-y-2">
                            <Label htmlFor="referralSource">{t('connect-form:labelReferralSource')}</Label>
                            <Input id="referralSource" {...form.register("referralSource")} />
                             {form.formState.errors.referralSource && <p className="text-sm text-destructive">{form.formState.errors.referralSource.message}</p>}
                        </div>
                    )}

                     {/* Prayer Request */} 
                     {settings.enablePrayerRequests && (
                         <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="prayerRequested"
                                    checked={form.watch("prayerRequested")} 
                                    onCheckedChange={(checked) => {
                                        const isChecked = !!checked;
                                         form.setValue("prayerRequested", isChecked);
                                         setShowPrayerInput(isChecked);
                                         if (!isChecked) {
                                             form.setValue("prayerRequest", ""); // Clear text if unchecked
                                         }
                                    }}
                                />
                                <Label htmlFor="prayerRequested">{t('connect-form:labelRequestPrayer')}</Label>
                            </div>
                            {showPrayerInput && (
                                <div className="space-y-2 pl-6">
                                    <Label htmlFor="prayerRequest">{t('connect-form:labelPrayerRequest')}</Label>
                                    <Textarea 
                                        id="prayerRequest"
                                         {...form.register("prayerRequest")} 
                                         placeholder={t('connect-form:placeholderPrayer')} 
                                     />
                                     {/* Add error display if needed */}
                                 </div>
                            )}
                         </div>
                     )}
                    
                     {/* Display General Submit Error */} 
                     {submitResult && !submitResult.success && (
                         <Alert variant="destructive">
                           <AlertCircle className="h-4 w-4" />
                           <AlertTitle>{t('common:errors.errorTitle')}</AlertTitle>
                           <AlertDescription>
                             {submitResult.message || t('connect-form:errorMessageDefault')}
                           </AlertDescription>
                        </Alert>
                     )}

                 </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                        {t('common:submit')}
                    </Button>
                 </CardFooter>
             </form>
        </Card>
    );
} 