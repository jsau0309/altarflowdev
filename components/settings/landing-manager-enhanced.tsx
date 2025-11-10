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
import { EmojiPickerPopover } from "@/components/settings/emoji-picker-popover";
import { EventManager } from "@/components/settings/event-manager";

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
  ogBackgroundColor: string;
  announcementText: string | null;
  announcementLink: string | null;
  showAnnouncement: boolean;
  eventTitleColor: string;
  eventDetailsColor: string;
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
    ogBackgroundColor: '#3B82F6',
    announcementText: null,
    announcementLink: null,
    showAnnouncement: false,
    eventTitleColor: '#FFFFFF',
    eventDetailsColor: '#FFFFFF',
  });

  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [hasActiveFlow, setHasActiveFlow] = useState(false);

  // Events state
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

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

  // Load events for preview
  const loadEvents = async () => {
    try {
      const response = await fetch("/api/settings/events");
      if (!response.ok) return;

      const data = await response.json();
      const allEvents = data.events || [];

      // Filter upcoming and past events (only show published events in preview)
      const now = new Date();
      const upcoming = allEvents
        .filter((event: any) => new Date(event.eventDate) >= now && event.isPublished)
        .slice(0, 3); // Show max 3 upcoming
      const past = allEvents
        .filter((event: any) => new Date(event.eventDate) < now && event.isPublished)
        .reverse()
        .slice(0, 2); // Show max 2 past

      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  useEffect(() => {
    if (organization) {
      loadEvents();
    }
  }, [organization]);

  // Listen for event updates from EventManager
  useEffect(() => {
    const handleEventUpdate = () => {
      loadEvents();
    };

    window.addEventListener('eventsUpdated', handleEventUpdate);
    return () => window.removeEventListener('eventsUpdated', handleEventUpdate);
  }, []);

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
          // Handle both JSON and non-JSON error responses
          let errorMessage = 'Logo upload failed';

          try {
            const contentType = uploadResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await uploadResponse.json();
              errorMessage = error.error || errorMessage;
            } else {
              // Handle HTML or plain text errors (like "Request Entity Too Large")
              const errorText = await uploadResponse.text();

              // Check for common error patterns
              if (uploadResponse.status === 413 || errorText.includes('Request Entity Too Large')) {
                errorMessage = 'Image file is too large. Maximum size is 5MB. Please choose a smaller image.';
              } else if (uploadResponse.status === 429) {
                errorMessage = 'Too many upload attempts. Please wait a moment and try again.';
              } else if (uploadResponse.status === 400) {
                errorMessage = 'Invalid image file. Please use JPEG, PNG, WebP, GIF, or SVG format.';
              } else {
                // Generic error with status code
                errorMessage = `Upload failed (Error ${uploadResponse.status}). Please try again.`;
              }
            }
          } catch (parseError) {
            // If we can't parse the error, use generic message
            errorMessage = `Upload failed (Error ${uploadResponse.status}). Please try again.`;
          }

          throw new Error(errorMessage);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="branding">{t("settings:landing.tabs.branding", "Branding")}</TabsTrigger>
              <TabsTrigger value="appearance">{t("settings:landing.tabs.appearance", "Appearance")}</TabsTrigger>
              <TabsTrigger value="social">{t("settings:landing.tabs.social", "Social")}</TabsTrigger>
              <TabsTrigger value="events">{t("settings:landing.tabs.events", "Events")}</TabsTrigger>
            </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          {/* Church Branding */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:landing.branding.title", "Church Branding")}</CardTitle>
              <CardDescription>
                {t("settings:landing.branding.description", "Customize how your church appears on the landing page")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>{t("settings:landing.branding.logo", "Church Logo")}</Label>

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
                          <>{t("settings:landing.branding.logoReady", "Logo ready to upload. Click \"Save All Changes\" to confirm.")}</>
                        ) : (
                          <>{t("settings:landing.branding.currentLogo", "Current logo")}</>
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
                          {t("settings:landing.branding.editButton", "Edit")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t("settings:landing.branding.removeButton", "Remove")}
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
                <Label htmlFor="custom-title">{t("settings:landing.branding.customTitle", "Custom Title (Optional)")}</Label>
                <Input
                  id="custom-title"
                  placeholder={churchName || t("settings:landing.branding.customTitlePlaceholder", "Enter custom title")}
                  value={config.customTitle || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, customTitle: e.target.value }))}
                  maxLength={50}
                />
                <p className="text-sm text-muted-foreground">
                  {t("settings:landing.branding.customTitleHint", "Leave empty to use your church name")}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t("settings:landing.branding.description", "Description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("settings:landing.branding.descriptionPlaceholder", "Welcome to our church! We're glad you're here...")}
                  value={config.description || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground">
                  {t("settings:landing.branding.descriptionCount", "{{count}}/160 characters", { count: config.description?.length || 0 })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Title Styling */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:landing.titleStyling.title", "Title Styling")}</CardTitle>
              <CardDescription>
                {t("settings:landing.titleStyling.description", "Customize how your church name appears")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Font Selection */}
              <div className="space-y-2">
                <Label htmlFor="title-font">{t("settings:landing.titleStyling.font", "Font")}</Label>
                <select
                  id="title-font"
                  value={config.titleFont}
                  onChange={(e) => setConfig(prev => ({ ...prev, titleFont: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="Modern">{t("settings:landing.titleStyling.fonts.modern", "Modern")}</option>
                  <option value="Elegant">{t("settings:landing.titleStyling.fonts.elegant", "Elegant")}</option>
                  <option value="Bold">{t("settings:landing.titleStyling.fonts.bold", "Bold")}</option>
                  <option value="Classic">{t("settings:landing.titleStyling.fonts.classic", "Classic")}</option>
                  <option value="Playful">{t("settings:landing.titleStyling.fonts.playful", "Playful")}</option>
                </select>
              </div>

              {/* Size Selection */}
              <div className="space-y-2">
                <Label htmlFor="title-size">{t("settings:landing.titleStyling.size", "Size")}</Label>
                <select
                  id="title-size"
                  value={config.titleSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, titleSize: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="Small">{t("settings:landing.titleStyling.sizes.small", "Small")}</option>
                  <option value="Medium">{t("settings:landing.titleStyling.sizes.medium", "Medium")}</option>
                  <option value="Large">{t("settings:landing.titleStyling.sizes.large", "Large")}</option>
                  <option value="Extra Large">{t("settings:landing.titleStyling.sizes.extraLarge", "Extra Large")}</option>
                </select>
              </div>

              {/* Color Selection */}
              <ColorPicker
                label={t("settings:landing.titleStyling.color", "Title Color")}
                color={config.titleColor}
                onChange={(color) => setConfig(prev => ({ ...prev, titleColor: color }))}
              />
            </CardContent>
          </Card>

          {/* Button Manager */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:landing.buttons.title", "Buttons")}</CardTitle>
              <CardDescription>
                {t("settings:landing.buttons.description", "Manage buttons on your landing page")}
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

          {/* Announcement Banner */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:landing.announcement.title", "Announcement Banner")}</CardTitle>
              <CardDescription>
                {t("settings:landing.announcement.description", "Display an announcement at the top of your landing page")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("settings:landing.announcement.showAnnouncement", "Show Announcement")}</Label>
                </div>
                <Switch
                  checked={config.showAnnouncement || false}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showAnnouncement: checked }))}
                />
              </div>

              {config.showAnnouncement && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="announcementText">
                        {t("settings:landing.announcement.announcementText", "Announcement Text")}
                      </Label>
                      <EmojiPickerPopover
                        onEmojiSelect={(emoji) => {
                          const currentText = config.announcementText || '';
                          setConfig(prev => ({
                            ...prev,
                            announcementText: currentText + emoji
                          }));
                        }}
                        buttonText={t("settings:landing.announcement.addEmoji", "Add emoji")}
                      />
                    </div>
                    <Textarea
                      id="announcementText"
                      placeholder={t("settings:landing.announcement.announcementTextPlaceholder", "Special service this Sunday at 10 AM!")}
                      value={config.announcementText || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, announcementText: e.target.value }))}
                      maxLength={200}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("settings:landing.announcement.characterCount", "{{count}}/200 characters", {
                        count: config.announcementText?.length || 0
                      })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="announcementLink">
                      {t("settings:landing.announcement.announcementLink", "Link URL (Optional)")}
                    </Label>
                    <Input
                      id="announcementLink"
                      type="url"
                      placeholder={t("settings:landing.announcement.announcementLinkPlaceholder", "https://example.com/event")}
                      value={config.announcementLink || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, announcementLink: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("settings:landing.announcement.linkNote", "Add a URL to make the banner clickable")}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          {/* Background Style */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:landing.backgroundStyle.title", "Background Style")}</CardTitle>
              <CardDescription>
                {t("settings:landing.backgroundStyle.description", "Choose a background for your landing page")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Backgrounds */}
              <div className="space-y-2">
                <Label>{t("settings:landing.backgroundStyle.presetBackgrounds", "Preset Backgrounds")}</Label>
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
                  <Label>{t("settings:landing.backgroundStyle.useSolidColor", "Use Solid Color")}</Label>
                </div>
                {config.backgroundType === 'SOLID' && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted">
                    <ColorPicker
                      label={t("settings:landing.backgroundStyle.backgroundColor", "Background Color")}
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
              <CardTitle>{t("settings:landing.buttonStyling.title", "Button Styling")}</CardTitle>
              <CardDescription>
                {t("settings:landing.buttonStyling.description", "Customize button appearance")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label={t("settings:landing.buttonStyling.buttonBackgroundColor", "Button Background Color")}
                color={config.buttonBackgroundColor}
                onChange={(color) => setConfig(prev => ({ ...prev, buttonBackgroundColor: color }))}
              />

              <ColorPicker
                label={t("settings:landing.buttonStyling.buttonTextColor", "Button Text Color")}
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
              <CardTitle>{t("settings:landing.socialLinks.title", "Social Links")}</CardTitle>
              <CardDescription>
                {t("settings:landing.socialLinks.description", "Add links to your social media profiles")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  {t("settings:landing.socialLinks.facebook", "Facebook URL")}
                </Label>
                <Input
                  id="facebook"
                  placeholder={t("settings:landing.socialLinks.facebookPlaceholder", "https://facebook.com/yourchurch")}
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
                  {t("settings:landing.socialLinks.instagram", "Instagram URL")}
                </Label>
                <Input
                  id="instagram"
                  placeholder={t("settings:landing.socialLinks.instagramPlaceholder", "https://instagram.com/yourchurch")}
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
                  {t("settings:landing.socialLinks.twitter", "Twitter/X URL")}
                </Label>
                <Input
                  id="twitter"
                  placeholder={t("settings:landing.socialLinks.twitterPlaceholder", "https://twitter.com/yourchurch")}
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
                  {t("settings:landing.socialLinks.youtube", "YouTube URL")}
                </Label>
                <Input
                  id="youtube"
                  placeholder={t("settings:landing.socialLinks.youtubePlaceholder", "https://youtube.com/@yourchurch")}
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
                  {t("settings:landing.socialLinks.website", "Website URL")}
                </Label>
                <Input
                  id="website"
                  placeholder={t("settings:landing.socialLinks.websitePlaceholder", "https://yourchurch.com")}
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

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {/* Event Styling */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:events.styling.title", "Event Styling")}</CardTitle>
              <CardDescription>
                {t("settings:events.styling.description", "Customize how events appear on your landing page")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label={t("settings:events.styling.titleColor", "Event Title Color")}
                color={config.eventTitleColor}
                onChange={(color) => setConfig(prev => ({ ...prev, eventTitleColor: color }))}
              />
              <ColorPicker
                label={t("settings:events.styling.detailsColor", "Event Details Color")}
                color={config.eventDetailsColor}
                onChange={(color) => setConfig(prev => ({ ...prev, eventDetailsColor: color }))}
              />
            </CardContent>
          </Card>

          {/* Event Manager */}
          <Card>
            <CardContent className="pt-6">
              <EventManager />
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
            ogBackgroundColor={config.ogBackgroundColor}
            onOgColorChange={(color) => setConfig(prev => ({ ...prev, ogBackgroundColor: color }))}
            announcementText={config.announcementText}
            announcementLink={config.announcementLink}
            showAnnouncement={config.showAnnouncement}
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
            eventTitleColor={config.eventTitleColor}
            eventDetailsColor={config.eventDetailsColor}
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
          {isSaving ? t("settings:landing.saving", "Saving...") : t("settings:landing.saveButton", "Save All Changes")}
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
