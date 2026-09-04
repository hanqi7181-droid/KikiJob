import { writeFileSync } from 'node:fs';
import { extname } from 'node:path';

export async function persistResumeFile({ fileBuffer, safeName, localPath, userId }) {
  if (isSupabaseStorageConfigured()) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'resumes';
    const storagePath = buildResumeStoragePath({ userId, safeName });
    await ensureSupabaseStorageBucket(bucket);
    await uploadToSupabaseStorage({
      bucket,
      storagePath,
      fileBuffer,
      contentType: contentTypeForFile(safeName),
    });
    writeFileSync(localPath, fileBuffer);
    return {
      storedPath: localPath,
      storagePath,
      fileType: contentTypeForFile(safeName),
      fileSize: fileBuffer.length,
      storageProvider: 'supabase',
    };
  }

  writeFileSync(localPath, fileBuffer);
  return {
    storedPath: localPath,
    storagePath: null,
    fileType: contentTypeForFile(safeName),
    fileSize: fileBuffer.length,
    storageProvider: 'local',
  };
}

export function isSupabaseStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function ensureSupabaseStorageBucket(bucket = process.env.SUPABASE_STORAGE_BUCKET || 'resumes') {
  if (!isSupabaseStorageConfigured()) return { provider: 'local', ensured: false };
  const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketId = String(bucket || 'resumes').trim();
  if (!bucketId) throw new Error('SUPABASE_STORAGE_BUCKET is required when Supabase Storage is configured');

  const getResponse = await fetch(`${baseUrl}/storage/v1/bucket/${encodeURIComponent(bucketId)}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (getResponse.ok) return { provider: 'supabase', bucket: bucketId, created: false };

  const getText = await getResponse.text().catch(() => '');
  const bucketMissing = getResponse.status === 404 || /NoSuchBucket|Bucket not found/i.test(getText);
  if (!bucketMissing) {
    throw new Error(`Supabase Storage bucket 检查失败：${getResponse.status} ${getText.slice(0, 160)}`);
  }

  const createResponse = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: bucketId,
      name: bucketId,
      public: false,
      file_size_limit: Number(process.env.MAX_RESUME_UPLOAD_BYTES || 8 * 1024 * 1024),
      allowed_mime_types: ['application/pdf', 'text/plain', 'text/markdown'],
    }),
  });

  if (!createResponse.ok && createResponse.status !== 409) {
    const text = await createResponse.text().catch(() => '');
    throw new Error(`Supabase Storage bucket 创建失败：${createResponse.status} ${text.slice(0, 160)}`);
  }

  return { provider: 'supabase', bucket: bucketId, created: createResponse.ok };
}

function buildResumeStoragePath({ userId, safeName }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${userId || 'anonymous'}/${timestamp}-${safeName}`;
}

async function uploadToSupabaseStorage({ bucket, storagePath, fileBuffer, contentType }) {
  const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(storagePath)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase Storage 上传失败：${response.status} ${text.slice(0, 160)}`);
  }
}

function encodeStoragePath(storagePath) {
  return storagePath.split('/').map(encodeURIComponent).join('/');
}

function contentTypeForFile(fileName) {
  const extension = extname(fileName).toLowerCase();
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.txt') return 'text/plain';
  if (extension === '.md') return 'text/markdown';
  return 'application/octet-stream';
}
