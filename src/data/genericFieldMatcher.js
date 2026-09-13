const autocompleteMap = {
  name: ['姓名'],
  'given-name': ['姓名'],
  'family-name': ['姓名'],
  email: ['邮箱'],
  tel: ['电话'],
  'tel-national': ['电话'],
  'tel-local': ['电话'],
  'tel-country-code': ['电话'],
  address: ['当前城市'],
  'address-level1': ['当前城市'],
  'address-level2': ['当前城市'],
  'address-level3': ['当前城市'],
  country: ['当前城市'],
  bday: ['出生年月'],
  'bday-day': ['出生年月'],
  'bday-month': ['出生年月'],
  'bday-year': ['出生年月'],
  organization: ['公司名称'],
  'organization-title': ['职位/角色', '学历'],
};

const sensitivePatterns = [
  /性别|gender|sex/i,
  /民族|ethnicity|race|nationality/i,
  /残障|残疾|disability|disabled/i,
  /政治面貌|政治身份|党员|political/i,
  /婚姻|marital/i,
  /宗教|religion/i,
];

const confirmationPatterns = [
  /签证|visa/i,
  /工作许可|work\s*permit|authorization|authorisation|eligible\s*to\s*work|sponsorship/i,
  /薪资|期望薪资|当前薪资|salary|compensation|pay/i,
  /到岗|入职时间|可入职|开始工作|available|start\s*date|notice\s*period/i,
  /是否|能否|愿意|同意|yes\/no|true\/false/i,
];

const genericCanonicalAliases = {
  姓名: ['姓名', '名字', '中文姓名', '候选人姓名', '申请人姓名', 'full name', 'name', 'candidate name'],
  邮箱: ['邮箱', '电子邮箱', '邮件', '邮箱地址', 'email', 'e-mail', 'email address'],
  电话: ['电话', '手机号', '手机号码', '联系电话', '移动电话', '联系方式', 'phone', 'mobile', 'phone number', 'telephone'],
  当前城市: ['当前城市', '当前所在地', '所在地', '现居住地', '居住城市', '城市', 'location', 'city', 'current location'],
  籍贯: ['籍贯', '户籍', '生源地', '家乡', 'hometown', 'native place'],
  出生年月: ['出生年月', '出生日期', '生日', '出生时间', 'birth date', 'birthday', 'date of birth'],
  求职意向: ['求职意向', '应聘职位', '申请职位', '目标岗位', '岗位方向', 'position', 'job applied', 'target role'],
  简历文件: ['简历文件', '简历附件', '上传简历', '附件', 'resume', 'cv', 'resume file'],
  技能总结: ['技能总结', '技能特长', '专业技能', '个人技能', '技能描述', 'skills', 'skill summary'],
  语言能力: ['语言能力', '语言水平', '外语能力', 'language', 'languages', 'language skills'],
  英语水平: ['英语水平', '英语能力', '英语成绩', '雅思', 'cet-6', 'cet-4', 'ielts', 'english level'],
  学校: ['学校', '院校', '毕业院校', '大学', 'school', 'university'],
  学历: ['学历', '学位', '最高学历', 'degree', 'education level'],
  专业: ['专业', '所学专业', '主修专业', 'major', 'discipline'],
  公司名称: ['公司名称', '公司', '单位', '雇主', 'company', 'employer'],
  部门: ['部门', '所属部门', '事业部', 'department', 'division'],
  '职位/角色': ['职位', '岗位', '角色', '担任角色', 'position', 'role', 'title', 'job title'],
  项目名称: ['项目名称', '项目', 'project name'],
  '职责/描述': ['职责描述', '工作职责', '经历描述', '项目描述', '主要职责', 'description', 'responsibilities'],
};

export function matchScannedFields(scannedFields = [], answerRows = []) {
  const canonicalRows = buildCanonicalRows(answerRows);
  const results = scannedFields.map((field) => matchScannedField(field, canonicalRows));
  return {
    matched: results.filter((item) => item.confidence === '高'),
    needsConfirmation: results.filter((item) => item.confidence === '中'),
    unmatched: results.filter((item) => item.confidence === '低'),
    results,
  };
}

