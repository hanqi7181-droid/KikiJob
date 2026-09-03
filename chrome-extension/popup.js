const API_BASE_URL = (window.JobPilotConfig?.API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '');

const packageInput = document.querySelector('#packageInput');
const scanButton = document.querySelector('#scanButton');
const copyScanButton = document.querySelector('#copyScanButton');
const fillButton = document.querySelector('#fillButton');
const watchButton = document.querySelector('#watchButton');
const watchStatusButton = document.querySelector('#watchStatusButton');
const stopWatchButton = document.querySelector('#stopWatchButton');
const exportMokaSchemaButton = document.querySelector('#exportMokaSchemaButton');
const probeMokaSchemaButton = document.querySelector('#probeMokaSchemaButton');
const learnedButton = document.querySelector('#learnedButton');
const scopeSelect = document.querySelector('#scopeSelect');
const statusBox = document.querySelector('#status');
const resultsBox = document.querySelector('#results');

let lastScan = { fields: [], url: '', adapter: 'generic' };
let learnedMappings = [];
let formMappingsPayload = [];
let profileCandidatesPayload = [];

function setStatus(text) {
  statusBox.textContent = text;
}

function renderResults(items = [], mode = 'result') {
  resultsBox.innerHTML = '';
  for (const item of items) {
    resultsBox.appendChild(mode === 'learned' ? learnedRow(item) : resultRow(item));
  }
}

function resultRow(item) {
  const title = item.field || item.label || item.name || item.placeholder || item.selector || '字段';
  const kind = item.status || item.inputType || item.type || item.elementType || item.matchSource || 'field';
  const meta = [
    item.selector,
    item.name ? `name=${item.name}` : '',
    item.required ? 'required' : '',
    item.visible === false ? 'hidden' : '',
    item.options?.length ? `options=${item.options.length}` : '',
    item.mappingSource ? `来源=${item.mappingSource}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const row = document.createElement('article');
  row.className = 'result';
  row.dataset.selector = item.selector || '';
  row.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span class="pill ${escapeHtml(kind)}">${escapeHtml(kind)}</span>
    <small>${escapeHtml(item.reason || meta || item.nearbyText || '')}</small>
    ${item.nearbyText && meta ? `<small>${escapeHtml(item.nearbyText)}</small>` : ''}
  `;

  if (row.dataset.selector) {
    row.title = '点击定位到页面字段';
    row.addEventListener('click', async (event) => {
      if (event.target.closest('select,button,pre')) return;
      try {
        await sendToTab({ type: 'AUTO_CV_FOCUS_FIELD', selector: row.dataset.selector });
      } catch (error) {
        setStatus(error.message || '定位失败');
      }
    });
  }

  if (item.selector && item.fieldId) {
    row.appendChild(mappingControls(item));
  }
  if (item.debugReport) {
    row.appendChild(debugControls(item.debugReport));
  }
  return row;
}

function debugControls(debugReport) {
  const wrapper = document.createElement('div');
  wrapper.className = 'debug-controls';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '复制 Debug';
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(debugReport);
    setStatus('已复制 Debug Report');
  });

  const details = document.createElement('pre');
  details.className = 'debug-report';
  details.textContent = debugReport;

  wrapper.append(button, details);
  return wrapper;
}

function mappingControls(field) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mapping-controls';

  const select = document.createElement('select');
  select.innerHTML = `<option value="">选择标准字段并填写</option>`;
  for (const candidate of candidateFields()) {
    const option = document.createElement('option');
    option.value = candidate.id;
    option.textContent = `${candidate.label}${candidate.source ? ` · ${candidate.source}` : ''}`;
    select.appendChild(option);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '确认并记住';
  button.addEventListener('click', async () => {
    const candidate = candidateFields().find((item) => item.id === select.value);
    if (!candidate) {
      setStatus('请先选择一个标准字段');
      return;
    }
    await confirmMapping(field, candidate);
  });

  wrapper.append(select, button);
  return wrapper;
}

