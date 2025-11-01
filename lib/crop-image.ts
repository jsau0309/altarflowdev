import { Area } from 'react-easy-crop';

/**
 * Create a cropped image from the source image and crop area
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Render at 1x resolution to keep file size manageable for uploads
  // A 400x400 logo is already good quality for web display
  const scale = 1;
  const outputWidth = pixelCrop.width * scale;
  const outputHeight = pixelCrop.height * scale;

  // Set canvas to final output size
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Don't fill background - preserve transparency for PNG logos
  // This allows logos to blend naturally with any background color

  // Draw the cropped portion of the image at 2x scale
  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  ctx.drawImage(
    image,
    pixelCrop.x, // source x
    pixelCrop.y, // source y
    pixelCrop.width, // source width
    pixelCrop.height, // source height
    0, // destination x
    0, // destination y
    outputWidth, // destination width (2x)
    outputHeight // destination height (2x)
  );

  // Save as PNG to preserve transparency (alpha channel)
  // Trade-off: Larger file size (~300KB) vs JPEG (~80KB), but maintains transparency
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/png');
  });
}

/**
 * Create an image element from a source URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}
