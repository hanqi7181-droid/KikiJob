import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  PlugZap,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react';

const roleOptions = ['AI 产品经理', 'AI Agent 工程师', 'AI 应用开发', '数据分析', '商业分析', '算法工程师', '机器学习工程师', '计算机视觉算法工程师', 'AI 运营', '产品运营'];
const locationOptions = ['深圳', '上海', '香港', '杭州', '北京', '广州', '成都', '南京', '苏州', '远程'];
const companyTypeOptions = ['互联网大厂', '央国企', '外企', '金融科技', '成长型公司', '其他'];
const industryOptions = ['人工智能', '金融科技', '银行中后台', '消费品/美妆', '跨境电商', '云计算', '咨询', '企业服务'];
const fillTypeOptions = [
  { id: 'contact', label: '联系方式' },
  { id: 'education', label: '教育经历' },
  { id: 'work', label: '经历' },
  { id: 'project', label: '项目经历' },
];

export const onboardingSteps = [
  {
    id: 'login',
    title: '登录',
    icon: LockKeyhole,
    validate: (draft) => {
      const errors = {};
      const email = String(draft?.login?.account || '').trim();
      if (!email) errors.account = '请输入邮箱';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.account = '请输入有效邮箱';
      if (!draft?.login?.acceptedTerms) errors.acceptedTerms = '需要同意服务条款和隐私说明';
      return errors;
    },
    Component: LoginStep,
  },
  {
    id: 'resume',
    title: '上传简历',
    icon: Upload,
    validate: (draft) => (!draft?.resume?.fileName ? { fileName: '请先选择一份简历文件' } : {}),
    Component: ResumeStep,
  },
  {
    id: 'profile',
    title: '确认基本资料',
    icon: UserRound,
    validate: (draft) => {
      const errors = {};
      if (!String(draft?.profile?.name || '').trim()) errors.name = '请确认姓名';
      if (!String(draft?.profile?.email || '').trim()) errors.email = '请确认邮箱';
      if (!String(draft?.profile?.phone || '').trim()) errors.phone = '请确认手机号';
      return errors;
    },
    Component: ProfileStep,
  },
  {
    id: 'preferences',
    title: '设置求职偏好',
    icon: BadgeCheck,
    validate: (draft) => {
      const errors = {};
      if (!safeArray(draft.preferences?.roles).length) errors.roles = '请选择至少一个求职意向';
      if (!safeArray(draft.preferences?.locations).length) errors.locations = '请选择至少一个目标地点';
      if (!safeArray(draft.preferences?.recruitmentTypes).length) errors.recruitmentTypes = '请选择招聘类型';
      return errors;
    },
    Component: PreferencesStep,
  },
  {
    id: 'autofill',
    title: '自动填写设置',
    icon: PlugZap,
    validate: () => ({}),
    Component: AutofillStep,
  },
  {
    id: 'review',
    title: '完成检查',
    icon: FileText,
    validate: () => ({}),
    Component: ReviewStep,
  },
];

