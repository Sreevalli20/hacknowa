import Tesseract from 'tesseract.js';

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

/**
 * Extracts text from an image using Tesseract.js OCR.
 * Runs locally in the browser or server (Node.js with worker support).
 */
export async function extractTextFromImage(imageBuffer: Buffer | string): Promise<OCRResult> {
  try {
    let worker;
    
    if (typeof window !== 'undefined') {
      // Browser environment
      worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          // Optional: log progress
          if (m.status === 'recognizing text') {
            // Progress available at m.progress
          }
        },
      });
    } else {
      // Node.js environment
      worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          // Optional: log progress
        },
      });
    }

    const result = await worker.recognize(imageBuffer);
    await worker.terminate();

    if (result && result.data && result.data.text) {
      const extractedText = result.data.text.trim();
      
      if (extractedText.length > 0) {
        return {
          success: true,
          text: extractedText,
          confidence: result.data.confidence,
        };
      } else {
        return {
          success: false,
          error: 'No text could be extracted from the image.',
        };
      }
    } else {
      return {
        success: false,
        error: 'OCR processing returned no results.',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed.',
    };
  }
}

/**
 * Extracts text from a base64-encoded image data URL.
 */
export async function extractTextFromBase64(base64Data: string): Promise<OCRResult> {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');
    
    return await extractTextFromImage(buffer);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process base64 image for OCR.',
    };
  }
}
