# OAuth Production Checklist

## Google Cloud Console

- Authorized JavaScript origins:
  - `https://ketdik.org`
- (No redirect URI needed for GIS popup flow)

## Railway — Web Service (`prolific-dedication`)

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com`
- `NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app`
- Note: Next.js embeds `NEXT_PUBLIC_*` at build time. Redeploy the web service after changing these.

## Railway — Backend Service (`VisaGo`)

- `GOOGLE_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET=<your-google-client-secret>`
- `CORS_ORIGIN=https://ketdik.org`

## Validation Steps

1. Redeploy web after updating env vars, then hard refresh browser.
2. In DevTools Console, ensure Google button renders (no missing Client ID warning).
3. In Network tab, confirm `/api/auth/google` is called after Google popup returns.
4. Backend logs should show startup CORS origins and no OAuth verification errors.
