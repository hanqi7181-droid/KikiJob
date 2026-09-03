import { matchScannedFields } from './genericFieldMatcher.js';

const platformTemplates = [
  {
    id: 'ctrip',
    name: '携程校招简历页',
    patterns: ['careers.ctrip.com'],
    fields: [
      field('fullName', '姓名 / Full Name', 'input', 'candidate_name', '姓名', '姓名'),
      field('email', '邮箱 / Email', 'input', 'email', '邮箱', '邮箱'),
      field('phone', '手机号 / Phone', 'input', 'mobile', '手机号', '电话'),
      field('birthDate', '出生年月 / Birthday', 'input', 'birthday', '出生年月', '出生年月'),
      field('city', '现居住地 / Current Location', 'input', 'current_city', '现居住地', '当前城市'),
      field('school', '毕业院校 / University', 'input', 'university', '毕业院校', '教育经历1-学校'),
      field('major', '专业 / Major', 'input', 'major', '专业', '教育经历1-专业'),
      field('degree', '学历 / Degree', 'select', 'degree', '学历', '教育经历1-学历'),
      field('educationStartDate', '入学时间 / Education Start', 'input', 'education_start', '入学时间', '教育经历1-开始时间'),
      field('educationEndDate', '毕业时间 / Education End', 'input', 'education_end', '毕业时间', '教育经历1-结束时间'),
      field('company', '公司名称 / Company', 'input', 'company', '公司名称', '实习经历1-公司名称'),
      field('jobTitle', '职位名称 / Job Title', 'input', 'job_title', '职位名称', '实习经历1-职位'),
      field('workStartDate', '工作开始时间 / Work Start', 'input', 'work_start', '工作开始时间', '实习经历1-开始时间'),
      field('workEndDate', '工作结束时间 / Work End', 'input', 'work_end', '工作结束时间', '实习经历1-结束时间'),
      field('workDescription', '工作职责 / Responsibilities', 'textarea', 'work_description', '工作职责', '实习经历1-职责描述'),
      field('projectName', '项目名称 / Project Name', 'input', 'project_name', '项目名称', '项目经历1-项目名称'),
      field('projectRole', '项目角色 / Project Role', 'input', 'project_role', '项目角色', '项目经历1-职责 / 角色'),
      field('projectDescription', '项目描述 / Project Description', 'textarea', 'project_description', '项目描述', '项目经历1-项目描述'),
      field('skills', '技能特长 / Skills', 'textarea', 'skills', '技能特长', '技能总结'),
      field('language', '语言能力 / Language', 'textarea', 'language', '语言能力', '语言能力'),
      field('resumeFile', '上传简历 / Resume', 'file', 'resume', '上传简历', '简历文件'),
    ],
  },
  {
    id: 'workday',
    name: 'Workday',
    patterns: ['myworkdayjobs.com', 'workdayjobs.com'],
    fields: [
      field('firstName', 'First Name', 'input', 'first_name', 'First Name', '姓名'),
      field('lastName', 'Last Name', 'input', 'last_name', 'Last Name', '姓名'),
      field('email', 'Email Address', 'input', 'email', 'Email', '邮箱'),
      field('phone', 'Phone Number', 'input', 'phone', 'Phone', '电话'),
      field('city', 'Current Location', 'input', 'location', 'Location', '当前城市'),
      field('school', 'School or University', 'input', 'school', 'School', '学校'),
      field('degree', 'Degree', 'select', 'degree', 'Degree', '学历'),
      field('resumeFile', 'Resume / CV', 'file', 'resume', 'Upload resume', '简历附件'),
    ],
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    patterns: ['greenhouse.io', 'boards.greenhouse.io'],
    fields: [
      field('fullName', 'Full Name', 'input', 'name', 'Full Name', '姓名'),
      field('email', 'Email', 'input', 'email', 'Email', '邮箱'),
      field('phone', 'Phone', 'input', 'phone', 'Phone', '电话'),
      field('resumeFile', 'Resume/CV', 'file', 'resume', 'Attach resume', '简历附件'),
      field('city', 'Location', 'input', 'location', 'Location', '当前城市'),
    ],
  },
  {
    id: 'lever',
    name: 'Lever',
    patterns: ['jobs.lever.co', 'lever.co'],
    fields: [
      field('fullName', 'Name', 'input', 'name', 'Name', '姓名'),
      field('email', 'Email', 'input', 'email', 'Email', '邮箱'),
      field('phone', 'Phone', 'input', 'phone', 'Phone', '电话'),
      field('resumeFile', 'Resume', 'file', 'resume', 'Resume', '简历附件'),
      field('targetRole', 'Additional information', 'textarea', 'comments', 'Anything else?', '目标岗位'),
    ],
  },
  {
    id: 'smartrecruiters',
    name: 'SmartRecruiters',
    patterns: ['smartrecruiters.com'],
    fields: [
      field('firstName', 'First name', 'input', 'firstName', 'First name', '姓名'),
      field('lastName', 'Last name', 'input', 'lastName', 'Last name', '姓名'),
      field('email', 'Email', 'input', 'email', 'Email', '邮箱'),
      field('phone', 'Phone', 'input', 'phoneNumber', 'Phone', '电话'),
      field('resumeFile', 'Resume', 'file', 'resume', 'Resume', '简历附件'),
      field('city', 'City', 'input', 'city', 'City', '当前城市'),
    ],
  },
  {
    id: 'mokahr',
    name: 'MokaHR',
    patterns: ['mokahr.com', 'app.mokahr.com'],
    fields: [
      field('fullName', '姓名', 'input', 'name', '请输入姓名', '姓名'),
      field('email', '邮箱', 'input', 'email', '请输入邮箱', '邮箱'),
      field('phone', '手机号', 'input', 'mobile', '请输入手机号 / 手机号码 / 联系电话', '电话'),
      field('birthDate', '出生日期 / 出生年月', 'input', 'birthday', '请选择出生日期 / 出生年月', '出生年月'),
      field('politicalStatus', '政治面貌', 'select', 'politicalStatus', '请选择政治面貌', '政治面貌'),
      field('city', '当前所在地', 'input', 'location', '请输入当前所在地', '当前城市'),
      field('targetRole', '应聘职位', 'input', 'position', '应聘职位', '目标岗位'),
      field('education1School', '教育经历1-学校', 'input', 'school', '请输入学校', '教育经历1-学校'),
      field('education1Degree', '教育经历1-学历', 'select', 'degree', '请选择学历', '教育经历1-学历'),
      field('education1Major', '教育经历1-专业', 'input', 'major', '请输入专业', '教育经历1-专业'),
      field('education1StartDate', '教育经历1-开始时间', 'input', 'educationStartDate', '请选择开始时间', '教育经历1-开始时间'),
      field('education1EndDate', '教育经历1-结束时间', 'input', 'educationEndDate', '请选择结束时间', '教育经历1-结束时间'),
      field('education1Courses', '教育经历1-主修课程', 'textarea', 'courses', '请输入主修课程', '教育经历1-主修课程'),
      field('education2School', '教育经历2-学校', 'input', 'school', '请输入学校', '教育经历2-学校'),
      field('education2Degree', '教育经历2-学历', 'select', 'degree', '请选择学历', '教育经历2-学历'),
      field('education2Major', '教育经历2-专业', 'input', 'major', '请输入专业', '教育经历2-专业'),
      field('education2StartDate', '教育经历2-开始时间', 'input', 'educationStartDate', '请选择开始时间', '教育经历2-开始时间'),
      field('education2EndDate', '教育经历2-结束时间', 'input', 'educationEndDate', '请选择结束时间', '教育经历2-结束时间'),
      field('internship1Company', '实习经历1-公司名称', 'input', 'company', '请输入公司名称', '实习经历1-公司名称'),
      field('internship1Department', '实习经历1-部门', 'input', 'department', '请输入部门', '实习经历1-部门'),
      field('internship1Role', '实习经历1-职位', 'input', 'position', '请输入职位', '实习经历1-职位/角色'),
      field('internship1StartDate', '实习经历1-开始时间', 'input', 'workStartDate', '请选择开始时间', '实习经历1-开始时间'),
      field('internship1EndDate', '实习经历1-结束时间', 'input', 'workEndDate', '请选择结束时间', '实习经历1-结束时间'),
      field('internship1Description', '实习经历1-职责描述', 'textarea', 'workDescription', '请输入职责描述', '实习经历1-职责/描述'),
      field('internship2Company', '实习经历2-公司名称', 'input', 'company', '请输入公司名称', '实习经历2-公司名称'),
      field('internship2Department', '实习经历2-部门', 'input', 'department', '请输入部门', '实习经历2-部门'),
      field('internship2Role', '实习经历2-职位', 'input', 'position', '请输入职位', '实习经历2-职位/角色'),
      field('internship2StartDate', '实习经历2-开始时间', 'input', 'workStartDate', '请选择开始时间', '实习经历2-开始时间'),
      field('internship2EndDate', '实习经历2-结束时间', 'input', 'workEndDate', '请选择结束时间', '实习经历2-结束时间'),
      field('internship2Description', '实习经历2-职责描述', 'textarea', 'workDescription', '请输入职责描述', '实习经历2-职责/描述'),
      field('internship3Company', '实习经历3-公司名称', 'input', 'company', '请输入公司名称', '实习经历3-公司名称'),
      field('internship3Role', '实习经历3-职位', 'input', 'position', '请输入职位', '实习经历3-职位/角色'),
      field('internship3StartDate', '实习经历3-开始时间', 'input', 'workStartDate', '请选择开始时间', '实习经历3-开始时间'),
      field('internship3EndDate', '实习经历3-结束时间', 'input', 'workEndDate', '请选择结束时间', '实习经历3-结束时间'),
      field('internship3Description', '实习经历3-职责描述', 'textarea', 'workDescription', '请输入职责描述', '实习经历3-职责/描述'),
      field('project1Name', '项目经历1-项目名称', 'input', 'projectName', '请输入项目名称', '项目经历1-项目名称'),
      field('project1Role', '项目经历1-职责 / 角色', 'input', 'projectRole', '请输入职责 / 角色 / 担任角色', '项目经历1-职位/角色'),
      field('project1StartDate', '项目经历1-开始时间', 'input', 'projectStartDate', '请选择开始时间', '项目经历1-开始时间'),
      field('project1EndDate', '项目经历1-结束时间', 'input', 'projectEndDate', '请选择结束时间', '项目经历1-结束时间'),
      field('project1Description', '项目经历1-项目描述', 'textarea', 'projectDescription', '请输入项目描述', '项目经历1-职责/描述'),
      field('project1Responsibility', '项目经历1-项目中职责', 'textarea', 'projectResponsibility', '请输入项目中职责 / 主要贡献', '项目经历1-职责/描述'),
      field('project2Name', '项目经历2-项目名称', 'input', 'projectName', '请输入项目名称', '项目经历2-项目名称'),
      field('project2Role', '项目经历2-职责 / 角色', 'input', 'projectRole', '请输入职责 / 角色 / 担任角色', '项目经历2-职位/角色'),
      field('project2StartDate', '项目经历2-开始时间', 'input', 'projectStartDate', '请选择开始时间', '项目经历2-开始时间'),
      field('project2EndDate', '项目经历2-结束时间', 'input', 'projectEndDate', '请选择结束时间', '项目经历2-结束时间'),
      field('project2Description', '项目经历2-项目描述', 'textarea', 'projectDescription', '请输入项目描述', '项目经历2-职责/描述'),
      field('project2Responsibility', '项目经历2-项目中职责', 'textarea', 'projectResponsibility', '请输入项目中职责 / 主要贡献', '项目经历2-职责/描述'),
      field('award1Date', '获奖经历1-获奖时间', 'input', 'awardDate', '请选择获奖时间', '实践荣誉1-开始时间'),
      field('award1Name', '获奖经历1-奖项名称', 'input', 'awardName', '请输入奖项名称', '实践荣誉1-名称'),
      field('award1Description', '获奖经历1-奖项描述', 'textarea', 'awardDescription', '请输入奖项描述', '实践荣誉1-职责/描述'),
      field('language', '语言能力', 'textarea', 'language', '请输入语言能力', '语言能力'),
      field('skills', '技能特长', 'textarea', 'skills', '请输入技能特长', '技能总结'),
      field('resumeFile', '上传简历', 'file', 'resume', '上传简历附件', '简历附件'),
    ],
  },
];

