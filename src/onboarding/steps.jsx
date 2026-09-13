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

const commonCityOptions = ['北京', '上海', '广州', '深圳'];
const companyTypeOptions = ['央国企', '大厂', '外企'];
const industryRoleGroups = [
  { industry: '人工智能', roles: ['AI 产品经理', 'AI Agent 工程师', 'AI 应用开发工程师', '机器学习工程师', '计算机视觉算法工程师', '算法工程师'] },
  { industry: '互联网', roles: ['产品经理', '用户增长', '产品运营', '数据产品经理', '前端工程师', '后端工程师'] },
  { industry: '金融科技', roles: ['金融科技产品经理', '量化研究助理', '风控策略分析师', '数据分析师', '商业分析师'] },
  { industry: '咨询与商业分析', roles: ['商业分析师', '战略分析师', '管理咨询顾问', '行业研究员'] },
  { industry: '消费品与品牌', roles: ['品牌管培生', '市场营销', '用户研究', '电商运营', '产品运营'] },
  { industry: '企业服务', roles: ['SaaS 产品经理', '解决方案顾问', '客户成功', '项目经理'] },
];
const cityOptionsByLetter = [
  ['A', ['鞍山', '安庆', '安阳', '安顺', '阿克苏']],
  ['B', ['北京', '保定', '包头', '宝鸡', '蚌埠', '北海']],
  ['C', ['重庆', '成都', '长沙', '长春', '常州', '沧州']],
  ['D', ['大连', '东莞', '东营', '德州', '大庆', '丹东']],
  ['F', ['佛山', '福州', '抚顺', '阜阳']],
  ['G', ['广州', '贵阳', '桂林', '赣州']],
  ['H', ['杭州', '合肥', '哈尔滨', '海口', '惠州', '呼和浩特', '湖州', '邯郸']],
  ['J', ['济南', '嘉兴', '金华', '吉林', '江门', '九江']],
  ['K', ['昆明', '开封']],
  ['L', ['兰州', '洛阳', '廊坊', '柳州', '临沂']],
  ['M', ['绵阳', '马鞍山']],
  ['N', ['南京', '宁波', '南昌', '南宁', '南通']],
  ['Q', ['青岛', '泉州', '秦皇岛']],
  ['S', ['上海', '深圳', '苏州', '沈阳', '石家庄', '绍兴', '三亚']],
  ['T', ['天津', '太原', '唐山', '台州']],
  ['W', ['武汉', '无锡', '温州', '乌鲁木齐', '威海', '潍坊']],
  ['X', ['西安', '厦门', '徐州', '香港', '新乡', '襄阳']],
  ['Y', ['烟台', '扬州', '银川', '宜昌']],
  ['Z', ['郑州', '珠海', '中山', '镇江', '淄博']],
];
const locationOptions = cityOptionsByLetter.flatMap(([, cities]) => cities);
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
  const [, setStatus] = useState(authUser ? '已登录，后续数据会保存到当前账号。' : '');
  const [pendingAction, setPendingAction] = useState('');

  const account = String(login.account || '').trim();
  const loginStatus = String(login.sessionStatus || '').trim();
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
          {loginStatus && (
            <p className="login-action-status" role="status" aria-live="polite">
              {loginStatus}
            </p>
          )}
        </div>
        <label className="check-row agreement-row">
          <input
            type="checkbox"
            checked={Boolean(login.acceptedTerms)}
            onChange={(event) => setField('login', 'acceptedTerms', event.target.checked)}
            aria-invalid={Boolean(errors.acceptedTerms)}
            aria-describedby={errors.acceptedTerms ? 'onboarding-terms-error' : undefined}
          />
          <span>我已阅读并同意服务条款和隐私说明。登录后，你的简历、字段词库、投递记录会按账号隔离保存。</span>
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
      <StepHeading title="上传简历" text="当前后端支持 PDF、DOCX、TXT、Markdown；扫描版 PDF 暂不支持 OCR。" />
      <label className="onboarding-upload">
        <Upload size={24} />
        <strong title={resume.fileName}>{truncateFileName(resume.fileName) || '选择 PDF / DOCX / TXT / Markdown 简历'}</strong>
        <span>{resume.fileSize ? `${resume.fileSize} · ${statusText}` : statusText}</span>
        <input
          id="onboarding-resume"
          type="file"
          accept=".pdf,.docx,.txt,.md"
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
      <IndustryRolePicker
        error={errors.roles}
        industryValues={safeArray(preferences.industries)}
        roleValues={safeArray(preferences.roles)}
        onIndustryChange={(values) => setField('preferences', 'industries', values)}
        onRoleChange={(values) => setField('preferences', 'roles', values)}
      />
      <CityChoiceGroup
        title="目标地点"
        error={errors.locations}
        values={safeArray(preferences.locations)}
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

function IndustryRolePicker({ error, industryValues, onIndustryChange, onRoleChange, roleValues }) {
  const [activeIndustry, setActiveIndustry] = useState(industryValues[0] || industryRoleGroups[0].industry);
  const activeGroup = industryRoleGroups.find((group) => group.industry === activeIndustry) || industryRoleGroups[0];

  const toggleIndustry = (industry) => {
    setActiveIndustry(industry);
    if (!industryValues.includes(industry)) onIndustryChange([...industryValues, industry]);
  };

  const updateRoles = (values) => {
    if (!industryValues.includes(activeGroup.industry)) onIndustryChange([...industryValues, activeGroup.industry]);
    onRoleChange(values);
  };

  return (
    <ChoiceGroup title="岗位偏好" error={error}>
      <div className="preference-split">
        <div className="industry-tabs" aria-label="行业分类">
          {industryRoleGroups.map((group) => (
            <button
              key={group.industry}
              type="button"
              className={group.industry === activeIndustry ? 'selected' : ''}
              onClick={() => toggleIndustry(group.industry)}
            >
              {group.industry}
            </button>
          ))}
        </div>
        <ChipGrid options={activeGroup.roles} values={roleValues} onChange={updateRoles} />
      </div>
    </ChoiceGroup>
  );
}

function CityChoiceGroup({ error, onChange, title, values }) {
  const [query, setQuery] = useState('');
  const safeValues = safeArray(values);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = cityOptionsByLetter
    .map(([letter, cities]) => [
      letter,
      normalizedQuery ? cities.filter((city) => city.toLowerCase().includes(normalizedQuery)) : cities,
    ])
    .filter(([, cities]) => cities.length);

  const addCustomValue = () => {
    const value = query.trim();
    if (!value || safeValues.includes(value)) return;
    onChange([...safeValues, value]);
    setQuery('');
  };

  return (
    <ChoiceGroup title={title} error={error}>
      <div className="common-city-row">
        <span>常用城市</span>
        <ChipGrid options={commonCityOptions} values={safeValues} onChange={onChange} />
      </div>
      <label className="choice-search">
        <span>按 A-Z 搜索中国省市</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustomValue();
            }
          }}
          placeholder="输入城市或省份名称"
        />
      </label>
      <div className="city-letter-list">
        {visibleGroups.map(([letter, cities]) => (
          <section className="city-letter-group" key={letter}>
            <strong>{letter}</strong>
            <ChipGrid options={cities} values={safeValues} onChange={onChange} />
          </section>
        ))}
      </div>
      {query.trim() && !locationOptions.includes(query.trim()) && (
        <button type="button" className="chip-add-button" onClick={addCustomValue}>
          添加“{query.trim()}”
        </button>
      )}
    </ChoiceGroup>
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
