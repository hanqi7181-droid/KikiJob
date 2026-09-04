import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeCheck,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  UserCircle,
  X,
} from 'lucide-react';
import {
  createResume,
  clearApplicationHistory,
  clearProfileData,
  deleteResume,
  deleteJob,
  fetchBootstrap,
  fetchAuthProviders,
  fetchResumes,
  importRecommendedJobs,
  loginWithPassword,
  logout as logoutFromApi,
  requestEmailCode,
  runAutofill,
  saveApplicationStatus,
  saveFormMappings,
  saveAuthToken,
  saveProfile as saveProfileToApi,
  setDefaultResume,
  uploadResume,
  verifyEmailCode,
} from './api/client.js';
import { buildApplicationPacket } from './data/applicationPacket.js';
import { buildAutofillPreview, buildAutofillPreviewFromScannedFields, buildAutofillScript } from './data/careerAutofill.js';
import { applicationStatuses, initialProfile } from './data/demoData.js';
import { evaluateJobMatch } from './data/matching.js';
import { generateCareerSiteTasks } from './data/searchTasks.js';
import { buildStandardFormMappings, normalizeProfileData } from './data/standardFormMappings.js';
import { OnboardingWizard } from './onboarding/OnboardingWizard.jsx';
import { readOnboardingCompleted, saveOnboardingCompleted, saveOnboardingStep } from './onboarding/onboardingState.js';
import './styles.css';

const connectedText = 'connected';
const primaryRoutes = [
  { id: 'recommend', label: '推荐', icon: Search },
  { id: 'assist', label: '辅助投递', icon: ClipboardList },
  { id: 'applications', label: '投递记录', icon: BriefcaseBusiness },
  { id: 'profile', label: '我的资料', icon: UserCircle },
];

const legacyRouteRedirects = {
  search: 'recommend',
  companies: 'recommend',
  jobs: 'applications',
  followups: 'applications',
  resume: 'profile',
  packet: 'profile',
  mapping: 'assist',
  autofill: 'assist',
  materials: 'applications',
};