const genericFields = [
  field('fullName', '姓名 / Full Name', 'input', 'candidate_name', '请输入姓名 / Full Name', '姓名'),
  field('email', '邮箱 / Email', 'input', 'email', '请输入邮箱 / Email', '邮箱'),
  field('phone', '手机号 / Phone', 'input', 'mobile', '请输入手机号 / Phone', '电话'),
  field('school', '毕业院校 / University', 'input', 'university', '毕业院校 / University', '学校'),
  field('major', '专业 / Major', 'input', 'major', '专业 / Major', '专业'),
  field('degree', '学历 / Degree', 'select', 'degree', '请选择学历 / Degree', '学历'),
  field('targetRole', '申请岗位 / Position', 'input', 'position', '申请岗位 / Position', '目标岗位'),
  field('resumeFile', '上传简历 / Resume', 'file', 'resume_file', '上传简历 / Resume', '简历附件'),
];

function field(id, label, type, name, placeholder, sourceLabel) {
  return { id, label, type, name, placeholder, sourceLabel };
}

function normalizeText(value = '') {
  return value.toLowerCase().replace(/[\s/_-]+/g, '');
}

function detectPlatform(url = '') {
  const normalizedUrl = url.toLowerCase();
  return platformTemplates.find((template) => template.patterns.some((pattern) => normalizedUrl.includes(pattern))) || {
    id: 'generic',
    name: '通用 Careers 表单',
    fields: genericFields,
  };
}

