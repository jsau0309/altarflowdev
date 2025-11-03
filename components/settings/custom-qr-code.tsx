"use client";

import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

export interface CustomQRCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  logoUrl?: string | null;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function CustomQRCode({
  value,
  size = 300,
  fgColor = '#000000',
  bgColor = '#FFFFFF',
  logoUrl = null,
  onCanvasReady,
}: CustomQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const generateQR = async () => {
      try {
        // Generate QR code on canvas with custom colors
        await QRCodeLib.toCanvas(canvas, value, {
          width: size,
          margin: 1,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: 'H', // High error correction allows for logo overlay
        });

        // If there's a logo, overlay it on the center
        if (logoUrl) {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const logo = new Image();
          logo.crossOrigin = 'anonymous';

          logo.onload = () => {
            // Logo should take up ~20% of QR code (safe with error correction level H)
            const logoSize = size * 0.2;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;

            // Draw white background circle for logo
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2 + 5, 0, 2 * Math.PI);
            ctx.fill();

            // Draw logo in center
            ctx.drawImage(logo, x, y, logoSize, logoSize);

            // Notify parent that canvas is ready
            if (onCanvasReady) {
              onCanvasReady(canvas);
            }
          };

          logo.onerror = () => {
            // If logo fails to load, still notify that canvas is ready
            if (onCanvasReady) {
              onCanvasReady(canvas);
            }
          };

          logo.src = logoUrl;
        } else {
          // No logo, canvas is ready
          if (onCanvasReady) {
            onCanvasReady(canvas);
          }
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [value, size, fgColor, bgColor, logoUrl, onCanvasReady]);

  return (
    <div className="flex justify-center items-center">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