function learnedRow(mapping) {
  const row = document.createElement('article');
  row.className = 'result';
  row.innerHTML = `
    <strong>${escapeHtml(mapping.scannedLabel || mapping.fieldSignature)}</strong>
    <span class="pill learned">网站记忆</span>
    <small>${escapeHtml(`${mapping.scope} · ${mapping.domain || mapping.adapter || 'global'} -> ${mapping.canonicalField}`)}</small>
  `;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '删除';
  button.addEventListener('click', async () => {
    learnedMappings = learnedMappings.filter((item) => item.id !== mapping.id);
    await persistLearnedMappings();
    renderResults(learnedMappings, 'learned');
    setStatus('已删除学习映射');
  });
  row.appendChild(button);
  return row;
}

async function confirmMapping(field, candidate) {
  const tab = await getActiveTab();
  const scope = scopeSelect.value || 'domain';
  const sensitive = isSensitiveField(field);
  const mapping = {
    id: `learned-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'learnedFieldMapping',
    scope,
    domain: domainFromUrl(tab.url),
    pageUrl: scope === 'page' ? normalizePageUrl(tab.url) : '',
    adapter: lastScan.adapter || 'generic',
    fieldSignature: fieldSignature(field),
    scannedLabel: field.label || field.name || field.placeholder || field.selector,
    canonicalField: candidate.label,
    candidateId: candidate.id,
    value: candidate.value,
    mappingSource: '人工选择',
    sensitive,
    autoFillAllowed: !sensitive,
    createdAt: new Date().toISOString(),
  };

  upsertLearnedMapping(mapping);
  await persistLearnedMappings();

  const step = {
    field: candidate.label,
    canonicalField: candidate.label,
    selector: field.selector,
    value: candidate.value,
    confidence: sensitive ? '中' : '人工确认',
    confirmed: !sensitive,
    matchSource: 'manual_choice',
    riskLevel: sensitive ? 'high' : 'low',
  };

  if (sensitive) {
    setStatus('敏感字段已记住为候选，但不会默认自动填写');
    renderResults([{ ...field, status: 'needs_confirmation', reason: '敏感字段需要每次人工确认', mappingSource: '人工选择' }]);
    return;
  }

  const response = await sendToTab({ type: 'AUTO_CV_FILL_ONE_FIELD', step });
  const summary = response.summary || {};
  setStatus(`已保存映射并填写：成功 ${summary.success || 0}，跳过 ${summary.skipped || 0}，失败 ${summary.failed || 0}`);
  renderResults(response.results || []);
}

function upsertLearnedMapping(mapping) {
  learnedMappings = learnedMappings.filter(
    (item) => !(item.scope === mapping.scope && item.domain === mapping.domain && item.adapter === mapping.adapter && item.fieldSignature === mapping.fieldSignature)
  );
  learnedMappings.unshift(mapping);
}

async function persistLearnedMappings() {
  if (scopeSelect.value === 'page') {
    await chrome.storage.local.set({ jobpilotPageMappings: learnedMappings.filter((item) => item.scope === 'page') });
    return;
  }
  const ordinaryMappings = formMappingsPayload.filter((item) => item.kind !== 'learnedFieldMapping');
  const payload = [...ordinaryMappings, ...learnedMappings.filter((item) => item.scope !== 'page')];
  const response = await fetch(`${API_BASE_URL}/form-mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formMappings: payload }),
  });
  if (!response.ok) throw new Error('保存映射失败，请确认后端已启动');
  formMappingsPayload = payload;
}

async function loadMappings() {
  const pageMappings = (await chrome.storage.local.get('jobpilotPageMappings')).jobpilotPageMappings || [];
  try {
    const response = await fetch(`${API_BASE_URL}/bootstrap`);
    if (!response.ok) throw new Error('bootstrap failed');
    const payload = await response.json();
    formMappingsPayload = payload.formMappings || [];
    profileCandidatesPayload = buildProfileCandidates(payload);
    learnedMappings = [...pageMappings, ...formMappingsPayload.filter((item) => item.kind === 'learnedFieldMapping')];
  } catch (_error) {
    formMappingsPayload = [];
    profileCandidatesPayload = [];
    learnedMappings = pageMappings;
  }
}

