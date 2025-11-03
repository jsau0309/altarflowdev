"use client";

import { useEffect, useRef, useState } from 'react';
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

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function isPartialHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{0,6}$/.test(color);
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
  const lastValidColorRef = useRef<string>(
    isValidHexColor(color) ? color : '#000000'
  );

  const handleColorChange = (newColor: string) => {
    if (isValidHexColor(newColor)) {
      lastValidColorRef.current = newColor;
    }
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure it starts with #
    const formattedValue = value.startsWith('#') ? value : `#${value}`;

    // Only update if it's a valid partial hex color (for typing experience)
    if (isPartialHexColor(formattedValue) && formattedValue.length <= 7) {
      onChange(formattedValue);
    }
  };

  const handleInputBlur = () => {
    // Validate on blur and reset to default if invalid
    if (typeof color !== 'string') {
      onChange(lastValidColorRef.current);
      return;
    }

    const trimmed = color.trim();

    if (trimmed.length === 0) {
      onChange(lastValidColorRef.current);
      return;
    }

    if (!isValidHexColor(trimmed)) {
      onChange(lastValidColorRef.current);
      return;
    }

    lastValidColorRef.current = trimmed;
    if (trimmed !== color) {
      onChange(trimmed);
    }
  };

  useEffect(() => {
    if (!enableEyedropper) return;
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      setIsEyedropperSupported(true);
    }
  }, [enableEyedropper]);

  useEffect(() => {
    if (isValidHexColor(color)) {
      lastValidColorRef.current = color;
    }
  }, [color]);

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
          onBlur={handleInputBlur}
          placeholder="#FFFFFF"
          className="font-mono flex-1"
          maxLength={7}
        />
      </div>
    </div>
  );
}
