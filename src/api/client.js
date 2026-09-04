const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'kikijob.authToken';

export function readAuthToken() {
  try {
    return window.localStorage?.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAuthToken(token) {
  try {
    if (token) window.localStorage?.setItem(AUTH_TOKEN_KEY, token);
    else window.localStorage?.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Local storage can be unavailable in restricted browser modes.
  }
}

export async function fetchAuthProviders() {
  return request('/auth/providers');
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    saveAuthToken('');
  }
}

export async function loginWithPassword(account, password) {
  const payload = await request('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
  saveAuthToken(payload.token);
  return payload;
}

export async function requestSmsCode(phone) {
  return request('/auth/sms/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifySmsCode(phone, code) {
  const payload = await request('/auth/sms/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  saveAuthToken(payload.token);
  return payload;
}

export async function requestEmailCode(email) {
  return request('/auth/email/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmailCode(email, code) {
  const payload = await request('/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  saveAuthToken(payload.token);
  return payload;
}

export async function startOAuthLogin(provider) {
  return request('/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}

export async function fetchBootstrap() {
  return request('/bootstrap');
}

export async function saveProfile(profile) {
  return request('/profile', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });
}

export async function createResume(fileName) {
  return request('/resumes', {
    method: 'POST',
    body: JSON.stringify({ fileName }),
  });
}

export async function fetchResumes() {
  return request('/resumes');
}

export async function setDefaultResume(resumeId) {
  return request(`/resumes/${resumeId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isDefault: true }),
  });
}

export async function deleteResume(resumeId) {
  return request(`/resumes/${resumeId}`, {
    method: 'DELETE',
  });
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Resume upload failed: ${response.status}`);
  }

  return response.json();
}

export async function saveApplicationStatus(jobId, status, details = {}) {
  return request(`/applications/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...details }),
  });
}

export async function deleteJob(jobId) {
  return request(`/jobs/${jobId}`, {
    method: 'DELETE',
  });
}

export async function importRecommendedJobs(profile) {
  return request('/jobs/import-recommendations', {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });
}

export async function saveFormMappings(formMappings) {
  return request('/form-mappings', {
    method: 'PUT',
    body: JSON.stringify({ formMappings }),
  });
}

export async function clearApplicationHistory() {
  return request('/applications', {
    method: 'DELETE',
  });
}

export async function clearProfileData() {
  return request('/profile', {
    method: 'DELETE',
  });
}

export async function runAutofill(url, steps) {
  return request('/autofill/run', {
    method: 'POST',
    body: JSON.stringify({ url, steps }),
  });
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `无法连接后端服务：${API_BASE_URL}。请检查 Vercel 的 VITE_API_BASE_URL、Railway 服务状态和 CORS 配置。`,
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

function authHeaders() {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
