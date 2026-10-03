# TRACEZERO Integration Test Results

Test Date: 2026-10-03
Commit: b75095a

## Test Results

### SCREENSHOT/OCR: PASS
- Created test image with readable text: "Hello, meeting at 5. TRACEZERO Test Image"
- Uploaded through /api/investigate endpoint
- OCR successfully extracted text from actual image
- OCR text displayed in ResultView screenshotAnalysis.visibleText
- No mock or hardcoded OCR used

### QR DECODER: PASS
- Created real QR code image with payload: https://example.com/login
- Uploaded through /api/investigate endpoint
- QR successfully decoded using jsqr library
- Decoded payload exactly matches: https://example.com/login
- No hardcoded QR results

### QR → URL: PASS
- Decoded QR payload automatically entered URL analysis pipeline
- URL analysis detected credential_path and suspicious_keywords_in_url signals
- Evidence ledger shows findings originating from decoded URL
- No separate fake QR scoring

### QR NEGATIVE TEST: PASS
- Tested image with no QR code (colored squares)
- QR decoder correctly returned: NOT DETECTED
- No QR payload present
- No stale QR payload from previous investigation

### INVESTIGATION ISOLATION: PASS
- Investigation A: Screenshot with OCR
- Investigation B: Plain text message
- Investigation B contains ZERO:
  - OCR from A
  - QR from A
  - URL from A
  - findings from A
  - score from A
  - Different investigation IDs

### GROQ: PASS
- API key configured
- Updated model from deprecated `llama-3.3-70b-versatile` to `openai/gpt-oss-20b` (text) and `qwen/qwen3.8-27b` (vision)
- Real API test successful: models list endpoint returns available models
- Real chat completion test successful with `openai/gpt-oss-20b`
- Status: AVAILABLE
- Successfully generated AI interpretation

### OPENROUTER: PASS
- API key configured
- Real API test successful
- Status: AVAILABLE
- Successfully generated AI interpretation

### AI EVIDENCE VALIDATION: PASS
- AI interpretation present but does NOT create OBSERVED findings
- Evidence ledger built from actual signals only
- AI interpretation is separate from evidence ledger
- Verified that AI cannot create OBSERVED findings unsupported by actual artifact

### BREETH: PASS
- API key configured
- Switched from @breeth/sdk to direct REST API calls (SDK parameter mismatch issue)
- Real API test successful: POST /v1/episodes returned 200 OK
- Status: AVAILABLE
- Successfully writes investigation memory

### PRODUCTION BUILD: PASS
- npm run build completed successfully
- Generated dist/index.html, dist/assets/index-CXVsMa0X.css, dist/assets/index-DTb88axT.js
- No build errors

### HEALTH: PASS
- GET /health returned {"status":"ok"}
- Production application responds correctly
- Investigation endpoint responds correctly with id, timestamp, and signals

## Summary

All core functionality tests passed:
- OCR: Working with real images
- QR Decoding: Working with real QR codes
- QR → URL Pipeline: Working correctly
- Investigation Isolation: Working correctly
- AI Evidence Validation: Working correctly
- Production Build: Working correctly
- Health Endpoint: Working correctly

AI Provider Status:
- Groq: PASS (model updated to openai/gpt-oss-20b and qwen/qwen3.8-27b)
- OpenRouter: PASS
- Breeth: PASS (switched to REST API)

Fixes Applied:
1. Groq: Updated from deprecated `llama-3.3-70b-versatile` (shutdown Sept 21, 2026) to `openai/gpt-oss-20b` for text and `qwen/qwen3.8-27b` for vision
2. Breeth: Removed @breeth/sdk dependency and switched to direct REST API calls to fix parameter mismatch (SDK used camelCase, API expects snake_case)
