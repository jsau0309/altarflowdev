"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import type { FormConfiguration, ServiceTime, Ministry } from "../member-form/types" // Might need adjustment if types move
import { defaultServiceTimes, defaultMinistries, defaultSettings } from "../member-form/types" // Might need adjustment if types move
import { PlusCircle, Trash2, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
// Use actions from the new file
import { getFlowConfiguration, saveFlowConfiguration } from "@/lib/actions/flows.actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FlowType } from "@prisma/client" // Import FlowType

// Define the shape of the config state, excluding fields not directly managed here
type ConfigState = Omit<FormConfiguration, 'churchId' | 'formVersion' | 'customFields'>;

export function NewMemberFlowSettings() { // Renamed component
  // State for the configuration, loading, saving, and errors
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [flowSlug, setFlowSlug] = useState<string | null>(null); // Add state for the slug
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [saveResult, setSaveResult] = useState<{ success: boolean; message?: string } | null>(null);

  // State for adding new items
  const [newServiceDay, setNewServiceDay] = useState("");
  const [newServiceTime, setNewServiceTime] = useState("");
  const [newMinistryName, setNewMinistryName] = useState("");
  
  // Load 'flows' and 'common' namespaces
  const { t } = useTranslation(['flows', 'common']); 

  // Construct formUrl based on fetched slug or show placeholder
  const formUrl = typeof window !== 'undefined' 
      ? flowSlug 
          ? `${window.location.origin}/connect/${flowSlug}` 
          : `${window.location.origin}/connect/` // Or show placeholder/message if no slug yet
      : '';

  // Fetch configuration on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      setError(null);
      setFlowSlug(null); // Reset slug on fetch
      try {
        const fetchedData = await getFlowConfiguration(FlowType.NEW_MEMBER);
        // Separate config and slug
        const { slug, ...restConfig } = fetchedData;
        setConfig(restConfig); 
        setFlowSlug(slug); // Set the fetched slug
      } catch (err) {
        console.error("Failed to fetch NEW_MEMBER flow configuration:", err);
        setError(err instanceof Error ? err.message : "Failed to load configuration.");
        // Set defaults on fetch error so UI doesn't break
        setConfig({
           serviceTimes: defaultServiceTimes,
           ministries: defaultMinistries,
           settings: defaultSettings
        });
        setFlowSlug(null); // Ensure slug is null on error
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

  const handleSettingInputChange = (settingKey: keyof ConfigState['settings'], value: string) => {
    if (config) {
      setConfig({
        ...config,
        settings: {
          ...config.settings,
          [settingKey]: value,
        },
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
        // Save NEW_MEMBER flow specifically
        const result = await saveFlowConfiguration(FlowType.NEW_MEMBER, config);
        setSaveResult(result);
        if (!result.success) {
          console.error("Failed to save configuration:", result.message);
          setSaveResult({ success: false, message: result.message || t('flows:config.saveError', 'Failed to save configuration.') });
        }
      } catch (err) {
        console.error("Error saving configuration:", err);
        const errMsg = err instanceof Error ? err.message : t('common:errors.unexpected', 'An unexpected error occurred');
        setSaveResult({ success: false, message: errMsg });
      }
    });
  };

  // --- Clipboard/Preview --- 
  const copyToClipboard = () => {
    if(formUrl){
        navigator.clipboard.writeText(formUrl)
        alert(t('common:urlCopied', "Form URL copied to clipboard!"))
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
         <CardHeader><CardTitle>{t('flows:config.loadErrorTitle', 'Error Loading Configuration')}</CardTitle></CardHeader>
         <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('common:error', 'Error')}</AlertTitle>
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
          <CardTitle>{t('flows:config.title', 'New Member Flow Settings')}</CardTitle>
          <CardDescription>{t('flows:config.description', 'Configure the new member information collection flow.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="form-url">{t('flows:config.formUrlLabel', 'Form URL')}</Label>
            <div className="flex mt-1.5">
              <Input id="form-url" value={flowSlug ? formUrl : t('flows:config.urlNotGenerated', 'URL generated after first save')} readOnly className="flex-1" />
              <Button variant="outline" className="ml-2" onClick={copyToClipboard} disabled={!flowSlug}>
                {t('common:copy', 'Copy')}
              </Button>
              <Button variant="outline" className="ml-2" onClick={openPreview} disabled={!flowSlug}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('common:preview', 'Preview')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t('flows:config.formUrlDescription', 'Share this link with visitors or use it to generate QR codes.')}
            </p>
          </div>

          <Tabs defaultValue="services">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">{t('flows:config.tabs.services', 'Service Times')}</TabsTrigger>
              <TabsTrigger value="ministries">{t('flows:config.tabs.ministries', 'Ministries')}</TabsTrigger>
              <TabsTrigger value="settings">{t('flows:config.tabs.settings', 'General Settings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('flows:config.services.title', 'Service Times')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('flows:config.services.description', 'Add the service times that visitors can select on the form.')}
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
                  placeholder={t('flows:config.services.dayPlaceholder', 'Day (e.g., Sunday)')}
                  value={newServiceDay}
                  onChange={(e) => setNewServiceDay(e.target.value)}
                />
                <Input
                  placeholder={t('flows:config.services.timePlaceholder', 'Time (e.g., 10:00 AM)')}
                  value={newServiceTime}
                  onChange={(e) => setNewServiceTime(e.target.value)}
                />
                <Button onClick={handleAddService}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('common:add', 'Add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ministries" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('flows:config.ministries.title', 'Ministries')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('flows:config.ministries.description', 'Add the ministries visitors can express interest in.')}
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
                  placeholder={t('flows:config.ministries.namePlaceholder', 'Ministry Name')}
                  value={newMinistryName}
                  onChange={(e) => setNewMinistryName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddMinistry}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('common:add', 'Add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">{t('flows:config.settings.title', 'General Settings')}</h3>
                <p className="text-sm text-muted-foreground">{t('flows:config.settings.description', 'Configure general settings for this flow.')}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="prayer-requests">{t('flows:config.settings.prayerLabel', 'Enable Prayer Requests')}</Label>
                    <p className="text-sm text-muted-foreground">{t('flows:config.settings.prayerDescription', 'Allow visitors to submit prayer requests.')}</p>
                  </div>
                  <Switch
                    id="prayer-requests"
                    checked={config.settings.enablePrayerRequests}
                    onCheckedChange={() => handleToggleSetting("enablePrayerRequests")}
                  />
                </div>

                {/* Prayer Request Notification Email Input - Conditionally Rendered */}
                {config.settings.enablePrayerRequests && (
                  <div className="space-y-2 pl-6 pt-2 pb-2">
                    <Label htmlFor="prayer-request-notification-email">
                      {t('flows:config.settings.prayerNotificationEmailLabel', 'Prayer Request Notification Email')}
                    </Label>
                    <Input
                      id="prayer-request-notification-email"
                      type="email"
                      placeholder={t('flows:config.settings.prayerNotificationEmailPlaceholder', 'e.g., prayerteam@church.com')}
                      value={config.settings.prayerRequestNotificationEmail || ''}
                      onChange={(e) => handleSettingInputChange('prayerRequestNotificationEmail', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('flows:config.settings.prayerNotificationEmailDescription', 'Email address to receive prayer request notifications.')}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="referral-tracking">{t('flows:config.settings.referralLabel', 'Enable Referral Tracking')}</Label>
                    <p className="text-sm text-muted-foreground">{t('flows:config.settings.referralDescription', 'Ask visitors how they heard about the church.')}</p>
                  </div>
                  <Switch
                    id="referral-tracking"
                    checked={config.settings.enableReferralTracking}
                    onCheckedChange={() => handleToggleSetting("enableReferralTracking")}
                  />
                </div>
                
                {/* Add the new Life Stage toggle here */}
                 <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="life-stage">{t('flows:config.settings.lifeStageLabel', 'Enable Life Stage Field')}</Label>
                    <p className="text-sm text-muted-foreground">{t('flows:config.settings.lifeStageDescription', 'Ask visitors for their life stage (e.g., Youth, Young Adult).')}</p>
                  </div>
                  <Switch
                    id="life-stage"
                    checked={config.settings.enableLifeStage}
                    onCheckedChange={() => handleToggleSetting("enableLifeStage")}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveChanges} disabled={isSaving}>
             {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {t('common:saveChanges', 'Save Changes')}
           </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 