function LoginStep({
  authUser,
  draft,
  errors,
  loginWithPassword,
  onAuthChanged,
  onStepComplete,
  requestEmailCode,
  setField,
  verifyEmailCode,
}) {
  const login = draft?.login || {};
  const [mode, setMode] = useState('password');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [status, setStatus] = useState(authUser ? '已登录，后续数据会保存到当前账号。' : '');
  const [pendingAction, setPendingAction] = useState('');

  const account = String(login.account || '').trim();
  const setLoginStatus = (message) => {
    setStatus(message);
    setField('login', 'sessionStatus', message, { touched: false });
  };

  const handlePasswordLogin = async () => {
    if (!loginWithPassword) return setLoginStatus('后端登录接口未启动。');
    if (!login.acceptedTerms) return setLoginStatus('请先勾选同意服务条款和隐私说明。');
    if (!account) return setLoginStatus('请先输入邮箱。');
    if (!password) return setLoginStatus('请先输入密码。');
    try {
      setPendingAction('password');
      setLoginStatus('正在登录...');
      const payload = await loginWithPassword(account, password);
      setLoginStatus('登录成功，正在进入上传简历。');
      onAuthChanged?.(payload);
      onStepComplete?.();
    } catch (error) {
      setLoginStatus(error.message || '登录失败，请检查账号密码。');
    } finally {
      setPendingAction('');
    }
  };

  const handleRequestEmailCode = async () => {
    if (!requestEmailCode) return setLoginStatus('邮箱验证码接口未启动。');
    if (!login.acceptedTerms) return setLoginStatus('请先勾选同意服务条款和隐私说明，再获取验证码。');
    if (!account) return setLoginStatus('请先输入邮箱。');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) return setLoginStatus('请输入有效邮箱后再获取验证码。');
    try {
      setPendingAction('requestEmailCode');
      setLoginStatus(`正在向 ${account} 发送验证码...`);
      const payload = await requestEmailCode(account);
      setLoginStatus(payload.devCode ? `邮箱验证码已生成：${payload.devCode}（本地开发模式）` : `验证码已发送至 ${payload.email}`);
    } catch (error) {
      setLoginStatus(error.message || '验证码发送失败。');
    } finally {
      setPendingAction('');
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyEmailCode) return setLoginStatus('邮箱验证码登录接口未启动。');
    if (!login.acceptedTerms) return setLoginStatus('请先勾选同意服务条款和隐私说明。');
    if (!account) return setLoginStatus('请先输入邮箱。');
    if (!emailCode) return setLoginStatus('请先输入邮箱验证码。');
    try {
      setPendingAction('verifyEmailCode');
      setLoginStatus('正在验证...');
      const payload = await verifyEmailCode(account, emailCode);
      setLoginStatus('登录成功，正在进入上传简历。');
      onAuthChanged?.(payload);
      onStepComplete?.();
    } catch (error) {
      setLoginStatus(error.message || '验证码不正确或已过期。');
    } finally {
      setPendingAction('');
    }
  };

  return (
    <div className="onboarding-step login-step-shell">
      <section className="login-template-card" aria-label="登录 KikiJob">
        <h3>登录</h3>
        <p>登录后你的简历、字段词库、投递记录会按账号隔离保存。</p>
        <div className="login-mode-toggle" aria-label="登录方式">
          <button type="button" className={mode === 'password' ? 'selected' : ''} onClick={() => setMode('password')}>
            <KeyRound size={17} />邮箱密码
          </button>
          <button type="button" className={mode === 'emailCode' ? 'selected' : ''} onClick={() => setMode('emailCode')}>
            <Mail size={17} />邮箱验证码
          </button>
        </div>
        <div className="login-form-card">
          <label>
            <span>电子邮件</span>
            <input
              id="onboarding-account"
              value={login.account || ''}
              onChange={(event) => setField('login', 'account', event.target.value)}
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.account)}
              aria-describedby={errors.account ? 'onboarding-account-error' : undefined}
            />
            <ErrorText id="onboarding-account-error" message={errors.account} />
          </label>
          {mode === 'password' ? (
            <label>
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位密码"
                autoComplete="current-password"
              />
            </label>
          ) : (
            <div className="sms-login-row">
              <label>
                <span>验证码</span>
                <input value={emailCode} onChange={(event) => setEmailCode(event.target.value)} placeholder="6 位验证码" inputMode="numeric" />
              </label>
              <button
                type="button"
                className="secondary-action"
                onClick={handleRequestEmailCode}
                disabled={pendingAction === 'requestEmailCode'}
              >
                {pendingAction === 'requestEmailCode' ? '发送中...' : '获取验证码'}
              </button>
            </div>
          )}
          <button
            type="button"
            className="primary-action login-main-button"
            onClick={mode === 'password' ? handlePasswordLogin : handleVerifyEmail}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === 'password'
              ? '登录中...'
              : pendingAction === 'verifyEmailCode'
                ? '验证中...'
                : mode === 'password'
                  ? '登录 / 注册'
                  : '验证码登录'}
          </button>
        </div>
        <div className="policy-list login-status-list" role="status" aria-live="polite">
          <p>会话状态：{status || login.sessionStatus || '等待登录'}</p>
          <p>当前仅支持邮箱密码和邮箱验证码登录。</p>
        </div>
        <label className="check-row agreement-row">
          <input
            type="checkbox"
            checked={Boolean(login.acceptedTerms)}
            onChange={(event) => setField('login', 'acceptedTerms', event.target.checked)}
            aria-invalid={Boolean(errors.acceptedTerms)}
            aria-describedby={errors.acceptedTerms ? 'onboarding-terms-error' : undefined}
          />
          <span>继续即代表同意服务条款和隐私说明</span>
        </label>
        <ErrorText id="onboarding-terms-error" message={errors.acceptedTerms} />
      </section>
    </div>
  );
}

