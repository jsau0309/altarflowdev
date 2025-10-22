"use client";

import { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCroppedImg } from '@/lib/crop-image';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageCropperModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  isEditingExisting?: boolean; // When true, don't auto-fit (editing already-cropped image)
}

export function ImageCropperModal({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  isEditingExisting = false,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [initialZoom, setInitialZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Calculate dynamic zoom range based on image dimensions
  useEffect(() => {
    if (!imageSrc || !open) return;

    const img = new Image();
    img.onload = () => {
      // Crop area is roughly 400px (the circle diameter)
      const cropSize = 400;

      // Calculate minimum zoom to fit entire image in crop circle
      const imageSize = Math.max(img.width, img.height);
      const calculatedMinZoom = cropSize / imageSize;

      // Set zoom range - allow zooming out further if needed
      const finalMinZoom = Math.min(calculatedMinZoom, 0.1);
      setMinZoom(finalMinZoom);
      setMaxZoom(3);

      // Auto-fit: Start with zoom that shows entire image with small margin
      // If editing an existing cropped logo, start at zoom 1.5 for better visibility
      // If uploading new image, auto-fit to show entire image
      let autoFitZoom;
      if (isEditingExisting) {
        // Editing existing logo - start at 1.5x for better visibility
        autoFitZoom = 1.5;
      } else if (imageSize <= cropSize) {
        // New upload, image fits - start at zoom 1
        autoFitZoom = 1;
      } else {
        // New upload, image too large - zoom out to fit with 5% padding
        autoFitZoom = calculatedMinZoom * 0.95;
      }

      setInitialZoom(autoFitZoom);
      setZoom(autoFitZoom);
    };

    img.src = imageSrc;
  }, [imageSrc, open, isEditingExisting]);

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleResetZoom = () => {
    setZoom(initialZoom);
    setCrop({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsCropping(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-gray-900 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            restrictPosition={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        {/* Zoom Control */}
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={minZoom}
              max={maxZoom}
              step={0.01}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="shrink-0"
              title="Reset zoom to fit"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Drag to reposition • Scroll or use slider to zoom • Click reset to fit image
          </p>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isCropping}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isCropping}>
            {isCropping ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
