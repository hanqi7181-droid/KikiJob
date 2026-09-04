import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { onboardingSteps } from './steps.jsx';
import {
  applyParsedProfileWithTouched,
  hasConfirmedProfile,
  hydrateOnboardingDraft,
  autofillDraftToAppProfile,
  preferencesDraftToAppProfile,
  profileDraftToAppProfile,
  profileFromParsedResume,
  readOnboardingDraft,
  readOnboardingStep,
  sanitizeOnboardingDraft,
  saveOnboardingCompleted,
  saveOnboardingDraft,
  saveOnboardingStep,
  updateSectionValue,
} from './onboardingState.js';

export function OnboardingWizard({
  appProfile,
  authUser,
  loginWithPassword,
  onAuthChanged,
  onComplete,
  onProfileSaved,
  parsedResume,
  requestEmailCode,
  saveProfile,
  uploadResume,
  verifyEmailCode,
}) {
  const [draft, setDraft] = useState(() => hydrateOnboardingDraft(readOnboardingDraft(), appProfile, parsedResume));
  const [stepIndex, setStepIndex] = useState(() => readOnboardingStep(onboardingSteps.length - 1));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [minimized, setMinimized] = useState(false);
  const dialogRef = useRef(null);
  const titleId = 'jobpilot-onboarding-title';
  const currentStep = onboardingSteps[stepIndex];
  const CurrentStepComponent = currentStep.Component;

  const progress = useMemo(() => Math.round(((stepIndex + 1) / onboardingSteps.length) * 100), [stepIndex]);
  const intakeBubbles = useMemo(() => buildIntakeBubbles(draft, appProfile, parsedResume), [draft, appProfile, parsedResume]);
  const intakeStats = useMemo(() => buildIntakeStats(draft, intakeBubbles), [draft, intakeBubbles]);

  useEffect(() => {
    saveOnboardingDraft(draft);
  }, [draft]);

  useEffect(() => {
    saveOnboardingStep(stepIndex);
  }, [stepIndex]);

  useEffect(() => {
    setDraft((current) => hydrateOnboardingDraft(current, appProfile, parsedResume));
  }, [appProfile, parsedResume]);

  useEffect(() => {
    if (minimized) return undefined;
    const previousActive = document.activeElement;
    const first = firstFocusable(dialogRef.current);
    first?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMinimized(true);
        return;
      }

      if (event.key !== 'Tab') return;
      trapFocus(event, dialogRef.current);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActive?.focus?.();
    };
  }, [minimized, stepIndex]);

  const setField = (section, key, value, options = {}) => {
    setDraft((current) => {
      const safeCurrent = sanitizeOnboardingDraft(current);
      const next = updateSectionValue(safeCurrent, section, key, value);
      if (section === 'profile' && options.touched !== false) {
        next.profile.touched = { ...(safeCurrent.profile.touched || {}), [key]: true };
      }
      return next;
    });
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const setProfileCollection = (collection, items) => {
    setDraft((current) => {
      const safeCurrent = sanitizeOnboardingDraft(current);
      return {
      ...safeCurrent,
      profile: {
        ...safeCurrent.profile,
        [collection]: items,
        touched: { ...(safeCurrent.profile.touched || {}), [collection]: true },
      },
    };
    });
  };

  const uploadResumeFile = async (file) => {
    if (!file || !uploadResume) return;
    const allowedExtensions = /\.(pdf|txt|md)$/i;
    if (!allowedExtensions.test(file.name)) {
      setDraft((current) => ({
        ...sanitizeOnboardingDraft(current),
        resume: {
          ...sanitizeOnboardingDraft(current).resume,
          uploadStatus: 'failed',
          error: '当前后端支持 PDF、TXT、Markdown。DOC/DOCX 解析尚未接入。',
        },
      }));
      return;
    }

    setDraft((current) => {
      const safeCurrent = sanitizeOnboardingDraft(current);
      return {
      ...safeCurrent,
      resume: {
        ...safeCurrent.resume,
        fileName: file.name,
        fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        uploadStatus: 'uploading',
        error: '',
      },
    };
    });

    try {
      setDraft((current) => {
        const safeCurrent = sanitizeOnboardingDraft(current);
        return { ...safeCurrent, resume: { ...safeCurrent.resume, uploadStatus: 'parsing' } };
      });
      const payload = await uploadResume(file);
      const parsedProfile = payload.resume?.parsedProfile || null;
      const parsedProfileDraft = profileFromParsedResume(parsedProfile || {}, appProfile || {});
      setDraft((current) => {
        const safeCurrent = sanitizeOnboardingDraft(current);
        return {
        ...safeCurrent,
        resume: {
          ...safeCurrent.resume,
          uploadStatus: 'success',
          error: '',
          parsedProfile,
          pendingProfile: parsedProfileDraft,
        },
        profile: hasConfirmedProfile(safeCurrent.profile)
          ? safeCurrent.profile
          : applyParsedProfileWithTouched(safeCurrent.profile, parsedProfileDraft),
      };
      });
      onProfileSaved?.({
        parsedResume: parsedProfile,
        formMappings: payload.formMappings,
        resumeName: payload.resume?.fileName || file.name,
      });
    } catch (error) {
      setDraft((current) => {
        const safeCurrent = sanitizeOnboardingDraft(current);
        return {
        ...safeCurrent,
        resume: {
          ...safeCurrent.resume,
          uploadStatus: 'failed',
          error: error.message || '简历上传或解析失败，请重试。',
        },
      };
      });
    }
  };

  const applyPendingProfile = () => {
    setDraft((current) => {
      const safeCurrent = sanitizeOnboardingDraft(current);
      if (!safeCurrent.resume.pendingProfile) return safeCurrent;
      return {
        ...safeCurrent,
        profile: applyParsedProfileWithTouched(safeCurrent.profile, safeCurrent.resume.pendingProfile),
      };
    });
  };

  const saveCurrentProfile = async (profilePayload) => {
    if (!saveProfile) return null;
    const payload = await saveProfile(profilePayload);
    onProfileSaved?.({ profile: payload.profile, formMappings: payload.formMappings });
    return payload;
  };

  const goNext = async () => {
    const nextErrors = currentStep.validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors || {}).length) return;

    if (currentStep.id === 'profile' && saveProfile) {
      try {
        setSaveError('');
        const appProfilePayload = profileDraftToAppProfile(draft.profile, appProfile || {});
        await saveCurrentProfile(appProfilePayload);
      } catch (error) {
        setSaveError(error.message || '基本资料保存失败，请稍后重试。');
        return;
      }
    }

    if (stepIndex === onboardingSteps.length - 1) {
      try {
        setSaveError('');
        const withProfile = profileDraftToAppProfile(draft.profile, appProfile || {});
        const withPreferences = preferencesDraftToAppProfile(draft.preferences, withProfile);
        const finalProfile = autofillDraftToAppProfile(draft.autofill, withPreferences);
        await saveCurrentProfile(finalProfile);
        saveOnboardingCompleted(true);
        saveOnboardingDraft(draft);
        onComplete?.(draft);
        return;
      } catch (error) {
        setSaveError(error.message || '引导设置保存失败，请稍后重试。');
        return;
      }
    }

    setStepIndex((current) => current + 1);
  };

  const goBack = () => {
    setErrors({});
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const saveAndClose = () => {
    saveOnboardingDraft(draft);
    setMinimized(true);
  };

  if (minimized) {
    return (
      <div className="onboarding-backdrop" role="presentation">
        <section className="onboarding-resume-card" role="dialog" aria-modal="true" aria-labelledby="jobpilot-onboarding-paused">
          <p className="eyebrow">Draft Saved</p>
          <h2 id="jobpilot-onboarding-paused">引导已保存</h2>
          <p>首次设置还没完成。继续后会回到第 {stepIndex + 1} 步：{currentStep.title}。</p>
          <button className="primary-action" onClick={() => setMinimized(false)}>继续引导</button>
        </section>
      </div>
    );
  }

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
        <aside className="onboarding-bubble-panel" aria-label="已收集的求职资料">
          <div className="bubble-panel-copy">
            <p className="eyebrow">KikiJob Intake</p>
            <h3>资料气泡池</h3>
            <p>你填写的岗位、城市、经历和规则会在这里汇聚，进入系统后同步给推荐、匹配和自动填表使用。</p>
          </div>
          <div className="bubble-stat-grid" aria-label="资料收集概览">
            <article>
              <strong>{intakeStats.bubbleCount}</strong>
              <span>已收集</span>
            </article>
            <article>
              <strong>{intakeStats.experienceCount}</strong>
              <span>经历</span>
            </article>
            <article>
              <strong>{stepIndex + 1}/{onboardingSteps.length}</strong>
              <span>步骤</span>
            </article>
          </div>
          <div className="bubble-pool" aria-live="polite">
            {intakeBubbles.length ? (
              intakeBubbles.map((bubble) => (
                <span className={`intake-bubble ${bubble.tone}`} key={bubble.key} title={`${bubble.type}：${bubble.label}`}>
                  <small>{bubble.type}</small>
                  {bubble.label}
                </span>
              ))
            ) : (
              <p className="bubble-empty">填写后会生成动态资料气泡。</p>
            )}
          </div>
          <div className="bubble-panel-footer">Find. Match. Apply.</div>
        </aside>

        <div className="onboarding-flow-panel">
          <header className="onboarding-header">
            <div>
              <p className="eyebrow">Step {stepIndex + 1} of {onboardingSteps.length}</p>
              <h2 id={titleId}>{currentStep.title}</h2>
            </div>
            <button className="icon-button" type="button" onClick={saveAndClose} aria-label="保存草稿并关闭引导">
              <X size={20} />
            </button>
            <div className="onboarding-progress" aria-label={`引导进度 ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <ol className="step-dots" aria-label="引导步骤">
              {onboardingSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.id} className={index === stepIndex ? 'active' : index < stepIndex ? 'done' : ''}>
                    <Icon size={16} />
                    <span>{step.title}</span>
                  </li>
                );
              })}
            </ol>
          </header>

          <div className="onboarding-body" key={currentStep.id}>
            {saveError && <div className="onboarding-error-banner">{saveError}</div>}
            <CurrentStepComponent
              draft={draft}
              errors={errors}
              authUser={authUser}
              loginWithPassword={loginWithPassword}
              onAuthChanged={onAuthChanged}
              onStepComplete={() => setStepIndex((current) => Math.max(current, 1))}
              requestEmailCode={requestEmailCode}
              setField={setField}
              setProfileCollection={setProfileCollection}
              verifyEmailCode={verifyEmailCode}
              applyPendingProfile={applyPendingProfile}
              goToStep={(targetStepId) => {
                const targetIndex = onboardingSteps.findIndex((step) => step.id === targetStepId);
                if (targetIndex >= 0) {
                  setErrors({});
                  setStepIndex(targetIndex);
                }
              }}
              uploadResumeFile={uploadResumeFile}
            />
          </div>

          {currentStep.id !== 'login' && (
            <footer className="onboarding-footer">
              <button className="secondary-action" type="button" onClick={goBack}>
                上一步
              </button>
              <button className="secondary-action" type="button" onClick={saveAndClose}>
                保存草稿
              </button>
              <button className="primary-action" type="button" onClick={goNext}>
                {stepIndex === onboardingSteps.length - 1 ? '进入 KikiJob' : '下一步'}
              </button>
            </footer>
          )}
        </div>
      </section>
    </div>
  );
}

function buildIntakeBubbles(draft = {}, appProfile = {}, parsedResume = {}) {
  const profile = { ...(appProfile || {}), ...(draft?.profile || {}) };
  const preferences = draft?.preferences || {};
  const autofill = draft?.autofill || {};
  const parsedProfile = draft?.resume?.parsedProfile || parsedResume || {};
  const pendingProfile = draft?.resume?.pendingProfile || {};
  const sourceProfile = { ...profile, ...pendingProfile, ...parsedProfile };
  const bubbles = [];

  const push = (type, value, tone = 'blue') => {
    const label = normalizeBubbleValue(value);
    if (!label) return;
    const key = `${type}-${label}`;
    if (bubbles.some((bubble) => bubble.key === key)) return;
    bubbles.push({ key, type, label, tone });
  };

  push('姓名', sourceProfile.name, 'blue');
  push('学校', sourceProfile.school || sourceProfile.university, 'green');
  push('专业', sourceProfile.major, 'purple');
  push('学历', sourceProfile.degree, 'pink');
  push('简历', draft?.resume?.fileName, 'blue');
  collectValues(preferences.roles || sourceProfile.roles).forEach((value) => push('意向岗位', value, 'blue'));
  collectValues(preferences.locations || sourceProfile.cities).forEach((value) => push('意向城市', value, 'green'));
  collectValues(preferences.recruitmentTypes || sourceProfile.goals).forEach((value) => push('招聘类型', value, 'purple'));
  collectValues(preferences.companyTypes).forEach((value) => push('公司偏好', value, 'pink'));
  collectValues(preferences.industries).forEach((value) => push('行业', value, 'green'));
  collectValues(autofill.allowedTypes).forEach((value) => push('自动填表', fillTypeLabel(value), 'purple'));
  collectValues(sourceProfile.skills || sourceProfile.skillDetails).slice(0, 8).forEach((value) => push('技能', value, 'blue'));

  collectCollection(sourceProfile.education || sourceProfile.educationDetails).forEach((item) => {
    push('教育', item.school || item.university, 'green');
    push('专业', item.major, 'purple');
  });
  collectCollection(sourceProfile.experiences || sourceProfile.workExperienceDetails || sourceProfile.practiceDetails).forEach((item) => {
    push('经历', item.company || item.organization, 'pink');
    push('岗位', item.role || item.position || item.title, 'blue');
  });
  collectCollection(sourceProfile.projects || sourceProfile.projectExperienceDetails).forEach((item) => {
    push('项目', item.name || item.projectName, 'purple');
  });

  return bubbles.slice(0, 36);
}

function buildIntakeStats(draft = {}, bubbles = []) {
  const profile = draft?.profile || {};
  const experienceCount =
    collectCollection(profile.education).length +
    collectCollection(profile.experiences).length +
    collectCollection(profile.projects).length;
  return {
    bubbleCount: bubbles.length,
    experienceCount,
  };
}

function collectValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (item && typeof item === 'object' ? Object.values(item) : item)).map(normalizeBubbleValue).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[、,;；\n]/).map(normalizeBubbleValue).filter(Boolean);
  }
  return normalizeBubbleValue(value) ? [normalizeBubbleValue(value)] : [];
}

function collectCollection(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  return [];
}

function normalizeBubbleValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function fillTypeLabel(value) {
  const labels = {
    contact: '联系方式',
    education: '教育',
    work: '经历',
    project: '项目',
  };
  return labels[value] || value;
}

function trapFocus(event, container) {
  const focusable = focusableElements(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function firstFocusable(container) {
  return focusableElements(container)[0];
}

function focusableElements(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null);
}