function ResumeStep({ applyPendingProfile, draft, errors, setField, uploadResumeFile }) {
  const resume = draft?.resume || {};
  const statusText = {
    idle: '等待上传',
    uploading: '正在上传...',
    parsing: '正在解析...',
    success: '解析成功',
    failed: '上传或解析失败',
  }[resume.uploadStatus || 'idle'];

  return (
    <div className="onboarding-step">
      <StepHeading title="上传简历" text="当前后端真实支持 PDF、TXT、Markdown；DOC/DOCX 解析尚未接入。" />
      <label className="onboarding-upload">
        <Upload size={24} />
        <strong title={resume.fileName}>{truncateFileName(resume.fileName) || '选择 PDF / TXT / Markdown 简历'}</strong>
        <span>{resume.fileSize ? `${resume.fileSize} · ${statusText}` : statusText}</span>
        <input
          id="onboarding-resume"
          type="file"
          accept=".pdf,.txt,.md"
          onChange={(event) => uploadResumeFile(event.target.files?.[0])}
          aria-invalid={Boolean(errors.fileName)}
          aria-describedby={errors.fileName ? 'onboarding-resume-error' : undefined}
        />
      </label>
      <ErrorText id="onboarding-resume-error" message={errors.fileName} />
      <ErrorText message={resume.error} />
      {resume.pendingProfile && (
        <section className="update-preview">
          <div className="section-head compact">
            <div>
              <h4>解析结果预览</h4>
              <p>只会应用你尚未手工编辑过的字段。</p>
            </div>
            <button type="button" className="secondary-action" onClick={applyPendingProfile}>应用解析结果</button>
          </div>
          <div className="review-list">
            {profilePreviewRows(resume.pendingProfile).map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value || '未识别'}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
      {resume.fileName && (
        <div className="onboarding-inline-actions">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('只删除当前引导草稿中的简历版本，不会清除数据库中已保存的历史简历和解析资料。确定继续吗？')) return;
              setField('resume', 'fileName', '');
              setField('resume', 'fileSize', '');
              setField('resume', 'uploadStatus', 'idle');
              setField('resume', 'error', '');
              setField('resume', 'pendingProfile', null);
            }}
          >
            删除当前版本
          </button>
          <span className="save-state">重试：重新选择文件即可再次上传解析</span>
        </div>
      )}
    </div>
  );
}

