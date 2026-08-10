# S3 View / Download Optimization

Frontend-only: open files via URLs already returned by list/detail APIs. Call `/download/` only when a usable direct URL is missing (private / presigned).

## Rule
  
```
Component state / list row
  → pick file_url | image_url | s3_url | attachment_url | …
  → if present: window.open (no /download/)
  → else: GET …/download/ once, cache URL on the row, open
```

Shared helper: `utils/storedFileUrl.ts`  
Metrics: `storedFileOpenMetrics` (`directOpens`, `downloadEndpointCalls`, latencies).

## Module results

| Module | Before | After | `/download/` removed? |
|---|---|---|---|
| **Testing Documents** | Always `GET /testing-documents/{id}/download/` | Open `fileUrl` / `s3_url` / … first | Yes when URL on row |
| **Meeting Documents** | Always `GET /meeting-documents/{id}/download/` | Open `fileUrl` from list/detail first; normalize now maps URL fields | Yes when URL on row |
| **Correspondence attachments** | Preview + Download always hit `/attachments/{id}/download/` | Prefer `fileUrl` on attachment; cache after first resolve | Yes when URL on row |
| **Site Images** | Already used `image_url` directly | Unchanged path; also accept `s3_url` / `file_url` | N/A (already direct) |
| **Project Feedback** | Already used `attachmentUrl` | Also map `file_url` / `s3_url` / `image_url` | N/A (already direct) |
| **EOT Documents** | Already used `supporting_document_url` | Also map `s3_url` / `attachment_url` | N/A (already direct) |
| **Project vault / documentation** | Direct `href` | Broader URL field picking | N/A |
| **Dashboard project docs** | Direct `file_url` href | Unchanged | N/A |

## UX safeguards

- Buttons disable while opening (`Opening…`) to block double-clicks.
- Resolved URLs written back into list/attachment state so the next click stays local.
- UI, permissions, and API contracts unchanged; `/download/` endpoints remain for private objects.

## Measured impact (expected)

| Metric | Before | After (with direct URL on payload) |
|---|---|---|
| `/download/` calls per View/Download | **1** | **0** |
| Average View latency | ~200–800ms (API RTT + open) | ~0–30ms (open only) |
| When URL missing / private | 1 `/download/` | 1 `/download/` (unchanged) |

Exact counts depend on how often the backend includes `file_url` / `s3_url` on list/detail. With the backend already optimized to return those fields, most clicks become direct opens.

### How to verify in DevTools

1. Open Network → filter `download`.
2. Click View/Download on Testing, Meeting, Correspondence rows that show a file URL in the list payload.
3. Expect **no** `/download/` request; tab opens the S3/CDN URL.
4. In console (optional): `storedFileOpenMetrics` from `utils/storedFileUrl.ts` after several opens.

## Files touched

- `utils/storedFileUrl.ts` (new)
- `services/meetingDocumentsApi.ts`, `types/meetingDocuments.ts`
- `services/correspondenceAttachmentsApi.ts`, `utils/correspondenceAttachments.ts`, `types.ts`
- `components/meetingDocuments/*`, `testingPhotos/TestingPhotosPage.tsx`
- `components/CorrespondenceAttachmentsPanel.tsx`, `CorrespondenceFormAttachments.tsx`
- `services/api.ts` (testing + site image normalize)
- `services/feedbackService.ts`, `services/projectEotApi.ts`
- `utils/projectDetailsTabData.ts`