function scoreMapping(scannedField, mapping) {
  if (scannedField.sourceLabel === mapping.sourceLabel || scannedField.sourceLabel === mapping.label) return 96;
  const haystack = normalizeText([scannedField.label, scannedField.name, scannedField.placeholder].join(' '));
  const directLabels = [mapping.label, mapping.sourceLabel].filter(Boolean).map(normalizeText);
  if (directLabels.some((label) => label && haystack.includes(label))) return 92;
  if (!mappingCompatible(scannedField, mapping)) return 0;

  const aliases = (mapping.aliases || mapping.label || '')
    .split(/[、,/|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (aliases.some((alias) => haystack.includes(normalizeText(alias)))) return 88;
  if (haystack.includes(normalizeText(mapping.label))) return 78;
  if (scannedField.id === mapping.id) return 72;
  return 0;
}

function mappingCompatible(scannedField, mapping) {
  const scannedText = [scannedField.label, scannedField.sourceLabel, scannedField.placeholder, scannedField.name].filter(Boolean).join(' ');
  const mappingText = [mapping.group, mapping.label, mapping.sourceLabel, mapping.aliases].filter(Boolean).join(' ');
  const scannedGroup = groupKind(scannedText);
  const mappedGroup = groupKind(mappingText);
  if (scannedGroup && mappedGroup && scannedGroup !== mappedGroup) return false;

  const scannedFieldKind = fieldKind(scannedText);
  const mappedFieldKind = fieldKind(mappingText);
  if (scannedFieldKind && mappedFieldKind && scannedFieldKind !== mappedFieldKind) return false;

  return true;
}

function groupKind(text = '') {
  if (/项目|project/i.test(text)) return 'project';
  if (/实习|工作经历|工作经验|公司名称|职位名称|internship|work experience/i.test(text)) return 'internship';
  if (/教育|学历|学校|院校|专业|education/i.test(text)) return 'education';
  if (/获奖|奖项|荣誉|实践|校园经历|award|honor/i.test(text)) return 'award';
  return '';
}

function fieldKind(text = '') {
  if (/邮箱|email|e-mail/i.test(text)) return 'email';
  if (/手机|电话|phone|mobile/i.test(text)) return 'phone';
  if (/开始|结束|起始|截止|入学|毕业|离职|获奖时间|出生|生日|时间|date|from|to|birth/i.test(text)) return 'date';
  if (/项目中职责|职责描述|项目描述|工作职责|经历描述|主要职责|主要贡献|项目贡献|描述|内容|description|responsibilities/i.test(text)) {
    return 'description';
  }
  if (/职位|岗位|角色|担任职责|担任角色|position|role|title/i.test(text)) return 'role';
  if (/学校|院校|大学|school|university/i.test(text)) return 'school';
  if (/公司|单位|雇主|company|employer/i.test(text)) return 'company';
  if (/部门|事业部|department|division/i.test(text)) return 'department';
  if (/专业|major|discipline/i.test(text)) return 'major';
  if (/学历|学位|degree/i.test(text)) return 'degree';
  if (/名称|姓名|name/i.test(text)) return 'name';
  return '';
}

function pickBestMapping(scannedField, formMappings) {
  const candidates = formMappings
    .map((mapping) => ({ mapping, score: scoreMapping(scannedField, mapping) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || Number(Boolean(b.mapping.value)) - Number(Boolean(a.mapping.value)));

  return candidates[0] || null;
}

function confidenceFromScore(score) {
  if (score >= 90) return '高';
  if (score >= 75) return '中';
  return '低';
}

function buildFillInstruction(fieldType) {
  if (fieldType === 'file') return '上传附件前停住，等待用户确认简历文件';
  if (fieldType === 'select') return '选择最接近的下拉选项';
  if (fieldType === 'textarea') return '填入文本框，提交前允许用户修改';
  return '填入输入框';
}

export function buildAutofillPreview(url, formMappings) {
  const platform = detectPlatform(url);
  return buildPreviewFromFields(url, platform.name, platform.id, platform.fields, formMappings);
}

export function buildAutofillPreviewFromScannedFields(scanPayload, formMappings) {
  const payload = typeof scanPayload === 'string' ? JSON.parse(scanPayload) : scanPayload;
  const fields = Array.isArray(payload) ? payload : payload.fields;
  if (!Array.isArray(fields) || !fields.length) throw new Error('扫描结果格式不正确，需要 fields 数组');
  return buildPreviewFromFields(
    payload.url || '',
    payload.adapter ? `${payload.adapter} 实页扫描` : '扩展实页扫描',
    payload.adapter || 'extension-scan',
    fields.map(normalizeScannedField),
    formMappings
  );
}

function buildPreviewFromFields(url, platformName, platformId, scannedFields, formMappings) {
  const mappingPool = normalizeMappings(formMappings);
  const fields = scannedFields.map((scannedField, index) => {
    const fieldItem = normalizeScannedField(scannedField, index);
    const best = pickBestMapping(fieldItem, mappingPool);
    return {
      ...fieldItem,
      matchedLabel: best?.mapping.label || '',
      matchedSourceLabel: best?.mapping.sourceLabel || '',
      matchedGroup: best?.mapping.group || groupFromLabel(fieldItem.sourceLabel || fieldItem.label),
      aliases: best?.mapping.aliases || '',
      value: best?.mapping.value || '',
      confidence: best ? confidenceFromScore(best.score) : '未匹配',
      score: best?.score || 0,
      instruction: best ? buildFillInstruction(fieldItem.type) : '需要人工选择字段',
    };
  });
  return {
    url,
    platform: platformName,
    platformId,
    fields,
    matchedCount: fields.filter((item) => item.value).length,
    totalCount: fields.length,
    safeMode: true,
  };
}

function normalizeScannedField(scannedField = {}, index = 0) {
  const elementType = scannedField.elementType || scannedField.type || 'input';
  const inputType = scannedField.inputType || scannedField.type || '';
  return {
    ...scannedField,
    id: scannedField.id || scannedField.fieldId || scannedField.selector || `field-${index + 1}`,
    label: scannedField.label || scannedField.field || scannedField.placeholder || scannedField.name || scannedField.nearbyText || `字段${index + 1}`,
    sourceLabel: scannedField.sourceLabel || scannedField.label || scannedField.field || scannedField.placeholder || scannedField.name || '',
    type: normalizeFieldType(elementType, inputType),
    name: scannedField.name || scannedField.id || '',
    placeholder: scannedField.placeholder || '',
  };
}

function normalizeFieldType(elementType = '', inputType = '') {
  const element = String(elementType).toLowerCase();
  const input = String(inputType).toLowerCase();
  if (element.includes('textarea')) return 'textarea';
  if (element.includes('select')) return 'select';
  if (input === 'file') return 'file';
  if (['checkbox', 'radio', 'date', 'tel', 'email', 'number'].includes(input)) return input;
  return 'input';
}

function normalizeMappings(formMappings) {
  return formMappings.map((mapping) => ({
    ...mapping,
    aliases: mapping.aliases || `${mapping.label || ''} / ${mapping.sourceLabel || ''}`,
    sourceLabel: mapping.sourceLabel || mapping.label,
  }));
}

function groupFromLabel(label = '') {
  if (label.includes('教育')) return '教育经历';
  if (label.includes('实习') || label.includes('工作')) return '实习经历';
  if (label.includes('项目')) return '项目经历';
  if (label.includes('奖') || label.includes('荣誉') || label.includes('实践')) return '实践荣誉';
  if (label.includes('技能') || label.includes('语言') || label.includes('英语')) return '技能';
  return '基础资料';
}

export function buildAutofillScript(preview) {
  return preview.fields.map((item, index) => ({
    step: index + 1,
    id: item.id,
    field: item.label,
    sourceLabel: item.matchedSourceLabel,
    group: item.matchedGroup,
    aliases: item.aliases,
    type: item.type,
    value: item.type === 'file' ? item.value || '待选择简历文件' : item.value || '待补充',
    action: item.instruction,
    requiresUserCheck: item.type === 'file' || item.confidence !== '高',
  }));
}

export function buildGenericScanMatchReport(scannedFields = [], answerRows = []) {
  return matchScannedFields(scannedFields, answerRows);
}
