"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, QrCode, Eye, Upload, X, Facebook, Instagram, Twitter, Youtube, Globe } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";
import { BACKGROUND_PRESETS } from "@/lib/landing-page/background-presets";
import Image from "next/image";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

interface LandingConfig {
  logoUrl: string | null;
  logoPath: string | null;
  description: string | null;
  backgroundType: string;
  backgroundValue: string | null;
  socialLinks: SocialLinks;
  showDonateButton: boolean;
  showConnectButton: boolean;
  donateButtonText: string;
  connectButtonText: string;
}

export function LandingManagerEnhanced() {
  const { t } = useTranslation();
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [churchSlug, setChurchSlug] = useState<string>("");
  const [churchName, setChurchName] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const [config, setConfig] = useState<LandingConfig>({
    logoUrl: null,
    logoPath: null,
    description: null,
    backgroundType: 'PRESET',
    backgroundValue: 'preset-1',
    socialLinks: {},
    showDonateButton: false,
    showConnectButton: false,
    donateButtonText: 'Donate',
    connectButtonText: 'Connect',
  });

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/landing-config");

        if (!response.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await response.json();
        setChurchSlug(data.churchSlug);
        setChurchName(data.churchName);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setQrCodeUrl(`${baseUrl}/${data.churchSlug}`);

        if (data.hasConfig) {
          setConfig(data.config);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load landing settings:", error);
        toast.error(t("settings:landing.loadError", "Failed to load settings"));
        setIsLoading(false);
      }
    };

    if (organization) {
      loadSettings();
    }
  }, [organization, t]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload/landing-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setConfig(prev => ({
        ...prev,
        logoUrl: data.logoUrl,
        logoPath: data.logoPath,
      }));

      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Logo upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!config.logoPath) return;

    try {
      const response = await fetch('/api/upload/landing-logo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoPath: config.logoPath }),
      });

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          logoUrl: null,
          logoPath: null,
        }));
        toast.success("Logo removed");
      }
    } catch (error) {
      console.error("Failed to remove logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const response = await fetch("/api/settings/landing-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      toast.success(t("settings:landing.saved", "Landing page settings saved successfully"));
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:landing.saveError", "Failed to save settings")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("landing-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 512;
    canvas.height = 512;

    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 512, 512);

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

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
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
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Church Branding</CardTitle>
              <CardDescription>
                Customize how your church appears on the landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Church Logo</Label>
                <div className="flex items-center gap-4">
                  {config.logoUrl ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                      <Image
                        src={config.logoUrl}
                        alt="Church logo"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={isUploading}
                    />
                    <Label htmlFor="logo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        asChild
                      >
                        <span>
                          {isUploading ? "Uploading..." : "Upload Logo"}
                        </span>
                      </Button>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended: Square image, at least 400x400px, max 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Welcome to our church! We're glad you're here..."
                  value={config.description || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">
                  {config.description?.length || 0}/500 characters
                </p>
              </div>

              {/* Button Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="donate-toggle">Show Donate Button</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow visitors to make donations
                    </p>
                  </div>
                  <Switch
                    id="donate-toggle"
                    checked={config.showDonateButton}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({ ...prev, showDonateButton: checked }))
                    }
                  />
                </div>

                {config.showDonateButton && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="donate-text">Button Text</Label>
                    <Input
                      id="donate-text"
                      value={config.donateButtonText}
                      onChange={(e) => setConfig(prev => ({ ...prev, donateButtonText: e.target.value }))}
                      maxLength={20}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="connect-toggle">Show Connect Button</Label>
                    <p className="text-sm text-muted-foreground">
                      Let visitors fill out your member form
                    </p>
                  </div>
                  <Switch
                    id="connect-toggle"
                    checked={config.showConnectButton}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({ ...prev, showConnectButton: checked }))
                    }
                  />
                </div>

                {config.showConnectButton && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="connect-text">Button Text</Label>
                    <Input
                      id="connect-text"
                      value={config.connectButtonText}
                      onChange={(e) => setConfig(prev => ({ ...prev, connectButtonText: e.target.value }))}
                      maxLength={20}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Background Tab */}
        <TabsContent value="background" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Background Style</CardTitle>
              <CardDescription>
                Choose a background for your landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      backgroundType: 'PRESET',
                      backgroundValue: preset.id,
                    }))}
                    className={`relative h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      config.backgroundType === 'PRESET' && config.backgroundValue === preset.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ background: preset.preview }}
                  >
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Add links to your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/yourchurch"
                  value={config.socialLinks.facebook || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, facebook: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/yourchurch"
                  value={config.socialLinks.instagram || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter/X
                </Label>
                <Input
                  id="twitter"
                  placeholder="https://twitter.com/yourchurch"
                  value={config.socialLinks.twitter || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  placeholder="https://youtube.com/@yourchurch"
                  value={config.socialLinks.youtube || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  placeholder="https://yourchurch.com"
                  value={config.socialLinks.website || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, website: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Code Tab */}
        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Landing Page QR Code
              </CardTitle>
              <CardDescription>
                Share this QR code for quick access to your landing page
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
                    <Label>Landing Page URL</Label>
                    <p className="text-sm text-muted-foreground mt-1 font-mono break-all">{qrCodeUrl}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleDownloadQR} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>

                    <Button onClick={handlePreview} variant="outline" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview Page
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          size="lg"
        >
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