function ProfileStep({ draft, errors, setField, setProfileCollection }) {
  const profile = draft?.profile || {};
  const fields = [
    ['name', '姓名', '郑涵亓'],
    ['email', '邮箱', 'name@example.com'],
    ['phone', '电话', '86-13800000000'],
    ['school', '学校', '香港城市大学'],
    ['degree', '学历', '硕士'],
    ['major', '专业', '商业人工智能'],
    ['graduationDate', '毕业时间', '2026-07'],
  ];

  return (
    <div className="onboarding-step">
      <StepHeading title="确认基本资料" text="简历可靠识别的信息会在这里预填；缺失项会提示你补齐。" />
      <div className="onboarding-field-grid">
        {fields.map(([key, label, placeholder]) => (
          <label key={key} className={!profile[key] ? 'missing-field' : ''}>
            <span>{label}</span>
            <input
              id={`onboarding-profile-${key}`}
              value={profile[key] || ''}
              onChange={(event) => setField('profile', key, event.target.value)}
              placeholder={placeholder}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? `onboarding-profile-${key}-error` : undefined}
            />
            <ErrorText id={`onboarding-profile-${key}-error`} message={errors[key]} />
          </label>
        ))}
      </div>
      <EditableCollection
        title="教育经历"
        items={safeArray(profile.education)}
        fields={[
          ['school', '学校'],
          ['degree', '学历'],
          ['major', '专业'],
          ['startDate', '开始时间'],
          ['endDate', '结束时间'],
          ['courses', '课程'],
        ]}
        emptyItem={{ school: '', degree: '', major: '', startDate: '', endDate: '', courses: '' }}
        onChange={(items) => setProfileCollection('education', items)}
      />
      <EditableCollection
        title="工作/实习经历"
        items={safeArray(profile.experiences)}
        fields={[
          ['company', '公司/组织'],
          ['role', '岗位/角色'],
          ['startDate', '开始时间'],
          ['endDate', '结束时间'],
          ['description', '职责内容'],
        ]}
        emptyItem={{ company: '', role: '', startDate: '', endDate: '', description: '' }}
        onChange={(items) => setProfileCollection('experiences', items)}
      />
      <EditableCollection
        title="项目经历"
        items={safeArray(profile.projects)}
        fields={[
          ['name', '项目名称'],
          ['role', '角色'],
          ['startDate', '开始时间'],
          ['endDate', '结束时间'],
          ['description', '项目描述'],
        ]}
        emptyItem={{ name: '', role: '', startDate: '', endDate: '', description: '' }}
        onChange={(items) => setProfileCollection('projects', items)}
      />
    </div>
  );
}

function PreferencesStep({ draft, errors, setField }) {
  const preferences = draft?.preferences || {};
  return (
    <div className="onboarding-step">
      <StepHeading title="设置求职偏好" text="这些偏好会影响推荐公司、推荐岗位和后续投递任务排序。" />
      <SearchableChoiceGroup
        title="求职意向"
        error={errors.roles}
        options={roleOptions}
        values={safeArray(preferences.roles)}
        placeholder="搜索岗位方向"
        onChange={(values) => setField('preferences', 'roles', values)}
      />
      <SearchableChoiceGroup
        title="目标地点"
        error={errors.locations}
        options={locationOptions}
        values={safeArray(preferences.locations)}
        placeholder="搜索城市/国家"
        onChange={(values) => setField('preferences', 'locations', values)}
      />
      <ChoiceGroup title="招聘类型" error={errors.recruitmentTypes}>
        <ChipGrid
          options={['校招', '实习', '社招']}
          values={safeArray(preferences.recruitmentTypes)}
          onChange={(values) => setField('preferences', 'recruitmentTypes', values)}
        />
      </ChoiceGroup>
      <ChoiceGroup title="公司类型">
        <ChipGrid
          options={companyTypeOptions}
          values={safeArray(preferences.companyTypes)}
          onChange={(values) => setField('preferences', 'companyTypes', values)}
        />
      </ChoiceGroup>
      <SearchableChoiceGroup
        title="行业偏好"
        options={industryOptions}
        values={safeArray(preferences.industries)}
        placeholder="搜索行业"
        onChange={(values) => setField('preferences', 'industries', values)}
      />
      <div className="onboarding-field-grid">
        <label>
          <span>届别/毕业时间</span>
          <input value={preferences.graduationType || ''} onChange={(event) => setField('preferences', 'graduationType', event.target.value)} placeholder="2026 届 / 2026-07" />
        </label>
        <label>
          <span>期望薪资</span>
          <input value={preferences.salaryRange || ''} onChange={(event) => setField('preferences', 'salaryRange', event.target.value)} placeholder="10k-30k / 面议" />
        </label>
        <label>
          <span>公司规模</span>
          <select value={preferences.companySize || ''} onChange={(event) => setField('preferences', 'companySize', event.target.value)}>
            <option value="">不限</option>
            <option>大型公司</option>
            <option>中型公司</option>
            <option>成长型团队</option>
            <option>外企成熟团队</option>
          </select>
        </label>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={Boolean(preferences.remote)} onChange={(event) => setField('preferences', 'remote', event.target.checked)} />
        <span>接受远程或混合办公</span>
      </label>
    </div>
  );
}

