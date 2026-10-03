# TRACEZERO Integration Test Results

Test Date: 2026-10-03
Commit: d0e040d

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

### GROQ: FAIL
- API key configured but model not found
- Error: The model `llama-3.3-70b-versatile` does not exist or you do not have access to it
- Status: FAILED
- Note: Groq initialization reported AVAILABLE initially but vision API failed with 404

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

### BREETH: FAIL
- API key configured but write operation failed
- Error: internal_error Breeth API error 500
- Status: FAILED
- Note: Breeth initialization reported AVAILABLE initially but write operation failed

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
- Groq: FAIL (model not found)
- OpenRouter: PASS
- Breeth: FAIL (internal server error)

Note: Groq and Breeth reported AVAILABLE during initialization but failed during actual API calls. This indicates the initialization test passed but the actual operations failed.
