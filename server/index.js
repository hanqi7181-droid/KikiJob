import http from 'node:http';
import { URL } from 'node:url';
import './env.js';
import { getRepository } from './repositories/index.js';
import { normalizeImportedJob } from './jobImporter.js';
import { crawlRecommendedJobs } from './jobCrawler.js';
import { runBrowserAutofill } from './browserAutofill.js';
import { parseProjectResume, saveUploadedResumeFromMultipart } from './resumeParser.js';
import { createRateLimiter } from './rateLimit.js';

const port = Number(process.env.PORT || 8787);
const defaultUserId = 1;
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*';
const repo = getRepository();
const authRateLimit = createRateLimiter({ max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), windowMs: 60_000 });
const uploadRateLimit = createRateLimiter({ max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 12), windowMs: 60_000 });

repo.initDatabase();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    return sendJson(response, 204, null);
  }

  try {
    if (isAuthMutation(request, url) && authRateLimit(request, response, ['auth', url.pathname])) return;
    if (request.method === 'POST' && url.pathname === '/api/resumes/upload' && uploadRateLimit(request, response, ['upload'])) {
      return;
    }

    const currentUser = await getCurrentUser(request);
    const currentUserId = currentUser?.id || defaultUserId;

    if (request.method === 'GET' && (url.pathname === '/api/health' || url.pathname === '/health')) {
      const database = repo.getDatabaseInfo();
      return sendJson(response, 200, {
        ok: true,
        service: 'kikijob-api',
        database: database.provider,
        databasePath: database.provider === 'sqlite' ? database.path : undefined,
        storage: process.env.SUPABASE_URL ? 'supabase-configured' : 'local',
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/auth/providers') {
      return sendJson(response, 200, { providers: await repo.getAuthProviders() });
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/password') {
      const body = await readJson(request);
      return sendJson(response, 200, await repo.createPasswordSession(body.account, body.password));
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/sms/request') {
      const body = await readJson(request);
      return sendJson(response, 200, await repo.requestSmsCode(body.phone));
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/sms/verify') {
      const body = await readJson(request);
      return sendJson(response, 200, await repo.createSmsSession(body.phone, body.code));
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/email/request') {
      const body = await readJson(request);
      return sendJson(response, 200, await repo.requestEmailCode(body.email));
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/email/verify') {
      const body = await readJson(request);
      return sendJson(response, 200, await repo.createEmailSession(body.email, body.code));
    }

    if (request.method === 'GET' && url.pathname === '/api/auth/me') {
      return sendJson(response, 200, { user: currentUser || null });
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = readBearerToken(request);
      return sendJson(response, 200, await repo.revokeSession(token));
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/oauth') {
      const body = await readJson(request);
      const providers = await repo.getAuthProviders();
      const provider = String(body.provider || '').trim();
      if (!providers[provider]) {
        return sendJson(response, 501, { error: `${provider || 'OAuth'} 登录尚未配置，请先设置对应 OAuth Client ID/Secret` });
      }
      return sendJson(response, 501, { error: `${provider} OAuth 回调尚未接入生产环境` });
    }

    if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
      await repo.ensureDefaultUser();
      const formMappings = await repo.syncStandardFormMappings(currentUserId);
      return sendJson(response, 200, {
        user: currentUser || null,
        profile: await repo.getProfile(currentUserId),
        jobs: await repo.listJobs(),
        applications: await repo.getApplicationStatusMap(currentUserId),
        applicationDetails: await repo.getApplicationMap(currentUserId),
        formMappings,
        latestResume: await repo.getLatestResume(currentUserId),
        resumes: await repo.listResumes(currentUserId),
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/jobs') {
      return sendJson(response, 200, { jobs: await repo.listJobs() });
    }

    if (request.method === 'POST' && url.pathname === '/api/jobs/parse-preview') {
      const body = await readJson(request);
      const job = normalizeImportedJob(body.job || body);
      return sendJson(response, 200, { job });
    }

    if (request.method === 'POST' && url.pathname === '/api/jobs/import') {
      const body = await readJson(request);
      const job = normalizeImportedJob(body.job || body);
      if (!job.description && !job.sourceUrl) {
        return sendJson(response, 400, { error: 'description or sourceUrl is required' });
      }

      const result = await repo.addImportedJob(job);
      return sendJson(response, result.duplicate ? 200 : 201, result);
    }

    if (request.method === 'POST' && url.pathname === '/api/jobs/import-recommendations') {
      const body = await readJson(request);
      const crawlResult = await crawlRecommendedJobs(body.profile || (await repo.getProfile(currentUserId)));
      const imported = [];
      const duplicates = [];
      for (const rawJob of crawlResult.jobs) {
        const result = await repo.addImportedJob(normalizeImportedJob(rawJob));
        if (result.duplicate) duplicates.push(result.job);
        else imported.push(result.job);
      }
      return sendJson(response, 200, {
        imported,
        duplicates,
        errors: crawlResult.errors,
        checkedCompanies: crawlResult.checkedCompanies,
        jobs: await repo.listJobs(),
      });
    }

    const jobMatch = url.pathname.match(/^\/api\/jobs\/(\d+)$/);
    if (request.method === 'DELETE' && jobMatch) {
      const result = await repo.deleteImportedJob(Number(jobMatch[1]));
      if (!result.deleted && result.reason === 'not_found') {
        return sendJson(response, 404, { error: 'Job not found' });
      }
      if (!result.deleted && result.reason === 'demo_job') {
        return sendJson(response, 400, { error: 'Demo jobs cannot be deleted' });
      }
      return sendJson(response, 200, result);
    }

    if (request.method === 'PUT' && url.pathname === '/api/profile') {
      const body = await readJson(request);
      const profile = await repo.saveProfile(currentUserId, body.profile || body);
      const formMappings = await repo.syncStandardFormMappings(currentUserId, { force: true });
      return sendJson(response, 200, { profile, formMappings });
    }

    if (request.method === 'DELETE' && url.pathname === '/api/profile') {
      return sendJson(response, 200, await repo.clearProfileData(currentUserId));
    }

    if (request.method === 'PUT' && url.pathname === '/api/form-mappings') {
      const body = await readJson(request);
      return sendJson(response, 200, { formMappings: await repo.saveFormMappings(currentUserId, body.formMappings || []) });
    }

    if (request.method === 'DELETE' && url.pathname === '/api/form-mappings') {
      return sendJson(response, 200, { formMappings: await repo.deleteFormMappings(currentUserId) });
    }

    if (request.method === 'DELETE' && url.pathname === '/api/applications') {
      return sendJson(response, 200, {
        applications: await repo.clearApplicationHistory(currentUserId),
        applicationDetails: {},
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/autofill/run') {
      const body = await readJson(request);
      const result = await runBrowserAutofill({ url: body.url, steps: body.steps || [] });
      return sendJson(response, 200, result);
    }

    if (request.method === 'POST' && url.pathname === '/api/resumes') {
      const body = await readJson(request);
      if (!body.fileName) {
        return sendJson(response, 400, { error: 'fileName is required' });
      }
      return sendJson(response, 201, { resume: await repo.addResume(currentUserId, body.fileName) });
    }

    if (request.method === 'POST' && url.pathname === '/api/resumes/upload') {
      const parsed = await saveUploadedResumeFromMultipart(request, currentUserId);
      const resume = await repo.addResume(currentUserId, parsed.fileName, parsed.rawText, parsed.parsedProfile, {
        storagePath: parsed.storagePath,
        fileType: parsed.fileType,
        fileSize: parsed.fileSize,
      });
      const formMappings = await repo.syncStandardFormMappings(currentUserId, { force: true });
      return sendJson(response, 201, {
        resume: {
          ...resume,
          parsedProfile: parsed.parsedProfile,
          textLength: parsed.rawText.length,
        },
        formMappings,
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/resumes/parse-local') {
      const body = await readJson(request);
      if (!body.fileName) {
        return sendJson(response, 400, { error: 'fileName is required' });
      }
      const parsed = await parseProjectResume(body.fileName, currentUserId);
      const resume = await repo.addResume(currentUserId, parsed.fileName, parsed.rawText, parsed.parsedProfile, {
        storagePath: parsed.storagePath,
        fileType: parsed.fileType,
        fileSize: parsed.fileSize,
      });
      const formMappings = await repo.syncStandardFormMappings(currentUserId, { force: true });
      return sendJson(response, 201, {
        resume: {
          ...resume,
          parsedProfile: parsed.parsedProfile,
          textLength: parsed.rawText.length,
        },
        formMappings,
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/resumes') {
      return sendJson(response, 200, { resumes: await repo.listResumes(currentUserId), latestResume: await repo.getLatestResume(currentUserId) });
    }

    const resumeMatch = url.pathname.match(/^\/api\/resumes\/(\d+)$/);
    if (request.method === 'PATCH' && resumeMatch) {
      const body = await readJson(request);
      if (body.isDefault !== true) return sendJson(response, 400, { error: 'isDefault=true is required' });
      return sendJson(response, 200, await repo.setDefaultResume(currentUserId, Number(resumeMatch[1])));
    }

    if (request.method === 'DELETE' && resumeMatch) {
      return sendJson(response, 200, await repo.deleteResume(currentUserId, Number(resumeMatch[1])));
    }

    const applicationMatch = url.pathname.match(/^\/api\/applications\/(\d+)$/);
    if (request.method === 'PATCH' && applicationMatch) {
      const body = await readJson(request);
      if (!body.status) {
        return sendJson(response, 400, { error: 'status is required' });
      }
      return sendJson(response, 200, {
        application: await repo.saveApplicationStatus(currentUserId, Number(applicationMatch[1]), body.status, body),
      });
    }

    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(port, () => {
  console.log(`Auto CV API listening on http://localhost:${port}`);
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  });

  if (statusCode === 204) {
    response.end();
    return;
  }

  response.end(JSON.stringify(payload));
}

async function getCurrentUser(request) {
  const token = readBearerToken(request);
  return token ? repo.getUserFromToken(token) : null;
}

function readBearerToken(request) {
  const auth = request.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function isAuthMutation(request, url) {
  return request.method === 'POST' && url.pathname.startsWith('/api/auth/') && url.pathname !== '/api/auth/logout';
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });
    request.on('error', reject);
  });
}
