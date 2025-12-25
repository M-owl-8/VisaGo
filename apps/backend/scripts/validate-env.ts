/* eslint-disable no-console */
import { getEnvConfig } from '../src/config/env';

async function main() {
  try {
    const cfg = getEnvConfig();
    const required = {
      NODE_ENV: cfg.NODE_ENV,
      DATABASE_URL: cfg.DATABASE_URL ? 'set' : 'missing',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      JWT_SECRET: cfg.JWT_SECRET ? 'set' : 'missing',
      OCR_PROVIDER: cfg.OCR_PROVIDER ?? 'missing',
      STORAGE_TYPE: cfg.STORAGE_TYPE,
    };

    const optional = {
      REDIS_URL: cfg.REDIS_URL ? 'set' : 'missing',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      OPENAI_API_KEY: cfg.OPENAI_API_KEY ? 'set' : 'missing',
      FIREBASE_PROJECT_ID: cfg.FIREBASE_PROJECT_ID ? 'set' : 'missing',
      FIREBASE_CLIENT_EMAIL: cfg.FIREBASE_CLIENT_EMAIL ? 'set' : 'missing',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      FIREBASE_PRIVATE_KEY: cfg.FIREBASE_PRIVATE_KEY ? 'set' : 'missing',
      FIREBASE_STORAGE_BUCKET: (cfg as any).FIREBASE_STORAGE_BUCKET ? 'set' : 'missing',
    };

    console.log('[validate-env] Required:', required);
    console.log('[validate-env] Optional:', optional);
    console.log('[validate-env] OK');
    process.exit(0);
  } catch (err) {
    console.error('[validate-env] FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

