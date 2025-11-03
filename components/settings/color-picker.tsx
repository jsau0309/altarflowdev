"use client";

import { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  description?: string;
  enableEyedropper?: boolean;
  eyedropperLabel?: string;
  eyedropperUnsupportedLabel?: string;
}

export function ColorPicker({
  label,
  color,
  onChange,
  description,
  enableEyedropper = false,
  eyedropperLabel = 'Pick color from screen',
  eyedropperUnsupportedLabel = 'EyeDropper is not supported in this browser',
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEyedropperSupported, setIsEyedropperSupported] = useState(false);

  const handleColorChange = (newColor: string) => {
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure it starts with #
    const formattedValue = value.startsWith('#') ? value : `#${value}`;
    onChange(formattedValue);
  };

  useEffect(() => {
    if (!enableEyedropper) return;
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      setIsEyedropperSupported(true);
    }
  }, [enableEyedropper]);

  const handleEyedropperPick = async () => {
    if (!enableEyedropper || !isEyedropperSupported) return;

    try {
      const EyeDropperConstructor = (window as typeof window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }>; };
      }).EyeDropper;

      if (!EyeDropperConstructor) return;

      const eyeDropper = new EyeDropperConstructor();
      const result = await eyeDropper.open();

      if (result?.sRGBHex) {
        onChange(result.sRGBHex);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('EyeDropper error:', error);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="flex items-center gap-2">
        {/* Color Preview Button */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-12 h-12 p-0 border-2"
              style={{ backgroundColor: color }}
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <HexColorPicker color={color} onChange={handleColorChange} />
          </PopoverContent>
        </Popover>

        {enableEyedropper && (
          <Button
            type="button"
            variant="outline"
            className="w-12 h-12 p-0 border-2 flex items-center justify-center"
            onClick={handleEyedropperPick}
            disabled={!isEyedropperSupported}
            title={!isEyedropperSupported ? eyedropperUnsupportedLabel : undefined}
          >
            <Pipette className="h-5 w-5" />
            <span className="sr-only">{eyedropperLabel}</span>
          </Button>
        )}

        {/* Hex Input */}
        <Input
          type="text"
          value={color}
          onChange={handleInputChange}
          placeholder="#FFFFFF"
          className="font-mono flex-1"
          maxLength={7}
        />
      </div>
    </div>
  );
}
