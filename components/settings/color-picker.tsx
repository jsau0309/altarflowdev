"use client";

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  description?: string;
}

export function ColorPicker({ label, color, onChange, description }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (newColor: string) => {
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure it starts with #
    const formattedValue = value.startsWith('#') ? value : `#${value}`;
    onChange(formattedValue);
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
