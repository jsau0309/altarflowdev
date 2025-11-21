"use client";


import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Clock, Calendar, Globe, QrCode } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LandingSettings {
  showDonateButton: boolean;
  showConnectButton: boolean;
  scheduling: {
    enabled: boolean;
    timezone: string;
    rules: ScheduleRule[];
  };
}

interface ScheduleRule {
  id: string;
  name: string;
  enabled: boolean;
  showDonate: boolean;
  showConnect: boolean;
  daysOfWeek: number[]; // 0-6, where 0 is Sunday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export function LandingManager() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [churchSlug, setChurchSlug] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  
  const [settings, setSettings] = useState<LandingSettings>({
    showDonateButton: true,
    showConnectButton: true,
    scheduling: {
      enabled: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      rules: []
    }
  });

  // Load church data and settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // For now, using organization slug from Clerk
        const orgSlug = user?.organizationMemberships?.[0]?.organization?.slug || "";
        setChurchSlug(orgSlug);
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setQrCodeUrl(`${baseUrl}/${orgSlug}/nfc-landing`);
        
        // TODO: Load saved settings from API
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load landing settings:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
        toast.error(t("settings:landing.loadError", "Failed to load settings"));
        setIsLoading(false);
      }
    };
    
    if (user) {
      loadSettings();
    }
  }, [user, t]);

  const handleDownloadQR = () => {
    const svg = document.getElementById("landing-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${churchSlug}-landing-qr.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      // TODO: Save settings to API
      toast.success(t("settings:landing.saved", "Landing page settings saved"));
    } catch (error) {
      console.error('Failed to save settings:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t("settings:landing.saveError", "Failed to save settings"));
    } finally {
      setIsSaving(false);
    }
  };

  const addScheduleRule = () => {
    const newRule: ScheduleRule = {
      id: Date.now().toString(),
      name: `Rule ${settings.scheduling.rules.length + 1}`,
      enabled: true,
      showDonate: true,
      showConnect: true,
      daysOfWeek: [0], // Default to Sunday
      startTime: "09:00",
      endTime: "12:00"
    };
    
    setSettings(prev => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        rules: [...prev.scheduling.rules, newRule]
      }
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t("settings:landing.qrCode", "Landing Page QR Code")}
          </CardTitle>
          <CardDescription>
            {t("settings:landing.qrCodeDesc", "Share this QR code for quick access to your church's landing page")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-white p-4 rounded-lg border">
              <QRCode
                id="landing-qr-code"
                value={qrCodeUrl}
                size={200}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <Label>{t("settings:landing.pageUrl", "Landing Page URL")}</Label>
                <p className="text-sm text-muted-foreground mt-1">{qrCodeUrl}</p>
              </div>
              
              <Button onClick={handleDownloadQR} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {t("settings:landing.downloadQR", "Download QR Code")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings:landing.buttonSettings", "Button Visibility")}
          </CardTitle>
          <CardDescription>
            {t("settings:landing.buttonSettingsDesc", "Control which buttons appear on your landing page")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="default" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="default">
                {t("settings:landing.defaultSettings", "Default Settings")}
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                {t("settings:landing.scheduledSettings", "Scheduled Settings")}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="default" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="donate-toggle">
                      {t("settings:landing.showDonateButton", "Show Donate Button")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings:landing.donateButtonDesc", "Allow visitors to make donations")}
                    </p>
                  </div>
                  <Switch
                    id="donate-toggle"
                    checked={settings.showDonateButton}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, showDonateButton: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="connect-toggle">
                      {t("settings:landing.showConnectButton", "Show Connect Button")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings:landing.connectButtonDesc", "Allow visitors to fill out the new member form")}
                    </p>
                  </div>
                  <Switch
                    id="connect-toggle"
                    checked={settings.showConnectButton}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, showConnectButton: checked }))
                    }
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="scheduled" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="scheduling-toggle">
                      {t("settings:landing.enableScheduling", "Enable Scheduling")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings:landing.schedulingDesc", "Show different buttons based on time and day")}
                    </p>
                  </div>
                  <Switch
                    id="scheduling-toggle"
                    checked={settings.scheduling.enabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        scheduling: { ...prev.scheduling, enabled: checked }
                      }))
                    }
                  />
                </div>
                
                {settings.scheduling.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="timezone-select">
                        {t("settings:landing.timezone", "Timezone")}
                      </Label>
                      <Select
                        value={settings.scheduling.timezone}
                        onValueChange={(value) => 
                          setSettings(prev => ({ 
                            ...prev, 
                            scheduling: { ...prev.scheduling, timezone: value }
                          }))
                        }
                      >
                        <SelectTrigger id="timezone-select" className="w-full md:w-[300px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        {t("settings:landing.schedulingNote", 
                          "Scheduling rules allow you to show different buttons during specific times. For example, show only the Connect button during service times."
                        )}
                      </p>
                    </div>
                    
                    <Button 
                      onClick={addScheduleRule} 
                      variant="outline" 
                      className="w-full"
                    >
                      {t("settings:landing.addSchedule", "Add Schedule Rule")}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving 
                ? t("settings:general.saving", "Saving...") 
                : t("settings:general.saveChanges", "Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}