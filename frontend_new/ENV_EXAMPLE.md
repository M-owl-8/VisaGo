# VisaBuddy Mobile App - Environment Configuration

Copy this configuration to `.env` file and fill in your actual values.

```bash
# ============================================================================
# API CONFIGURATION
# ============================================================================
# Backend API URL
# Development (Android Emulator): http://10.0.2.2:3000
# Development (iOS Simulator): http://localhost:3000
# Production: https://api.visabuddy.uz
EXPO_PUBLIC_API_URL=http://localhost:3000

# ============================================================================
# GOOGLE OAUTH (Optional)
# ============================================================================
# Google Web Client ID for OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# ============================================================================
# ERROR REPORTING (Optional)
# ============================================================================
# Sentry DSN for crash/error reporting
EXPO_PUBLIC_SENTRY_DSN=https://your_sentry_dsn.ingest.sentry.io/project-id
```

## Platform-Specific Configuration

### Android Emulator

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

### iOS Simulator

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Production

```bash
EXPO_PUBLIC_API_URL=https://api.visabuddy.uz
```

## Notes

- The `EXPO_PUBLIC_` prefix makes variables accessible in the app
- Never commit `.env` file to git
- Use different `.env` files for development and production
- Push notifications require Firebase configuration files: place `android/app/google-services.json` and `ios/GoogleService-Info.plist`, then rebuild the native apps.