function applyLearnedMappings(fields = [], tabUrl = '') {
  return fields.map((field) => {
    const mapping = findLearnedMapping(field, tabUrl);
    if (!mapping) return field;
    return {
      ...field,
      field: mapping.canonicalField,
      value: mapping.value,
      status: mapping.autoFillAllowed ? 'learned' : 'needs_confirmation',
      mappingSource: mapping.scope === 'domain' ? '网站记忆' : mapping.scope === 'ats' ? 'ATS记忆' : mapping.scope === 'global' ? '全局同义词' : '页面临时',
      reason: mapping.autoFillAllowed ? '命中已学习映射，可优先使用' : '命中已学习映射，但敏感字段需要确认',
    };
  });
}

function findLearnedMapping(field, tabUrl) {
  const signature = fieldSignature(field);
  const domain = domainFromUrl(tabUrl);
  const pageUrl = normalizePageUrl(tabUrl);
  const adapter = lastScan.adapter || 'generic';
  const priority = ['page', 'domain', 'ats', 'global'];
  return learnedMappings
    .filter((item) => item.fieldSignature === signature)
    .filter((item) => {
      if (item.scope === 'page') return item.pageUrl === pageUrl;
      if (item.scope === 'domain') return item.domain === domain;
      if (item.scope === 'ats') return item.adapter === adapter;
      return item.scope === 'global';
    })
    .sort((a, b) => priority.indexOf(a.scope) - priority.indexOf(b.scope))[0];
}

function candidateFields() {
  const fromPackage = safeParsePackage().map((step, index) => ({
    id: `package-${index}-${step.field || step.canonicalField || step.sourceLabel || step.id}`,
    label: step.canonicalField || step.field || step.sourceLabel || step.id || `字段${index + 1}`,
    source: step.sourceLabel || step.matchSource || '填充包',
    value: step.value ?? step.answer ?? step.confirmedAnswer ?? '',
  }));
  const fromBackend = formMappingsPayload
    .filter((item) => item.kind !== 'learnedFieldMapping')
    .map((item, index) => ({
      id: `backend-${index}-${item.id || item.label}`,
      label: item.label || item.sourceLabel || item.id || `字段${index + 1}`,
      source: item.sourceLabel || '标准规则',
      value: item.value || '',
    }));
  return uniqueCandidates([...fromPackage, ...fromBackend, ...profileCandidatesPayload]).filter((item) => item.value || item.label);
}

