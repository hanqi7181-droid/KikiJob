import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyParsedProfileWithTouched,
  autofillDraftToAppProfile,
  preferencesDraftToAppProfile,
  profileFromParsedResume,
  sanitizeOnboardingDraft,
} from './onboardingState.js';

test('parsed resume builds onboarding profile basics and repeatable sections', () => {
  const profile = profileFromParsedResume({
    name: '张三',
    fullText: '张三 zhangsan@example.com 13812345678',
    educationDetails: [{ school: '香港城市大学', degree: '硕士', major: '商业人工智能', endDate: '2026.07' }],
    workExperienceDetails: [{ company: '示例科技', role: '产品实习生', description: '负责需求分析' }],
    projectExperienceDetails: [{ name: 'AI Agent 项目', role: '负责人', description: '完成原型' }],
  });

  assert.equal(profile.name, '张三');
  assert.equal(profile.email, 'zhangsan@example.com');
  assert.equal(profile.phone, '13812345678');
  assert.equal(profile.school, '香港城市大学');
  assert.equal(profile.education.length, 1);
  assert.equal(profile.experiences[0].company, '示例科技');
  assert.equal(profile.projects[0].name, 'AI Agent 项目');
});

test('parsed profile does not overwrite manually touched fields', () => {
  const current = {
    name: '用户手动姓名',
    email: '',
    touched: { name: true },
  };
  const next = applyParsedProfileWithTouched(current, {
    name: '解析姓名',
    email: 'parsed@example.com',
  });

  assert.equal(next.name, '用户手动姓名');
  assert.equal(next.email, 'parsed@example.com');
});

test('onboarding preferences and autofill settings reuse existing profile shape', () => {
  const withPreferences = preferencesDraftToAppProfile(
    {
      roles: ['AI 产品经理', '数据分析'],
      recruitmentTypes: ['校招'],
      locations: ['深圳', '香港'],
      industries: ['金融科技'],
      companyTypes: ['外企'],
      salaryRange: '15k-30k',
      graduationType: '2026届',
      remote: true,
      companySize: '大型公司',
    },
    { identity: '应届毕业生' }
  );
  const finalProfile = autofillDraftToAppProfile(
    {
      allowedTypes: ['contact', 'education'],
      confirmEveryTime: ['salary', 'availability', 'workPermit'],
      sensitiveBlocked: true,
      pluginStatus: '稍后设置',
    },
    withPreferences
  );

  assert.equal(finalProfile.roles, 'AI 产品经理、数据分析');
  assert.deepEqual(finalProfile.goals, ['校招']);
  assert.deepEqual(finalProfile.cities, ['深圳', '香港']);
  assert.deepEqual(finalProfile.companyTypes, ['外企']);
  assert.equal(finalProfile.salaryGraduate, '15k-30k');
  assert.equal(finalProfile.remotePreference, true);
  assert.deepEqual(finalProfile.autofillPolicy.allowedTypes, ['contact', 'education']);
  assert.equal(finalProfile.autofillPolicy.finalSubmitByUser, true);
});

test('onboarding draft sanitizer repairs stale null arrays', () => {
  const draft = sanitizeOnboardingDraft({
    profile: null,
    preferences: {
      roles: null,
      locations: '深圳、香港',
      industries: null,
    },
    autofill: {
      allowedTypes: null,
    },
  });

  assert.deepEqual(draft.profile.education, []);
  assert.deepEqual(draft.preferences.roles, []);
  assert.deepEqual(draft.preferences.locations, ['深圳', '香港']);
  assert.deepEqual(draft.preferences.industries, []);
  assert.deepEqual(draft.autofill.allowedTypes, []);
});
