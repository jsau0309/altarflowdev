"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  buttonText?: string;
}

export function EmojiPickerPopover({ onEmojiSelect, buttonText = "Add emoji" }: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emojiData: any) => {
    onEmojiSelect(emojiData.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-3 w-3 mr-1" />
          {buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="end">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          width="100%"
          height={400}
          searchDisabled={false}
          skinTonesDisabled
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  );
}
