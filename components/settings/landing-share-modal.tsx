"use client";

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, QrCode, ExternalLink, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { CustomQRCode } from "@/components/settings/custom-qr-code";
import { ColorPicker } from "@/components/settings/color-picker";

interface LandingShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  churchSlug: string;
  churchName: string;
  logoUrl: string | null;
  ogBackgroundColor: string;
  onOgColorChange: (color: string) => void;
}

export function LandingShareModal({
  open,
  onClose,
  url,
  churchSlug,
  churchName,
  logoUrl,
  ogBackgroundColor,
  onOgColorChange,
}: LandingShareModalProps) {
  const { t } = useTranslation();
  const [showQR, setShowQR] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // QR Code customization state
  const [qrFgColor, setQrFgColor] = useState('#000000');
  const [showQRColorPicker, setShowQRColorPicker] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCopyLink = async () => {
    try {
      // Check if Clipboard API is available (requires HTTPS in production)
      if (!navigator.clipboard) {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success(t("settings:shareModal.linkCopied", "Link copied to clipboard!"));
        } catch (err) {
          toast.error(t("settings:shareModal.copyFailed", "Failed to copy link"));
        } finally {
          document.body.removeChild(textArea);
        }
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success(t("settings:shareModal.linkCopied", "Link copied to clipboard!"));
    } catch (error) {
      toast.error(t("settings:shareModal.copyFailed", "Failed to copy link"));
    }
  };

  const handleDownloadQR = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      toast.error('QR code not ready');
      return;
    }

    try {
      // Check if toBlob is supported
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${churchSlug}-qr-code.png`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(t("settings:shareModal.qrDownloaded", "QR code downloaded!"));
          }
        });
      } else {
        // Fallback for browsers without toBlob support
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${churchSlug}-qr-code.png`;
        link.click();
        toast.success(t("settings:shareModal.qrDownloaded", "QR code downloaded!"));
      }
    } catch (error) {
      console.error('QR code download error:', error);
      toast.error('Failed to download QR code');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("settings:shareModal.title", "Share your landing page")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2">
          {/* OG Preview Card */}
          <div className="space-y-3">
            <div
              className="relative rounded-lg overflow-hidden border aspect-[1200/630]"
              style={{ backgroundColor: ogBackgroundColor }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                {/* Logo Circle */}
                {logoUrl && (
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white mb-4 flex items-center justify-center border-2 border-white/30">
                    <img
                      src={logoUrl}
                      alt="Church logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Church Name */}
                <div className="text-white font-bold text-lg text-center mb-2 max-w-[90%]">
                  {churchName}
                </div>

                {/* URL */}
                <div className="text-white/85 text-xs text-center font-medium">
                  altarflow.com/{churchSlug}
                </div>
              </div>
            </div>

            {/* Color Picker Toggle */}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{t("settings:shareModal.customizeColor", "Customize share color")}</span>
              </div>
              <span className="text-muted-foreground">&gt;</span>
            </button>

            {/* Color Picker Section */}
            {showColorPicker && (
              <div className="pt-2 pb-4 border-t space-y-3">
                <ColorPicker
                  label={t("settings:shareModal.ogBackgroundColor", "Share Card Background Color")}
                  color={ogBackgroundColor}
                  onChange={onOgColorChange}
                />
              </div>
            )}
          </div>

          {/* URL Copy Section */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
            <span className="flex-1 text-sm truncate font-mono text-foreground">{url}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-1" />
              {t("settings:shareModal.copy", "Copy")}
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{t("settings:shareModal.open", "Open")}</span>
              </div>
              <span className="text-muted-foreground">&gt;</span>
            </button>

            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{t("settings:shareModal.qrCode", "QR code")}</span>
              </div>
              <span className="text-muted-foreground">&gt;</span>
            </button>
          </div>

          {/* QR Code Section */}
          {showQR && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-center bg-background p-6 rounded-lg border">
                <CustomQRCode
                  value={url}
                  size={300}
                  fgColor={qrFgColor}
                  bgColor="#FFFFFF"
                  logoUrl={logoUrl}
                  onCanvasReady={(canvas) => {
                    qrCanvasRef.current = canvas;
                  }}
                />
              </div>

              {/* QR Color Customization */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowQRColorPicker(!showQRColorPicker)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">
                      {t("settings:shareModal.customizeQRColor", "Customize QR color")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: qrFgColor }}
                    />
                    <span className="text-muted-foreground">&gt;</span>
                  </div>
                </button>

                {showQRColorPicker && (
                  <div className="pt-2 pb-4 border-t space-y-3">
                    <ColorPicker
                      label={t("settings:shareModal.qrColor", "QR Code Color")}
                      color={qrFgColor}
                      onChange={setQrFgColor}
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="w-full"
              >
                {t("settings:shareModal.downloadQR", "Download QR Code")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
