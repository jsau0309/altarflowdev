"use client";
import { logger } from '@/lib/logger';

import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

export interface CustomQRCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  logoUrl?: string | null;
  logoBackgroundColor?: string;
  logoSizeRatio?: number;
  logoPaddingRatio?: number;
  logoBorderRadiusRatio?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function CustomQRCode({
  value,
  size = 300,
  fgColor = '#000000',
  bgColor = '#FFFFFF',
  logoUrl = null,
  logoBackgroundColor = '#FFFFFF',
  logoSizeRatio = 0.26,
  logoPaddingRatio = 0.12,
  logoBorderRadiusRatio = 0.28,
  onCanvasReady,
}: CustomQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const generateQR = async () => {
      try {
        const targetSize = Math.max(size, 120);
        const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

        canvas.width = targetSize * pixelRatio;
        canvas.height = targetSize * pixelRatio;
        canvas.style.width = `${targetSize}px`;
        canvas.style.height = `${targetSize}px`;

        await QRCodeLib.toCanvas(canvas, value, {
          width: targetSize * pixelRatio,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: 'H',
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (onCanvasReady) {
            onCanvasReady(canvas);
          }
          return;
        }

        ctx.imageSmoothingQuality = 'high';

        if (logoUrl) {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';

          const drawLogo = () => {
            const baseSize = targetSize * pixelRatio;
            const logoSize = Math.min(baseSize * logoSizeRatio, baseSize * 0.38);
            const padding = logoSize * logoPaddingRatio;
            const badgeSize = logoSize + padding * 2;
            const radius = badgeSize * logoBorderRadiusRatio;
            const center = baseSize / 2;
            const topLeftX = center - badgeSize / 2;
            const topLeftY = center - badgeSize / 2;

            const drawRoundedRect = (x: number, y: number, width: number, height: number, r: number) => {
              const clampedRadius = Math.min(r, width / 2, height / 2);
              ctx.beginPath();
              ctx.moveTo(x + clampedRadius, y);
              ctx.arcTo(x + width, y, x + width, y + height, clampedRadius);
              ctx.arcTo(x + width, y + height, x, y + height, clampedRadius);
              ctx.arcTo(x, y + height, x, y, clampedRadius);
              ctx.arcTo(x, y, x + width, y, clampedRadius);
              ctx.closePath();
            };

            ctx.save();
            ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
            ctx.shadowBlur = badgeSize * 0.18;
            ctx.shadowOffsetY = badgeSize * 0.08;
            drawRoundedRect(topLeftX, topLeftY, badgeSize, badgeSize, radius);
            ctx.fillStyle = logoBackgroundColor;
            ctx.fill();
            ctx.restore();

            ctx.save();
            drawRoundedRect(topLeftX, topLeftY, badgeSize, badgeSize, radius);
            ctx.clip();
            const logoX = center - logoSize / 2;
            const logoY = center - logoSize / 2;
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
            ctx.restore();

            if (onCanvasReady) {
              onCanvasReady(canvas);
            }
          };
          logo.onload = drawLogo;
          logo.onerror = (error) => {
            logger.error('Failed to load logo image', {
              operation: 'ui.qr.logo_load_error',
              logoUrl,
              possibleCause: 'CORS policy, invalid URL, or network error',
              errorType: typeof error
            }, error instanceof Error ? error : new Error(String(error)));
            // Continue without logo if it fails to load
            if (onCanvasReady) {
              onCanvasReady(canvas);
            }
          };
          logo.src = logoUrl;
          if (logo.complete && logo.naturalWidth > 0) {
            drawLogo();
          }
        } else {
          if (onCanvasReady) {
            onCanvasReady(canvas);
          }
        }
      } catch (error) {
        logger.error('Error generating QR code:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      }
    };

    generateQR();
  }, [value, size, fgColor, bgColor, logoUrl, logoBackgroundColor, logoSizeRatio, logoPaddingRatio, logoBorderRadiusRatio, onCanvasReady]);

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
