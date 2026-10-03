import jsQR from 'jsqr';

export interface QRDecodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Decodes a QR code from a base64 image data URL or Blob using HTML5 Canvas and jsQR.
 * Genuine local matrix decoding without any external services.
 */
export async function decodeQrFromDataUrl(dataUrl: string): Promise<QRDecodeResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ success: false, error: 'Could not acquire 2D canvas context for QR decoding.' });
          return;
        }

        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        if (canvas.width === 0 || canvas.height === 0) {
          resolve({ success: false, error: 'Image dimensions are 0x0.' });
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data && code.data.trim().length > 0) {
          resolve({
            success: true,
            data: code.data.trim(),
          });
        } else {
          resolve({
            success: false,
            error: 'No QR code pattern detected in the provided image matrix.',
          });
        }
      } catch (err) {
        resolve({
          success: false,
          error: err instanceof Error ? err.message : 'QR code matrix processing failed.',
        });
      }
    };

    img.onerror = () => {
      resolve({ success: false, error: 'Failed to load image for QR decoding.' });
    };

    img.src = dataUrl;
  });
}