function AutofillStep({ draft, setField }) {
  const autofill = draft?.autofill || {};
  return (
    <div className="onboarding-step">
      <StepHeading title="设置自动填写边界" text="KikiJob 只在你主动操作当前招聘表单时工作，最终提交始终由你在官网完成。" />
      <ChoiceGroup title="默认允许自动填写">
        <ChipGrid
          options={fillTypeOptions}
          values={safeArray(autofill.allowedTypes)}
          valueOf={(item) => item.id}
          labelOf={(item) => item.label}
          onChange={(values) => setField('autofill', 'allowedTypes', values)}
        />
      </ChoiceGroup>
      <div className="autofill-rule-grid">
        <PolicyCard icon={<CheckCircle2 size={18} />} title="每次确认" text="薪资、到岗时间、签证/工作许可固定为每次确认后再填。" />
        <PolicyCard icon={<ShieldCheck size={18} />} title="默认不填" text="性别、民族、残障等敏感字段不填，也不允许模型从简历推断。" />
        <PolicyCard icon={<LockKeyhole size={18} />} title="永不读取" text="密码和验证码不会被读取；最终提交始终由你在招聘官网点击。" />
      </div>
      <div className="policy-list">
        <p>薪资、到岗时间、签证/工作许可：每次确认后填写。</p>
        <p>性别、民族、残障、政治面貌：默认不填，也不从简历推断。</p>
        <p>验证码、登录密码、最终提交按钮：KikiJob 不读取、不绕过、不点击。</p>
      </div>
      <label>
        <span>Chrome Autofill 插件状态</span>
        <select value={autofill.pluginStatus || '稍后设置'} onChange={(event) => setField('autofill', 'pluginStatus', event.target.value)}>
          <option>稍后设置</option>
          <option>已安装</option>
          <option>需要安装说明</option>
        </select>
      </label>
    </div>
  );
}