function buildProfileCandidates(payload = {}) {
  if (payload.formMappings?.some((item) => item.kind === 'standardFormMapping')) return [];
  const profile = payload.profile || {};
  const parsed = payload.latestResume?.parsedProfile || {};
  const rows = [];
  const add = (label, value, source = '最新简历词库', key = label) => {
    rows.push({
      id: `profile-${rows.length}-${key}`,
      label,
      source,
      value: value || '',
    });
  };

  const text = parsed.fullText || parsed.summary || '';
  const skills = parsed.skillDetails || {};
  const phone = pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, text);
  const email = pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, text);
  const hometown = pick(/(?:辽宁|北京|上海|深圳|广州|杭州|香港|浙江|成都|南京|苏州)[\u4e00-\u9fa5]*/, text);
  const birthDate = pick(/(?:19|20)\d{2}[./-]\d{1,2}/, text);
  const jobIntention = pick(/求职意向[:：]\s*([^。；\n]+)/, text);

  add('姓名', parsed.name, '基础资料', 'personal.name');
  add('邮箱', email, '基础资料', 'personal.email');
  add('电话', phone, '基础资料', 'personal.phone');
  add('籍贯', hometown, '基础资料', 'personal.hometown');
  add('出生年月', birthDate, '基础资料', 'personal.birthDate');
  add('政治面貌', /中共党员/.test(text) ? '中共党员' : '', '基础资料', 'personal.politicalStatus');
  add('求职意向', jobIntention || profile.roles, '基础资料', 'personal.jobIntention');
  add('简历文件', profile.resumeName || payload.latestResume?.fileName, '基础资料', 'personal.resumeFile');

  add('技能总结', [skills.programming, skills.data, skills.product, skills.languages].filter(Boolean).join('；'), '技能', 'skills.summary');
  add('AI技能', [skills.data, parsed.skills?.join('、')].filter(Boolean).join('；'), '技能', 'skills.ai');
  add('语言能力', skills.languages || parsed.languages?.join('、'), '技能', 'skills.languages');
  add('英语水平', skills.languages || parsed.languages?.join('、'), '技能', 'skills.english');
  add('编程开发', skills.programming, '技能', 'skills.programming');
  add('数据技术', skills.data, '技能', 'skills.data');
  add('产品工具', skills.product, '技能', 'skills.product');
  add('其他技能', [skills.programming, skills.data, skills.product].filter(Boolean).join('；'), '技能', 'skills.other');

  appendGroup(rows, '教育经历', 'education', parsed.educationDetails || []);
  appendGroup(rows, '实习经历', 'internship', parsed.workExperienceDetails || []);
  appendGroup(rows, '项目经历', 'project', parsed.projectExperienceDetails || []);
  appendGroup(rows, '实践荣誉', 'practice', parsed.practiceDetails || []);
  return rows;
}

function appendGroup(rows, groupLabel, keyPrefix, items = []) {
  const labelMap = {
    school: '学校',
    degree: '学历',
    major: '专业',
    startDate: '开始时间',
    endDate: '结束时间',
    ranking: '排名/成绩',
    courses: '主修课程',
    description: '职责/描述',
    company: '公司名称',
    department: '部门',
    role: '职位/角色',
    name: '项目名称',
    technologies: '技术栈',
    title: '名称',
  };
  items.forEach((item, itemIndex) => {
    Object.entries(item || {}).forEach(([key, value]) => {
      rows.push({
        id: `profile-${keyPrefix}-${itemIndex + 1}-${key}`,
        label: `${groupLabel}${itemIndex + 1}-${labelMap[key] || key}`,
        source: groupLabel,
        value: value || '',
      });
    });
  });
}

function uniqueCandidates(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.label}::${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePackage() {
  const raw = packageInput.value.trim();
  if (!raw) throw new Error('请先粘贴 Auto CV 填充包 JSON');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.steps)) return parsed.steps;
  throw new Error('填充包格式不正确，需要数组或 { steps: [...] }');
}

function safeParsePackage() {
  try {
    return parsePackage();
  } catch (_error) {
    return [];
  }
}

function fieldSignature(field) {
  return normalize([field.label, field.name, field.id, field.placeholder, field.inputType, field.selector].filter(Boolean).join('|'));
}

function isSensitiveField(field) {
  const text = [field.label, field.name, field.id, field.placeholder, field.nearbyText].filter(Boolean).join(' ');
  return /性别|gender|sex|民族|ethnicity|race|残障|残疾|disability|政治面貌|政治身份|党员|political|婚姻|marital|宗教|religion/i.test(text);
}

function domainFromUrl(url = '') {
  try {
    return new URL(url).hostname;
  } catch (_error) {
    return '';
  }
}

function normalizePageUrl(url = '') {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch (_error) {
    return url;
  }
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[\s/_\-:：*（）()[\]{}"'‘’“”，,.;；。]+/g, '');
}

function pick(pattern, text = '') {
  const match = String(text).match(pattern);
  return match ? match[1] || match[0] : '';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('没有找到当前标签页');
  if (/^(chrome|edge|about):\/\//.test(tab.url || '')) {
    throw new Error('当前页面不允许扩展注入脚本，请切换到 Careers 申请页后再试');
  }
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [
      'src/content/core/normalize.js',
      'src/content/core/scanner.js',
      'src/content/core/matcher.js',
      'src/content/core/filler.js',
      'src/content/core/profileNormalizer.js',
      'src/content/core/dynamicForms.js',
      'src/content/repeaters/generic.js',
      'src/content/adapters/generic.js',
      'src/content/adapters/moka.js',
      'src/content/adapters/mokaDrivers.js',
      'src/content/adapters/mokaV2.js',
      'src/content/adapters/mokaGoldenSchema.js',
      'src/content/adapters/registry.js',
      'contentScript.js',
    ],
  });
}

