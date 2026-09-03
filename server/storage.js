import { writeFileSync } from 'node:fs';
import { extname } from 'node:path';

export async function persistResumeFile({ fileBuffer, safeName, localPath, userId }) {
  if (isSupabaseStorageConfigured()) {
    const storagePath = buildResumeStoragePath({ userId, safeName });
    await uploadToSupabaseStorage({
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'resumes',
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
  if (extension === '.txt') return 'text/plain; charset=utf-8';
  if (extension === '.md') return 'text/markdown; charset=utf-8';
  return 'application/octet-stream';
}