function ReviewStep({ draft, goToStep }) {
  const resume = draft?.resume || {};
  const profile = draft?.profile || {};
  const preferences = draft?.preferences || {};
  const autofill = draft?.autofill || {};
  return (
    <div className="onboarding-step">
      <StepHeading title="完成检查" text="确认这些基础信息后，就可以进入 KikiJob 主工作台。" />
      <div className="review-module-grid">
        <ReviewModule title="简历与资料" stepId="resume" goToStep={goToStep} rows={[
          ['简历版本', resume.fileName || '未上传'],
          ['资料完整度', profileCompleteness(draft)],
          ['教育经历', `${safeArray(profile.education).length} 条`],
          ['工作/实习经历', `${safeArray(profile.experiences).length} 条`],
          ['项目经历', `${safeArray(profile.projects).length} 条`],
        ]} />
        <ReviewModule title="岗位偏好" stepId="preferences" goToStep={goToStep} rows={[
          ['目标岗位', safeArray(preferences.roles).join('、') || '未设置'],
          ['目标地点', safeArray(preferences.locations).join('、') || '未设置'],
          ['招聘类型', safeArray(preferences.recruitmentTypes).join('、') || '未设置'],
          ['公司类型', safeArray(preferences.companyTypes).join('、') || '未设置'],
          ['行业偏好', safeArray(preferences.industries).join('、') || '未设置'],
          ['薪资范围', preferences.salaryRange || '未设置'],
          ['远程偏好', preferences.remote ? '接受远程/混合' : '未开启'],
          ['公司规模', preferences.companySize || '不限'],
        ]} />
        <ReviewModule title="自动填写策略" stepId="autofill" goToStep={goToStep} rows={[
          ['默认允许', allowedFillLabels(safeArray(autofill.allowedTypes)).join('、') || '未开启'],
          ['每次确认', '薪资、到岗时间、签证/工作许可'],
          ['默认不填', '性别、民族、残障等敏感字段'],
          ['永不读取', '密码、验证码'],
          ['最终提交', '用户在招聘官网手动点击'],
          ['插件状态', autofill.pluginStatus || '稍后设置'],
        ]} />
      </div>
    </div>
  );
}

function StepHeading({ text, title }) {
  return (
    <div className="step-heading">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ChoiceGroup({ children, error, title }) {
  return (
    <section className="choice-group" aria-invalid={Boolean(error)}>
      <div>
        <h4>{title}</h4>
        <ErrorText message={error} />
      </div>
      {children}
    </section>
  );
}

function SearchableChoiceGroup({ error, onChange, options, placeholder, title, values }) {
  const [query, setQuery] = useState('');
  const safeOptions = safeArray(options);
  const safeValues = safeArray(values);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return safeOptions;
    return safeOptions.filter((option) => String(option || '').toLowerCase().includes(normalizedQuery));
  }, [safeOptions, query]);

  const addCustomValue = () => {
    const value = query.trim();
    if (!value || safeValues.includes(value)) return;
    onChange([...safeValues, value]);
    setQuery('');
  };

  return (
    <ChoiceGroup title={title} error={error}>
      <label className="choice-search">
        <span>{placeholder}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustomValue();
            }
          }}
          placeholder={placeholder}
        />
      </label>
      <ChipGrid options={visibleOptions} values={safeValues} onChange={onChange} />
      {query.trim() && !safeOptions.includes(query.trim()) && (
        <button type="button" className="chip-add-button" onClick={addCustomValue}>
          添加“{query.trim()}”
        </button>
      )}
    </ChoiceGroup>
  );
}

