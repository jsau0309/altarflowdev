"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import type { FormConfiguration, ServiceTime, Ministry } from "../member-form/types"
import { defaultServiceTimes, defaultMinistries, defaultSettings } from "../member-form/types"
import { PlusCircle, Trash2, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getFormConfiguration, saveFormConfiguration } from "@/lib/actions/settings.actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Define the shape of the config state, excluding fields not directly managed here
type ConfigState = Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'>;

export function FormSettings() {
  // State for the configuration, loading, saving, and errors
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [saveResult, setSaveResult] = useState<{ success: boolean; message?: string } | null>(null);

  // State for adding new items
  const [newServiceDay, setNewServiceDay] = useState("");
  const [newServiceTime, setNewServiceTime] = useState("");
  const [newMinistryName, setNewMinistryName] = useState("");
  
  const { t } = useTranslation(['settings', 'common']);
  const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/connect` : '';

  // Fetch configuration on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedConfig = await getFormConfiguration();
        setConfig(fetchedConfig);
      } catch (err) {
        console.error("Failed to fetch form configuration:", err);
        setError(err instanceof Error ? err.message : "Failed to load configuration.");
        // Set defaults on fetch error so UI doesn't break
        setConfig({
           serviceTimes: defaultServiceTimes,
           ministries: defaultMinistries,
           settings: defaultSettings
        });
      }
      setIsLoading(false);
    };
    fetchConfig();
  }, []); // Empty dependency array ensures this runs once on mount

  // --- Event Handlers (Update local state) ---

  const handleAddService = () => {
    if (newServiceDay && newServiceTime && config) {
      setConfig({
        ...config,
        serviceTimes: [
          ...config.serviceTimes,
          { id: Date.now().toString(), day: newServiceDay, time: newServiceTime, isActive: true },
        ],
      });
      setNewServiceDay("");
      setNewServiceTime("");
      setSaveResult(null); // Clear previous save result on edit
    }
  };

  const handleRemoveService = (id: string) => {
    if (config) {
      setConfig({
        ...config,
        serviceTimes: config.serviceTimes.filter((service) => service.id !== id),
      });
      setSaveResult(null);
    }
  };

  const handleToggleService = (id: string) => {
    if (config) {
      setConfig({
        ...config,
        serviceTimes: config.serviceTimes.map((service) =>
          service.id === id ? { ...service, isActive: !service.isActive } : service,
        ),
      });
      setSaveResult(null);
    }
  };

  const handleAddMinistry = () => {
    if (newMinistryName && config) {
      setConfig({
        ...config,
        ministries: [
          ...config.ministries,
          { id: Date.now().toString(), name: newMinistryName, isActive: true },
        ],
      });
      setNewMinistryName("");
      setSaveResult(null);
    }
  };

  const handleRemoveMinistry = (id: string) => {
    if (config) {
      setConfig({
        ...config,
        ministries: config.ministries.filter((ministry) => ministry.id !== id),
      });
      setSaveResult(null);
    }
  };

  const handleToggleMinistry = (id: string) => {
    if (config) {
      setConfig({
        ...config,
        ministries: config.ministries.map((ministry) =>
          ministry.id === id ? { ...ministry, isActive: !ministry.isActive } : ministry,
        ),
      });
      setSaveResult(null);
    }
  };

  const handleToggleSetting = (setting: keyof ConfigState['settings']) => {
    if (config) {
      setConfig({
        ...config,
        settings: {
          ...config.settings,
          [setting]: !config.settings[setting],
        },
      });
      setSaveResult(null);
    }
  };

  // --- Save Handler --- 
  const handleSaveChanges = () => {
    if (!config) return;

    startSavingTransition(async () => {
      setSaveResult(null);
      setError(null);
      try {
        const result = await saveFormConfiguration(config);
        setSaveResult(result);
        if (!result.success) {
          console.error("Failed to save configuration:", result.message);
        }
      } catch (err) {
        console.error("Error saving configuration:", err);
        setSaveResult({ success: false, message: err instanceof Error ? err.message : "An unexpected error occurred during save." });
      }
    });
  };

  // --- Clipboard/Preview --- 
  const copyToClipboard = () => {
    if(formUrl){
        navigator.clipboard.writeText(formUrl)
        alert(t('settings:formSettings.urlCopied', "Form URL copied to clipboard!"))
    }
  }

  const openPreview = () => {
    if(formUrl) window.open(formUrl, "_blank");
  }

  // --- Render Logic --- 
  if (isLoading) {
    return (
      <Card className="w-full flex justify-center items-center p-10">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         <span className="ml-2 text-muted-foreground">{t('common:loading')}</span>
      </Card>
    );
  }

  if (error) {
    return (
       <Card className="w-full">
         <CardHeader><CardTitle>{t('common:error')}</CardTitle></CardHeader>
         <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('settings:formSettings.loadErrorTitle')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
         </CardContent>
       </Card>
    );
  }
  
  // Ensure config is not null before rendering the main UI
  if (!config) {
     // This state should ideally not be reached if loading/error handled correctly
     return <Card className="w-full p-4"><p>{t('common:error')}</p></Card>;
  }

  return (
    <div className="w-full overflow-x-hidden">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('settings:formSettings.title')}</CardTitle>
          <CardDescription>{t('settings:formSettings.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="form-url">{t('settings:formSettings.formUrlLabel')}</Label>
            <div className="flex mt-1.5">
              <Input id="form-url" value={formUrl} readOnly className="flex-1" />
              <Button variant="outline" className="ml-2" onClick={copyToClipboard}>
                {t('common:copy')}
              </Button>
              <Button variant="outline" className="ml-2" onClick={openPreview}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('common:preview')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t('settings:formSettings.formUrlDescription')}
            </p>
          </div>

          {/* Display Save Result */} 
          {saveResult && (
            <Alert variant={saveResult.success ? "default" : "destructive"} className="mb-4">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>{saveResult.success ? t('common:success') : t('common:error')}</AlertTitle>
               <AlertDescription>
                 {saveResult.message || (saveResult.success ? t('settings:formSettings.saveSuccess') : t('settings:formSettings.saveError'))}
               </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="services">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">{t('settings:formSettings.tabs.services')}</TabsTrigger>
              <TabsTrigger value="ministries">{t('settings:formSettings.tabs.ministries')}</TabsTrigger>
              <TabsTrigger value="settings">{t('settings:formSettings.tabs.settings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('settings:formSettings.services.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings:formSettings.services.description')}
                </p>
              </div>

              <div className="space-y-4">
                {config.serviceTimes.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={service.isActive} onCheckedChange={() => handleToggleService(service.id)} />
                      <span>
                        {service.day} {service.time}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveService(service.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={t('settings:formSettings.services.dayPlaceholder')}
                  value={newServiceDay}
                  onChange={(e) => setNewServiceDay(e.target.value)}
                />
                <Input
                  placeholder={t('settings:formSettings.services.timePlaceholder')}
                  value={newServiceTime}
                  onChange={(e) => setNewServiceTime(e.target.value)}
                />
                <Button onClick={handleAddService}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('common:add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ministries" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('settings:formSettings.ministries.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings:formSettings.ministries.description')}
                </p>
              </div>

              <div className="space-y-4">
                {config.ministries.map((ministry) => (
                  <div key={ministry.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={ministry.isActive} onCheckedChange={() => handleToggleMinistry(ministry.id)} />
                      <span>{ministry.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMinistry(ministry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={t('settings:formSettings.ministries.namePlaceholder')}
                  value={newMinistryName}
                  onChange={(e) => setNewMinistryName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddMinistry}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('common:add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('settings:formSettings.settings.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('settings:formSettings.settings.description')}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="prayer-requests">{t('settings:formSettings.settings.prayerLabel')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings:formSettings.settings.prayerDescription')}</p>
                  </div>
                  <Switch
                    id="prayer-requests"
                    checked={config.settings.enablePrayerRequests}
                    onCheckedChange={() => handleToggleSetting("enablePrayerRequests")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="referral-tracking">{t('settings:formSettings.settings.referralLabel')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings:formSettings.settings.referralDescription')}</p>
                  </div>
                  <Switch
                    id="referral-tracking"
                    checked={config.settings.enableReferralTracking}
                    onCheckedChange={() => handleToggleSetting("enableReferralTracking")}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveChanges} disabled={isSaving}>
             {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {t('common:saveChanges')}
           </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