export function matchScannedField(scannedField, canonicalRows = []) {
  const rows = ensureCanonicalRows(canonicalRows).filter((row) => rowCompatible(scannedField, row));
  const textBundle = buildFieldText(scannedField);
  if (isSensitiveField(textBundle)) {
    return emptyResult(scannedField, 'sensitive_field', '低', 'high', '敏感字段不得根据简历推断');
  }

  if (requiresConfirmation(textBundle) && isConfirmationOnlyField(textBundle)) {
    return {
      scannedField,
      canonicalField: '',
      answer: '',
      matchSource: 'confirmation_required',
      confidence: '中',
      reason: '签证、工作许可、薪资、到岗时间或布尔确认类字段需要用户确认',
      riskLevel: 'medium',
    };
  }

  const candidates = [
    matchByAutocomplete(scannedField, rows),
    matchByExactName(scannedField, rows),
    matchByAliases(scannedField, rows),
    matchByCombinedAttributes(scannedField, rows),
    matchByNearbyText(scannedField, rows),
  ].filter(Boolean);

  if (!candidates.length) {
    return emptyResult(scannedField, 'unmatched', '低', riskLevelFor(textBundle), '没有足够可靠的字段证据');
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const mustConfirm = requiresConfirmation(textBundle);
  const confidence = mustConfirm && best.confidence === '高' ? '中' : best.confidence;
  const riskLevel = mustConfirm ? 'medium' : riskLevelFor(textBundle);

  return {
    scannedField,
    canonicalField: best.row.label,
    answer: confidence === '低' ? '' : best.row.value || '',
    matchSource: best.source,
    confidence,
    reason: mustConfirm ? `${best.reason}；该字段属于需要用户确认的类型` : best.reason,
    riskLevel,
  };
}

function buildCanonicalRows(answerRows = []) {
  return answerRows.map((row) => {
    const shortLabel = stripIndex(row.label);
    return {
      ...row,
      shortLabel,
      tokens: unique([
        row.label,
        shortLabel,
        row.key,
        row.group,
        ...(row.aliases || '').split(/[、,/|]/),
        ...(genericCanonicalAliases[shortLabel] || []),
      ])
        .map(normalize)
        .filter(isUsefulToken)
        .filter(Boolean),
    };
  });
}

function ensureCanonicalRows(rows = []) {
  if (rows.every((row) => Array.isArray(row.tokens))) return rows;
  return buildCanonicalRows(rows);
}

function matchByAutocomplete(field, rows) {
  const autocomplete = normalize(field.autocomplete || '');
  if (!autocomplete) return null;
  const labels = autocompleteMap[autocomplete] || [];
  return bestFromRows(
    rows.filter((row) => labels.includes(row.shortLabel) || labels.includes(row.label)),
    100,
    'autocomplete',
    `autocomplete="${field.autocomplete}" 命中标准字段`
  );
}

function matchByExactName(field, rows) {
  const values = [field.label, field.name, field.id].map(normalize).filter(Boolean);
  const placeholder = normalizePromptText(field.placeholder || '');
  for (const row of rows) {
    if (values.includes(normalize(row.label)) || values.includes(normalize(row.shortLabel))) {
      return candidate(row, 96, 'exact_field_name', '字段 label/name/id 与标准字段精确匹配', '高');
    }
    if (placeholder && (placeholder === normalize(row.label) || placeholder === normalize(row.shortLabel))) {
      return candidate(row, 70, 'placeholder_hint', 'placeholder 仅作为弱提示命中', '中');
    }
  }
  return null;
}

function matchByAliases(field, rows) {
  const strongText = normalize([field.label, field.name, field.id, field.autocomplete].filter(Boolean).join(' '));
  const weakText = normalizePromptText(field.placeholder || '');
  const matches = rows
    .map((row) => {
      const hit = row.tokens.find((token) => token && strongText.includes(token));
      if (hit) return candidate(row, 88 + Math.min(hit.length, 10), 'alias_dictionary', `同义词 "${hit}" 命中`, '高');
      const weakHit = row.tokens.find((token) => token && weakText.includes(token));
      return weakHit ? candidate(row, 68 + Math.min(weakHit.length, 8), 'placeholder_alias', `placeholder 弱提示 "${weakHit}" 命中`, '中') : null;
    })
    .filter(Boolean);
  return best(matches);
}

function matchByCombinedAttributes(field, rows) {
  const text = normalize([field.label, field.name, field.id, field.inputType, field.elementType].filter(Boolean).join(' '));
  const matches = rows
    .map((row) => {
      const hitCount = row.tokens.filter((token) => token && text.includes(token)).length;
      if (!hitCount) return null;
      return candidate(row, 74 + hitCount, 'combined_attributes', 'label/name/id/placeholder 综合匹配', hitCount > 1 ? '高' : '中');
    })
    .filter(Boolean);
  return best(matches);
}

function matchByNearbyText(field, rows) {
  const text = normalize(field.nearbyText || '');
  if (!text) return null;
  const matches = rows
    .map((row) => {
      const hit = row.tokens.find((token) => isUsefulNearbyToken(token) && text.includes(token));
      return hit ? candidate(row, 62 + Math.min(hit.length, 8), 'nearby_text', `附近说明文字命中 "${hit}"`, '中') : null;
    })
    .filter(Boolean);
  return best(matches);
}

function bestFromRows(rows, score, source, reason) {
  if (!rows.length) return null;
  return candidate(rows[0], score, source, reason, '高');
}

function best(matches) {
  return matches.sort((a, b) => b.score - a.score || Number(Boolean(b.row.value)) - Number(Boolean(a.row.value)))[0] || null;
}

function candidate(row, score, source, reason, confidence) {
  return { row, score, source, reason, confidence };
}

function emptyResult(scannedField, matchSource, confidence, riskLevel, reason) {
  return {
    scannedField,
    canonicalField: '',
    answer: '',
    matchSource,
    confidence,
    reason,
    riskLevel,
  };
}

function buildFieldText(field = {}) {
  return [
    field.label,
    field.name,
    field.id,
    field.placeholder,
    field.autocomplete,
    field.nearbyText,
    field.selector,
    field.inputType,
    field.options?.map((option) => `${option.label || ''} ${option.value || ''}`).join(' '),
  ]
    .filter(Boolean)
    .join(' ');
}

function rowCompatible(field = {}, row = {}) {
  if (!sectionItemCompatible(field, row)) return false;

  const fieldGroup = groupKindFromText([field.sectionType, field.section, field.group, field.label, field.nearbyText].filter(Boolean).join(' '));
  const rowGroup = groupKindFromText([row.group, row.label, row.sourceLabel].filter(Boolean).join(' '));
  if (fieldGroup && rowGroup && fieldGroup !== rowGroup) return false;

  const ownFieldText = [field.label, field.name, field.id, normalizePromptText(field.placeholder)].filter(Boolean).join(' ');
  const fieldKind = fieldKindFromText(ownFieldText) || fieldKindFromText(field.nearbyText || '');
  const rowKind = fieldKindFromText([row.label, row.sourceLabel, row.aliases].filter(Boolean).join(' '));
  if (fieldKind && rowKind && fieldKind !== rowKind) return false;

  return true;
}

function sectionItemCompatible(field = {}, row = {}) {
  const fieldSection = canonicalSectionType(field.sectionType || field.section || field.group || '');
  const rowSection = canonicalSectionType(row.sectionType || row.group || row.label || row.sourceLabel || '');
  if (fieldSection && rowSection && fieldSection !== rowSection) return false;

  const fieldIndex = normalizedItemIndex(field.itemIndex);
  const rowIndex = normalizedItemIndex(row.itemIndex);
  if (fieldSection && rowSection && fieldSection === rowSection && fieldIndex >= 0 && rowIndex >= 0 && fieldIndex !== rowIndex) {
    return false;
  }

  return true;
}

function canonicalSectionType(text = '') {
  const value = String(text || '');
  if (/projectExperience/i.test(value)) return 'project';
  if (/项目|project/i.test(value)) return 'project';
  if (/internship|workExperience|work|experience|实习|工作经历|工作经验/i.test(value)) return 'internship';
  if (/education|教育|学历|学习|院校|学校|专业/i.test(value)) return 'education';
  if (/award|honou?r|获奖|奖项|荣誉|实践|校园经历/i.test(value)) return 'award';
  if (/skills?|language|技能|语言|英语|证书/i.test(value)) return 'skills';
  if (/personal|contact|basic|个人信息|基础信息|联系方式|姓名|邮箱|手机/i.test(value)) return 'personal';
  return '';
}

function normalizedItemIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : -1;
}

