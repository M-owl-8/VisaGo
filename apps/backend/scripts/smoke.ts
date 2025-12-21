/* eslint-disable no-console */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  validateStatus: () => true,
});

async function registerOrLogin(email: string, password: string) {
  let token: string | null = null;

  const registerRes = await API.post('/auth/register', {
    email,
    password,
    firstName: 'Smoke',
    lastName: 'Test',
  });

  if (registerRes.status === 201 && registerRes.data?.data?.token) {
    console.log('[smoke] Registered user');
    token = registerRes.data.data.token;
  } else if (registerRes.status === 409) {
    const loginRes = await API.post('/auth/login', { email, password });
    if (loginRes.status === 200 && loginRes.data?.data?.token) {
      console.log('[smoke] Logged in existing user');
      token = loginRes.data.data.token;
    }
  }

  if (!token) {
    throw new Error(`Auth failed: ${registerRes.status} ${registerRes.data?.error?.message || ''}`);
  }

  return token;
}

async function createApplication(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  // Attempt simple creation (IDs may be seeded in staging)
  const createRes = await API.post(
    '/applications',
    {
      countryId: process.env.SMOKE_COUNTRY_ID || 'test-country-id',
      visaTypeId: process.env.SMOKE_VISA_TYPE_ID || 'test-visa-type-id',
    },
    { headers }
  );

  if (createRes.status === 201 && createRes.data?.data?.id) {
    console.log('[smoke] Application created');
    return createRes.data.data.id as string;
  }

  // Fallback: AI generate
  const aiRes = await API.post(
    '/applications/ai-generate',
    {
      questionnaireData: {
        version: '1.0',
        purpose: 'tourism',
        country: 'US',
        duration: '1_3_months',
        hasInvitation: false,
      },
    },
    { headers }
  );

  const aiId = aiRes.data?.data?.applicationId || aiRes.data?.data?.id;
  if (aiRes.status === 200 && aiId) {
    console.log('[smoke] Application created via AI generate');
    return aiId as string;
  }

  throw new Error(`Failed to create application: ${createRes.status}/${aiRes.status}`);
}

async function generateChecklist(token: string, applicationId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await API.get(`/document-checklist/${applicationId}`, { headers });
  if (res.status >= 200 && res.status < 300) {
    console.log('[smoke] Checklist retrieved/generated');
    return res.data;
  }
  throw new Error(`Checklist failed: ${res.status}`);
}

async function uploadDocument(token: string, applicationId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const form = new FormData();
  const fixturePath = path.join(__dirname, 'fixtures', 'sample.txt');
  const buffer = fs.existsSync(fixturePath)
    ? fs.readFileSync(fixturePath)
    : Buffer.from('sample document');
  form.append('file', buffer, { filename: 'sample.txt', contentType: 'text/plain' });
  form.append('applicationId', applicationId);
  form.append('documentType', 'document');

  const res = await API.post('/documents/upload', form, {
    headers: { ...headers, ...form.getHeaders() },
    maxContentLength: Infinity,
  });

  if (res.status >= 200 && res.status < 300) {
    console.log('[smoke] Document uploaded');
    return res.data;
  }
  throw new Error(`Upload failed: ${res.status}`);
}

async function runDocCheck(token: string, applicationId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await API.post(`/doc-check/${applicationId}/run`, {}, { headers });
  if (res.status >= 200 && res.status < 300) {
    console.log('[smoke] Doc-check triggered');
    return res.data;
  }
  throw new Error(`Doc-check failed: ${res.status}`);
}

async function fetchDocStatus(token: string, applicationId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await API.get(`/doc-check/${applicationId}/summary`, { headers });
  if (res.status >= 200 && res.status < 300) {
    console.log('[smoke] Doc-check summary fetched');
    return res.data;
  }
  throw new Error(`Doc-check summary failed: ${res.status}`);
}

async function main() {
  console.log(`[smoke] BASE_URL=${BASE_URL}`);
  const email = `smoke-${Date.now()}@example.com`;
  const password = 'SecureP@ssw0rd123';

  const token = await registerOrLogin(email, password);
  const applicationId = await createApplication(token);
  await generateChecklist(token, applicationId);
  await uploadDocument(token, applicationId);
  await runDocCheck(token, applicationId);
  await fetchDocStatus(token, applicationId);
}

main()
  .then(() => {
    console.log('[smoke] SUCCESS');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[smoke] FAILED:', err?.message || err);
    process.exit(1);
  });





