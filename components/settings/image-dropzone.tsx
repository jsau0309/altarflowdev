"use client";

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImageDropzoneProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

export function ImageDropzone({ onImageSelected, disabled }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): boolean => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return false;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only images are allowed.");
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onImageSelected(file);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFile(file);
      }
    };
    input.click();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-primary bg-primary/5 scale-105'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex flex-col items-center gap-3">
        <div className={`
          p-4 rounded-full transition-colors
          ${isDragging ? 'bg-primary/10' : 'bg-gray-100'}
        `}>
          <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900">
            {isDragging ? 'Drop image here' : 'Select file to upload'}
          </p>
          <p className="text-xs text-muted-foreground">
            or drag-and-drop file
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Allowed file types: JPEG, PNG, WebP, GIF, AVIF, BMP, HEIC, HEIF
        </p>
      </div>
    </div>
  );
}