async function sendToTab(message) {
  const tab = await getActiveTab();
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    if (!String(error.message || '').includes('Receiving end does not exist')) {
      throw error;
    }
    await ensureContentScript(tab.id);
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

scanButton.addEventListener('click', async () => {
  try {
    await loadMappings();
    setStatus('正在扫描当前页...');
    const tab = await getActiveTab();
    const response = await sendToTab({ type: 'AUTO_CV_SCAN_FIELDS' });
    lastScan = { fields: response.fields || [], url: response.url || tab.url, adapter: response.adapter || 'generic' };
    const fields = applyLearnedMappings(lastScan.fields, lastScan.url);
    setStatus(`检测到 ${fields.length} 个字段。适配器：${lastScan.adapter}。已学习映射 ${learnedMappings.length} 条。`);
    renderResults(fields);
  } catch (error) {
    setStatus(error.message || '扫描失败');
  }
});

copyScanButton.addEventListener('click', async () => {
  try {
    if (!lastScan.fields?.length) {
      await loadMappings();
      const tab = await getActiveTab();
      const response = await sendToTab({ type: 'AUTO_CV_SCAN_FIELDS' });
      lastScan = { fields: response.fields || [], url: response.url || tab.url, adapter: response.adapter || 'generic' };
    }
    const payload = {
      source: 'JobPilot Chrome Extension',
      exportedAt: new Date().toISOString(),
      url: lastScan.url,
      adapter: lastScan.adapter,
      fields: lastScan.fields || [],
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setStatus(`已复制扫描 JSON：${payload.fields.length} 个字段。回到前端“扩展真实扫描 JSON”粘贴即可。`);
  } catch (error) {
    setStatus(error.message || '复制扫描 JSON 失败');
  }
});

fillButton.addEventListener('click', async () => {
  try {
    const steps = parsePackage();
    setStatus('正在填充当前页...');
    const response = await sendToTab({ type: 'AUTO_CV_FILL_STEPS', steps });
    const summary = response.summary || {};
    setStatus(`已尝试预填：成功 ${summary.success || 0}，跳过 ${summary.skipped || 0}，失败 ${summary.failed || 0}。请逐项检查，确认无误后再手动提交。`);
    renderResults(response.results || []);
    exportMokaAutofillDebugReport(response.results || []);
  } catch (error) {
    setStatus(error.message || '填充失败');
  }
});

learnedButton.addEventListener('click', async () => {
  await loadMappings();
  setStatus(`已学习映射 ${learnedMappings.length} 条。默认优先级：页面临时 > 当前域名 > ATS 平台 > 全局同义词。`);
  renderResults(learnedMappings, 'learned');
});

watchButton.addEventListener('click', async () => {
  try {
    const response = await sendToTab({ type: 'AUTO_CV_START_DYNAMIC_WATCH' });
    setStatus(`已开始监听动态表单。当前步骤数：${response.dynamic?.steps?.length || 0}`);
    renderDynamicSteps(response.dynamic?.steps || []);
  } catch (error) {
    setStatus(error.message || '启动监听失败');
  }
});

watchStatusButton.addEventListener('click', async () => {
  try {
    const response = await sendToTab({ type: 'AUTO_CV_DYNAMIC_STATUS' });
    setStatus(response.dynamic?.running ? '动态表单监听中' : '动态表单未监听');
    renderDynamicSteps(response.dynamic?.steps || []);
  } catch (error) {
    setStatus(error.message || '读取步骤统计失败');
  }
});

stopWatchButton.addEventListener('click', async () => {
  try {
    const response = await sendToTab({ type: 'AUTO_CV_STOP_DYNAMIC_WATCH' });
    setStatus(`已停止监听。记录步骤数：${response.dynamic?.steps?.length || 0}`);
    renderDynamicSteps(response.dynamic?.steps || []);
  } catch (error) {
    setStatus(error.message || '停止监听失败');
  }
});

exportMokaSchemaButton.addEventListener('click', async () => {
  await exportMokaSchema(false);
});

probeMokaSchemaButton.addEventListener('click', async () => {
  await exportMokaSchema(true);
});

window.addEventListener('unload', () => {
  sendToTab({ type: 'AUTO_CV_STOP_DYNAMIC_WATCH' }).catch(() => {});
});

async function exportMokaSchema(probeComponents) {
  try {
    setStatus(probeComponents ? '正在导出 MokaHR Golden Schema，并安全探测组件...' : '正在导出 MokaHR Golden Schema...');
    const response = await sendToTab({ type: 'AUTO_CV_EXPORT_MOKA_SCHEMA', probeComponents });
    if (!response.ok) throw new Error(response.error || '导出失败');
    const summary = response.summary || {};
    setStatus(
      `已导出：${response.files?.join('，') || 'MokaHR Schema'}。识别 Section ${summary.sectionCount || 0} 个，Field ${summary.fieldCount || 0} 个，组件 ${summary.componentTypes?.join(' / ') || '无'}。`
    );
    renderResults(schemaSummaryRows(summary));
  } catch (error) {
    setStatus(error.message || '导出 MokaHR 页面结构失败');
  }
}

function schemaSummaryRows(summary = {}) {
  return (summary.sections || []).map((section) => ({
    field: section.sectionTitle || section.sectionType,
    status: section.repeatable ? 'repeatable' : 'section',
    reason: `items=${section.itemCount || 0} · fields=${section.fieldCount || 0} · add=${section.hasAddButton ? 'yes' : 'no'} · delete=${section.hasDeleteButton ? 'yes' : 'no'}`,
    nearbyText: section.fieldsPreview?.join('；') || '',
  }));
}

function exportMokaAutofillDebugReport(results = []) {
  const mokaResults = results.filter((item) => item.adapter === 'mokaV2');
  if (!mokaResults.length) return;
  const report = buildMokaAutofillDebugReport(mokaResults);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadText(`moka-autofill-debug-report.${stamp}.json`, JSON.stringify(report, null, 2), 'application/json');
  downloadText(`moka-autofill-debug-report.${stamp}.md`, renderMokaAutofillDebugMarkdown(report), 'text/markdown');
}

function buildMokaAutofillDebugReport(results = []) {
  const fillableStatuses = new Set(['SUCCESS', 'FAILED', 'NEED_CONFIRMATION', 'NOT_FOUND', 'SKIPPED', 'MANUAL']);
  const fieldResults = results.filter((item) => item.componentType !== 'section');
  const repeaters = results.filter((item) => item.componentType === 'section');
  const added = repeaters.filter((item) => item.status === 'SUCCESS' && /新增 item/.test(item.reason || '')).length;
  const duplicateAdds = repeaters.filter((item) => /重复新增|duplicate/i.test(item.reason || '')).length;
  const errorFilled = fieldResults.filter((item) => {
    if (item.status !== 'SUCCESS' || !item.readAfter || !item.profileValuePreview) return false;
    if (String(item.profileValuePreview).includes('***')) return false;
    return item.readAfter !== item.profileValuePreview && !valuesLookCompatible(item.readAfter, item.profileValuePreview);
  }).length;
  return {
    generatedAt: new Date().toISOString(),
    adapter: 'mokaV2',
    summary: {
      pageFieldTotal: fieldResults.length,
      fillableFieldTotal: fieldResults.filter((item) => fillableStatuses.has(item.status)).length,
      successFieldTotal: fieldResults.filter((item) => item.status === 'SUCCESS').length,
      failedFieldTotal: fieldResults.filter((item) => ['FAILED', 'NOT_FOUND'].includes(item.status)).length,
      needsConfirmationFieldTotal: fieldResults.filter((item) => item.status === 'NEED_CONFIRMATION').length,
      errorFilledFieldTotal: errorFilled,
      autoAddedItemTotal: added,
      duplicateAddedItemTotal: duplicateAdds,
    },
    sections: groupMokaDebugBySection(results),
    results,
  };
}

function groupMokaDebugBySection(results = []) {
  const map = new Map();
  for (const item of results) {
    const sectionName = item.section || '未知 Section';
    if (!map.has(sectionName)) map.set(sectionName, { section: sectionName, items: new Map(), sectionEvents: [] });
    const section = map.get(sectionName);
    if (item.componentType === 'section') {
      section.sectionEvents.push(item);
      continue;
    }
    const itemKey = item.itemIndex ?? -1;
    if (!section.items.has(itemKey)) section.items.set(itemKey, []);
    section.items.get(itemKey).push(item);
  }
  return Array.from(map.values()).map((section) => ({
    section: section.section,
    sectionEvents: section.sectionEvents,
    items: Array.from(section.items.entries()).map(([itemIndex, fields]) => ({ itemIndex, fields })),
  }));
}

function renderMokaAutofillDebugMarkdown(report) {
  const lines = [
    '# Moka Autofill Debug Report',
    '',
    `Generated At: ${report.generatedAt}`,
    '',
    '## Summary',
    `- 页面字段总数: ${report.summary.pageFieldTotal}`,
    `- 可填写字段: ${report.summary.fillableFieldTotal}`,
    `- 成功字段: ${report.summary.successFieldTotal}`,
    `- 失败字段: ${report.summary.failedFieldTotal}`,
    `- 待确认字段: ${report.summary.needsConfirmationFieldTotal}`,
    `- 错误填写字段: ${report.summary.errorFilledFieldTotal}`,
    `- 自动新增经历数量: ${report.summary.autoAddedItemTotal}`,
    `- 重复新增数量: ${report.summary.duplicateAddedItemTotal}`,
    '',
  ];
  for (const section of report.sections) {
    lines.push(`## ${section.section}`);
    for (const event of section.sectionEvents) {
      lines.push(`- ${statusMark(event.status)} ${event.reason || event.status}`);
    }
    for (const item of section.items) {
      lines.push(`### Item ${item.itemIndex}`);
      for (const field of item.fields) {
        const target = field.profilePath ? ` → ${field.profilePath}` : '';
        const failure = field.failureReason ? `：${field.failureReason}` : '';
        lines.push(`- ${statusMark(field.status)} ${field.pageLabel || field.label || field.canonicalField}${target} (${field.componentType}/${field.fillMethod || 'unknown'})${failure}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function statusMark(status) {
  if (status === 'SUCCESS' || status === 'filled') return '✓';
  if (status === 'NEED_CONFIRMATION' || status === 'MANUAL') return '△';
  if (status === 'SKIPPED') return '-';
  return '×';
}

function valuesLookCompatible(actual = '', expected = '') {
  const normalizeValue = (value) => String(value || '').toLowerCase().replace(/[\s/_\-:：*（）()[\]{}"'‘’“”，,.;；。]+/g, '');
  const a = normalizeValue(actual);
  const b = normalizeValue(expected);
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderDynamicSteps(steps = []) {
  renderResults(
    steps.map((step) => ({
      field: `步骤 ${step.stepIndex}`,
      status: step.reason || 'step',
      reason: `字段 ${step.fieldCount} · 匹配 ${step.matchedCount} · 成功 ${step.fillSuccessCount} · 待确认 ${step.needsConfirmationCount} · 失败 ${step.failedCount} · 丢失 ${step.lostFieldCount}`,
      nearbyText: step.lostFields?.map((item) => `${item.selector}: ${item.reason}`).join('；'),
    }))
  );
}

loadMappings().catch(() => {});
