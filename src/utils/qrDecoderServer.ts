import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';

export interface QRDecodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Decodes a QR code from a base64 image string using Node.js canvas
 * This is a server-side alternative to the browser-based decoder
 */
export async function decodeQrFromBase64Server(base64Data: string): Promise<QRDecodeResult> {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');

    // Load image using canvas
    const image = await loadImage(buffer);

    // Create canvas
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw image to canvas
    ctx.drawImage(image, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Decode QR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data && code.data.trim().length > 0) {
      return {
        success: true,
        data: code.data.trim(),
      };
    } else {
      return {
        success: false,
        error: 'No QR code pattern detected in the provided image matrix.',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'QR code matrix processing failed.',
    };
  }
}
