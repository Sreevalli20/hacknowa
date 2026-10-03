# TRACEZERO

**Understand what you're about to trust.**

TRACEZERO is a deterministic digital safety investigator that analyzes suspicious content with grounded evidence analysis. The application distinguishes between OBSERVED facts, INFERRED deductions, and NOT VERIFIED aspects—never fabricating external threat intelligence or reputation data.

## Features

- **Message Analysis**: Extracts URLs, urgency language, credential requests, OTP requests, payment requests, and social-engineering indicators from text messages using deterministic rule-based detection
- **URL Structural Analysis**: Performs genuine local structural analysis without external reputation APIs—detects punycode, IP hostnames, suspicious encoding, credential paths, and deceptive URL patterns
- **Screenshot Analysis**: Uses local OCR (Tesseract.js) to extract text from uploaded images for analysis
- **QR Code Analysis**: Locally decodes QR codes from screenshots using jsQR and runs structural analysis on decoded URLs
- **Deterministic Risk Scoring**: Evidence-based risk scoring (0-100) with clear signal breakdowns
- **Evidence Ledger**: Traceable findings with evidence, classification (OBSERVED/INFERRED/NOT VERIFIED), confidence levels, and detection rule IDs
- **Attack Path Visualization**: Visual attack-path graph showing observed vs. possible steps
- **Emergency Mode**: Provides incident response guidance if you've already interacted with suspicious content
- **Zero Fabrication**: Never claims external reputation checks, WHOIS information, malware detections, or blacklist results unless explicitly supplied
- **Optional Memory Layer**: Breeth integration for investigation history (application functions fully without it)

## Architecture

**Backend**: Node.js with Express, TypeScript, and deterministic analysis engines

**Frontend**: React 19 with Vite, Tailwind CSS, and Lucide icons

**OCR**: Tesseract.js for local text extraction from images

**QR Decoding**: jsQR for local QR code decoding

**Memory Layer**: Breeth (optional) - investigation history and similarity search

**Deployment**: Single deployable application on Render (no separate frontend/backend required)

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Sreevalli20/hacknowa.git
   cd hacknowa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (optional - for Breeth memory):
   ```
   BREETH_API_KEY=your_breeth_api_key_here
   ```

   **Note**: TRACEZERO functions fully without Breeth. The Breeth API key is optional and only enables investigation history features.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Environment Variables

The application can run with zero environment variables. The optional variable is:

- `BREETH_API_KEY`: Your Breeth API key for investigation memory features (obtain from https://thebreeth.com/app/api-keys)

**Important**: Never commit `.env` files. Use `.env.example` as a template.

## Render Deployment

The application is configured for Render deployment via `render.yaml`.

### Deploy Steps

1. Push the code to GitHub
2. Connect your GitHub repository to Render
3. Render will automatically detect the `render.yaml` configuration
4. Optionally set the `BREETH_API_KEY` environment variable in Render dashboard (for memory features)
5. Deploy

The application will:
- Build with `npm install && npm run build`
- Start with `npm start`
- Listen on port 10000 (configurable via PORT env var)
- Serve the complete application (frontend + backend) from a single service

## Breeth Setup (Optional)

TRACEZERO uses Breeth as an optional memory layer for investigation history. The application works fully without it.

1. Go to https://thebreeth.com/
2. Create an account
3. Generate an API key from the dashboard
4. Add the key to your `.env` file (local) or Render environment variables (production)

**Without Breeth**: TRACEZERO still performs all security analysis deterministically. Investigation history features will be unavailable.

## Security Considerations

- **API Key Security**: BREETH_API_KEY is server-side only, never exposed to browser code
- **File Uploads**: Validated for size and type; never executed
- **No URL Execution**: Suspicious URLs are analyzed structurally but never visited
- **No Credential Submission**: Never submits credentials to any service
- **Local Analysis**: All analysis is performed locally using deterministic rules
- **Evidence Grounding**: All findings are traceable to supplied evidence
- **No Generative AI**: No hallucination risk - only rule-based detection and OCR

## Limitations

- **No External Reputation**: Does not query VirusTotal, URLScan, WHOIS, or external threat intelligence
- **No Live Analysis**: URLs are analyzed structurally but not executed or fetched
- **QR Decoding**: QR codes are decoded locally; may fail on poor-quality images
- **OCR Accuracy**: Text extraction from screenshots depends on image quality and Tesseract.js performance
- **Single User Storage**: Local JSON file storage is not suitable for multi-user production deployments
- **Breeth Optional**: Investigation history features require Breeth; core analysis does not

## API Endpoints

### GET /health
Health check endpoint (does not require any external services).

**Response**:
```json
{
  "status": "ok"
}
```

### POST /api/investigate
Analyze suspicious content.

**Request Body**:
```json
{
  "messageText": "string (optional)",
  "urlText": "string (optional)",
  "screenshotBase64": {
    "mimeType": "string",
    "data": "string (base64)"
  },
  "qrScreenshotBase64": {
    "mimeType": "string",
    "data": "string (base64)"
  },
  "qrDecodedText": "string (optional)"
}
```

**Response**: Investigation result with risk score, evidence ledger, attack path, and recommendations.

### POST /api/emergency-plan
Generate emergency response plan if user has interacted with suspicious content.

**Request Body**:
```json
{
  "enteredCredentials": "boolean",
  "enteredPayment": "boolean",
  "downloadedAnything": "boolean",
  "grantedPermissions": "boolean",
  "sharedOtp": "boolean",
  "threatSummary": "string",
  "riskLevel": "string"
}
```

**Response**: Emergency action items, verification checklist, and containment guidance.

## Development

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run lint
```

### Clean Build Artifacts
```bash
npm run clean
```

## License

This project is part of a hackathon submission.

## Disclaimer

TRACEZERO is a digital safety investigation tool, not a substitute for professional security services. Always verify with official channels before taking action on security recommendations.
