export const ONBOARDING_DRAFT_KEY = 'jobpilot.onboardingDraft.v1';
export const ONBOARDING_COMPLETED_KEY = 'jobpilot.onboardingCompleted';
export const ONBOARDING_STEP_KEY = 'jobpilot.onboardingStep.v1';

export const defaultOnboardingState = {
  login: {
    account: '',
    acceptedTerms: false,
    sessionStatus: '使用本地默认用户',
  },
  resume: {
    fileName: '',
    fileSize: '',
    uploadStatus: 'idle',
    error: '',
    parsedProfile: null,
    pendingProfile: null,
  },
  profile: {
    name: '',
    email: '',
    phone: '',
    school: '',
    degree: '',
    major: '',
    graduationDate: '',
    education: [],
    experiences: [],
    projects: [],
    touched: {},
  },
  preferences: {
    roles: ['AI 产品经理'],
    locations: ['深圳', '上海'],
    recruitmentTypes: ['校招', '实习'],
    graduationType: '',
    companyTypes: ['互联网大厂', '外企'],
    industries: [],
    salaryRange: '',
    remote: false,
    companySize: '',
  },
  autofill: {
    allowedTypes: ['contact', 'education', 'work', 'project'],
    confirmEveryTime: ['salary', 'availability', 'workPermit'],
    sensitiveBlocked: true,
    pluginStatus: '稍后设置',
  },
};

export function readOnboardingCompleted() {
  return getStorage()?.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
}

export function saveOnboardingCompleted(value) {
  getStorage()?.setItem(ONBOARDING_COMPLETED_KEY, value ? 'true' : 'false');
}

export function readOnboardingDraft() {
  try {
    const raw = getStorage()?.getItem(ONBOARDING_DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? sanitizeOnboardingDraft(parsed) : sanitizeOnboardingDraft(defaultOnboardingState);
  } catch {
    return sanitizeOnboardingDraft(defaultOnboardingState);
  }
}

export function saveOnboardingDraft(draft) {
  getStorage()?.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(sanitizeOnboardingDraft(draft)));
}

export function readOnboardingStep(maxStepIndex = 0) {
  const value = Number(getStorage()?.getItem(ONBOARDING_STEP_KEY) || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, value), maxStepIndex);
}

export function saveOnboardingStep(stepIndex) {
  getStorage()?.setItem(ONBOARDING_STEP_KEY, String(stepIndex));
}

export function mergeDraft(base, patch) {
  if (!base || typeof base !== 'object') return defaultOnboardingState;
  const safePatch = patch && typeof patch === 'object' ? patch : {};
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value, ...(safePatch?.[key] && typeof safePatch[key] === 'object' ? safePatch[key] : {}) }
        : safePatch?.[key] ?? value,
    ])
  );
}

export function sanitizeOnboardingDraft(draft = defaultOnboardingState) {
  const next = mergeDraft(defaultOnboardingState, draft);
  next.profile = {
    ...defaultOnboardingState.profile,
    ...(next.profile && typeof next.profile === 'object' ? next.profile : {}),
    education: Array.isArray(next.profile?.education) ? next.profile.education : [],
    experiences: Array.isArray(next.profile?.experiences) ? next.profile.experiences : [],
    projects: Array.isArray(next.profile?.projects) ? next.profile.projects : [],
    touched: next.profile?.touched && typeof next.profile.touched === 'object' ? next.profile.touched : {},
  };
  next.preferences = {
    ...defaultOnboardingState.preferences,
    ...(next.preferences && typeof next.preferences === 'object' ? next.preferences : {}),
    roles: asArray(next.preferences?.roles),
    locations: asArray(next.preferences?.locations),
    recruitmentTypes: asArray(next.preferences?.recruitmentTypes),
    companyTypes: asArray(next.preferences?.companyTypes),
    industries: asArray(next.preferences?.industries),
  };
  next.autofill = {
    ...defaultOnboardingState.autofill,
    ...(next.autofill && typeof next.autofill === 'object' ? next.autofill : {}),
    allowedTypes: asArray(next.autofill?.allowedTypes),
    confirmEveryTime: asArray(next.autofill?.confirmEveryTime),
  };
  next.resume = {
    ...defaultOnboardingState.resume,
    ...(next.resume && typeof next.resume === 'object' ? next.resume : {}),
  };
  next.login = {
    ...defaultOnboardingState.login,
    ...(next.login && typeof next.login === 'object' ? next.login : {}),
  };
  return next;
}

export function updateSectionValue(current, section, key, value) {
  const safeCurrent = sanitizeOnboardingDraft(current);
  return {
    ...safeCurrent,
    [section]: {
      ...(safeCurrent[section] && typeof safeCurrent[section] === 'object' ? safeCurrent[section] : {}),
      [key]: value,
    },
  };
}

export function hydrateOnboardingDraft(currentDraft, appProfile = {}, parsedResume = null) {
  const parsedProfile = parsedResume ? profileFromParsedResume(parsedResume, appProfile) : null;
  const next = sanitizeOnboardingDraft(currentDraft);
  if (appProfile?.email && !next.login.account) next.login.account = appProfile.email;
  if (appProfile?.resumeName && !next.resume.fileName) next.resume.fileName = appProfile.resumeName;
  next.preferences = hydratePreferences(next.preferences, appProfile);
  if (parsedProfile && !hasConfirmedProfile(next.profile)) {
    next.profile = {
      ...next.profile,
      ...parsedProfile,
      touched: next.profile.touched || {},
    };
    next.resume.parsedProfile = parsedResume;
  }
  return sanitizeOnboardingDraft(next);
}

