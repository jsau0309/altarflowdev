"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";
import LoaderOne from "@/components/ui/loader-one";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";


const getFormSchema = (t: any) => z.object({
  senderName: z.string().min(2, {
    message: t('common:errors.required'),
  }),
  replyToEmail: z.string().email({
    message: t('common:errors.invalidEmail'),
  }).optional().or(z.literal("")),
  timezone: z.string().min(1, {
    message: t('common:errors.required'),
  }),
  footerAddress: z.string().min(10, {
    message: t('common:errors.required'),
  }),
});

type FormData = z.infer<ReturnType<typeof getFormSchema>>;

export function EmailSettingsForm() {
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication', 'common']);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetupFlow = searchParams.get('setup') === 'true';
  const returnTo = searchParams.get('returnTo');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);
  const [churchData, setChurchData] = useState({
    name: "",
    email: "",
    address: "",
  });
  
  // Define timezones with translations
  const timezones = [
    { value: "America/New_York", label: t('communication:timezones.eastern') },
    { value: "America/Chicago", label: t('communication:timezones.central') },
    { value: "America/Denver", label: t('communication:timezones.mountain') },
    { value: "America/Los_Angeles", label: t('communication:timezones.pacific') },
    { value: "America/Phoenix", label: t('communication:timezones.arizona') },
    { value: "America/Anchorage", label: t('communication:timezones.alaska') },
    { value: "Pacific/Honolulu", label: t('communication:timezones.hawaii') },
  ];

  const form = useForm<FormData>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      senderName: "",
      replyToEmail: "",
      timezone: "America/New_York",
      footerAddress: "",
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = await getToken();
        
        // Fetch both settings and church profile in parallel
        const [settingsResponse, profileResponse] = await Promise.all([
          fetch("/api/communication/settings", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/settings/church-profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        // Get church data for defaults
        let newChurchData = { name: "", email: "", address: "" };
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log("Church profile data:", profileData); // Debug log
          newChurchData = {
            name: profileData.name || "",
            email: profileData.email || "",
            address: profileData.address || "",
          };
          setChurchData(newChurchData);
          
          // Log specific address info for debugging
          if (!profileData.address) {
            console.warn("Church profile has no address set. Please update your church profile.");
          }
        } else {
          console.error("Failed to fetch church profile:", profileResponse.status);
          const errorText = await profileResponse.text();
          console.error("Error details:", errorText);
        }

        // Get email settings
        if (settingsResponse.ok) {
          const data = await settingsResponse.json();
          if (data.settings) {
            setHasExistingSettings(true);
            form.reset({
              senderName: data.settings.senderName || newChurchData.name,
              replyToEmail: data.settings.replyToEmail || newChurchData.email,
              timezone: data.settings.timezone || "America/New_York",
              // Always prioritize church profile address over saved email settings address
              // This ensures consistency across the platform
              footerAddress: newChurchData.address || data.settings.footerAddress || "",
            });
          } else {
            // No settings yet, use church data as defaults but don't fill the form
            setHasExistingSettings(false);
            // Only set placeholders, not actual values
            form.reset({
              senderName: "",
              replyToEmail: "",
              timezone: "America/New_York",
              footerAddress: "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error(t('communication:emailSettings.failedToLoadSettings'), {
          description: t('communication:emailSettings.failedToLoadSettingsDescription'),
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [form, getToken, t]);


  const onSubmit = async (data: FormData) => {
    // Show loading toast
    const loadingToast = toast.loading(t('communication:emailSettings.savingSettings'));
    
    try {
      setIsLoading(true);
      const token = await getToken();

      const response = await fetch("/api/communication/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(t('communication:emailSettings.settingsSaved'), {
        description: t('communication:emailSettings.settingsSavedDescription'),
      });
      
      // Update the state to reflect that settings now exist
      setHasExistingSettings(true);
      
      // If coming from setup flow, redirect back
      if (isSetupFlow && returnTo) {
        setTimeout(() => {
          router.push(returnTo);
        }, 1000);
      }
    } catch (error) {
      // Dismiss loading toast on error
      toast.dismiss(loadingToast);
      console.error("Error saving settings:", error);
      toast.error(t('common:error'), {
        description: t('communication:emailSettings.failedToSaveSettingsDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Badge - Similar to Campaign Unlimited Badge */}
      <div className="flex justify-end pr-2">
        {!hasExistingSettings ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-500">
            <AlertCircle className="h-4 w-4" />
            {t('communication:emailSettings.notConfigured', "Not Configured")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-500">
            <CheckCircle className="h-4 w-4" />
            {t('communication:emailSettings.configured', "Configured")}
          </span>
        )}
      </div>
      
      {/* Setup flow message if applicable */}
      {isSetupFlow && !hasExistingSettings && (
        <p className="text-sm text-muted-foreground">
          {t('communication:emailSettings.setupFlowMessage', "Let's configure your sender information to start sending campaigns")}
        </p>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>{t('communication:emailSettings.deliverySettings.title')}</CardTitle>
            <CardDescription>
              {t('communication:emailSettings.deliverySettings.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="senderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('communication:emailSettings.deliverySettings.senderName')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={churchData.name || t('communication:emailSettings.deliverySettings.senderNamePlaceholder', { churchName: 'First Baptist Church' })} 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {t('communication:emailSettings.deliverySettings.senderNameDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reply-To Email - Hidden for v1, will implement in v2 */}
            {/* <FormField
              control={form.control}
              name="replyToEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('communication:emailSettings.deliverySettings.replyToEmail')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder={churchData.email || t('communication:emailSettings.deliverySettings.replyToEmailPlaceholder')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {t('communication:emailSettings.deliverySettings.replyToEmailDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('communication:emailSettings.deliverySettings.timezone')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('communication:emailSettings.deliverySettings.timezonePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('communication:emailSettings.deliverySettings.timezoneDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('communication:emailSettings.compliance.title')}</CardTitle>
            <CardDescription>
              {t('communication:emailSettings.compliance.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="footerAddress"
              render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t('communication:emailSettings.compliance.mailingAddress')}</FormLabel>
                  {churchData.address && field.value !== churchData.address && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.setValue("footerAddress", churchData.address);
                        toast.success(t('communication:emailSettings.addressSyncedSuccess'));
                      }}
                      className="h-8 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {t('communication:emailSettings.compliance.syncFromProfile')}
                    </Button>
                  )}
                </div>
                <FormControl>
                  <Textarea
                    placeholder={t('communication:emailSettings.compliance.addressPlaceholder')}
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {churchData.address && field.value !== churchData.address && (
                    <span className="text-amber-600 text-xs">
                      {t('communication:emailSettings.compliance.addressDiffers')}
                    </span>
                  )}
                  {churchData.address && field.value === churchData.address && (
                    <span className="text-green-600 text-xs">
                      {t('communication:emailSettings.compliance.addressSynced')}
                    </span>
                  )}
                  {!churchData.address && (
                    <span className="text-amber-600 text-xs">
                      {t('communication:emailSettings.compliance.noAddressInProfile')}
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('communication:emailSettings.saveSettings')}
          </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}