function normalizeRoute(route) {
  const cleanRoute = String(route || '').replace(/^#?\//, '');
  if (primaryRoutes.some((item) => item.id === cleanRoute)) return cleanRoute;
  return legacyRouteRedirects[cleanRoute] || 'recommend';
}

function routeFromHash() {
  const rawRoute = window.location.hash.replace(/^#\/?/, '');
  if (rawRoute === 'onboarding') {
    saveOnboardingCompleted(false);
    saveOnboardingStep(0);
    return 'recommend';
  }
  return normalizeRoute(rawRoute);
}

function App() {
  const [profile, setProfile] = useState(initialProfile);
  const [jobs, setJobs] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [applicationDetails, setApplicationDetails] = useState({});
  const [parsedResume, setParsedResume] = useState(null);
  const [customMappings, setCustomMappings] = useState(null);
  const [resumeVersions, setResumeVersions] = useState([]);
  const [careerUrl, setCareerUrl] = useState('');
  const [scanPayloadText, setScanPayloadText] = useState('');
  const [autofillPreview, setAutofillPreview] = useState(null);
  const [autofillConfirmed, setAutofillConfirmed] = useState(false);
  const [autofillRunState, setAutofillRunState] = useState('');
  const [autofillRunResult, setAutofillRunResult] = useState(null);
  const [mappingSaveState, setMappingSaveState] = useState('');
  const [apiState, setApiState] = useState('连接后端中');
  const [authProviders, setAuthProviders] = useState({ password: true, emailCode: true });
  const [authUser, setAuthUser] = useState(null);
  const [recommendImportState, setRecommendImportState] = useState('');
  const [activeTab, setActiveTabState] = useState(routeFromHash);
  const [onboardingCompleted, setOnboardingCompleted] = useState(readOnboardingCompleted);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    let isMounted = true;

    fetchBootstrap()
      .then((payload) => {
        if (!isMounted) return;
        setProfile(payload.profile || initialProfile);
        setJobs(payload.jobs || []);
        setStatusMap(payload.applications || {});
        setApplicationDetails(payload.applicationDetails || {});
        setCustomMappings(payload.formMappings?.length ? payload.formMappings : null);
        setParsedResume(payload.latestResume?.parsedProfile || null);
        setResumeVersions(payload.resumes || (payload.latestResume ? [payload.latestResume] : []));
        setAuthUser(payload.user || null);
        setApiState(connectedText);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (error.status === 401) {
          setAuthUser(null);
          saveAuthToken('');
          saveOnboardingCompleted(false);
          saveOnboardingStep(0);
          setOnboardingCompleted(false);
          setApiState('请先登录后继续');
        } else {
          setApiState('后端未启动，当前使用前端演示数据');
        }
      })
      .finally(() => {
        if (isMounted) hasBootstrapped.current = true;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchAuthProviders()
      .then((payload) => setAuthProviders(payload.providers || authProviders))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      const rawRoute = window.location.hash.replace(/^#\/?/, '');
      if (rawRoute === 'onboarding') {
        saveOnboardingCompleted(false);
        saveOnboardingStep(0);
        setOnboardingCompleted(false);
        setActiveTabState('recommend');
        window.history.replaceState(null, '', '#/recommend');
        return;
      }
      const nextRoute = normalizeRoute(rawRoute);
      setActiveTabState(nextRoute);
      if (rawRoute && rawRoute !== nextRoute && window.location.hash !== `#/${nextRoute}`) {
        window.history.replaceState(null, '', `#/${nextRoute}`);
      }
    };
    window.addEventListener('hashchange', syncRoute);
    if (!window.location.hash) window.history.replaceState(null, '', '#/recommend');
    syncRoute();
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    if (!hasBootstrapped.current || apiState !== connectedText) return;

    const timeoutId = window.setTimeout(() => {
      saveProfileToApi(profile)
        .then((payload) => {
          if (payload.formMappings?.length) setCustomMappings(payload.formMappings);
        })
        .catch(() => setApiState('保存失败，请检查后端服务'));
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [apiState, profile]);

  useEffect(() => {
    if (!hasBootstrapped.current || apiState !== connectedText || !customMappings?.length) return;

    setMappingSaveState('保存中...');
    const timeoutId = window.setTimeout(() => {
      saveFormMappings(customMappings)
        .then(() => setMappingSaveState('已保存'))
        .catch(() => setMappingSaveState('保存失败'));
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [apiState, customMappings]);

  const scoredJobs = useMemo(() => {
    return jobs
      .map((job) => evaluateJobMatch(job, profile, parsedResume))
      .sort((a, b) => b.score - a.score);
  }, [jobs, parsedResume, profile]);

  const careerSiteTasks = useMemo(() => generateCareerSiteTasks(profile), [profile]);

  const applicationPacket = useMemo(() => buildApplicationPacket(profile, parsedResume), [parsedResume, profile]);
  const standardMappings = useMemo(
    () => buildStandardFormMappings(profile, parsedResume, { resumeFileName: profile.resumeName }),
    [parsedResume, profile]
  );
  const formMappings = useMemo(
    () => (customMappings?.length ? customMappings.filter((item) => item.kind !== 'learnedFieldMapping') : standardMappings),
    [customMappings, standardMappings]
  );
  const autofillMappings = formMappings;

  const handleScanCareerForm = () => {
    if (!careerUrl.trim()) return;
    setAutofillPreview(buildAutofillPreview(careerUrl.trim(), autofillMappings));
    setAutofillConfirmed(false);
  };

  const handleImportExtensionScan = () => {
    if (!scanPayloadText.trim()) return;
    try {
      const preview = buildAutofillPreviewFromScannedFields(scanPayloadText.trim(), autofillMappings);
      if (preview.url) setCareerUrl(preview.url);
      setAutofillPreview(preview);
      setAutofillConfirmed(false);
      setAutofillRunResult(null);
      setAutofillRunState('');
    } catch (error) {
      setAutofillRunState(error.message || '扩展扫描结果导入失败');
    }
  };

  const updateAutofillField = (id, patch) => {
    setAutofillPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
      };
    });
    setAutofillConfirmed(false);
    setAutofillRunResult(null);
  };

  const autofillScript = useMemo(
    () => (autofillPreview && autofillConfirmed ? buildAutofillScript(autofillPreview) : []),
    [autofillConfirmed, autofillPreview]
  );

  const handleRunAutofill = () => {
    if (!careerUrl.trim() || !autofillScript.length) return;
    setAutofillRunState('正在打开浏览器并预填...');
    setAutofillRunResult(null);
    runAutofill(careerUrl.trim(), autofillScript)
      .then((payload) => {
        setAutofillRunResult(payload);
        setAutofillRunState(payload.ok ? '预填完成，请在浏览器中人工检查后再提交' : payload.message || '浏览器预填未完成');
      })
      .catch((error) => {
        setAutofillRunState(error.message || '浏览器预填失败');
      });
  };

  const crmStats = useMemo(() => {
    return applicationStatuses.map((status) => ({
      status,
      count: scoredJobs.filter((job) => canonicalApplicationStatus(applicationDetails[job.id]?.status || statusMap[job.id]) === status)
        .length,
    }));
  }, [applicationDetails, scoredJobs, statusMap]);

  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));

  const updateList = (key, value) => {
    update(
      key,
      value
        .split(/[、,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
  };

  const handleResumeChange = (file) => {
    const fileName = file?.name || '';
    update('resumeName', fileName);
    if (!fileName || apiState !== connectedText) return;

    uploadResume(file)
      .then((payload) => {
        setParsedResume(payload.resume?.parsedProfile || null);
        setCustomMappings(payload.formMappings?.length ? payload.formMappings : null);
        fetchResumes()
          .then((resumePayload) => setResumeVersions(resumePayload.resumes || []))
          .catch(() => {});
      })
      .catch(() => {
        createResume(fileName).catch(() => setApiState('简历记录保存失败，请检查后端服务'));
        setApiState('简历解析失败，已先记录文件名');
      });
  };

  const handleSetDefaultResume = (resumeId) => {
    if (apiState !== connectedText) {
      setApiState('请先启动后端，再设置默认简历');
      return;
    }
    setDefaultResume(resumeId)
      .then((payload) => {
        setResumeVersions((current) =>
          current.map((resume) => ({ ...resume, isDefault: resume.id === resumeId }))
        );
        if (payload.profile) setProfile(payload.profile);
        if (payload.resume?.parsedProfile) setParsedResume(payload.resume.parsedProfile);
      })
      .catch((error) => setApiState(error.message || '设置默认简历失败'));
  };

  const handleDeleteResume = (resumeId) => {
    if (apiState !== connectedText) {
      setApiState('请先启动后端，再删除简历版本');
      return;
    }
    deleteResume(resumeId)
      .then((payload) => {
        setResumeVersions(payload.resumes || []);
        setParsedResume(payload.latestResume?.parsedProfile || null);
        if (payload.profile) setProfile(payload.profile);
      })
      .catch((error) => setApiState(error.message || '删除简历失败'));
  };

  const handleClearApplications = () => {
    if (apiState !== connectedText) {
      setApiState('请先启动后端，再清空投递历史');
      return;
    }
    clearApplicationHistory()
      .then(() => {
        setStatusMap({});
        setApplicationDetails({});
        setApiState('投递历史已清空');
      })
      .catch((error) => setApiState(error.message || '清空投递历史失败'));
  };

  const handleClearFieldMemory = () => {
    const base = customMappings?.length ? customMappings : standardMappings;
    const nextMappings = base.filter((item) => item.kind !== 'learnedFieldMapping');
    setCustomMappings(nextMappings);
    setMappingSaveState('字段记忆已清空');
    if (apiState === connectedText) {
      saveFormMappings(nextMappings).catch(() => setMappingSaveState('字段记忆清空失败'));
    }
  };

  const handleClearProfileData = () => {
    if (apiState !== connectedText) {
      setApiState('请先启动后端，再删除个人资料');
      return;
    }
    clearProfileData()
      .then((payload) => {
        setProfile(payload.profile || initialProfile);
        setParsedResume(payload.latestResume?.parsedProfile || null);
        setResumeVersions(payload.resumes || []);
        setStatusMap(payload.applications || {});
        setApplicationDetails(payload.applicationDetails || {});
        setCustomMappings(payload.formMappings || null);
        setApiState('个人资料已删除');
      })
      .catch((error) => setApiState(error.message || '删除个人资料失败'));
  };

  const handleStatusChange = (jobId, status, meta = {}) => {
    const normalizedStatus = canonicalApplicationStatus(status);
    const now = new Date().toISOString();
    const detailPatch = {
      updatedAt: now,
      updatedSource: meta.updatedSource || meta.source || 'manual',
      ...meta,
    };
    delete detailPatch.source;
    const submittedPatch =
      normalizedStatus === '已投递'
        ? {
            appliedAt: meta.appliedAt || applicationDetails[jobId]?.appliedAt || now,
            submissionResult: meta.submissionResult || applicationDetails[jobId]?.submissionResult || 'success',
          }
        : {};

    setStatusMap((current) => ({ ...current, [jobId]: normalizedStatus }));
    setApplicationDetails((current) => ({
      ...current,
      [jobId]: { ...(current[jobId] || {}), ...detailPatch, ...submittedPatch, status: normalizedStatus },
    }));
    if (apiState !== connectedText) return;
    saveApplicationStatus(jobId, normalizedStatus, {
      ...detailPatch,
      ...submittedPatch,
      followUpAt: detailPatch.followUpAt || detailPatch.nextActionAt,
    }).catch(() => setApiState('投递状态保存失败，请检查后端服务'));
  };

  const handleApplicationDetailChange = (jobId, patch) => {
    const current = applicationDetails[jobId] || { status: statusMap[jobId] || '收藏/待投', notes: '', followUpAt: '' };
    const normalizedPatch = {
      ...patch,
      status: canonicalApplicationStatus(patch.status || current.status || statusMap[jobId]),
      updatedAt: new Date().toISOString(),
      updatedSource: patch.updatedSource || 'manual',
    };
    if (normalizedPatch.nextActionAt && !normalizedPatch.followUpAt) normalizedPatch.followUpAt = normalizedPatch.nextActionAt;
    const next = { ...current, ...normalizedPatch };
    setApplicationDetails((details) => ({ ...details, [jobId]: next }));
    setStatusMap((statuses) => ({ ...statuses, [jobId]: next.status }));
    if (apiState !== connectedText) return;
    saveApplicationStatus(jobId, next.status, { ...next, followUpAt: next.followUpAt || next.nextActionAt }).catch(() =>
      setApiState('投递记录保存失败，请检查后端服务')
    );
  };

  const handleDeleteJob = (job) => {
    if (job.isDemo) {
      setApiState('示例岗位不能删除');
      return;
    }

    if (apiState !== connectedText) {
      setApiState('请先启动后端，再删除真实岗位');
      return;
    }

    deleteJob(job.id)
      .then(() => {
        setJobs((current) => current.filter((item) => item.id !== job.id));
        setStatusMap((current) => {
          const next = { ...current };
          delete next[job.id];
          return next;
        });
        setApiState('真实岗位已删除');
      })
      .catch((error) => setApiState(error.message || '删除岗位失败'));
  };

  const handleSmartRecommend = () => {
    setRecommendImportState('正在抓取偏好公司的真实官网岗位...');
    importRecommendedJobs(profile)
      .then((payload) => {
        setJobs(payload.jobs || []);
        const importedCount = payload.imported?.length || 0;
        const duplicateCount = payload.duplicates?.length || 0;
        const errorCount = payload.errors?.length || 0;
        setRecommendImportState(
          importedCount
            ? `已导入 ${importedCount} 个真实岗位，跳过重复 ${duplicateCount} 个。`
            : `本次未抓到可确认的岗位链接，已检查 ${payload.checkedCompanies || 0} 家公司${errorCount ? `，${errorCount} 家访问失败` : ''}。`
        );
      })
      .catch((error) => setRecommendImportState(error.message || '智能推荐抓取失败，请稍后重试。'));
  };

  const handleLogout = async () => {
    await logoutFromApi().catch(() => saveAuthToken(''));
    setAuthUser(null);
    saveOnboardingCompleted(false);
    setOnboardingCompleted(false);
    setActiveTab('recommend');
    setApiState('已退出登录，可用新账号体验普通用户流程');
  };

  function setActiveTab(route) {
    const nextRoute = normalizeRoute(route);
    setActiveTabState(nextRoute);
    if (window.location.hash !== `#/${nextRoute}`) {
      window.location.hash = `/${nextRoute}`;
    }
  }

  const activeRoute = primaryRoutes.find((route) => route.id === activeTab) || primaryRoutes[0];
  const isHomeRoute = activeTab === 'recommend';

  return (
    <main className={`app-shell ${isHomeRoute ? 'home-shell' : ''}`}>
      {!isHomeRoute && <header className="app-header">
        <div className="app-header-inner">
          <button className="brand-inline" onClick={() => setActiveTab('recommend')} aria-label="返回推荐">
            <div className="brand-mark">
              <BriefcaseBusiness size={22} />
            </div>
            <div>
              <h1>KikiJob</h1>
              <span>智能求职助手</span>
            </div>
          </button>
          <nav className="top-tabs" aria-label="主导航">
            {primaryRoutes.map((tab) => (
              <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="header-actions" aria-label="账户操作">
            <button aria-label="通知">
              <Bell size={19} />
            </button>
            <button aria-label="我的资料" onClick={() => setActiveTab('profile')}>
              <UserCircle size={20} />
            </button>
            {authUser && (
              <button className="logout-action" onClick={handleLogout}>
                退出
              </button>
            )}
          </div>
        </div>
      </header>}

      {isHomeRoute && (
        <KikiJobHero
          authUser={authUser}
          onLogout={handleLogout}
          primaryRoutes={primaryRoutes}
          setActiveTab={setActiveTab}
          onExplore={() => document.getElementById('recommend-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      )}

      <section className="app-content" id={isHomeRoute ? 'recommend-content' : undefined}>
        {!isHomeRoute && <div className="page-title-row">
          <div>
            <p className="eyebrow">KikiJob Workspace</p>
            <h2>{activeRoute.label}</h2>
          </div>
        </div>}

        {activeTab === 'recommend' && (
          <CoreRoutePage
            eyebrow="Recommendation"
            title="推荐公司与岗位"
            description="根据你的简历画像、求职偏好和已导入岗位，聚合推荐公司、岗位详情和匹配结果。"
          >
            <RecommendPage
              applicationDetails={applicationDetails}
              careerSiteTasks={careerSiteTasks}
              handleApplicationDetailChange={handleApplicationDetailChange}
              handleDeleteJob={handleDeleteJob}
              handleStatusChange={handleStatusChange}
              profile={profile}
              recommendImportState={recommendImportState}
              scoredJobs={scoredJobs}
              setActiveTab={setActiveTab}
              statusMap={statusMap}
              onSmartRecommend={handleSmartRecommend}
              onStartAssist={(url) => {
                setCareerUrl(url || '');
                setActiveTab('assist');
              }}
            />
          </CoreRoutePage>
        )}

        {activeTab === 'applications' && (
          <CoreRoutePage
            eyebrow="Applications"
            title="投递记录"
            description="搜索、筛选、更新和跟进每一次投递状态。"
          >
            <ApplicationsPage
              applicationStatuses={applicationStatuses}
              applicationDetails={applicationDetails}
              crmStats={crmStats}
              handleApplicationDetailChange={handleApplicationDetailChange}
              handleStatusChange={handleStatusChange}
              profile={profile}
              scoredJobs={scoredJobs}
              setActiveTab={setActiveTab}
              statusMap={statusMap}
            />
          </CoreRoutePage>
        )}

        {activeTab === 'assist' && (
          <CoreRoutePage
            eyebrow="Autofill"
            title="辅助投递"
            description="连接官网申请页和 Chrome Autofill 扩展，只做识别、预填和人工确认，不替你提交。"
          >
            <AutofillPage
              autofillConfirmed={autofillConfirmed}
              autofillPreview={autofillPreview}
              autofillRunResult={autofillRunResult}
              autofillRunState={autofillRunState}
              autofillScript={autofillScript}
              careerUrl={careerUrl}
              formMappings={formMappings}
              handleApplicationDetailChange={handleApplicationDetailChange}
              handleImportExtensionScan={handleImportExtensionScan}
              handleScanCareerForm={handleScanCareerForm}
              handleStatusChange={handleStatusChange}
              handleRunAutofill={handleRunAutofill}
              scanPayloadText={scanPayloadText}
              setAutofillConfirmed={setAutofillConfirmed}
              setCareerUrl={setCareerUrl}
              setScanPayloadText={setScanPayloadText}
              scoredJobs={scoredJobs}
              updateAutofillField={updateAutofillField}
            />
          </CoreRoutePage>
        )}

        {activeTab === 'profile' && (
          <CoreRoutePage
            eyebrow="Profile"
            title="我的资料"
            description="统一维护简历、经历、偏好、自动填写规则、字段记忆和隐私数据。"
          >
            <MyProfilePage
              applicationDetails={applicationDetails}
              applicationPacket={applicationPacket}
              applicationStatuses={applicationStatuses}
              clearApplications={handleClearApplications}
              clearFieldMemory={handleClearFieldMemory}
              clearProfileData={handleClearProfileData}
              formMappings={autofillMappings}
              handleDeleteResume={handleDeleteResume}
              handleResumeChange={handleResumeChange}
              handleSetDefaultResume={handleSetDefaultResume}
              mappingSaveState={mappingSaveState}
              onLogout={handleLogout}
              parsedResume={parsedResume}
              profile={profile}
              resumeVersions={resumeVersions}
              scoredJobs={scoredJobs}
              setCustomMappings={setCustomMappings}
              update={update}
              updateList={updateList}
            />
          </CoreRoutePage>
        )}
      </section>

      <nav className="bottom-tabs" aria-label="移动端主导航">
        {primaryRoutes.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {!onboardingCompleted && (
        <OnboardingWizard
          appProfile={profile}
          authUser={authUser}
          loginWithPassword={loginWithPassword}
          parsedResume={parsedResume}
          requestEmailCode={requestEmailCode}
          saveProfile={saveProfileToApi}
          uploadResume={uploadResume}
          verifyEmailCode={verifyEmailCode}
          onAuthChanged={(payload) => {
            setAuthUser(payload?.user || null);
            setApiState(connectedText);
            fetchBootstrap()
              .then((nextPayload) => {
                setProfile(nextPayload.profile || initialProfile);
                setJobs(nextPayload.jobs || []);
                setStatusMap(nextPayload.applications || {});
                setApplicationDetails(nextPayload.applicationDetails || {});
                setCustomMappings(nextPayload.formMappings?.length ? nextPayload.formMappings : null);
                setParsedResume(nextPayload.latestResume?.parsedProfile || null);
                setResumeVersions(nextPayload.resumes || (nextPayload.latestResume ? [nextPayload.latestResume] : []));
                setAuthUser(nextPayload.user || payload?.user || null);
              })
              .catch(() => {});
          }}
          onProfileSaved={({ formMappings: nextMappings, parsedResume: nextParsedResume, profile: nextProfile, resumeName }) => {
            if (nextParsedResume) setParsedResume(nextParsedResume);
            if (nextMappings?.length) setCustomMappings(nextMappings);
            if (nextProfile) setProfile(nextProfile);
            if (resumeName) setProfile((current) => ({ ...current, resumeName }));
          }}
          onComplete={() => setOnboardingCompleted(true)}
        />
      )}
    </main>
  );
}

function KikiJobHero({ authUser, onLogout, primaryRoutes, setActiveTab, onExplore }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="kiki-hero" aria-label="KikiJob 首页">
      <div className="kiki-hero-shell">
        <nav className="kiki-hero-nav" aria-label="首页导航">
          <button className="kiki-hero-logo" onClick={() => setActiveTab('recommend')} aria-label="返回 KikiJob 首页">
            KikiJob
          </button>
          <div className="kiki-hero-links">
            {primaryRoutes.map((route) => (
              <button key={route.id} onClick={() => setActiveTab(route.id)}>
                {route.label}
              </button>
            ))}
          </div>
          <button className="kiki-hero-chat" onClick={() => setActiveTab('assist')}>
            开始投递
          </button>
          {authUser && (
            <button className="kiki-hero-logout" onClick={onLogout}>
              退出
            </button>
          )}
        </nav>

        <div className="kiki-hero-content">
          <div className="kiki-hero-grid">
            <div className="kiki-hero-copy">
              <AnimatedHeading text={"KikiJob-Apply Smarter，\nFind your Future"} isVisible={isVisible} />
              <FadeIn delay={800}>
                <p>把岗位推荐、简历资料、官网填表和投递记录放进同一个求职工作流。</p>
              </FadeIn>
              <FadeIn delay={1200}>
                <div className="kiki-hero-actions">
                  <button className="kiki-hero-primary" onClick={() => setActiveTab('assist')}>
                    开始投递
                  </button>
                  <button className="kiki-hero-secondary" onClick={onExplore}>
                    查看推荐
                  </button>
                </div>
              </FadeIn>
            </div>
            <FadeIn delay={1000} className="kiki-hero-illo" aria-hidden="true">
              <div className="illo-card illo-card-main">
                <div className="illo-card-title">
                  <span>推荐匹配</span>
                  <strong>94%</strong>
                </div>
                <div className="illo-bars">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="illo-ticket">
                  <small>AI 产品经理</small>
                  <b>深圳 · 校招</b>
                </div>
              </div>
              <div className="illo-card illo-card-pink">
                <small>资料包</small>
                <strong>简历 · 项目 · 技能</strong>
              </div>
              <div className="illo-card illo-card-green">
                <small>官网填表</small>
                <strong>高置信字段已准备</strong>
              </div>
              <svg className="illo-cursor" viewBox="0 0 34 38" role="img" aria-label="">
                <path d="M4 3L29 20.2L18.4 22.1L13.9 34.5L4 3Z" fill="#F8FAF7" stroke="#2A0F14" strokeWidth="2.4" strokeLinejoin="round" />
              </svg>
            </FadeIn>
            <FadeIn delay={1400} className="kiki-hero-tag-wrap">
              <div className="kiki-hero-tag">Find. Match. Apply.</div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimatedHeading({ text, isVisible }) {
  const lines = text.split('\n');
  const charDelay = 30;

  return (
    <h2 className="kiki-animated-heading" aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, lineIndex) => (
        <span className="kiki-heading-line" key={`${line}-${lineIndex}`} aria-hidden="true">
          {Array.from(line).map((char, charIndex) => {
            const delay = 200 + lineIndex * line.length * charDelay + charIndex * charDelay;
            return (
              <span
                className={isVisible ? 'visible' : ''}
                key={`${lineIndex}-${charIndex}-${char}`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </span>
      ))}
    </h2>
  );
}

function FadeIn({ children, className = '', delay = 0, duration = 1000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`kiki-fade ${visible ? 'visible' : ''} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

function CoreRoutePage({ children, description, eyebrow, title }) {
  return (
    <div className="route-stack">
      <section className="route-intro">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </section>
      {children}
    </div>
  );
}

function RecommendPage({
  applicationDetails,
  careerSiteTasks,
  handleApplicationDetailChange,
  handleDeleteJob,
  handleStatusChange,
  profile,
  scoredJobs,
  setActiveTab,
  statusMap,
  onStartAssist,
  onSmartRecommend,
  recommendImportState,
}) {
  const safeApplicationDetails = applicationDetails && typeof applicationDetails === 'object' ? applicationDetails : {};
  const safeStatusMap = statusMap && typeof statusMap === 'object' ? statusMap : {};
  const safeScoredJobs = Array.isArray(scoredJobs) ? scoredJobs : [];
  const safeCareerSiteTasks = Array.isArray(careerSiteTasks) ? careerSiteTasks : [];
  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  const [filters, setFilters] = useState({
    keyword: '',
    location: '全部',
    recruitmentType: '全部',
    companyType: '全部',
    publishedAt: '全部',
    deadline: '全部',
    minScore: '0',
    sortBy: 'match',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [detailTab, setDetailTab] = useState('detail');
  const recommendedCompanies = useMemo(() => buildRecommendedCompanies(safeCareerSiteTasks), [safeCareerSiteTasks]);
  const jobViewModels = useMemo(() => safeScoredJobs.map(normalizeJobViewModel), [safeScoredJobs]);
  const filterOptions = useMemo(() => buildRecommendFilterOptions(jobViewModels), [jobViewModels]);
  const visibleJobs = useMemo(() => filterRecommendedJobs(jobViewModels, filters), [filters, jobViewModels]);
  const selectedIndex = visibleJobs.findIndex((job) => job.id === selectedJobId);
  const selectedJob = selectedIndex >= 0 ? visibleJobs[selectedIndex] : null;

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const openJobDetail = (job, tab = 'detail') => {
    setSelectedJobId(job.id);
    setDetailTab(tab);
  };
  const clearFilters = () =>
    setFilters({
      keyword: '',
      location: '全部',
      recruitmentType: '全部',
      companyType: '全部',
      publishedAt: '全部',
      deadline: '全部',
      minScore: '0',
      sortBy: 'match',
    });

  return (
    <div className="recommend-page">
      <section className="recommend-welcome">
        <div>
          <p className="eyebrow">For You</p>
          <h3>{safeProfile.roles || '设置目标岗位后获得更准确推荐'}</h3>
          <p>{formatList(safeProfile.cities) || '暂未设置目标地点'}</p>
        </div>
        <div className="recommend-welcome-actions">
          <button className="primary-action smart-action" onClick={onSmartRecommend}>
            智能推荐
            <ExternalLink size={17} />
          </button>
          <button className="secondary-action" onClick={() => setActiveTab('profile')}>
            编辑偏好
          </button>
        </div>
        {recommendImportState && <p className="recommend-import-state">{recommendImportState}</p>}
      </section>

      <section className="recommend-companies">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Companies</p>
            <h3>推荐公司</h3>
          </div>
        </div>
        {recommendedCompanies.length ? (
          <div className="company-snap-row" aria-label="推荐公司列表">
            {recommendedCompanies.map((company) => (
              <article className="recommend-company-card" key={company.company}>
                <div className="company-avatar">{company.company.slice(0, 1)}</div>
                <div>
                  <h4>{company.company}</h4>
                  <p>{company.companyType || '公司类型暂未公开'} · {company.location || '地点暂未公开'}</p>
                  <span>{company.industry || '行业暂未公开'}</span>
                  <small>{company.reason}</small>
                </div>
                <button className="secondary-action" onClick={() => window.open(company.url, '_blank', 'noreferrer')}>
                  关注
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyRecommendState title="还没有推荐公司" text="完善求职偏好后，这里会展示更合适的公司官网入口。" />
        )}
      </section>

      <section className="recommend-jobs">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Jobs</p>
            <h3>推荐岗位</h3>
          </div>
          <button className="secondary-action mobile-filter-trigger" onClick={() => setFiltersOpen(true)}>
            <Filter size={16} />
            筛选
          </button>
        </div>

        <RecommendFilters
          clearFilters={clearFilters}
          filters={filters}
          filterOptions={filterOptions}
          isSheetOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          updateFilter={updateFilter}
        />

        <div className="recommend-result-meta">
          <span>共 {visibleJobs.length} 个岗位</span>
          <span>缺失发布时间/截止时间会显示“暂未公开”</span>
        </div>

        {visibleJobs.length ? (
          <div className="recommend-job-grid">
            {visibleJobs.map((job) => (
              <RecommendJobCard
                applicationDetails={safeApplicationDetails}
                handleApplicationDetailChange={handleApplicationDetailChange}
                handleDeleteJob={handleDeleteJob}
                handleStatusChange={handleStatusChange}
                job={job}
                key={job.id}
                onOpenDetail={openJobDetail}
                statusMap={safeStatusMap}
              />
            ))}
          </div>
        ) : (
          <EmptyRecommendState title="没有符合筛选的岗位" text="试试清空筛选，或先导入真实 JD 后再查看推荐。" />
        )}
      </section>

      {selectedJob && (
        <JobDetailDrawer
          applicationDetails={safeApplicationDetails}
          detailTab={detailTab}
          handleApplicationDetailChange={handleApplicationDetailChange}
          handleDeleteJob={handleDeleteJob}
          handleStatusChange={handleStatusChange}
          job={selectedJob}
          onClose={() => setSelectedJobId(null)}
          onStartAssist={onStartAssist}
          onSwitchTab={setDetailTab}
          previousJob={selectedIndex > 0 ? visibleJobs[selectedIndex - 1] : null}
          nextJob={selectedIndex < visibleJobs.length - 1 ? visibleJobs[selectedIndex + 1] : null}
          selectJob={(job, tab = detailTab) => openJobDetail(job, tab)}
          statusMap={safeStatusMap}
        />
      )}
    </div>
  );
}

function RecommendFilters({ clearFilters, filters, filterOptions, isSheetOpen, setFiltersOpen, updateFilter }) {
  const content = (
    <div className="recommend-filter-bar">
      <label>
        <span>关键词</span>
        <input value={filters.keyword} onChange={(event) => updateFilter('keyword', event.target.value)} placeholder="岗位 / 公司 / JD" />
      </label>
      <label>
        <span>地点</span>
        <select value={filters.location} onChange={(event) => updateFilter('location', event.target.value)}>
          {filterOptions.locations.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>招聘类型</span>
        <select value={filters.recruitmentType} onChange={(event) => updateFilter('recruitmentType', event.target.value)}>
          {filterOptions.recruitmentTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>公司类型</span>
        <select value={filters.companyType} onChange={(event) => updateFilter('companyType', event.target.value)}>
          {filterOptions.companyTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>发布时间</span>
        <select value={filters.publishedAt} onChange={(event) => updateFilter('publishedAt', event.target.value)}>
          {['全部', '已公开', '暂未公开'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>截止时间</span>
        <select value={filters.deadline} onChange={(event) => updateFilter('deadline', event.target.value)}>
          {['全部', '未过期', '已过期', '暂未公开'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>匹配度</span>
        <select value={filters.minScore} onChange={(event) => updateFilter('minScore', event.target.value)}>
          {['0', '60', '75', '90'].map((item) => <option key={item} value={item}>{item === '0' ? '不限' : `${item}+`}</option>)}
        </select>
      </label>
      <label>
        <span>排序</span>
        <select value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value)}>
          <option value="match">匹配度优先</option>
          <option value="updated">最近更新</option>
          <option value="deadline">截止时间优先</option>
        </select>
      </label>
      <button className="secondary-action" onClick={clearFilters}>清空筛选</button>
    </div>
  );

  return (
    <>
      <div className="desktop-filters">{content}</div>
      {isSheetOpen && (
        <div className="filter-sheet-backdrop" onClick={() => setFiltersOpen(false)}>
          <section className="filter-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="section-head compact">
              <h3>筛选岗位</h3>
              <button className="secondary-action" onClick={() => setFiltersOpen(false)}>完成</button>
            </div>
            {content}
          </section>
        </div>
      )}
    </>
  );
}

function RecommendJobCard({
  applicationDetails,
  handleApplicationDetailChange,
  handleDeleteJob,
  handleStatusChange,
  job,
  onOpenDetail,
  statusMap,
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const safeApplicationDetails = applicationDetails && typeof applicationDetails === 'object' ? applicationDetails : {};
  const safeStatusMap = statusMap && typeof statusMap === 'object' ? statusMap : {};
  const detail = safeApplicationDetails[job.id] || { status: safeStatusMap[job.id] || '待确认', notes: '', followUpAt: '' };
  const saved = ['收藏/待投', '已加入队列', '已投递'].includes(detail.status);

  const toggleSaved = (event) => {
    event.stopPropagation();
    handleStatusChange(job.id, saved ? '待确认' : '收藏/待投');
  };
  const deleteFavorite = () => {
    if (job.isDemo) {
      handleStatusChange(job.id, '待确认');
      return;
    }
    handleDeleteJob(job);
  };

  return (
    <article
      className={`recommend-job-card ${job.isExpired ? 'expired' : ''}`}
      onClick={() => onOpenDetail(job, 'detail')}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetail(job, 'detail');
        }
      }}
    >
      <div className="recommend-job-top">
        <div className="job-logo">{job.company.slice(0, 1)}</div>
        <div>
          <p>{job.company}</p>
          <h4>{job.title}</h4>
        </div>
        <button className={saved ? 'saved-button active' : 'saved-button'} onClick={toggleSaved} title={saved ? '取消收藏' : '收藏岗位'}>
          <Bookmark size={17} />
        </button>
      </div>

      <div className="recommend-job-meta">
        <span><MapPin size={15} />{job.location}</span>
        <span><GraduationCap size={15} />{job.recruitmentType}</span>
        <span><CalendarDays size={15} />发布：{job.publishedAt || '暂未公开'}</span>
        <span className={job.isExpired ? 'danger-text' : ''}><Clock3 size={15} />截止：{job.deadline || '暂未公开'}</span>
      </div>

      <p className="recommend-jd">{job.jdSummary || '岗位 JD 暂未公开。导入完整 JD 后可获得更准确的匹配分析。'}</p>

      <div className="recommend-job-footer">
        <button className="match-button" onClick={(event) => {
          event.stopPropagation();
          onOpenDetail(job, 'match');
        }}>
          匹配度 {job.score ?? 0}
        </button>
        <span>{job.source} · 更新：{job.sourceUpdatedAt || '暂未公开'}</span>
      </div>

      {notesOpen && (
        <section className="recommend-match-panel">
          <InsightBlock empty="暂无强匹配理由。" items={job.reasons} title="匹配原因" />
          <InsightBlock empty="暂未发现明显能力缺口。" items={job.risks} title="能力缺口/风险" />
          <label>
            <span>备注</span>
            <textarea
              rows={3}
              value={detail.notes || ''}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => handleApplicationDetailChange(job.id, { notes: event.target.value })}
              placeholder="记录投递准备、内推人、申请进度"
            />
          </label>
        </section>
      )}

      <div className="recommend-card-actions">
        <button className="primary-action" disabled={!job.applyUrl} onClick={(event) => {
          event.stopPropagation();
          window.open(job.applyUrl, '_blank', 'noreferrer');
        }}>
          <ExternalLink size={16} />
          官方投递
        </button>
        <button className="secondary-action" onClick={(event) => {
          event.stopPropagation();
          setNotesOpen((open) => !open);
        }}>编辑备注</button>
        <button className="danger-action" onClick={(event) => {
          event.stopPropagation();
          deleteFavorite();
        }}>
          <Trash2 size={16} />
          删除收藏
        </button>
      </div>
    </article>
  );
}

function JobDetailDrawer({
  applicationDetails,
  detailTab,
  handleApplicationDetailChange,
  handleDeleteJob,
  handleStatusChange,
  job,
  nextJob,
  onClose,
  onStartAssist,
  onSwitchTab,
  previousJob,
  selectJob,
  statusMap,
}) {
  const [suggestionStates, setSuggestionStates] = useState({});
  const safeApplicationDetails = applicationDetails && typeof applicationDetails === 'object' ? applicationDetails : {};
  const safeStatusMap = statusMap && typeof statusMap === 'object' ? statusMap : {};
  const detail = safeApplicationDetails[job.id] || { status: safeStatusMap[job.id] || '待确认', notes: '', followUpAt: '' };
  const saved = ['收藏/待投', '已加入队列', '已投递'].includes(detail.status);
  const jdSections = splitJdSections(job.jdText);
  const analysis = buildJobAnalysis(job);
  const canCalculate = Boolean(job.jdText && (analysis.matchItems.length || analysis.gaps.length || analysis.risks.length));

  const toggleSaved = () => handleStatusChange(job.id, saved ? '待确认' : '收藏/待投');
  const deleteFavorite = () => {
    if (!window.confirm(`确定删除或取消收藏「${job.title}」吗？`)) return;
    if (job.isDemo) {
      handleStatusChange(job.id, '待确认');
      return;
    }
    handleDeleteJob(job);
    onClose();
  };
  const updateSuggestionState = (index, status) => {
    setSuggestionStates((current) => ({ ...current, [index]: current[index] === status ? '' : status }));
  };
  const copySuggestion = async (text) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      window.prompt('复制这条建议', text);
    }
  };

  return (
    <div className="job-detail-backdrop" onClick={onClose}>
      <aside className="job-detail-drawer" onClick={(event) => event.stopPropagation()} aria-label={`${job.title} 岗位详情`}>
        <header className="job-detail-header">
          <div>
            <p className="eyebrow">{job.source} · {job.sourceUpdatedAt || '更新时间暂未公开'}</p>
            <h2>{job.title}</h2>
            <p>{job.company} · {job.location} · {job.recruitmentType}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭岗位详情">
            <X size={20} />
          </button>
        </header>

        <nav className="detail-tabs" aria-label="岗位详情 Tabs">
          <button className={detailTab === 'detail' ? 'active' : ''} onClick={() => onSwitchTab('detail')}>岗位详情</button>
          <button className={detailTab === 'match' ? 'active' : ''} onClick={() => onSwitchTab('match')}>查看匹配</button>
        </nav>

        <section className="job-detail-body">
          {detailTab === 'detail' ? (
            <div className="detail-section-stack">
              <section className="detail-card">
                <h3>基本信息</h3>
                <div className="detail-meta-grid">
                  <InfoItem label="公司" value={job.company} />
                  <InfoItem label="地点" value={job.location} />
                  <InfoItem label="招聘类型" value={job.recruitmentType} />
                  <InfoItem label="发布时间" value={job.publishedAt || '暂未公开'} />
                  <InfoItem label="截止时间" value={job.deadline || '暂未公开'} danger={job.isExpired} />
                  <InfoItem label="来源" value={job.source || '暂未公开'} />
                  <InfoItem label="最后更新" value={job.sourceUpdatedAt || '暂未公开'} />
                </div>
                {job.applyUrl ? (
                  <a className="apply-link" href={job.applyUrl} target="_blank" rel="noreferrer">打开官方投递链接</a>
                ) : (
                  <p className="muted-text">官方投递链接暂未导入。</p>
                )}
              </section>

              <section className="detail-card">
                <h3>备注和跟进</h3>
                <div className="detail-meta-grid">
                  <label>
                    <span>当前状态</span>
                    <select value={detail.status || '待确认'} onChange={(event) => handleStatusChange(job.id, event.target.value)}>
                      {applicationStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>下次行动日期</span>
                    <input
                      type="date"
                      value={detail.followUpAt || ''}
                      onChange={(event) => handleApplicationDetailChange(job.id, { followUpAt: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  <span>备注</span>
                  <textarea
                    rows={4}
                    value={detail.notes || ''}
                    onChange={(event) => handleApplicationDetailChange(job.id, { notes: event.target.value })}
                    placeholder="记录内推人、材料准备、申请状态或下一步行动"
                  />
                </label>
              </section>

              <section className="detail-card">
                <h3>完整 JD</h3>
                {job.jdText ? (
                  <div className="jd-section-list">
                    {jdSections.map((section) => (
                      <article key={section.title}>
                        <h4>{section.title}</h4>
                        <p>{section.content}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyInline text="暂无完整 JD。导入 JD 后可以计算更可信的匹配原因和简历建议。" />
                )}
              </section>
            </div>
          ) : (
            <div className="detail-section-stack">
              <section className="detail-card match-summary-card">
                <div>
                  <p className="eyebrow">Match Score</p>
                  <h3>{job.score ?? 0}</h3>
                  <span>计算时间：{formatDateTime(new Date())}</span>
                </div>
                {!canCalculate && <p className="warning-text">不可完整计算：缺少完整 JD 或简历证据，只展示现有推荐规则结果。</p>}
              </section>

              <section className="detail-card">
                <h3>匹配证据</h3>
                <EvidenceList empty="暂无可关联的技能/经历证据，建议先补充完整 JD 或解析简历。" items={analysis.matchItems} />
              </section>

              <section className="detail-card">
                <h3>不匹配项与资格风险</h3>
                <EvidenceList empty="暂未发现明显缺口；仍建议人工核对地点、届别和工作许可。" items={[...analysis.gaps, ...analysis.risks]} />
              </section>

              <section className="detail-card">
                <h3>简历修改建议</h3>
                {analysis.suggestions.length ? (
                  <div className="suggestion-list">
                    {analysis.suggestions.map((suggestion, index) => (
                      <article key={suggestion}>
                        <p>{suggestion}</p>
                        <div>
                          <button className="secondary-action" onClick={() => copySuggestion(suggestion)}>
                            <Copy size={15} />
                            复制建议
                          </button>
                          <button className={suggestionStates[index] === 'done' ? 'secondary-action active' : 'secondary-action'} onClick={() => updateSuggestionState(index, 'done')}>
                            已处理
                          </button>
                          <button className={suggestionStates[index] === 'skip' ? 'secondary-action active' : 'secondary-action'} onClick={() => updateSuggestionState(index, 'skip')}>
                            不适用
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyInline text="缺少可用 JD 或匹配证据，暂不能给出可靠简历建议。" />
                )}
              </section>
            </div>
          )}
        </section>

        <footer className="job-detail-footer">
          <button className="secondary-action" disabled={!previousJob} onClick={() => previousJob && selectJob(previousJob)}>上一个岗位</button>
          <button className="secondary-action" disabled={!nextJob} onClick={() => nextJob && selectJob(nextJob)}>下一个岗位</button>
          <button className={saved ? 'secondary-action active' : 'secondary-action'} onClick={toggleSaved}>{saved ? '取消收藏' : '收藏'}</button>
          <button className="secondary-action" onClick={() => onSwitchTab(detailTab === 'match' ? 'detail' : 'match')}>{detailTab === 'match' ? '返回详情' : '查看匹配'}</button>
          <button className="primary-action" disabled={!job.applyUrl} onClick={() => onStartAssist?.(job.applyUrl)}>开始辅助投递</button>
          <button className="danger-action" onClick={deleteFavorite}>删除收藏</button>
        </footer>
      </aside>
    </div>
  );
}

function InfoItem({ danger = false, label, value }) {
  return (
    <article className={danger ? 'info-item danger-text' : 'info-item'}>
      <span>{label}</span>
      <strong>{value || '暂未公开'}</strong>
    </article>
  );
}

function EvidenceList({ empty, items }) {
  if (!items.length) return <EmptyInline text={empty} />;
  return (
    <div className="evidence-list">
      {items.map((item) => (
        <article key={`${item.type}-${item.text}`}>
          <span>{item.type}</span>
          <p>{item.text}</p>
          {item.evidence && <small>证据：{item.evidence}</small>}
        </article>
      ))}
    </div>
  );
}

function EmptyInline({ text }) {
  return <p className="muted-text">{text}</p>;
}

function EmptyRecommendState({ text, title }) {
  return (
    <section className="empty-state compact-empty">
      <Search size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function canonicalApplicationStatus(status) {
  const value = String(status || '').trim();
  const aliases = {
    待确认: '收藏/待投',
    已加入队列: '收藏/待投',
    不合适: '未通过',
    面试: '一面',
    拒绝: '未通过',
    失败: '未通过',
    unknown: '结果未知',
    success: '已投递',
  };
  if (applicationStatuses.includes(value)) return value;
  return aliases[value] || '收藏/待投';
}

function buildApplicationRecords(scoredJobs = [], applicationDetails = {}, statusMap = {}) {
  const records = scoredJobs.map((job) => {
    const normalizedJob = normalizeJobViewModel(job);
    const detail = normalizeApplicationDetail(normalizedJob, applicationDetails[job.id], statusMap[job.id]);
    return {
      ...normalizedJob,
      detail,
      status: detail.status,
      notes: detail.notes,
      followUpAt: detail.followUpAt,
      nextAction: detail.nextAction,
      nextActionAt: detail.nextActionAt,
      appliedAt: detail.appliedAt,
      submittedAt: detail.submittedAt || detail.appliedAt,
      updatedAt: detail.updatedAt || normalizedJob.sourceUpdatedAt || normalizedJob.fetchedAt || '',
    };
  });

  const duplicateJobKeys = countBy(records, (record) => duplicateJobKey(record));
  const submittedKeys = countBy(
    records.filter((record) => record.status === '已投递'),
    (record) => `${normalizeText(record.company)}::${normalizeText(record.title)}`
  );

  return records.map((record) => ({
    ...record,
    hasDuplicateJob: duplicateJobKeys.get(duplicateJobKey(record)) > 1,
    hasDuplicateSubmission: submittedKeys.get(`${normalizeText(record.company)}::${normalizeText(record.title)}`) > 1,
  }));
}

function normalizeApplicationDetail(job, detail = {}, statusFromMap = '') {
  const safeDetail = detail && typeof detail === 'object' ? detail : {};
  const status = canonicalApplicationStatus(safeDetail.status || statusFromMap);
  const followUpAt = safeDetail.followUpAt || safeDetail.nextActionAt || '';
  return {
    ...safeDetail,
    status,
    notes: safeDetail.notes || '',
    followUpAt,
    nextAction: safeDetail.nextAction || inferNextAction(status, followUpAt),
    nextActionAt: safeDetail.nextActionAt || followUpAt,
    appliedAt: safeDetail.appliedAt || safeDetail.submittedAt || '',
    submittedAt: safeDetail.submittedAt || safeDetail.appliedAt || '',
    updatedAt: safeDetail.updatedAt || job.sourceUpdatedAt || job.fetchedAt || '',
    updatedSource: safeDetail.updatedSource || '',
    submissionResult: safeDetail.submissionResult || '',
    autofillSessionId: safeDetail.autofillSessionId || '',
  };
}

function buildApplicationFilterOptions(records, statuses) {
  return {
    statuses: ['全部状态', ...statuses],
    locations: ['全部地点', ...unique(records.map((record) => record.location).filter(Boolean))],
    companyTypes: ['全部类型', ...unique(records.map((record) => record.companyType).filter(Boolean))],
  };
}

function filterApplicationRecords(records, filters) {
  const keyword = normalizeText(filters.keyword);
  const filtered = records.filter((record) => {
    const text = normalizeText(`${record.company} ${record.title}`);
    if (keyword && !text.includes(keyword)) return false;
    if (filters.status !== '全部状态' && record.status !== filters.status) return false;
    if (filters.location !== '全部地点' && record.location !== filters.location) return false;
    if (filters.companyType !== '全部类型' && record.companyType !== filters.companyType) return false;
    if (filters.date === '7天内更新' && !isWithinDays(record.updatedAt, 7)) return false;
    if (filters.date === '30天内更新' && !isWithinDays(record.updatedAt, 30)) return false;
    if (filters.date === '有截止时间' && !record.deadline) return false;
    if (filters.date === '无截止时间' && record.deadline) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sortBy === 'deadline') return compareDeadline(a, b);
    if (filters.sortBy === 'nextAction') return compareOptionalDate(a.nextActionAt, b.nextActionAt);
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function duplicateJobKey(record) {
  const link = normalizeText(record.applyUrl || record.sourceUrl);
  if (link) return `url::${link}`;
  return `job::${normalizeText(record.company)}::${normalizeText(record.title)}::${normalizeText(record.location)}`;
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function inferNextAction(status, followUpAt) {
  if (status === '收藏/待投') return '确认是否投递';
  if (status === '准备材料') return '完善材料';
  if (status === '填表中') return '检查官网表单';
  if (status === '结果未知') return '人工确认投递结果';
  if (followUpAt) return '按期跟进';
  return '';
}

function compareDeadline(a, b) {
  return deadlineRank(a).localeCompare(deadlineRank(b));
}

function compareOptionalDate(a, b) {
  const first = a || '9999-99-99';
  const second = b || '9999-99-99';
  return String(first).localeCompare(String(second));
}

function isWithinDays(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  return now - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatDateOnly(value = '') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function appendRecordNote(notes = '', line = '') {
  const nextLine = String(line || '').trim();
  if (!nextLine) return notes || '';
  const stamp = formatDateTime(new Date());
  return [notes, `[${stamp}] ${nextLine}`].filter(Boolean).join('\n');
}

function statusClassName(status) {
  const groups = {
    '收藏/待投': 'saved',
    准备材料: 'preparing',
    填表中: 'filling',
    已投递: 'submitted',
    笔试: 'process',
    一面: 'process',
    二面: 'process',
    终面: 'process',
    Offer: 'offer',
    未通过: 'failed',
    已撤回: 'withdrawn',
    结果未知: 'unknown',
  };
  return groups[status] || 'saved';
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildProfileDataStats(records = []) {
  const safeRecords = ensureArray(records);
  const interviewStatuses = new Set(['笔试', '一面', '二面', '终面']);
  const latest = safeRecords
    .map((record) => record.updatedAt || record.appliedAt || record.sourceUpdatedAt || '')
    .filter(Boolean)
    .sort()
    .at(-1);
  return {
    total: safeRecords.length,
    interviews: safeRecords.filter((record) => interviewStatuses.has(record.status)).length,
    offers: safeRecords.filter((record) => record.status === 'Offer').length,
    latestActivity: formatDateOnly(latest),
  };
}

function normalizeJobViewModel(job) {
  const jdText = job.jdText || job.description || '';
  const applyUrl = job.applyUrl || job.sourceUrl || '';
  const sourceUpdatedAt = job.sourceUpdatedAt || job.fetchedAt || '';
  const deadline = job.deadline || '';
  return {
    ...job,
    location: job.locations?.join('、') || job.city || job.location || '暂未公开',
    recruitmentType: job.recruitmentType || job.goal || '暂未公开',
    publishedAt: job.publishedAt || '',
    deadline,
    sourceUpdatedAt,
    jdText,
    applyUrl,
    jdSummary: summarizeJd(jdText),
    isExpired: Boolean(deadline && isPastDate(deadline)),
  };
}

function buildRecommendFilterOptions(jobs) {
  return {
    locations: ['全部', ...unique(jobs.map((job) => job.location).filter(Boolean))],
    recruitmentTypes: ['全部', ...unique(jobs.map((job) => job.recruitmentType).filter(Boolean))],
    companyTypes: ['全部', ...unique(jobs.map((job) => job.companyType).filter(Boolean))],
  };
}

function filterRecommendedJobs(jobs, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return jobs
    .filter((job) => {
      const text = `${job.title} ${job.company} ${job.jdText} ${(job.tags || []).join(' ')}`.toLowerCase();
      if (keyword && !text.includes(keyword)) return false;
      if (filters.location !== '全部' && job.location !== filters.location) return false;
      if (filters.recruitmentType !== '全部' && job.recruitmentType !== filters.recruitmentType) return false;
      if (filters.companyType !== '全部' && job.companyType !== filters.companyType) return false;
      if (filters.publishedAt === '已公开' && !job.publishedAt) return false;
      if (filters.publishedAt === '暂未公开' && job.publishedAt) return false;
      if (filters.deadline === '未过期' && (!job.deadline || job.isExpired)) return false;
      if (filters.deadline === '已过期' && !job.isExpired) return false;
      if (filters.deadline === '暂未公开' && job.deadline) return false;
      if (Number(job.score || 0) < Number(filters.minScore || 0)) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'updated') return String(b.sourceUpdatedAt).localeCompare(String(a.sourceUpdatedAt));
      if (filters.sortBy === 'deadline') return deadlineRank(a).localeCompare(deadlineRank(b));
      return Number(b.score || 0) - Number(a.score || 0);
    });
}

function buildRecommendedCompanies(tasks = []) {
  const seen = new Map();
  for (const task of tasks) {
    if (!task.company || seen.has(task.company)) continue;
    seen.set(task.company, {
      company: task.company,
      companyType: task.companyType,
      industry: task.keyword,
      location: task.city || '',
      url: task.url || task.searchUrl,
      reason: task.note || `与你的${task.companyType || '求职'}偏好匹配`,
    });
  }
  return [...seen.values()].slice(0, 12);
}

function summarizeJd(text = '') {
  const compact = String(text).replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 150 ? `${compact.slice(0, 150)}...` : compact;
}

function isPastDate(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function deadlineRank(job) {
  if (!job.deadline) return '9999-99-99';
  return job.deadline;
}

function unique(values) {
  return [...new Set(values)];
}

function formatList(value) {
  return Array.isArray(value) ? value.join('、') : String(value || '');
}

function splitJdSections(jdText = '') {
  const text = String(jdText || '').trim();
  if (!text) return [];
  const normalized = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n');
  const markers = [
    ['职位职责', /(?:职位职责|工作职责|岗位职责|职责描述|Responsibilities?)[:：]?/i],
    ['任职要求', /(?:任职要求|岗位要求|职位要求|Requirements?|Qualifications?)[:：]?/i],
  ];
  const found = markers
    .map(([title, pattern]) => {
      const match = normalized.match(pattern);
      return match ? { title, index: match.index, markerLength: match[0].length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  if (!found.length) return [{ title: 'JD 原文', content: normalized }];

  const sections = [];
  if (found[0].index > 0) {
    sections.push({ title: '岗位摘要', content: normalized.slice(0, found[0].index).trim() });
  }
  found.forEach((item, index) => {
    const next = found[index + 1];
    const content = normalized.slice(item.index + item.markerLength, next?.index ?? normalized.length).trim();
    sections.push({ title: item.title, content: content || '该分段暂无正文。' });
  });
  return sections.filter((section) => section.content);
}

function buildJobAnalysis(job) {
  const jdText = String(job.jdText || job.description || '');
  const matchItems = [
    ...(job.reasons || []).map((reason) => ({
      type: '匹配项',
      text: reason,
      evidence: evidenceFromReason(reason, job),
    })),
    ...(job.skillHits || []).map((skill) => ({
      type: '技能证据',
      text: `JD 与简历技能同时出现：${skill}`,
      evidence: excerptAround(jdText, skill),
    })),
  ];
  const gaps = (job.risks || [])
    .filter((risk) => !/城市|届|工作许可|签证|社招|经验/.test(risk))
    .map((risk) => ({ type: '能力缺口', text: risk, evidence: excerptAround(jdText, firstUsefulTerm(risk)) }));
  const risks = (job.risks || [])
    .filter((risk) => /城市|届|工作许可|签证|社招|经验/.test(risk))
    .map((risk) => ({ type: '资格风险', text: risk, evidence: excerptAround(jdText, firstUsefulTerm(risk)) }));
  const suggestions = buildResumeSuggestions(job, matchItems, gaps, risks);
  return {
    matchItems: dedupeEvidence(matchItems),
    gaps: dedupeEvidence(gaps),
    risks: dedupeEvidence(risks),
    suggestions,
  };
}

function buildResumeSuggestions(job, matchItems, gaps, risks) {
  if (!job.jdText && !matchItems.length && !gaps.length && !risks.length) return [];
  const suggestions = [];
  const skills = (job.skillHits || job.tags || []).slice(0, 3);
  if (skills.length) {
    suggestions.push(`在简历技能或项目描述中补强与「${skills.join('、')}」相关的证据，例如写清使用工具、任务场景和可验证结果。`);
  }
  if (matchItems.length) {
    suggestions.push(`保留并前置已匹配内容：${matchItems.slice(0, 2).map((item) => item.text).join('；')}。`);
  }
  if (gaps.length) {
    suggestions.push(`针对能力缺口补充一条经历证据：${gaps[0].text}。示例方向：说明你在课程、项目或实习中如何接近该要求。`);
  }
  if (risks.length) {
    suggestions.push(`投递前人工确认资格风险：${risks.map((item) => item.text).join('；')}。不要在简历里虚构地点、届别或工作许可信息。`);
  }
  if (!suggestions.length && job.jdText) {
    suggestions.push('JD 已导入但简历证据命中较少，建议补充与岗位职责直接对应的项目成果、数据指标和协作角色。');
  }
  return suggestions.slice(0, 5);
}

function evidenceFromReason(reason, job) {
  const text = String(reason || '');
  const afterColon = text.includes('：') ? text.split('：').pop() : text;
  const term = firstUsefulTerm(afterColon);
  return excerptAround(job.jdText || job.description || '', term) || afterColon;
}

function firstUsefulTerm(text = '') {
  return String(text)
    .split(/[、,;；:\s]/)
    .map((item) => item.trim())
    .find((item) => item.length >= 2) || '';
}

function excerptAround(text = '', term = '') {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  const keyword = String(term || '').trim();
  if (!source || !keyword) return '';
  const index = source.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) return '';
  const start = Math.max(0, index - 36);
  const end = Math.min(source.length, index + keyword.length + 44);
  return `${start > 0 ? '...' : ''}${source.slice(start, end)}${end < source.length ? '...' : ''}`;
}

function dedupeEvidence(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}-${item.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDateTime(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '暂未计算';
  const pad = (part) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

const ASSIST_SESSION_KEY = 'jobpilot.assistSession.v1';

function readAssistSession() {
  try {
    const raw = window.localStorage?.getItem(ASSIST_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAssistSession(session) {
  try {
    window.localStorage?.setItem(ASSIST_SESSION_KEY, JSON.stringify(session || {}));
  } catch {
    // Assist sessions are recoverability state only; storage can be unavailable.
  }
}

function createAutofillSession(targetUrl, selectedJob) {
  return {
    id: `AF-${Date.now().toString(36).toUpperCase()}`,
    targetUrl,
    jobId: selectedJob?.id || null,
    company: selectedJob?.company || '',
    title: selectedJob?.title || '',
    status: 'DETECTED',
    createdAt: new Date().toISOString(),
  };
}

function assistStateForStep(step, preview, confirmed, result) {
  if (step >= 7) {
    if (result === 'success') return 'SUBMITTED';
    if (result === 'failed') return 'FAILED';
    return 'UNKNOWN';
  }
  if (step >= 6) return 'WAITING_FOR_USER_SUBMIT';
  if (step >= 5) return confirmed ? 'FILLED' : 'REVIEW_REQUIRED';
  if (step >= 4) return preview ? 'MAPPED' : 'SCANNED';
  if (step >= 3) return 'DETECTED';
  return 'DETECTED';
}

function validateAssistStep(step, { targetUrl, session, autofillPreview, autofillConfirmed, submissionResult }) {
  if (step === 0 && !targetUrl) return '请先选择岗位或粘贴官方投递链接。';
  if (step === 1 && !targetUrl) return '缺少官网链接，无法打开招聘官网。';
  if (step === 2 && !targetUrl) return '请粘贴登录后的正式申请表 URL。';
  if (step === 3 && !session && !targetUrl) return '请先创建 Autofill Session。';
  if (step === 4 && !autofillPreview) return '请先导入扩展扫描结果，或使用 URL 兜底识别。';
  if (step === 5 && !autofillConfirmed) return '请先确认字段映射并生成扩展填充包。';
  if (step === 6 && !submissionResult) return '请记录官网最终提交结果。';
  return '';
}

function summarizeAutofillPreview(preview) {
  const fields = Array.isArray(preview?.fields) ? preview.fields : [];
  const matched = fields.filter((field) => field.confidence === '高' || field.confidence === '人工确认').length;
  const reviewRequired = fields.filter((field) => field.requiresUserCheck || field.confidence === '中').length;
  const unsupported = fields.filter((field) => field.confidence === '未匹配' || field.type === 'file').length;
  return {
    total: preview?.totalCount || fields.length,
    matched,
    reviewRequired,
    unsupported,
  };
}

function buildExtensionPackage(url, script) {
  const steps = (Array.isArray(script) ? script : []).map((item) => ({
    step: item.step,
    id: item.id,
    field: item.field,
    sourceLabel: item.sourceLabel,
    group: item.group,
    aliases: item.aliases,
    type: item.type,
    value: item.value,
    action: item.action,
    requiresUserCheck: item.requiresUserCheck,
  }));
  return {
    url,
    stateMachine: 'REVIEW_REQUIRED',
    safety: {
      noSubmit: true,
      noPassword: true,
      noCaptchaBypass: true,
      userFinalSubmit: true,
    },
    steps,
  };
}

function compactUrl(url = '') {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.slice(0, 72);
  } catch {
    return String(url).slice(0, 72);
  }
}

function isDesktopLike() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(min-width: 761px)').matches ?? true;
}

function maskSensitiveValue(value = '') {
  const text = String(value || '');
  if (text.includes('@')) return text.replace(/^(.{2}).+(@.+)$/, '$1***$2');
  return text.replace(/(1[3-9]\d)\d{4}(\d{4})/, '$1****$2');
}

function appendSessionNote(job, result, session) {
  const statusLabel = result === 'success' ? '成功提交' : result === 'failed' ? '提交失败/暂不提交' : '结果未知';
  return `[${formatDateTime(new Date())}] 辅助投递 ${statusLabel}${session?.id ? `（${session.id}）` : ''}：${job.company} - ${job.title}`;
}

function MyProfilePage({
  applicationDetails,
  applicationPacket,
  applicationStatuses,
  clearApplications,
  clearFieldMemory,
  clearProfileData,
  fieldMemories,
  formMappings,
  handleDeleteResume,
  handleResumeChange,
  handleSetDefaultResume,
  mappingSaveState,
  onLogout,
  parsedResume,
  profile,
  resumeVersions,
  scoredJobs,
  setCustomMappings,
  update,
  updateList,
}) {
  const [activeSection, setActiveSection] = useState('basic');
  const normalizedProfile = useMemo(() => normalizeProfileData(profile, parsedResume, { resumeFileName: profile.resumeName }), [
    parsedResume,
    profile,
  ]);
  const records = useMemo(() => buildApplicationRecords(scoredJobs, applicationDetails, {}), [applicationDetails, scoredJobs]);
  const stats = useMemo(() => buildProfileDataStats(records), [records]);
  const sections = [
    ['basic', '基本资料'],
    ['experiences', '教育/工作/项目经历'],
    ['resumes', '简历版本'],
    ['preferences', '求职偏好'],
    ['autofill', '自动填写规则'],
    ['memory', '网站字段记忆'],
    ['privacy', '隐私与数据'],
  ];
  const visibleSections = isDesktopLike() ? sections.filter(([id]) => id === activeSection) : sections;

  const confirmAction = (message, action) => {
    if (window.confirm(message)) action();
  };
  const updateArrayItem = (key, index, patch) => {
    const current = ensureArray(profile[key]);
    update(
      key,
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  };
  const addArrayItem = (key, template) => update(key, [...ensureArray(profile[key]), template]);
  const deleteArrayItem = (key, index, label) =>
    confirmAction(`确认删除这条${label}吗？删除后会立即同步到个人资料。`, () =>
      update(
        key,
        ensureArray(profile[key]).filter((_, itemIndex) => itemIndex !== index)
      )
    );
  const removeMemory = (mappingId) =>
    confirmAction('确认删除这条网站字段记忆吗？只会删除这条学习记录，不影响标准词库。', () => {
      setCustomMappings((current) => ensureArray(current).filter((mapping) => mapping.id !== mappingId));
    });
  const updateMemory = (mappingId, patch) => {
    setCustomMappings((current) => ensureArray(current).map((mapping) => (mapping.id === mappingId ? { ...mapping, ...patch } : mapping)));
  };

  return (
    <section className="profile-center">
      <aside className="profile-section-nav" aria-label="我的资料分区">
        {sections.map(([id, label]) => (
          <button key={id} className={activeSection === id ? 'active' : ''} onClick={() => setActiveSection(id)}>
            {label}
          </button>
        ))}
        <button className="profile-logout-action" onClick={onLogout}>
          退出登录
        </button>
      </aside>

      <div className="profile-section-stack">
        <section className="profile-data-summary">
          <Metric icon={<ClipboardList />} label="总投递数" value={stats.total} />
          <Metric icon={<BadgeCheck />} label="面试中" value={stats.interviews} />
          <Metric icon={<CheckCircle2 />} label="Offer" value={stats.offers} />
          <Metric icon={<Clock3 />} label="最近活动" value={stats.latestActivity || '暂无'} />
        </section>

        {visibleSections.map(([id, label]) => (
          <details className="profile-section-card" key={id} open={isDesktopLike() || activeSection === id}>
            <summary>
              <span>{label}</span>
              <button type="button" onClick={(event) => {
                event.preventDefault();
                setActiveSection(id);
              }}>
                编辑
              </button>
            </summary>
            {id === 'basic' && (
              <BasicProfileSection
                normalizedProfile={normalizedProfile}
                profile={profile}
                update={update}
                updateList={updateList}
              />
            )}
            {id === 'experiences' && (
              <ExperienceProfileSection
                addArrayItem={addArrayItem}
                deleteArrayItem={deleteArrayItem}
                normalizedProfile={normalizedProfile}
                profile={profile}
                updateArrayItem={updateArrayItem}
              />
            )}
            {id === 'resumes' && (
              <ResumeVersionsSection
                handleDeleteResume={(resume) =>
                  confirmAction(`确认删除简历版本「${resume.fileName}」吗？这不会清空已确认的基本资料。`, () => handleDeleteResume(resume.id))
                }
                handleResumeChange={handleResumeChange}
                handleSetDefaultResume={handleSetDefaultResume}
                parsedResume={parsedResume}
                profile={profile}
                resumeVersions={resumeVersions}
              />
            )}
            {id === 'preferences' && <PreferenceProfileSection profile={profile} update={update} updateList={updateList} />}
            {id === 'autofill' && (
              <AutofillRulesSection
                applicationPacket={applicationPacket}
                formMappings={formMappings}
                mappingSaveState={mappingSaveState}
                profile={profile}
                update={update}
              />
            )}
            {id === 'memory' && (
              <FieldMemorySection
                fieldMemories={fieldMemories}
                formMappings={formMappings}
                removeMemory={removeMemory}
                updateMemory={updateMemory}
              />
            )}
            {id === 'privacy' && (
              <PrivacyDataSection
                applicationStatuses={applicationStatuses}
                clearApplications={() =>
                  confirmAction('确认清空全部投递历史吗？岗位数据和个人资料不会被删除。', clearApplications)
                }
                clearFieldMemory={() =>
                  confirmAction('确认清空字段记忆吗？学习到的网站字段映射会被删除，标准资料包可重新生成。', clearFieldMemory)
                }
                clearProfileData={() =>
                  confirmAction('确认删除全部个人资料吗？这会清空简历版本、字段记忆和投递历史，但不会删除示例岗位。', clearProfileData)
                }
                logout={() => confirmAction('确认退出当前账号并返回登录引导吗？本地登录状态会清除，账号数据不会删除。', onLogout)}
                records={records}
              />
            )}
          </details>
        ))}
      </div>
    </section>
  );
}

function BasicProfileSection({ normalizedProfile, profile, update, updateList }) {
  const personal = normalizedProfile.personal || {};
  return (
    <div className="profile-edit-grid">
      <label>
        <span>姓名</span>
        <input value={profile.name || personal.name || ''} onChange={(event) => update('name', event.target.value)} />
      </label>
      <label>
        <span>邮箱</span>
        <input value={profile.email || personal.email || ''} onChange={(event) => update('email', event.target.value)} />
      </label>
      <label>
        <span>电话</span>
        <input value={profile.phone || personal.phone || ''} onChange={(event) => update('phone', event.target.value)} />
      </label>
      <label>
        <span>身份</span>
        <select value={profile.identity || '应届毕业生'} onChange={(event) => update('identity', event.target.value)}>
          <option>应届毕业生</option>
          <option>在读学生</option>
          <option>职场人士</option>
          <option>转行求职者</option>
        </select>
      </label>
      <label>
        <span>城市/国家偏好</span>
        <input value={ensureArray(profile.cities).join('、')} onChange={(event) => updateList('cities', event.target.value)} />
      </label>
      <label>
        <span>求职意向</span>
        <textarea rows={3} value={profile.roles || personal.jobIntention || ''} onChange={(event) => update('roles', event.target.value)} />
      </label>
    </div>
  );
}

function ExperienceProfileSection({ addArrayItem, deleteArrayItem, normalizedProfile, profile, updateArrayItem }) {
  const education = ensureArray(profile.education).length ? ensureArray(profile.education) : normalizedProfile.education;
  const experiences = ensureArray(profile.experiences).length ? ensureArray(profile.experiences) : normalizedProfile.internships;
  const projects = ensureArray(profile.projects).length ? ensureArray(profile.projects) : normalizedProfile.projects;

  return (
    <div className="experience-editor-stack">
      <RepeatableProfileGroup
        addLabel="新增教育经历"
        fields={[
          ['school', '学校'],
          ['degree', '学历'],
          ['major', '专业'],
          ['startDate', '开始时间'],
          ['endDate', '结束时间'],
          ['gpa', 'GPA'],
        ]}
        items={education}
        onAdd={() => addArrayItem('education', { school: '', degree: '', major: '', startDate: '', endDate: '', gpa: '' })}
        onDelete={(index) => deleteArrayItem('education', index, '教育经历')}
        onUpdate={(index, patch) => updateArrayItem('education', index, patch)}
        title="教育经历"
      />
      <RepeatableProfileGroup
        addLabel="新增工作/实习经历"
        fields={[
          ['company', '公司'],
          ['department', '部门'],
          ['role', '岗位'],
          ['startDate', '开始时间'],
          ['endDate', '结束时间'],
          ['description', '职责内容'],
        ]}
        items={experiences}
        multiline={['description']}
        onAdd={() => addArrayItem('experiences', { company: '', department: '', role: '', startDate: '', endDate: '', description: '' })}
        onDelete={(index) => deleteArrayItem('experiences', index, '工作/实习经历')}
        onUpdate={(index, patch) => updateArrayItem('experiences', index, patch)}
        title="工作/实习经历"
      />
      <RepeatableProfileGroup
        addLabel="新增项目经历"
        fields={[
          ['name', '项目名称'],
          ['role', '角色'],
          ['startDate', '开始时间'],
          ['endDate', '结束时间'],
          ['description', '项目描述'],
          ['responsibility', '项目职责'],
        ]}
        items={projects}
        multiline={['description', 'responsibility']}
        onAdd={() => addArrayItem('projects', { name: '', role: '', startDate: '', endDate: '', description: '', responsibility: '' })}
        onDelete={(index) => deleteArrayItem('projects', index, '项目经历')}
        onUpdate={(index, patch) => updateArrayItem('projects', index, patch)}
        title="项目经历"
      />
    </div>
  );
}

function RepeatableProfileGroup({ addLabel, fields, items, multiline = [], onAdd, onDelete, onUpdate, title }) {
  return (
    <section className="repeatable-profile-group">
      <div className="section-head compact-head">
        <div>
          <h3>{title}</h3>
          <p>{ensureArray(items).length} 条</p>
        </div>
        <button className="secondary-action" onClick={onAdd}>{addLabel}</button>
      </div>
      <div className="repeatable-profile-list">
        {ensureArray(items).map((item, index) => (
          <article className="repeatable-profile-item" key={`${title}-${index}`}>
            <header>
              <strong>{title} {index + 1}</strong>
              <button className="danger-action" onClick={() => onDelete(index)}>删除</button>
            </header>
            <div className="profile-edit-grid">
              {fields.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  {multiline.includes(key) ? (
                    <textarea rows={3} value={item[key] || ''} onChange={(event) => onUpdate(index, { [key]: event.target.value })} />
                  ) : (
                    <input value={item[key] || ''} onChange={(event) => onUpdate(index, { [key]: event.target.value })} />
                  )}
                </label>
              ))}
            </div>
          </article>
        ))}
        {!ensureArray(items).length && <EmptyInline text={`暂无${title}，可点击新增。`} />}
      </div>
    </section>
  );
}

function ResumeVersionsSection({ handleDeleteResume, handleResumeChange, handleSetDefaultResume, parsedResume, profile, resumeVersions }) {
  const versions = ensureArray(resumeVersions);
  return (
    <div className="resume-version-stack">
      <label className="upload-box compact-upload">
        <Upload size={22} />
        <span>{profile.resumeName || '重新上传简历 PDF'}</span>
        <input type="file" accept=".pdf" onChange={(event) => handleResumeChange(event.target.files?.[0])} />
      </label>
      {versions.map((resume) => (
        <article className="resume-version-card" key={resume.id}>
          <div>
            <h3>{resume.fileName}</h3>
            <p>{resume.createdAt || '上传时间暂未记录'} · {resume.parseStatus === 'parsed' ? '解析成功' : '待解析'}</p>
          </div>
          <div className="resume-version-actions">
            {resume.isDefault ? <span className="status-pill status-submitted">默认版本</span> : <button onClick={() => handleSetDefaultResume(resume.id)}>设为默认</button>}
            <button className="danger-action" onClick={() => handleDeleteResume(resume)}>删除</button>
          </div>
        </article>
      ))}
      {!versions.length && <EmptyInline text={parsedResume ? '当前只有解析资料，未返回简历版本列表。' : '暂无简历版本。'} />}
    </div>
  );
}

function PreferenceProfileSection({ profile, update, updateList }) {
  return (
    <div className="profile-edit-grid">
      <label>
        <span>目标岗位</span>
        <textarea rows={3} value={profile.roles || ''} onChange={(event) => update('roles', event.target.value)} />
      </label>
      <label>
        <span>目标</span>
        <input value={ensureArray(profile.goals).join('、')} onChange={(event) => updateList('goals', event.target.value)} />
      </label>
      <label>
        <span>地点</span>
        <input value={ensureArray(profile.cities).join('、')} onChange={(event) => updateList('cities', event.target.value)} />
      </label>
      <label>
        <span>公司/行业偏好</span>
        <textarea rows={3} value={ensureArray(profile.industries).join('、')} onChange={(event) => updateList('industries', event.target.value)} />
      </label>
      <label>
        <span>实习薪资</span>
        <input value={profile.salaryIntern || ''} onChange={(event) => update('salaryIntern', event.target.value)} />
      </label>
      <label>
        <span>校招薪资</span>
        <input value={profile.salaryGraduate || ''} onChange={(event) => update('salaryGraduate', event.target.value)} />
      </label>
    </div>
  );
}

function AutofillRulesSection({ applicationPacket, formMappings, mappingSaveState, profile, update }) {
  const standardCount = ensureArray(formMappings).filter((mapping) => mapping.kind !== 'learnedFieldMapping').length;
  return (
    <div className="autofill-rules-panel">
      <div className="profile-rule-grid">
        <InfoItem label="标准答案字段" value={`${standardCount} 个`} />
        <InfoItem label="资料包分组" value={`${ensureArray(applicationPacket).length} 组`} />
        <InfoItem label="保存状态" value={mappingSaveState || '自动保存'} />
      </div>
      <label className="toggle">
        <input type="checkbox" checked={Boolean(profile.allowTailor)} onChange={(event) => update('allowTailor', event.target.checked)} />
        <span>允许针对岗位微调简历建议</span>
      </label>
      <div className="privacy-rule-list">
        <article><strong>默认可填</strong><span>联系方式、教育、工作/实习、项目经历的高置信字段。</span></article>
        <article><strong>每次确认</strong><span>薪资、到岗时间、签证/工作许可。</span></article>
        <article><strong>默认不填</strong><span>性别、民族、残障、政治面貌等敏感字段不会从简历推断。</span></article>
        <article><strong>永不读取</strong><span>密码、验证码；最终提交始终由用户在官网点击。</span></article>
      </div>
    </div>
  );
}

function FieldMemorySection({ fieldMemories, formMappings, removeMemory, updateMemory }) {
  const standardOptions = ensureArray(formMappings).filter((mapping) => mapping.kind !== 'learnedFieldMapping');
  return (
    <div className="field-memory-list">
      {ensureArray(fieldMemories).map((memory) => (
        <article className="field-memory-card" key={memory.id}>
          <div>
            <h3>{memory.fieldLabel || memory.label || memory.aliases || '未命名字段'}</h3>
            <p>{memory.domain || memory.host || memory.pageUrl || '当前域名'} · {memory.matchSource || memory.source || '人工选择'} · {memory.updatedAt || '更新时间未知'}</p>
          </div>
          <select
            value={memory.sourceLabel || memory.canonicalLabel || ''}
            onChange={(event) => {
              const selected = standardOptions.find((item) => item.sourceLabel === event.target.value || item.label === event.target.value);
              updateMemory(memory.id, {
                sourceLabel: selected?.sourceLabel || event.target.value,
                value: selected?.value || memory.value,
                canonicalField: selected?.canonicalField || memory.canonicalField,
              });
            }}
          >
            <option value="">选择标准字段</option>
            {standardOptions.map((mapping) => (
              <option key={mapping.id} value={mapping.sourceLabel || mapping.label}>
                {mapping.group} / {mapping.sourceLabel || mapping.label}
              </option>
            ))}
          </select>
          <button className="danger-action" onClick={() => removeMemory(memory.id)}>删除</button>
        </article>
      ))}
      {!ensureArray(fieldMemories).length && <EmptyInline text="暂无网站字段记忆。插件里人工修正字段后，会默认按当前域名保存到这里。" />}
    </div>
  );
}

function PrivacyDataSection({ applicationStatuses, clearApplications, clearFieldMemory, clearProfileData, logout, records }) {
  return (
    <div className="privacy-data-panel">
      <div className="profile-rule-grid">
        <InfoItem label="投递记录" value={`${ensureArray(records).length} 条`} />
        <InfoItem label="CRM 状态" value={`${applicationStatuses.length} 类`} />
        <InfoItem label="敏感字段策略" value="默认不推断" />
      </div>
      <div className="danger-zone">
        <article>
          <div><strong>退出登录 / 切换账号</strong><span>清除当前浏览器登录状态，回到 6 步引导；不会删除账号数据。</span></div>
          <button className="secondary-action" onClick={logout}>退出登录</button>
        </article>
        <article>
          <div><strong>清空投递历史</strong><span>只删除 application/CRM 记录，不删除岗位和个人资料。</span></div>
          <button className="danger-action" onClick={clearApplications}>清空投递历史</button>
        </article>
        <article>
          <div><strong>清空字段记忆</strong><span>删除网站学习映射；标准映射会根据资料重新生成。</span></div>
          <button className="danger-action" onClick={clearFieldMemory}>清空字段记忆</button>
        </article>
        <article>
          <div><strong>删除全部个人资料</strong><span>清空简历、资料、字段记忆和投递历史，三个入口互不混删。</span></div>
          <button className="danger-action" onClick={clearProfileData}>删除全部个人资料</button>
        </article>
      </div>
    </div>
  );
}

function ApplicationsPage({
  applicationStatuses,
  applicationDetails,
  crmStats,
  handleApplicationDetailChange,
  handleStatusChange,
  scoredJobs,
  setActiveTab,
  statusMap,
}) {
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    keyword: '',
    status: '全部状态',
    location: '全部地点',
    companyType: '全部类型',
    date: '全部日期',
    sortBy: 'updated',
  });
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  const records = useMemo(
    () => buildApplicationRecords(scoredJobs, applicationDetails, statusMap),
    [applicationDetails, scoredJobs, statusMap]
  );
  const options = useMemo(() => buildApplicationFilterOptions(records, applicationStatuses), [applicationStatuses, records]);
  const visibleRecords = useMemo(() => filterApplicationRecords(records, filters), [filters, records]);
  const editingRecord = records.find((record) => record.id === editingId) || null;
  const duplicateCount = records.filter((record) => record.hasDuplicateJob || record.hasDuplicateSubmission).length;

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () =>
    setFilters({
      keyword: '',
      status: '全部状态',
      location: '全部地点',
      companyType: '全部类型',
      date: '全部日期',
      sortBy: 'updated',
    });

  const softDeleteRecord = (record) => {
    const ok = window.confirm(`确认删除「${record.company} - ${record.title}」这条投递记录吗？\n删除后会进入“已撤回”，可以立即撤销。`);
    if (!ok) return;
    const previousStatus = record.status;
    handleApplicationDetailChange(record.id, {
      status: '已撤回',
      notes: appendRecordNote(record.detail.notes, `已删除记录，原状态：${previousStatus}`),
      previousStatus,
      deletedAt: new Date().toISOString(),
    });
    setToast({ recordId: record.id, previousStatus, title: record.title });
  };

  const undoDelete = () => {
    if (!toast) return;
    handleApplicationDetailChange(toast.recordId, {
      status: toast.previousStatus,
      deletedAt: '',
      notes: appendRecordNote(applicationDetails[toast.recordId]?.notes || '', '已撤销删除'),
    });
    setToast(null);
  };

  return (
    <section className="applications-workspace">
      <div className="application-crm-strip" aria-label="投递状态统计">
        {crmStats.map((item) => (
          <button
            key={item.status}
            className={filters.status === item.status ? 'active' : ''}
            onClick={() => updateFilter('status', item.status)}
          >
            <span>{item.status}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>

      <section className="application-panel">
        <div className="application-toolbar">
          <div>
            <p className="eyebrow">Application CRM</p>
            <h3>投递记录</h3>
            <p>共 {records.length} 条记录，当前显示 {visibleRecords.length} 条。</p>
          </div>
          <div className="application-toolbar-actions">
            {duplicateCount > 0 && <span className="duplicate-badge">检测到 {duplicateCount} 条可能重复</span>}
            <div className="view-toggle" aria-label="切换视图">
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                <List size={17} />
                列表
              </button>
              <button className={viewMode === 'kanban' ? 'active' : ''} onClick={() => setViewMode('kanban')}>
                <LayoutGrid size={17} />
                看板
              </button>
            </div>
          </div>
        </div>

        <div className="application-filters">
          <label className="search-field">
            <Search size={18} />
            <input
              value={filters.keyword}
              onChange={(event) => updateFilter('keyword', event.target.value)}
              placeholder="搜索公司名或岗位名"
            />
          </label>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            {options.statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={filters.location} onChange={(event) => updateFilter('location', event.target.value)}>
            {options.locations.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={filters.companyType} onChange={(event) => updateFilter('companyType', event.target.value)}>
            {options.companyTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={filters.date} onChange={(event) => updateFilter('date', event.target.value)}>
            {['全部日期', '7天内更新', '30天内更新', '有截止时间', '无截止时间'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value)}>
            <option value="updated">最近更新</option>
            <option value="deadline">截止时间</option>
            <option value="nextAction">下一步日期</option>
          </select>
          <button className="ghost-action" onClick={clearFilters}>
            清空筛选
          </button>
        </div>

        {visibleRecords.length ? (
          viewMode === 'list' ? (
            <div className="application-list" role="list">
              {visibleRecords.map((record) => (
                <ApplicationRecordCard
                  applicationStatuses={applicationStatuses}
                  key={record.id}
                  onDelete={() => softDeleteRecord(record)}
                  onEdit={() => setEditingId(record.id)}
                  onStatusChange={(status) => handleStatusChange(record.id, status)}
                  record={record}
                />
              ))}
            </div>
          ) : (
            <div className="application-kanban" aria-label="投递状态看板">
              {applicationStatuses.map((status) => {
                const columnRecords = visibleRecords.filter((record) => record.status === status);
                return (
                  <section className="kanban-column" key={status}>
                    <header>
                      <span>{status}</span>
                      <strong>{columnRecords.length}</strong>
                    </header>
                    <div className="kanban-card-stack">
                      {columnRecords.map((record) => (
                        <ApplicationMiniCard key={record.id} onEdit={() => setEditingId(record.id)} record={record} />
                      ))}
                      {!columnRecords.length && <p className="kanban-empty">暂无记录</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : (
          <section className="empty-state compact-empty">
            <ClipboardList size={32} />
            <h3>还没有符合条件的投递记录</h3>
            <p>可以清空筛选，或从推荐岗位和辅助投递开始建立记录。</p>
            <div className="empty-actions">
              <button onClick={() => setActiveTab('recommend')}>去看推荐岗位</button>
              <button className="secondary-task-action" onClick={() => setActiveTab('assist')}>
                开始辅助投递
              </button>
            </div>
          </section>
        )}
      </section>

      {editingRecord && (
        <ApplicationEditDrawer
          applicationStatuses={applicationStatuses}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            handleApplicationDetailChange(editingRecord.id, patch);
            setEditingId(null);
          }}
          record={editingRecord}
        />
      )}

      {toast && (
        <div className="undo-toast" role="status">
          <span>已删除「{toast.title}」</span>
          <button onClick={undoDelete}>
            <RotateCcw size={16} />
            撤销
          </button>
          <button aria-label="关闭提示" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

function ApplicationRecordCard({ applicationStatuses, onDelete, onEdit, onStatusChange, record }) {
  return (
    <article className="application-record-card" role="listitem">
      <div className="record-logo">{record.company.slice(0, 1)}</div>
      <div className="record-main">
        <div className="record-title-row">
          <div>
            <h4>{record.title}</h4>
            <p>{record.company}</p>
          </div>
          <ApplicationStatusPill status={record.status} />
        </div>
        <div className="record-meta-grid">
          <span>
            <MapPin size={15} />
            {record.location}
          </span>
          <span>
            <CalendarDays size={15} />
            投递：{formatDateOnly(record.appliedAt || record.submittedAt) || '暂未投递'}
          </span>
          <span>
            <Clock3 size={15} />
            下一步：{record.nextActionAt || '未设置'}
          </span>
          <span>
            <Globe2 size={15} />
            {record.source || '暂未公开'}
          </span>
        </div>
        {(record.hasDuplicateJob || record.hasDuplicateSubmission) && (
          <p className="duplicate-note">
            {record.hasDuplicateSubmission ? '可能重复提交：同公司同岗位存在多条已投递记录。' : '可能重复岗位：同公司同岗位或同投递链接已存在。'}
          </p>
        )}
      </div>
      <div className="record-actions">
        <select value={record.status} onChange={(event) => onStatusChange(event.target.value)} aria-label="更新投递状态">
          {applicationStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button onClick={onEdit}>
          <Pencil size={16} />
          编辑
        </button>
        {record.applyUrl && (
          <button className="secondary-task-action" onClick={() => window.open(record.applyUrl, '_blank', 'noreferrer')}>
            <ExternalLink size={16} />
            投递链接
          </button>
        )}
        <button className="danger-action" onClick={onDelete}>
          <Trash2 size={16} />
          删除
        </button>
      </div>
    </article>
  );
}

function ApplicationMiniCard({ onEdit, record }) {
  return (
    <button className="kanban-mini-card" onClick={onEdit}>
      <strong>{record.title}</strong>
      <span>{record.company}</span>
      <small>{record.nextActionAt ? `下一步 ${record.nextActionAt}` : record.deadline ? `截止 ${record.deadline}` : '未设置下一步'}</small>
      {(record.hasDuplicateJob || record.hasDuplicateSubmission) && <em>重复提醒</em>}
    </button>
  );
}

function ApplicationEditDrawer({ applicationStatuses, onClose, onSave, record }) {
  const [draft, setDraft] = useState(() => ({
    status: record.status,
    nextAction: record.nextAction || '',
    nextActionAt: record.nextActionAt || '',
    followUpAt: record.followUpAt || record.nextActionAt || '',
    notes: record.detail.notes || '',
  }));

  useEffect(() => {
    setDraft({
      status: record.status,
      nextAction: record.nextAction || '',
      nextActionAt: record.nextActionAt || '',
      followUpAt: record.followUpAt || record.nextActionAt || '',
      notes: record.detail.notes || '',
    });
  }, [record]);

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const analysis = buildJobAnalysis(record);

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside className="application-drawer" role="dialog" aria-modal="true" aria-labelledby="application-drawer-title">
        <header>
          <div>
            <p className="eyebrow">Application Detail</p>
            <h3 id="application-drawer-title">{record.title}</h3>
            <p>{record.company}</p>
          </div>
          <button aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="drawer-content">
          <section className="drawer-section">
            <h4>状态与下一步</h4>
            <label>
              状态
              <select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}>
                {applicationStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              下一步行动
              <input value={draft.nextAction} onChange={(event) => updateDraft('nextAction', event.target.value)} placeholder="例如：补充作品集 / 等待笔试通知" />
            </label>
            <label>
              下一步日期
              <input
                type="date"
                value={draft.nextActionAt || draft.followUpAt || ''}
                onChange={(event) => {
                  updateDraft('nextActionAt', event.target.value);
                  updateDraft('followUpAt', event.target.value);
                }}
              />
            </label>
            <label>
              备注
              <textarea rows={5} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} />
            </label>
          </section>

          <section className="drawer-section">
            <h4>JD 快照</h4>
            <InfoItem label="来源" value={record.source} />
            <InfoItem label="截止时间" value={record.deadline || '暂未公开'} />
            <InfoItem label="最后更新" value={formatDateOnly(record.sourceUpdatedAt) || '暂未公开'} />
            {record.applyUrl ? (
              <button className="link-button" onClick={() => window.open(record.applyUrl, '_blank', 'noreferrer')}>
                <ExternalLink size={16} />
                打开投递 URL
              </button>
            ) : (
              <p className="muted-text">暂无官方投递链接。</p>
            )}
            <p className="jd-snapshot">{record.jdText || '暂无完整 JD 快照。'}</p>
          </section>

          <section className="drawer-section">
            <h4>匹配分析</h4>
            <InfoItem label="匹配度" value={Number.isFinite(record.score) ? `${record.score}` : '不可计算'} />
            <EvidenceList empty="暂无匹配证据。" items={analysis.matchItems.slice(0, 4)} />
            <EvidenceList empty="暂未识别到能力缺口或资格风险。" items={[...analysis.gaps, ...analysis.risks].slice(0, 4)} />
          </section>

          <section className="drawer-section">
            <h4>Autofill Session</h4>
            <InfoItem label="Session ID" value={record.detail.autofillSessionId || '暂无'} />
            <InfoItem label="提交结果" value={record.detail.submissionResult || '未记录'} />
            <InfoItem label="最近更新来源" value={record.detail.updatedSource || '用户手动'} />
          </section>
        </div>

        <footer>
          <button className="secondary-task-action" onClick={onClose}>
            取消
          </button>
          <button onClick={() => onSave({ ...draft, followUpAt: draft.nextActionAt || draft.followUpAt })}>保存</button>
        </footer>
      </aside>
    </div>
  );
}

function ApplicationStatusPill({ status }) {
  return <span className={`status-pill status-${statusClassName(status)}`}>{status}</span>;
}

function AutofillPage({
  autofillConfirmed,
  autofillPreview,
  autofillRunResult,
  autofillRunState,
  autofillScript,
  careerUrl,
  formMappings,
  handleApplicationDetailChange,
  handleImportExtensionScan,
  handleStatusChange,
  handleScanCareerForm,
  scanPayloadText,
  setAutofillConfirmed,
  setCareerUrl,
  setScanPayloadText,
  scoredJobs,
  updateAutofillField,
}) {
  const steps = [
    '选择岗位/链接',
    '登录官网',
    '确认申请页',
    '创建 Session',
    '扫描映射',
    '扩展填充',
    '人工提交',
    '结果回写',
  ];
  const [wizardStep, setWizardStep] = useState(() => readAssistSession().step || 0);
  const [selectedJobId, setSelectedJobId] = useState(() => readAssistSession().selectedJobId || '');
  const [loggedInUrl, setLoggedInUrl] = useState(() => readAssistSession().loggedInUrl || '');
  const [session, setSession] = useState(() => readAssistSession().session || null);
  const [submissionResult, setSubmissionResult] = useState(() => readAssistSession().submissionResult || 'unknown');
  const [assistMessage, setAssistMessage] = useState('');
  const safeJobs = Array.isArray(scoredJobs) ? scoredJobs.map(normalizeJobViewModel) : [];
  const selectedJob = safeJobs.find((job) => String(job.id) === String(selectedJobId));
  const targetUrl = loggedInUrl.trim() || careerUrl.trim() || selectedJob?.applyUrl || selectedJob?.sourceUrl || '';
  const summary = summarizeAutofillPreview(autofillPreview);
  const extensionPackage = buildExtensionPackage(targetUrl, autofillScript);

  useEffect(() => {
    saveAssistSession({
      step: wizardStep,
      selectedJobId,
      loggedInUrl,
      session,
      submissionResult,
    });
  }, [loggedInUrl, selectedJobId, session, submissionResult, wizardStep]);

  useEffect(() => {
    if (!selectedJob) return;
    const jobUrl = selectedJob.applyUrl || selectedJob.sourceUrl || '';
    if (jobUrl && !careerUrl) setCareerUrl(jobUrl);
  }, [careerUrl, selectedJob, setCareerUrl]);

  useEffect(() => {
    if (autofillPreview && wizardStep < 4) setWizardStep(4);
  }, [autofillPreview, wizardStep]);

  useEffect(() => {
    if (autofillConfirmed && wizardStep < 5) setWizardStep(5);
  }, [autofillConfirmed, wizardStep]);

  const copyPlan = () => {
    const text = autofillScript
      .map((item) => `${item.step}. ${item.field} (${item.type}) -> ${item.value} | ${item.action}`)
      .join('\n');
    navigator.clipboard?.writeText(text);
  };

  const copyExtensionPackage = () => {
    navigator.clipboard?.writeText(JSON.stringify(extensionPackage, null, 2));
    setAssistMessage('已复制扩展填充包，请在 Chrome 扩展中粘贴后点击“填当前页”。');
  };

  const goNext = () => {
    const validation = validateAssistStep(wizardStep, { targetUrl, session, autofillPreview, autofillConfirmed, submissionResult });
    if (validation) {
      setAssistMessage(validation);
      return;
    }
    setAssistMessage('');
    if (wizardStep === 2) {
      if (loggedInUrl.trim()) setCareerUrl(loggedInUrl.trim());
      const nextSession = session || createAutofillSession(targetUrl, selectedJob);
      setSession(nextSession);
    }
    if (wizardStep === 3 && !autofillPreview) {
      handleScanCareerForm();
      setAssistMessage('已创建 Autofill Session。若只输入 URL，Web 端会生成兜底模板；真实字段请优先从扩展导入扫描 JSON。');
    }
    if (wizardStep === 4 && autofillPreview && !autofillConfirmed) {
      setAutofillConfirmed(true);
    }
    setWizardStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const goBack = () => {
    setAssistMessage('');
    setWizardStep((current) => Math.max(0, current - 1));
  };

  const handleSubmitResult = (result) => {
    setSubmissionResult(result);
    if (selectedJob?.id) {
      const status = result === 'success' ? '已投递' : result === 'failed' ? '未通过' : '结果未知';
      handleStatusChange(selectedJob.id, status);
      handleApplicationDetailChange?.(selectedJob.id, {
        submissionResult: result,
        notes: appendSessionNote(selectedJob, result, session),
      });
    }
    setWizardStep(7);
  };

  const resetSession = () => {
    if (!window.confirm('确定清空当前辅助投递 Session 草稿吗？不会删除岗位和个人资料。')) return;
    setWizardStep(0);
    setSelectedJobId('');
    setLoggedInUrl('');
    setSession(null);
    setSubmissionResult('unknown');
    setAutofillConfirmed(false);
    setAssistMessage('已重置当前辅助投递向导。');
  };

  return (
    <section className="assist-wizard module-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Autofill Session</p>
          <h2>登录官网 - 识别 - 填充 - 确认 - 回写</h2>
          <span className="save-state">安全模式：Web 不跨域操作招聘官网，最终提交始终由你手动点击。</span>
        </div>
        <button className="secondary-action" onClick={resetSession}>重置 Session</button>
      </div>

      <div className="assist-stepper" aria-label="辅助投递步骤">
        {steps.map((step, index) => (
          <button key={step} className={index === wizardStep ? 'active' : index < wizardStep ? 'done' : ''} onClick={() => setWizardStep(index)}>
            <strong>{index + 1}</strong>
            <span>{step}</span>
          </button>
        ))}
      </div>

      <div className="assist-status-strip">
        <StatusPill label="状态机" value={assistStateForStep(wizardStep, autofillPreview, autofillConfirmed, submissionResult)} />
        <StatusPill label="插件状态" value={isDesktopLike() ? '等待用户打开扩展' : '请在电脑端继续'} />
        <StatusPill label="当前 Session" value={session?.id || '未创建'} />
      </div>

      {assistMessage && <div className="onboarding-error-banner">{assistMessage}</div>}

      <div className="assist-panel">
        {wizardStep === 0 && (
          <AssistSelectTarget
            careerUrl={careerUrl}
            safeJobs={safeJobs}
            selectedJobId={selectedJobId}
            setCareerUrl={setCareerUrl}
            setSelectedJobId={setSelectedJobId}
          />
        )}
        {wizardStep === 1 && (
          <AssistLoginStep targetUrl={targetUrl} />
        )}
        {wizardStep === 2 && (
          <AssistConfirmUrlStep
            loggedInUrl={loggedInUrl}
            setLoggedInUrl={setLoggedInUrl}
            targetUrl={targetUrl}
          />
        )}
        {wizardStep === 3 && (
          <AssistCreateSessionStep session={session} targetUrl={targetUrl} />
        )}
        {wizardStep === 4 && (
          <AssistScanStep
            autofillPreview={autofillPreview}
            formMappings={formMappings}
            handleImportExtensionScan={handleImportExtensionScan}
            handleScanCareerForm={handleScanCareerForm}
            scanPayloadText={scanPayloadText}
            setScanPayloadText={setScanPayloadText}
            summary={summary}
            targetUrl={targetUrl}
            updateAutofillField={updateAutofillField}
          />
        )}
        {wizardStep === 5 && (
          <AssistFillStep
            autofillConfirmed={autofillConfirmed}
            autofillRunResult={autofillRunResult}
            autofillRunState={autofillRunState}
            autofillScript={autofillScript}
            copyExtensionPackage={copyExtensionPackage}
            copyPlan={copyPlan}
            extensionPackage={extensionPackage}
            setAutofillConfirmed={setAutofillConfirmed}
          />
        )}
        {wizardStep === 6 && (
          <AssistUserSubmitStep handleSubmitResult={handleSubmitResult} />
        )}
        {wizardStep === 7 && (
          <AssistResultStep result={submissionResult} selectedJob={selectedJob} session={session} />
        )}
      </div>

      <footer className="assist-footer">
        <button className="secondary-action" onClick={goBack} disabled={wizardStep === 0}>上一步</button>
        <button className="primary-action" onClick={goNext} disabled={wizardStep === steps.length - 1}>
          下一步
        </button>
      </footer>
    </section>
  );
}

function AssistSelectTarget({ careerUrl, safeJobs, selectedJobId, setCareerUrl, setSelectedJobId }) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="选择岗位或官方投递链接" text="可以从已保存岗位开始，也可以直接粘贴登录前的官方投递页链接。" />
      <label>
        <span>选择已有岗位</span>
        <select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
          <option value="">不绑定岗位，仅使用链接</option>
          {safeJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.company} - {job.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>官方投递链接</span>
        <input
          value={careerUrl}
          onChange={(event) => setCareerUrl(event.target.value)}
          placeholder="https://careers.company.com/apply/..."
        />
      </label>
      <SafetyNotice items={['URL 不代表已登录，KikiJob 后端不会拥有你的招聘网站会话。', '重复岗位会在投递记录中提醒，unknown 状态不会自动重试。']} />
    </div>
  );
}

function AssistLoginStep({ targetUrl }) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="打开招聘官网并手动登录" text="请在 Chrome 中打开官网，自己完成登录、验证码或短信验证，然后进入正式申请表。" />
      <div className="assist-action-row">
        <button className="primary-action" disabled={!targetUrl} onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}>
          <ExternalLink size={16} />
          打开招聘官网
        </button>
      </div>
      <SafetyNotice items={['KikiJob 不保存密码、Cookie 或验证码。', '如果页面提示验证码，请你在官网手动处理。', '移动端无法运行桌面 Chrome 扩展，请在电脑端继续。']} />
    </div>
  );
}

function AssistConfirmUrlStep({ loggedInUrl, setLoggedInUrl, targetUrl }) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="确认正式申请表链接" text="登录后进入真正的申请表，把当前地址栏链接粘贴回来；如果扩展已打开，也可以在扩展中直接扫描当前标签页。" />
      <label>
        <span>登录后的申请页 URL</span>
        <input
          value={loggedInUrl}
          onChange={(event) => setLoggedInUrl(event.target.value)}
          placeholder={targetUrl || '粘贴登录后的申请页 URL'}
        />
      </label>
      <SafetyNotice items={['当前页不是申请表时，扫描结果会很少或无法匹配。', '如果登录过期，请回官网重新登录后再继续。']} />
    </div>
  );
}

function AssistCreateSessionStep({ session, targetUrl }) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="创建 Autofill Session" text="Session 只保存任务状态和字段结果，不保存招聘网站登录态。" />
      <div className="session-card">
        <StatusPill label="Session" value={session?.id || '点击下一步创建'} />
        <StatusPill label="目标页面" value={targetUrl ? compactUrl(targetUrl) : '未设置'} />
        <StatusPill label="当前阶段" value="DETECTED" />
      </div>
      <SafetyNotice items={['创建后请优先用 Chrome 扩展扫描真实页面。', 'Web 端 URL 识别只做兜底，不等同真实 DOM 扫描。']} />
    </div>
  );
}

function AssistScanStep({
  autofillPreview,
  formMappings,
  handleImportExtensionScan,
  handleScanCareerForm,
  scanPayloadText,
  setScanPayloadText,
  summary,
  targetUrl,
  updateAutofillField,
}) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="扫描字段并映射资料" text="推荐：在 Chrome 扩展点击“扫描当前页”，复制扫描 JSON 后粘贴到这里。" />
      <div className="assist-action-row">
        <button className="secondary-action" onClick={handleScanCareerForm} disabled={!targetUrl}>
          URL 兜底识别
        </button>
        <span className="save-state">扩展未连接时，可先用 URL 兜底生成预览。</span>
      </div>
      <label>
        <span>扩展真实扫描 JSON</span>
        <textarea
          rows={5}
          value={scanPayloadText}
          onChange={(event) => setScanPayloadText(event.target.value)}
          placeholder="Chrome 扩展扫描当前页后，把扫描 JSON 粘贴到这里"
        />
      </label>
      <button className="primary-action" onClick={handleImportExtensionScan} disabled={!scanPayloadText.trim()}>
        导入扩展扫描结果
      </button>

      {autofillPreview ? (
        <>
          <div className="autofill-summary">
            <Metric icon={<Globe2 />} label="检测字段" value={summary.total} />
            <Metric icon={<CheckCircle2 />} label="已匹配" value={summary.matched} />
            <Metric icon={<BadgeCheck />} label="待确认" value={summary.reviewRequired} />
            <Metric icon={<FileText />} label="未支持" value={summary.unsupported} />
          </div>
          <div className="autofill-table">
            <div className="autofill-table-head">
              <span>官网字段</span>
              <span>类型</span>
              <span>匹配资料</span>
              <span>待填值</span>
              <span>置信度</span>
            </div>
            {autofillPreview.fields.map((field) => (
              <article className="autofill-row" key={field.id}>
                <div>
                  <strong>{field.label}</strong>
                  <small>{field.name || field.placeholder || field.instruction}</small>
                </div>
                <span className="field-type">{field.type}</span>
                <select
                  value={field.matchedSourceLabel}
                  onChange={(event) => {
                    const selected = formMappings.find((mapping) => mapping.sourceLabel === event.target.value);
                    updateAutofillField(field.id, {
                      matchedLabel: selected?.label || '',
                      matchedSourceLabel: selected?.sourceLabel || '',
                      value: selected?.value || '',
                      confidence: selected ? '人工确认' : '未匹配',
                      instruction: selected ? field.instruction : '需要人工选择字段',
                    });
                  }}
                >
                  <option value="">未匹配</option>
                  {formMappings.map((mapping) => (
                    <option key={mapping.id} value={mapping.sourceLabel}>
                      {mapping.label} / {mapping.sourceLabel}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={field.value}
                  placeholder="待补充"
                  onChange={(event) => updateAutofillField(field.id, { value: event.target.value, confidence: '人工确认' })}
                />
                <span className={`confidence ${field.confidence === '高' ? 'high' : field.confidence === '未匹配' ? 'low' : 'medium'}`}>
                  {field.confidence}
                </span>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="autofill-empty">
          <FileText size={28} />
          <h3>等待扫描结果</h3>
          <p>如果检测到验证码、文件上传或未知组件，请在扩展侧边栏人工确认。</p>
        </div>
      )}
    </div>
  );
}

function AssistFillStep({
  autofillConfirmed,
  autofillRunResult,
  autofillRunState,
  autofillScript,
  copyExtensionPackage,
  copyPlan,
  extensionPackage,
  setAutofillConfirmed,
}) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="调用 Chrome 扩展填充当前页" text="Web 只生成填充包；请在已登录的招聘申请表页面打开扩展，粘贴填充包，只填字段，不点击提交。" />
      <div className="assist-action-row">
        <button className="primary-action" onClick={() => setAutofillConfirmed(true)} disabled={!autofillScript.length && !autofillConfirmed}>
          确认字段并生成填充包
        </button>
        <button className="secondary-action" onClick={copyExtensionPackage} disabled={!extensionPackage.steps.length}>
          复制扩展填充包
        </button>
        <button className="secondary-action" onClick={copyPlan} disabled={!autofillScript.length}>
          复制步骤明细
        </button>
      </div>
      <div className="plan-list">
        {autofillScript.length ? autofillScript.map((item) => (
          <article className="plan-row" key={`${item.step}-${item.field}`}>
            <strong>{item.step}</strong>
            <div>
              <h3>{item.field}</h3>
              <p>{item.action}</p>
            </div>
            <span>{maskSensitiveValue(item.value)}</span>
            {item.requiresUserCheck && <small>需确认</small>}
          </article>
        )) : (
          <EmptyInline text="还没有可执行填充步骤，请先完成扫描映射。" />
        )}
      </div>
      {autofillRunState && <span className="save-state">{autofillRunState}</span>}
      {autofillRunResult?.results?.length > 0 && (
        <div className="run-result-list">
          {autofillRunResult.results.map((item) => (
            <article className="run-result-row" key={`${item.step}-${item.field}`}>
              <strong>{item.field}</strong>
              <span className={`run-status ${item.status}`}>{item.status}</span>
              <small>{item.selector || item.reason || item.action}</small>
            </article>
          ))}
        </div>
      )}
      <SafetyNotice items={['中置信字段和敏感字段请在扩展侧边栏逐项确认。', '简历附件需要你在官网手动上传。', '插件不会点击下一步、保存并提交或最终提交。']} />
    </div>
  );
}

function AssistUserSubmitStep({ handleSubmitResult }) {
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="人工检查并手动提交" text="请回到招聘官网，逐项检查已填内容。确认无误后，由你自己点击最终提交按钮。" />
      <div className="result-choice-grid">
        <button className="primary-action" onClick={() => handleSubmitResult('success')}>我已成功提交</button>
        <button className="secondary-action" onClick={() => handleSubmitResult('unknown')}>无法确认结果</button>
        <button className="danger-action" onClick={() => handleSubmitResult('failed')}>提交失败/暂不提交</button>
      </div>
      <SafetyNotice items={['如果系统无法确认结果，状态会记录为 unknown，不会自动重试。', '遇到验证码、登录过期、附件上传失败时，请在官网手动处理后再记录结果。']} />
    </div>
  );
}

function AssistResultStep({ result, selectedJob, session }) {
  const label = result === 'success' ? 'SUBMITTED' : result === 'failed' ? 'FAILED' : 'UNKNOWN';
  return (
    <div className="assist-step-content">
      <StepHeadingLite title="回写完成" text="本次辅助投递状态已记录到 KikiJob。无法确认时不会自动重复投递。" />
      <div className="session-card">
        <StatusPill label="状态" value={label} />
        <StatusPill label="岗位" value={selectedJob ? `${selectedJob.company} - ${selectedJob.title}` : '未绑定岗位'} />
        <StatusPill label="Session" value={session?.id || '未创建'} />
      </div>
    </div>
  );
}

function StepHeadingLite({ text, title }) {
  return (
    <div className="step-heading">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function StatusPill({ label, value }) {
  return (
    <article className="status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SafetyNotice({ items }) {
  return (
    <div className="safety-notice">
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TagRow({ tags = [] }) {
  return (
    <div className="tag-row">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function InsightBlock({ empty, items = [], title }) {
  return (
    <div>
      <strong>{title}</strong>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

function renderStartupError(error) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = '';
  const fallback = document.createElement('main');
  fallback.className = 'app-shell';
  fallback.innerHTML = `
    <section class="app-fallback">
      <p class="eyebrow">Startup Error</p>
      <h1>页面启动遇到问题</h1>
      <p>${escapeHtml(error?.message || '未知前端错误')}</p>
      <div class="recommend-card-actions">
        <button class="primary-action" data-action="reload">刷新重试</button>
        <button class="secondary-action" data-action="reset">重置引导</button>
      </div>
    </section>
  `;
  fallback.querySelector('[data-action="reload"]')?.addEventListener('click', () => window.location.reload());
  fallback.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    resetOnboardingStorage();
    window.location.href = '#/recommend';
    window.location.reload();
  });
  root.appendChild(fallback);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    window.__JOBPILOT_LAST_ERROR__ = {
      message: error?.message || String(error),
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
    };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-shell">
        <section className="app-fallback">
          <p className="eyebrow">Runtime Error</p>
          <h1>页面加载遇到问题</h1>
          <p>{this.state.error.message || '未知前端错误'}</p>
          <div className="recommend-card-actions">
            <button className="primary-action" onClick={() => window.location.reload()}>刷新重试</button>
            <button
              className="secondary-action"
              onClick={() => {
                resetOnboardingStorage();
                window.location.href = '#/recommend';
                window.location.reload();
              }}
            >
              重置引导
            </button>
          </div>
        </section>
      </main>
    );
  }
}

try {
  createRoot(document.getElementById('root')).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
} catch (error) {
  renderStartupError(error);
}

function resetOnboardingStorage() {
  try {
    window.localStorage?.removeItem('jobpilot.onboardingDraft.v1');
    window.localStorage?.removeItem('jobpilot.onboardingStep.v1');
    window.localStorage?.setItem('jobpilot.onboardingCompleted', 'false');
  } catch {
    // Storage can be unavailable in embedded or restricted browser contexts.
  }
}