export function profileFromParsedResume(parsedResume = {}, appProfile = {}) {
  const firstEducation = parsedResume.educationDetails?.[0] || {};
  const text = parsedResume.fullText || parsedResume.summary || '';
  return {
    name: parsedResume.name || appProfile.name || '',
    email: pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, text) || appProfile.email || '',
    phone: pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, text) || appProfile.phone || '',
    school: firstEducation.school || '',
    degree: firstEducation.degree || '',
    major: firstEducation.major || '',
    graduationDate: firstEducation.endDate || '',
    education: (parsedResume.educationDetails || []).map(normalizeEducation),
    experiences: (parsedResume.workExperienceDetails || []).map(normalizeExperience),
    projects: (parsedResume.projectExperienceDetails || []).map(normalizeProject),
  };
}

export function applyParsedProfileWithTouched(currentProfile, parsedProfile) {
  const touched = currentProfile.touched || {};
  const next = { ...currentProfile, touched };
  for (const [key, value] of Object.entries(parsedProfile || {})) {
    if (key === 'touched') continue;
    if (touched[key]) continue;
    next[key] = value;
  }
  return next;
}

export function hasConfirmedProfile(profile = {}) {
  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  return ['name', 'email', 'phone', 'school', 'degree', 'major', 'graduationDate'].some((key) => Boolean(safeProfile[key]));
}

export function profileDraftToAppProfile(profileDraft = {}, previousProfile = {}) {
  const safeProfile = sanitizeOnboardingDraft({ profile: profileDraft }).profile;
  const safePrevious = previousProfile && typeof previousProfile === 'object' ? previousProfile : {};
  return {
    ...safePrevious,
    name: safeProfile.name,
    email: safeProfile.email,
    phone: safeProfile.phone,
    parsedBasics: {
      school: safeProfile.school,
      degree: safeProfile.degree,
      major: safeProfile.major,
      graduationDate: safeProfile.graduationDate,
      education: safeProfile.education,
      experiences: safeProfile.experiences,
      projects: safeProfile.projects,
    },
  };
}

export function preferencesDraftToAppProfile(preferencesDraft = {}, previousProfile = {}) {
  const safePreferences = sanitizeOnboardingDraft({ preferences: preferencesDraft }).preferences;
  const safePrevious = previousProfile && typeof previousProfile === 'object' ? previousProfile : {};
  return {
    ...safePrevious,
    roles: safePreferences.roles.join('、'),
    goals: safePreferences.recruitmentTypes.length ? safePreferences.recruitmentTypes : safePrevious.goals || [],
    cities: safePreferences.locations.length ? safePreferences.locations : safePrevious.cities || [],
    industries: safePreferences.industries.length ? safePreferences.industries : safePrevious.industries || [],
    companyTypes: safePreferences.companyTypes.length ? safePreferences.companyTypes : safePrevious.companyTypes || [],
    salaryGraduate: safePreferences.salaryRange || safePrevious.salaryGraduate || '',
    graduationType: safePreferences.graduationType || safePrevious.graduationType || '',
    remotePreference: Boolean(safePreferences.remote),
    companySize: safePreferences.companySize || '',
    autofillPolicy: safePrevious.autofillPolicy || {},
  };
}

export function autofillDraftToAppProfile(autofillDraft = {}, previousProfile = {}) {
  const safeAutofill = sanitizeOnboardingDraft({ autofill: autofillDraft }).autofill;
  const safePrevious = previousProfile && typeof previousProfile === 'object' ? previousProfile : {};
  return {
    ...safePrevious,
    autofillPolicy: {
      allowedTypes: safeAutofill.allowedTypes,
      confirmEveryTime: safeAutofill.confirmEveryTime,
      sensitiveBlocked: safeAutofill.sensitiveBlocked !== false,
      pluginStatus: safeAutofill.pluginStatus || '稍后设置',
      neverRead: ['password', 'captcha'],
      finalSubmitByUser: true,
    },
  };
}

function hydratePreferences(currentPreferences = {}, appProfile = {}) {
  const safePreferences = currentPreferences && typeof currentPreferences === 'object' ? currentPreferences : {};
  const safeProfile = appProfile && typeof appProfile === 'object' ? appProfile : {};
  return {
    ...safePreferences,
    roles: asArray(safePreferences.roles).length ? asArray(safePreferences.roles) : splitList(safeProfile.roles),
    locations: asArray(safePreferences.locations).length ? asArray(safePreferences.locations) : asArray(safeProfile.cities),
    recruitmentTypes: asArray(safePreferences.recruitmentTypes).length ? asArray(safePreferences.recruitmentTypes) : asArray(safeProfile.goals),
    companyTypes: asArray(safePreferences.companyTypes).length
      ? asArray(safePreferences.companyTypes)
      : asArray(safeProfile.companyTypes || safeProfile.industries),
    industries: asArray(safePreferences.industries).length ? asArray(safePreferences.industries) : asArray(safeProfile.industries),
    salaryRange: safePreferences.salaryRange || safeProfile.salaryGraduate || '',
    graduationType: safePreferences.graduationType || safeProfile.graduationType || '',
    remote: safePreferences.remote || Boolean(safeProfile.remotePreference),
    companySize: safePreferences.companySize || safeProfile.companySize || '',
  };
}

function splitList(value) {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split(/[、,;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return splitList(value);
  return [];
}

function normalizeEducation(item = {}) {
  return {
    school: item.school || '',
    degree: item.degree || '',
    major: item.major || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    courses: item.courses || '',
  };
}

function normalizeExperience(item = {}) {
  return {
    company: item.company || item.title || '',
    role: item.role || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    description: item.description || '',
  };
}

function normalizeProject(item = {}) {
  return {
    name: item.name || '',
    role: item.role || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    description: item.description || '',
  };
}

function pick(pattern, text = '') {
  const match = String(text).match(pattern);
  return match ? match[0] : '';
}

function getStorage() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}
