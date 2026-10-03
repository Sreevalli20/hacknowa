# TRACEZERO

**Understand what you're about to trust.**

TRACEZERO is a real AI-powered digital safety investigator that analyzes suspicious content with grounded evidence analysis. The application distinguishes between OBSERVED facts, INFERRED deductions, and NOT VERIFIED aspects—never fabricating external threat intelligence or reputation data.

## Features

- **Message Analysis**: Extracts URLs, urgency language, credential requests, OTP requests, payment requests, and social-engineering indicators from text messages
- **URL Structural Analysis**: Performs genuine local structural analysis without external reputation APIs—detects punycode, IP hostnames, suspicious encoding, credential paths, and deceptive URL patterns
- **Screenshot Analysis**: Uses Gemini multimodal vision to analyze uploaded images for visible text, branding, fake UI elements, and phishing indicators
- **QR Code Analysis**: Locally decodes QR codes from screenshots and runs structural analysis on decoded URLs
- **Deterministic Risk Scoring**: Evidence-based risk scoring (0-100) with clear signal breakdowns
- **Evidence Ledger**: Traceable findings with evidence, classification (OBSERVED/INFERRED/NOT VERIFIED), and confidence levels
- **Attack Path Visualization**: Visual attack-path graph showing observed vs. possible steps
- **Emergency Mode**: Provides incident response guidance if you've already interacted with suspicious content
- **Zero Fabrication**: Never claims external reputation checks, WHOIS information, malware detections, or blacklist results unless explicitly supplied

## Architecture

**Backend**: Node.js with Express, TypeScript, and Google Gemini AI SDK

**Frontend**: React 19 with Vite, Tailwind CSS, and Lucide icons

**Database**: Local JSON file storage for user accounts and saved reports

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

3. Create a `.env` file in the root directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Environment Variables

The application requires only one environment variable:

- `GEMINI_API_KEY`: Your Google Gemini API key (obtain from https://ai.google.dev/)

**Important**: Never commit `.env` files. Use `.env.example` as a template.

## Render Deployment

The application is configured for Render deployment via `render.yaml`.

### Deploy Steps

1. Push the code to GitHub
2. Connect your GitHub repository to Render
3. Render will automatically detect the `render.yaml` configuration
4. Set the `GEMINI_API_KEY` environment variable in Render dashboard
5. Deploy

The application will:
- Build with `npm install && npm run build`
- Start with `npm start`
- Listen on port 10000 (configurable via PORT env var)
- Serve the complete application (frontend + backend) from a single service

## Gemini Setup

1. Go to https://ai.google.dev/
2. Create a project or select an existing one
3. Enable the Gemini API
4. Create an API key
5. Add the key to your `.env` file (local) or Render environment variables (production)

## Security Considerations

- **API Key Security**: GEMINI_API_KEY is server-side only, never exposed to browser code
- **File Uploads**: Validated for size and type; never executed
- **No URL Execution**: Suspicious URLs are analyzed structurally but never visited
- **No Credential Submission**: Never submits credentials to any service
- **Local Analysis**: Most analysis is performed locally without external API calls
- **Evidence Grounding**: All findings are traceable to supplied evidence

## Limitations

- **No External Reputation**: Does not query VirusTotal, URLScan, WHOIS, or external threat intelligence
- **No Live Analysis**: URLs are analyzed structurally but not executed or fetched
- **QR Decoding**: QR codes are decoded locally; may fail on poor-quality images
- **Gemini Dependency**: AI-powered features require Gemini API; fallback to deterministic analysis if unavailable
- **Single User Storage**: Local JSON file storage is not suitable for multi-user production deployments

## API Endpoints

### GET /health
Health check endpoint (does not call Gemini).

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
