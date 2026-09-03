const knownSkills = [
  'AI产品经理',
  'AI应用开发',
  '算法工程师',
  '机器学习',
  '深度学习',
  '计算机视觉',
  '图神经网络',
  '数据挖掘',
  '数据分析',
  '商业分析',
  'Python',
  'SQL',
  'PyTorch',
  'TensorFlow',
  'Tableau',
  'Excel',
  '运营',
  '金融',
  '产品经理',
];

const knownCities = ['深圳', '香港', '上海', '杭州', '浙江', '北京', '广州', '成都', '南京', '苏州', '远程'];

export function normalizeImportedJob(input) {
  const description = (input.description || input.jd || '').trim();
  const normalizedText = description.replace(/\r\n/g, '\n');
  const title = cleanValue(input.title) || extractField(normalizedText, ['岗位名称', '职位名称', '职位', '岗位']) || firstUsefulLine(normalizedText);
  const company = cleanValue(input.company) || extractField(normalizedText, ['公司名称', '公司']) || '未知公司';
  const city = cleanValue(input.city) || extractCity(normalizedText) || '未标注';
  const salary = cleanValue(input.salary) || extractSalary(normalizedText) || '未标注';
  const goal = cleanValue(input.goal) || inferGoal(normalizedText);
  const tags = unique([...(input.tags || []), ...extractTags(`${title} ${normalizedText}`)]).slice(0, 8);

  return {
    source: cleanValue(input.source) || '手动导入',
    sourceUrl: cleanValue(input.sourceUrl) || cleanValue(input.url) || null,
    title: title || '未命名岗位',
    company,
    city,
    salary,
    description: normalizedText,
    tags,
    companyType: cleanValue(input.companyType) || inferCompanyType(normalizedText),
    goal,
    channel: cleanValue(input.channel) || (input.sourceUrl || input.url ? 'manual-link' : 'manual-jd'),
    isDemo: false,
  };
}

function cleanValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractField(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, 'i');
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function firstUsefulLine(text) {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length >= 4 && line.length <= 40 && !line.includes('职责') && !line.includes('要求')) || ''
  );
}

function extractCity(text) {
  return knownCities.find((city) => text.includes(city)) || '';
}

function extractSalary(text) {
  const match = text.match(/(\d+\s*[kK万千]?\s*[-~至]\s*\d+\s*[kK万千]?|\d+\s*[-~至]\s*\d+\s*\/?\s*天|\d+\s*[-~至]\s*\d+)/);
  return match ? match[1].replace(/\s+/g, '') : '';
}

function inferGoal(text) {
  if (/实习|intern/i.test(text)) return '实习';
  if (/校招|应届|graduate|campus/i.test(text)) return '校招';
  return '社招';
}

function inferCompanyType(text) {
  if (/银行|金融|FinTech|fintech/i.test(text)) return '金融科技';
  if (/国企|央企|研究院/.test(text)) return '央国企';
  if (/外企|跨国|Microsoft|Google|Amazon|Apple/i.test(text)) return '福利待遇好的外企';
  if (/互联网|平台|大厂/.test(text)) return '互联网大厂';
  return '未标注';
}

function extractTags(text) {
  return knownSkills.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}
