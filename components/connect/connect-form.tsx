"use client";


import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { submitFlow } from '@/lib/actions/flows.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ServiceTime, Ministry, LifeStage, RelationshipStatus } from '../member-form/types'; // Adjust path if needed
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { Confetti, ConfettiRef } from '@/components/ui/confetti';

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
    churchSlug: string;
    backgroundStyle: string;
    config: ConnectFormConfig;
}

// --- Zod Schema Factory (to use t function) ---
const createFormSchema = (t: (key: string) => string) => z.object({
    // Use t function for validation messages
    firstName: z.string().min(1, { message: t('common:errors.required') }),
    lastName: z.string().min(1, { message: t('common:errors.required') }),
    email: z.string().email({ message: t('common:errors.invalidEmail') }),
    phone: z.string()
             .transform(val => val.replace(/\D/g, '')) // Remove non-digit characters
             .pipe(z.string().length(10, { message: t('common:errors.invalidPhoneDigits') })), // Check for exactly 10 digits
    relationshipStatus: z.enum(["visitor", "regular"], { message: t('connect-form:validationRelationshipStatusRequired') }),
    serviceTimes: z.array(z.string()).optional(),
    interestedMinistries: z.array(z.string()).optional(),
    lifeStage: z.enum(["teens", "20s", "30s", "40s", "50s", "60s", "70plus"]).optional(),
    referralSource: z.string().optional(),
    prayerRequested: z.boolean().optional().default(false),
    // Add validation for prayerRequest if prayerRequested is true
    prayerRequest: z.string().optional(),
    // Honeypot field for spam protection - should be empty
    website: z.string().optional().default(""),
}).refine(data => !data.prayerRequested || (data.prayerRequested && data.prayerRequest && data.prayerRequest.length > 0), {
    message: t('common:errors.required'), // Reuse common required message
    path: ["prayerRequest"], // Apply validation to prayerRequest field
});

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function ConnectForm({ flowId, churchName, churchSlug, backgroundStyle, config }: ConnectFormProps) {
    const { t, i18n } = useTranslation(['connect-form', 'common']); // Use hook with namespaces
    const formSchema = createFormSchema(t); // Create schema instance with t function

    const [isSubmitting, startSubmitTransition] = useTransition();
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message?: string } | null>(null);
    const [showPrayerInput, setShowPrayerInput] = useState(false);
    const confettiRef = useRef<ConfettiRef>(null);

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
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
            website: "", // Honeypot field
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
                 // Prepare data for submission.
                 // Type inference from 'data: FormData' is sufficient.
                 const submissionData = {
                     ...data,
                     language: i18n.language.split('-')[0], // Add current language to submission data
                     // smsConsent is removed as it's no longer part of the form/schema
                 };
                 // Debug logging removed: submitting form data

                 // Check honeypot field - if filled, it's likely a bot
                 if (submissionData.website && submissionData.website.length > 0) {
                     console.warn('Potential spam submission detected - honeypot field was filled', { operation: 'ui.warn' });
                     // Silently reject but show success to confuse bots
                     setSubmitResult({ 
                         success: true, 
                         message: t('connect-form:submitSuccess') 
                     });
                     return;
                 }

                 // Initialize optional fields as undefined initially
                 const dataToSubmit = {
                     firstName: submissionData.firstName,
                     lastName: submissionData.lastName,
                     email: submissionData.email,
                     phone: submissionData.phone, // Now required
                     relationshipStatus: submissionData.relationshipStatus,
                     language: submissionData.language, // Ensure language is passed
                     serviceTimes: undefined as string[] | undefined,
                     interestedMinistries: undefined as string[] | undefined,
                     lifeStage: undefined as LifeStage | undefined,
                     referralSource: undefined as string | undefined,
                     prayerRequested: undefined as boolean | undefined,
                     prayerRequest: undefined as string | undefined,
                 };

                 // Add optional fields conditionally
                 if (activeServiceTimes.length > 0) dataToSubmit.serviceTimes = data.serviceTimes;
                 if (activeMinistries.length > 0) dataToSubmit.interestedMinistries = data.interestedMinistries;
                 if (settings.enableLifeStage) dataToSubmit.lifeStage = data.lifeStage;
                 if (settings.enableReferralTracking) dataToSubmit.referralSource = data.referralSource;
                 if (settings.enablePrayerRequests) {
                     dataToSubmit.prayerRequested = data.prayerRequested;
                     dataToSubmit.prayerRequest = data.prayerRequested ? data.prayerRequest : undefined;
                 }

                // Log the data being sent
                // Debug logging removed: data being sent to backend 
                
                // Pass the structured object including language
                const result = await submitFlow(flowId, dataToSubmit);
                setSubmitResult(result);

                if (result.success) {
                    // Optionally reset form on success
                    // form.reset(); 
                    // setShowPrayerInput(false);
                }
            } catch (error) { 
                console.error('Submission Error:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
                setSubmitResult({ success: false, message: "An unexpected error occurred during submission." });
            }
        });
    };

    // --- Phone Input Filtering Logic ---
    const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value;
        const digitsOnly = rawValue.replace(/\D/g, ''); // Remove non-digits
        const truncatedValue = digitsOnly.slice(0, 10); // Limit to 10 digits
        setValue('phone', truncatedValue, { shouldValidate: true }); // Update form state and trigger validation
    };

    // Trigger confetti when submission succeeds
    useEffect(() => {
        if (submitResult?.success) {
            // Trigger fireworks confetti with proper cleanup
            const timers: NodeJS.Timeout[] = [];

            const timer1 = setTimeout(() => {
                confettiRef.current?.fire({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                });

                // Second burst for fireworks effect
                const timer2 = setTimeout(() => {
                    confettiRef.current?.fire({
                        particleCount: 100,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0, y: 0.6 }
                    });
                }, 250);
                timers.push(timer2);

                const timer3 = setTimeout(() => {
                    confettiRef.current?.fire({
                        particleCount: 100,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1, y: 0.6 }
                    });
                }, 400);
                timers.push(timer3);
            }, 500);
            timers.push(timer1);

            // Cleanup all timers on unmount
            return () => {
                timers.forEach(timer => clearTimeout(timer));
            };
        }
    }, [submitResult]);

    // If submission was successful, show celebration message
    if (submitResult?.success) {
        return (
            <div className="relative min-h-screen flex items-center justify-center p-4" style={{ background: backgroundStyle }}>
                {/* Confetti Canvas */}
                <Confetti
                    ref={confettiRef}
                    className="absolute inset-0 pointer-events-none w-full h-full"
                    manualstart={true}
                />

                <div className="bg-white px-8 py-10 rounded-2xl shadow-xl max-w-lg w-full relative z-10">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="rounded-full bg-green-100 p-4">
                            <CheckCircle2 className="w-16 h-16 text-green-600" />
                        </div>
                    </div>

                    {/* Title and Subtitle */}
                    <h1 className="text-4xl font-bold mb-3 text-gray-900 text-center">
                        {t('connect-form:successCardTitle')}
                    </h1>
                    <p className="text-gray-600 mb-6 text-lg text-center">
                        {t('connect-form:successSubtitle')}
                    </p>

                    {/* Message */}
                    <p className="text-center text-gray-700 mb-8">
                        {submitResult.message ? t(submitResult.message, { ns: 'connect-form' }) : t('connect-form:successMessage')}
                    </p>

                    {/* Return to Landing Page Button */}
                    <Button
                        asChild
                        variant="default"
                        className="w-full py-6 text-lg rounded-lg font-semibold transition-all duration-150 ease-in-out hover:scale-105"
                    >
                        <Link href={`/${churchSlug}`}>
                            {t('connect-form:goHomeButton')}
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto bg-white text-gray-900 border-gray-300">
            <CardHeader>
                <CardTitle className="text-gray-900">{t('connect-form:title', { churchName: churchName })}</CardTitle>
                <CardDescription className="text-gray-600">{t('connect-form:description')}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {/* Honeypot field for spam protection - hidden from users */}
                    <input 
                        type="text"
                        id="website"
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                        {...register("website")}
                        aria-hidden="true"
                    />
                    
                    {/* --- Standard Fields --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-gray-900">{t('connect-form:labelFirstName')}</Label>
                            <Input id="firstName" {...register("firstName")} className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-900">{t('connect-form:labelLastName')}</Label>
                            <Input id="lastName" {...register("lastName")} className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-900">{t('common:email')}</Label>
                        <Input id="email" type="email" {...register("email")} className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                         {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-900">{t('common:phone')}</Label>
                        <Input
                            id="phone"
                            type="tel"
                            {...register("phone")}
                            onChange={handlePhoneChange}
                            placeholder={t('common:placeholders.phoneExample', '(555) 123-4567')}
                            className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                        />
                         {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                         <Label className="text-gray-900">{t('connect-form:labelRelationshipStatus')}</Label>
                        <RadioGroup
                            onValueChange={(value) => setValue("relationshipStatus", value as RelationshipStatus)}
                            defaultValue={watch("relationshipStatus")}
                            className="flex space-x-4"
                         >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="visitor" id="visitor" />
                                <Label htmlFor="visitor" className="text-gray-900">{t('connect-form:optionVisitor')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="regular" id="regular" />
                                <Label htmlFor="regular" className="text-gray-900">{t('connect-form:optionRegular')}</Label>
                            </div>
                        </RadioGroup>
                         {errors.relationshipStatus && <p className="text-sm text-destructive">{errors.relationshipStatus.message}</p>}
                    </div>

                     {/* --- Conditional Fields --- */}

                    {/* Service Times */}
                    {activeServiceTimes.length > 0 && (
                        <div className="space-y-2">
                             <Label className="text-gray-900">{t('connect-form:labelServiceAttended')}</Label>
                             {activeServiceTimes.map((st) => (
                                <div key={st.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`service-${st.id}`}
                                        value={st.id}
                                        onCheckedChange={(checked) => {
                                            const currentSelection = watch("serviceTimes") || [];
                                            const newSelection = checked
                                                ? [...currentSelection, st.id]
                                                : currentSelection.filter(id => id !== st.id);
                                            setValue("serviceTimes", newSelection);
                                        }}
                                    />
                                    <Label htmlFor={`service-${st.id}`} className="text-gray-900">{st.day} {st.time}</Label>
                                </div>
                             ))}
                             {/* Add error display if needed */}
                        </div>
                    )}

                     {/* Ministries */}
                     {activeMinistries.length > 0 && (
                        <div className="space-y-2">
                             <Label className="text-gray-900">{t('connect-form:labelMinistryInterest')}</Label>
                             {activeMinistries.map((m) => (
                                <div key={m.id} className="flex items-center space-x-2">
                                    <Checkbox
                                         id={`ministry-${m.id}`}
                                         value={m.id}
                                        onCheckedChange={(checked) => {
                                            const currentSelection = watch("interestedMinistries") || [];
                                            const newSelection = checked
                                                ? [...currentSelection, m.id]
                                                : currentSelection.filter(id => id !== m.id);
                                            setValue("interestedMinistries", newSelection);
                                        }}
                                     />
                                    <Label htmlFor={`ministry-${m.id}`} className="text-gray-900">{m.name}</Label>
                                </div>
                             ))}
                             {/* Add error display if needed */}
                        </div>
                    )}

                    {/* Life Stage */}
                    {settings.enableLifeStage && (
                        <div className="space-y-2">
                            <Label className="text-gray-900">{t('connect-form:labelLifeStage')}</Label>
                             <RadioGroup
                                onValueChange={(value) => setValue("lifeStage", value as LifeStage)}
                                defaultValue={watch("lifeStage")}
                                className="grid grid-cols-2 gap-2"
                             >
                                 {(["teens", "20s", "30s", "40s", "50s", "60s", "70plus"] as LifeStage[]).map(stage => (
                                    <div key={stage} className="flex items-center space-x-2">
                                        <RadioGroupItem value={stage} id={`lifeStage-${stage}`} />
                                        <Label htmlFor={`lifeStage-${stage}`} className="capitalize text-gray-900">
                                            {t(`connect-form:optionLifeStage${stage.charAt(0).toUpperCase() + stage.slice(1)}`, stage === '70plus' ? '70+' : stage)}
                                        </Label>
                                    </div>
                                 ))}
                             </RadioGroup>
                             {errors.lifeStage && <p className="text-sm text-destructive">{errors.lifeStage.message}</p>}
                        </div>
                    )}

                    {/* Referral Source */}
                    {settings.enableReferralTracking && (
                        <div className="space-y-2">
                            <Label htmlFor="referralSource" className="text-gray-900">{t('connect-form:labelReferralSource')}</Label>
                            <Input id="referralSource" {...register("referralSource")} className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500" />
                             {errors.referralSource && <p className="text-sm text-destructive">{errors.referralSource.message}</p>}
                        </div>
                    )}

                     {/* Prayer Request */}
                     {settings.enablePrayerRequests && (
                         <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="prayerRequested"
                                    checked={watch("prayerRequested")}
                                    onCheckedChange={(checked) => {
                                        const isChecked = !!checked;
                                         setValue("prayerRequested", isChecked);
                                         setShowPrayerInput(isChecked);
                                         if (!isChecked) {
                                             setValue("prayerRequest", ""); // Clear text if unchecked
                                         }
                                    }}
                                />
                                <Label htmlFor="prayerRequested" className="text-gray-900">{t('connect-form:labelRequestPrayer')}</Label>
                            </div>
                            {showPrayerInput && (
                                <div className="space-y-2 pl-6">
                                    <Label htmlFor="prayerRequest" className="text-gray-900">{t('connect-form:labelPrayerRequest')}</Label>
                                    <Textarea
                                        id="prayerRequest"
                                         {...register("prayerRequest")}
                                         placeholder={t('connect-form:placeholderPrayer')}
                                         className="bg-white text-gray-900 border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                                     />
                                     {/* Add error display if needed */}
                                 </div>
                            )}
                         </div>
                     )}

                     {/* Display General Submit Error */}
                     {submitResult && !submitResult.success && (
                         <Alert variant="destructive" className="bg-red-50 border-red-300">
                           <AlertCircle className="h-4 w-4 text-red-600" />
                           <AlertTitle className="text-red-900">{t('common:errors.errorTitle')}</AlertTitle>
                           <AlertDescription className="text-red-800">
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