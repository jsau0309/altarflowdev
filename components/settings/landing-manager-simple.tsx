"use client";


import { useState, useEffect } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, QrCode, Eye, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getFlowConfiguration } from "@/lib/actions/flows.actions";
import { FlowType } from "@prisma/client";
import LoaderOne from "@/components/ui/loader-one";

export function LandingManager() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [churchSlug, setChurchSlug] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  
  const [showDonateButton, setShowDonateButton] = useState(false);
  const [showConnectButton, setShowConnectButton] = useState(false);
  
  // Validation states
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [hasFlows, setHasFlows] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string>("");

  // Load church data
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Fetch all data in parallel for better performance
        const [settingsResponse, stripeResponse, flowData] = await Promise.all([
          // Fetch settings
          fetch("/api/settings/landing"),
          // Fetch Stripe account status (only if org exists)
          organization?.id ? fetch("/api/settings/stripe-account") : Promise.resolve(null),
          // Fetch flows
          getFlowConfiguration(FlowType.NEW_MEMBER).catch(() => null)
        ]);

        // Process settings response
        if (!settingsResponse.ok) {
          const errorData = await settingsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch settings: ${settingsResponse.status}`);
        }
        
        const data = await settingsResponse.json();
        setChurchSlug(data.churchSlug);
        setShowDonateButton(data.settings.showDonateButton);
        setShowConnectButton(data.settings.showConnectButton);
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setQrCodeUrl(`${baseUrl}/${data.churchSlug}/nfc-landing`);
        
        // Process Stripe response
        if (stripeResponse && stripeResponse.ok) {
          try {
            const stripeData = await stripeResponse.json();
            if (stripeData.account) {
              setHasStripeAccount(true);
              const isVerified = stripeData.account.verificationStatus === "verified";
              const chargesEnabled = stripeData.account.chargesEnabled;
              setStripeStatus(isVerified && chargesEnabled ? "active" : "pending");
            } else {
              setHasStripeAccount(false);
              setStripeStatus("");
            }
          } catch (error) {
            console.error('Error processing Stripe data:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
            setHasStripeAccount(false);
            setStripeStatus("");
          }
        } else {
          setHasStripeAccount(false);
          setStripeStatus("");
        }
        
        // Process flows data
        setHasFlows(!!flowData && !!flowData.slug);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load landing settings:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
        toast.error(t("settings:landing.loadError", "Failed to load settings"));
        setIsLoading(false);
      }
    };
    
    if (user && organization) {
      loadSettings();
    }
  }, [user, organization, t]);

  const handleDownloadQR = () => {
    // Create a canvas to convert SVG to PNG
    const svg = document.getElementById("landing-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    canvas.width = 512;  // Higher resolution
    canvas.height = 512;
    
    // White background
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 512, 512);
        
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${churchSlug || 'church'}-landing-qr.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      };
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch("/api/settings/landing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showDonateButton,
          showConnectButton,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }
      
      toast.success(t("settings:landing.saved", "Landing page settings saved successfully"));
    } catch (error) {
      console.error('Failed to save settings:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(
        error instanceof Error 
          ? error.message 
          : t("settings:landing.saveError", "Failed to save settings")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    window.open(qrCodeUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t("settings:landing.qrCode", "NFC Landing Page QR Code")}
          </CardTitle>
          <CardDescription>
            {t("settings:landing.qrCodeDesc", "Print this QR code and place it at your church entrance for easy access")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <QRCode
                id="landing-qr-code"
                value={qrCodeUrl}
                size={250}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <Label>{t("settings:landing.pageUrl", "Landing Page URL")}</Label>
                <p className="text-sm text-muted-foreground mt-1 font-mono break-all">{qrCodeUrl}</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleDownloadQR} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t("settings:landing.downloadQR", "Download QR Code")}
                </Button>
                
                <Button onClick={handlePreview} variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  {t("settings:landing.preview", "Preview Page")}
                </Button>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  💡 {t("settings:landing.tip", "Tip: Print this QR code on a sign or sticker and place it at your church entrance. Visitors can scan it to donate or connect with your church.")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t("settings:landing.buttonVisibility", "Page Content")}
          </CardTitle>
          <CardDescription>
            {t("settings:landing.buttonVisibilityDesc", "Choose which actions are available on your landing page")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-sm">💸</span>
                  </div>
                  <Label htmlFor="donate-toggle" className="text-base font-medium">
                    {t("settings:landing.donateButton", "Donate Button")}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-10">
                  {t("settings:landing.donateButtonDesc", "Allow visitors to make quick donations")}
                </p>
                {!hasStripeAccount && (
                  <p className="text-sm text-amber-600 ml-10 mt-1 flex items-center gap-1">
                    ⚠️ {t("settings:landing.stripeRequired", "Stripe account required. Set up in Banking.")}
                  </p>
                )}
                {hasStripeAccount && stripeStatus !== "active" && (
                  <p className="text-sm text-amber-600 ml-10 mt-1 flex items-center gap-1">
                    ⚠️ {t("settings:landing.stripeNotActive", "Complete Stripe setup to enable donations.")}
                  </p>
                )}
              </div>
              <Switch
                id="donate-toggle"
                checked={showDonateButton}
                onCheckedChange={setShowDonateButton}
                disabled={!hasStripeAccount || stripeStatus !== "active"}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <Label htmlFor="connect-toggle" className="text-base font-medium">
                    {t("settings:landing.connectButton", "Connect Button")}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-10">
                  {t("settings:landing.connectButtonDesc", "Let new visitors fill out your member form")}
                </p>
                {!hasFlows && (
                  <p className="text-sm text-amber-600 ml-10 mt-1 flex items-center gap-1">
                    ⚠️ {t("settings:landing.flowRequired", "Create a flow first. Go to Flows page.")}
                  </p>
                )}
              </div>
              <Switch
                id="connect-toggle"
                checked={showConnectButton}
                onCheckedChange={setShowConnectButton}
                disabled={!hasFlows}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(!showDonateButton && !showConnectButton) 
                ? t("settings:landing.noButtonsWarning", "⚠️ At least one button should be enabled")
                : t("settings:landing.changesSaved", "Changes will be reflected immediately on your landing page")
              }
            </p>
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving || 
                       (showDonateButton && (!hasStripeAccount || stripeStatus !== "active")) ||
                       (showConnectButton && !hasFlows)}
            >
              {isSaving 
                ? t("settings:general.saving", "Saving...") 
                : t("settings:general.saveChanges", "Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Future Enhancement Note */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">
            {t("settings:landing.futureFeatures", "Coming Soon: Advanced Scheduling")}
          </CardTitle>
          <CardDescription>
            {t("settings:landing.futureDesc", "In future updates, you'll be able to schedule different buttons to appear at specific times and days of the week.")}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}