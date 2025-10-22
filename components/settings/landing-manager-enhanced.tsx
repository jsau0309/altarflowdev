"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { X, Facebook, Instagram, Twitter, Youtube, Globe, User, Edit2 } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";
import { BACKGROUND_PRESETS } from "@/lib/landing-page/background-presets";
import Image from "next/image";
import { ButtonManager, ButtonConfig } from "@/components/settings/button-manager";
import { ColorPicker } from "@/components/settings/color-picker";
import { LandingPagePreview } from "@/components/settings/landing-page-preview";
import { ImageDropzone } from "@/components/settings/image-dropzone";
import { ImageCropperModal } from "@/components/settings/image-cropper-modal";

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
  customTitle: string | null;
  titleFont: string;
  titleSize: string;
  titleColor: string;
  backgroundType: string;
  backgroundValue: string | null;
  socialLinks: SocialLinks;
  showDonateButton: boolean;
  showConnectButton: boolean;
  donateButtonText: string;
  connectButtonText: string;
  buttonBackgroundColor: string;
  buttonTextColor: string;
  buttons: ButtonConfig[];
}

export function LandingManagerEnhanced() {
  const { t } = useTranslation();
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [churchSlug, setChurchSlug] = useState<string>("");
  const [churchName, setChurchName] = useState<string>("");

  const [config, setConfig] = useState<LandingConfig>({
    logoUrl: null,
    logoPath: null,
    description: null,
    customTitle: null,
    titleFont: 'Modern',
    titleSize: 'Large',
    titleColor: '#FFFFFF',
    backgroundType: 'PRESET',
    backgroundValue: 'preset-1',
    socialLinks: {},
    showDonateButton: false,
    showConnectButton: false,
    donateButtonText: 'Donate',
    connectButtonText: 'Connect',
    buttonBackgroundColor: '#FFFFFF',
    buttonTextColor: '#1F2937',
    buttons: [],
  });

  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [hasActiveFlow, setHasActiveFlow] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [isEditingExistingLogo, setIsEditingExistingLogo] = useState(false);

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

        if (data.hasConfig) {
          setConfig(data.config);
        }

        // Load Stripe and Flow availability
        setHasStripeAccount(data.hasStripeAccount || false);
        setHasActiveFlow(data.hasActiveFlow || false);

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

  // Handle image selection from dropzone
  const handleImageSelected = (file: File) => {
    setSelectedImage(file);
    setIsEditingExistingLogo(false); // New upload, not editing
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle cropped image
  const handleCropComplete = (croppedBlob: Blob) => {
    setCroppedImageBlob(croppedBlob);
    // Create preview URL for the cropped image
    const previewUrl = URL.createObjectURL(croppedBlob);
    setConfig(prev => ({
      ...prev,
      logoUrl: previewUrl, // Temporary preview
    }));
    setShowCropper(false);
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setCroppedImageBlob(null);
    setConfig(prev => ({
      ...prev,
      logoUrl: null,
      logoPath: null,
    }));
  };

  // Handle logo edit (reopen cropper with current logo)
  const handleEditLogo = () => {
    if (config.logoUrl) {
      setImagePreview(config.logoUrl);
      setIsEditingExistingLogo(true); // Editing existing, not new upload
      setShowCropper(true);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      // Step 1: Upload logo if there's a new cropped image
      let logoUrl = config.logoUrl;
      let logoPath = config.logoPath;

      if (croppedImageBlob) {
        const formData = new FormData();
        formData.append('logo', croppedImageBlob, selectedImage?.name || 'logo.jpg');

        const uploadResponse = await fetch('/api/upload/landing-logo', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Logo upload failed');
        }

        const uploadData = await uploadResponse.json();
        logoUrl = uploadData.logoUrl;
        logoPath = uploadData.logoPath;
      }

      // Step 2: Save all settings including the uploaded logo URL
      const response = await fetch("/api/settings/landing-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          logoUrl,
          logoPath,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      // Update local state with the real URLs
      setConfig(prev => ({
        ...prev,
        logoUrl,
        logoPath,
      }));

      // Clear temporary image state
      setCroppedImageBlob(null);
      setSelectedImage(null);
      setImagePreview(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Settings */}
        <div>
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          {/* Church Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Church Branding</CardTitle>
              <CardDescription>
                Customize how your church appears on the landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Church Logo</Label>

                {config.logoUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border shadow-md bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%,#e5e7eb),linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%,#e5e7eb)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]">
                      <Image
                        src={config.logoUrl}
                        alt="Church logo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {croppedImageBlob ? (
                          <>Logo ready to upload. Click "Save All Changes" to confirm.</>
                        ) : (
                          <>Current logo</>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEditLogo}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ImageDropzone
                    onImageSelected={handleImageSelected}
                    disabled={isSaving}
                  />
                )}
              </div>

              {/* Custom Title */}
              <div className="space-y-2">
                <Label htmlFor="custom-title">Custom Title (Optional)</Label>
                <Input
                  id="custom-title"
                  placeholder={churchName || "Enter custom title"}
                  value={config.customTitle || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, customTitle: e.target.value }))}
                  maxLength={50}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to use your church name
                </p>
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
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground">
                  {config.description?.length || 0}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Title Styling */}
          <Card>
            <CardHeader>
              <CardTitle>Title Styling</CardTitle>
              <CardDescription>
                Customize how your church name appears
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Font Selection */}
              <div className="space-y-2">
                <Label htmlFor="title-font">Font</Label>
                <select
                  id="title-font"
                  value={config.titleFont}
                  onChange={(e) => setConfig(prev => ({ ...prev, titleFont: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="Modern">Modern</option>
                  <option value="Elegant">Elegant</option>
                  <option value="Bold">Bold</option>
                  <option value="Classic">Classic</option>
                  <option value="Playful">Playful</option>
                </select>
              </div>

              {/* Size Selection */}
              <div className="space-y-2">
                <Label htmlFor="title-size">Size</Label>
                <select
                  id="title-size"
                  value={config.titleSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, titleSize: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                  <option value="Extra Large">Extra Large</option>
                </select>
              </div>

              {/* Color Selection */}
              <ColorPicker
                label="Title Color"
                color={config.titleColor}
                onChange={(color) => setConfig(prev => ({ ...prev, titleColor: color }))}
              />
            </CardContent>
          </Card>

          {/* Button Manager */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Manage buttons on your landing page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ButtonManager
                buttons={config.buttons}
                onButtonsChange={(buttons) => setConfig(prev => ({ ...prev, buttons }))}
                hasStripeAccount={hasStripeAccount}
                hasActiveFlow={hasActiveFlow}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          {/* Background Style */}
          <Card>
            <CardHeader>
              <CardTitle>Background Style</CardTitle>
              <CardDescription>
                Choose a background for your landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Backgrounds */}
              <div className="space-y-2">
                <Label>Preset Backgrounds</Label>
                <div className="grid grid-cols-2 gap-3">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setConfig(prev => ({
                        ...prev,
                        backgroundType: 'PRESET',
                        backgroundValue: preset.id,
                      }))}
                      className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        config.backgroundType === 'PRESET' && config.backgroundValue === preset.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ background: preset.preview }}
                    >
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1.5">
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Solid Color Option */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.backgroundType === 'SOLID'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig(prev => ({
                          ...prev,
                          backgroundType: 'SOLID',
                          backgroundValue: prev.backgroundValue || '#4F46E5',
                        }));
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          backgroundType: 'PRESET',
                          backgroundValue: 'preset-1',
                        }));
                      }
                    }}
                  />
                  <Label>Use Solid Color</Label>
                </div>
                {config.backgroundType === 'SOLID' && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted">
                    <ColorPicker
                      label="Background Color"
                      color={config.backgroundValue || '#4F46E5'}
                      onChange={(color) => setConfig(prev => ({ ...prev, backgroundValue: color }))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Button Styling */}
          <Card>
            <CardHeader>
              <CardTitle>Button Styling</CardTitle>
              <CardDescription>
                Customize button appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label="Button Background Color"
                color={config.buttonBackgroundColor}
                onChange={(color) => setConfig(prev => ({ ...prev, buttonBackgroundColor: color }))}
              />

              <ColorPicker
                label="Button Text Color"
                color={config.buttonTextColor}
                onChange={(color) => setConfig(prev => ({ ...prev, buttonTextColor: color }))}
              />
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
          </Tabs>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:block hidden">
          <LandingPagePreview
            churchName={churchName}
            churchSlug={churchSlug}
            logoUrl={config.logoUrl}
            description={config.description}
            customTitle={config.customTitle}
            titleFont={config.titleFont}
            titleSize={config.titleSize}
            titleColor={config.titleColor}
            backgroundType={config.backgroundType}
            backgroundValue={config.backgroundValue}
            socialLinks={config.socialLinks}
            showDonateButton={config.showDonateButton}
            showConnectButton={config.showConnectButton}
            donateButtonText={config.donateButtonText}
            connectButtonText={config.connectButtonText}
            buttonBackgroundColor={config.buttonBackgroundColor}
            buttonTextColor={config.buttonTextColor}
            buttons={config.buttons}
          />
        </div>
      </div>

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

      {/* Image Cropper Modal */}
      {imagePreview && (
        <ImageCropperModal
          open={showCropper}
          onClose={() => setShowCropper(false)}
          imageSrc={imagePreview}
          onCropComplete={handleCropComplete}
          isEditingExisting={isEditingExistingLogo}
        />
      )}
    </div>
  );
}