function ChipGrid({ labelOf = defaultChipLabel, onChange, options, valueOf = defaultChipValue, values }) {
  const safeOptions = safeArray(options);
  const safeValues = safeArray(values);
  const getValue = (option, index = 0) => {
    try {
      const rawValue = typeof valueOf === 'function' ? valueOf(option) : defaultChipValue(option);
      return safeText(rawValue) || `option-${index}`;
    } catch {
      return defaultChipValue(option) || `option-${index}`;
    }
  };
  const getLabel = (option) => {
    try {
      const rawLabel = typeof labelOf === 'function' ? labelOf(option) : defaultChipLabel(option);
      return safeText(rawLabel) || defaultChipLabel(option);
    } catch {
      return defaultChipLabel(option);
    }
  };

  const toggle = (option) => {
    const value = getValue(option);
    onChange(safeValues.includes(value) ? safeValues.filter((item) => item !== value) : [...safeValues, value]);
  };

  return (
    <div className="chip-grid">
      {safeOptions.map((option, index) => {
        const value = getValue(option, index);
        const selected = safeValues.includes(value);
        return (
          <button key={value} type="button" className={selected ? 'selected' : ''} onClick={() => toggle(option)}>
            <span aria-hidden="true">{selected ? '✓' : ''}</span>
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function PolicyCard({ icon, text, title }) {
  return (
    <article className="policy-card">
      <div>{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function ReviewModule({ goToStep, rows, stepId, title }) {
  return (
    <section className="review-module">
      <div className="section-head compact">
        <h4>{title}</h4>
        <button type="button" className="secondary-action" onClick={() => goToStep(stepId)}>
          <Pencil size={15} />
          编辑
        </button>
      </div>
      <div className="review-list">
        {rows.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function ErrorText({ id, message }) {
  if (!message) return null;
  return (
    <small className="field-error" id={id}>
      {message}
    </small>
  );
}

function allowedFillLabels(values = []) {
  return fillTypeOptions.filter((option) => values.includes(option.id)).map((option) => option.label);
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[、,;；]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function defaultChipValue(option) {
  if (option && typeof option === 'object') return safeText(option.id || option.value || option.label);
  return safeText(option);
}

function defaultChipLabel(option) {
  if (option && typeof option === 'object') return safeText(option.label || option.value || option.id);
  return safeText(option);
}

function safeText(value) {
  if (value === undefined || value === null) return '';
  try {
    return `${value}`;
  } catch {
    return '';
  }
}

function EditableCollection({ emptyItem, fields, items, onChange, title }) {
  const updateItem = (index, key, value) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const addItem = () => onChange([...items, { ...emptyItem }]);

  const deleteItem = (index) => {
    if (!window.confirm(`将删除${title}第 ${index + 1} 条。此操作只影响当前确认草稿，保存后才会写入资料。确定删除吗？`)) return;
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section className="editable-collection">
      <div className="section-head compact">
        <div>
          <h4>{title}</h4>
          <p>{items.length ? `${items.length} 条` : '暂未识别，可手动新增'}</p>
        </div>
        <button type="button" className="secondary-action" onClick={addItem}>新增一项</button>
      </div>
      <div className="editable-list">
        {items.map((item, index) => (
          <article key={`${title}-${index}`} className="editable-item">
            <div className="section-head compact">
              <strong>{title} {index + 1}</strong>
              <button type="button" className="danger-action" onClick={() => deleteItem(index)}>删除</button>
            </div>
            <div className="onboarding-field-grid">
              {fields.map(([key, label]) => (
                <label key={key} className={!item[key] ? 'missing-field' : ''}>
                  <span>{label}</span>
                  {key === 'description' || key === 'courses' ? (
                    <textarea rows={3} value={item[key] || ''} onChange={(event) => updateItem(index, key, event.target.value)} />
                  ) : (
                    <input value={item[key] || ''} onChange={(event) => updateItem(index, key, event.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function profilePreviewRows(profile = {}) {
  return [
    ['姓名', profile.name],
    ['邮箱', maskContact(profile.email)],
    ['电话', maskContact(profile.phone)],
    ['学校', profile.school],
    ['学历', profile.degree],
    ['专业', profile.major],
    ['毕业时间', profile.graduationDate],
    ['教育经历', `${profile.education?.length || 0} 条`],
    ['工作/实习经历', `${profile.experiences?.length || 0} 条`],
    ['项目经历', `${profile.projects?.length || 0} 条`],
  ];
}

function truncateFileName(fileName = '') {
  if (fileName.length <= 34) return fileName;
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  return `${fileName.slice(0, 18)}...${fileName.slice(Math.max(18, fileName.length - 10 - extension.length))}`;
}

function maskContact(value = '') {
  const text = String(value);
  if (!text) return '';
  if (text.includes('@')) {
    const [name, domain] = text.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return text.replace(/(\d{3})\d+(\d{3})/, '$1****$2');
}

function profileCompleteness(draft) {
  const profile = draft?.profile || {};
  const keys = ['name', 'email', 'phone', 'school', 'degree', 'major', 'graduationDate'];
  const values = keys.filter((key) => Boolean(profile[key])).length;
  return `${Math.round((values / keys.length) * 100)}%`;
}
