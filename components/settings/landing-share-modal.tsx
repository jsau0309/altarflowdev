"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from "react-qr-code";

interface LandingShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  churchSlug: string;
}

export function LandingShareModal({
  open,
  onClose,
  url,
  churchSlug,
}: LandingShareModalProps) {
  const [showQR, setShowQR] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('share-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${churchSlug}-qr-code.png`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success('QR code downloaded!');
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Share your landing page</DialogTitle>
        </DialogHeader>

        {/* URL Copy Section */}
        <div className="space-y-4 overflow-y-auto pr-2">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
            <span className="flex-1 text-sm truncate font-mono text-foreground">{url}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">QR code</span>
              </div>
              <span className="text-muted-foreground">&gt;</span>
            </button>
          </div>

          {/* QR Code Section */}
          {showQR && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-center bg-background p-4 rounded-lg border">
                <QRCode
                  id="share-qr-code"
                  value={url}
                  size={180}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="w-full"
              >
                Download QR Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
