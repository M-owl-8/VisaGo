# Storage Configuration

## Modes

- `STORAGE_TYPE=local`
  - Uses `LOCAL_STORAGE_PATH` (default `uploads`)
  - Requires `BACKEND_PUBLIC_URL` or `SERVER_URL` for file URLs (prod)
- `STORAGE_TYPE=firebase`
  - Requires: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
  - Generates signed URLs (7 days), falls back to public URL if signing fails

## Validation Steps

1. Run `npm run storage:check` (uses current STORAGE_TYPE)
2. For Firebase: confirm HEAD on signed URL returns 200
3. For local: confirm file exists under `LOCAL_STORAGE_PATH/uploads/storage-self-test` and URL is reachable

## Known Behaviors

- Re-upload of same `applicationId + documentType` updates existing record and resets status to `pending`.
- Thumbnail generation only for images when `generateThumbnail=true`.
- In production with local storage, missing `SERVER_URL` will fail uploads (guarded in `local-storage.service.ts`).