function groupKindFromText(text = '') {
  if (/项目|project/i.test(text)) return 'project';
  if (/实习|工作经历|工作经验|公司名称|职位名称|internship|work experience/i.test(text)) return 'internship';
  if (/教育|学历|学习|院校|学校|专业|education/i.test(text)) return 'education';
  if (/获奖|奖项|荣誉|实践|校园经历|award|honor/i.test(text)) return 'award';
  return '';
}

function fieldKindFromText(text = '') {
  if (/邮箱|email|e-mail/i.test(text)) return 'email';
  if (/手机|电话|phone|mobile/i.test(text)) return 'phone';
  if (/开始|结束|起始|截止|入学|毕业|离职|获奖时间|出生|生日|时间|\b(date|from|to|birth)\b/i.test(text)) return 'date';
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

function normalizePromptText(value = '') {
  return normalize(String(value).replace(/请(?:输入|填写|选择|上传)|请输入|请填写|请选择|请上传|选择|输入|填写|上传/g, ''));
}

function stripIndex(label = '') {
  return String(label).replace(/^(教育经历|实习经历|项目经历|实践荣誉)\d+-/, '');
}

function isSensitiveField(text = '') {
  return sensitivePatterns.some((pattern) => pattern.test(text));
}

function requiresConfirmation(text = '') {
  return confirmationPatterns.some((pattern) => pattern.test(text));
}

function isConfirmationOnlyField(text = '') {
  return /签证|visa|工作许可|work\s*permit|authorization|authorisation|eligible\s*to\s*work|sponsorship|薪资|salary|compensation|pay|到岗|入职时间|可入职|开始工作|available|start\s*date|notice\s*period/i.test(
    text
  );
}

function riskLevelFor(text = '') {
  if (requiresConfirmation(text)) return 'medium';
  return 'low';
}

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[\s/_\-:：*（）()[\]{}"'‘’“”，,.;；。]+/g, '');
}

function isUsefulToken(token = '') {
  if (!token) return false;
  if (/^[a-z0-9]+$/i.test(token)) return token.length >= 3;
  return token.length >= 2;
}

function isUsefulNearbyToken(token = '') {
  if (!isUsefulToken(token)) return false;
  if (/^[a-z0-9]+$/i.test(token)) return token.length >= 5;
  return token.length >= 2;
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}
