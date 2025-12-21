/* eslint-disable no-console */
import fs from 'fs/promises';
import path from 'path';
import StorageAdapter from '../src/services/storage-adapter';

async function checkLocal(fileName: string, fileType: string) {
  const safeName = path.basename(fileName);
  const baseDir = process.env.LOCAL_STORAGE_PATH || 'uploads';
  const localPath = path.join(baseDir, 'uploads', 'storage-self-test', fileType, safeName);
  await fs.access(localPath);
}

async function main() {
  const storageType = process.env.STORAGE_TYPE || 'local';
  const userId = 'storage-self-test';
  const fileType = 'pdf';
  const buffer = Buffer.from('%PDF-1.4\n% Storage self test\n');
  const fileName = 'storage-check.pdf';

  console.log(`[storage-check] Using storage type: ${storageType}`);

  const result = await StorageAdapter.uploadFile(buffer, fileName, fileType, userId, {
    compress: false,
    generateThumbnail: false,
  });

  console.log('[storage-check] Upload success:', {
    fileUrl: result.fileUrl,
    storageType,
  });

  if (storageType === 'local') {
    await checkLocal(result.fileName, fileType);
    console.log('[storage-check] Local file present on disk.');
  } else {
    const res = await fetch(result.fileUrl, { method: 'HEAD' });
    if (!res.ok) {
      throw new Error(`Failed to fetch uploaded file: ${res.status} ${res.statusText}`);
    }
    console.log('[storage-check] Remote file reachable (HEAD ok).');
  }
}

main()
  .then(() => {
    console.log('[storage-check] OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[storage-check] FAILED:', err?.message || err);
    process.exit(1);
  });

