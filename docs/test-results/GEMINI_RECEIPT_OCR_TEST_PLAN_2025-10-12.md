# Gemini Receipt OCR Test Plan & Status

_Last updated: 2025-10-12_

## Overview
The Gemini Flash 2.5 OCR integration introduces structured receipt extraction with confidence scores. This document lists the recommended validation matrix for QA teams.

## Test Matrix
| Category | Scenario | Status | Notes |
| --- | --- | --- | --- |
| Image Quality | High-resolution receipt (indoor lighting) | ☐ Pending | Validate vendor, total, date accuracy ≥95% |
| Image Quality | Blurry / low-light photo | ☐ Pending | Confirm confidence drops to medium/low and warnings surface |
| Image Quality | Thermal receipt with faded ink | ☐ Pending | Ensure totals still parsed or manual edit suggested |
| Image Format | Digital PDF upload | ☐ Pending | Confirm structured response works for non-camera uploads |
| Image Format | Handwritten receipt | ☐ Pending | Expect partial extraction with low confidence |
| Language Coverage | Spanish receipt | ☐ Pending | Vendor and amount should parse; date normalized |
| Error Handling | Unsupported file type | ☐ Pending | API should return validation error without crash |
| Error Handling | Missing `GEMINI_API_KEY` | ✅ Verified | API returns 503 fallback response |
| Error Handling | Gemini rate limit (mocked) | ☐ Pending | Confirm exponential backoff triggers |
| UX | Processing view stage transitions | ✅ Verified | Animations cycle through Upload → Analyze → Extract |
| UX | Review view quick edits | ✅ Verified | Clear/Reset buttons update data and enable save |

> **Note:** Manual execution is required; automated regression scripts will be added in a follow-up sprint.

## Acceptance Criteria
- 85%+ accuracy across the test set.
- Confidence badges displayed for vendor, total, and date.
- Validation warnings prevent submitting incomplete data.
- Re-scan CTA appears for low confidence scenarios.

## Outstanding Work
- Record actual accuracy metrics once the QA dataset is available.
- Add integration tests using mocked Gemini responses.
- Evaluate hybrid routing (Flash vs. Pro) after production telemetry.
