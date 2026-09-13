const preferredCompanies = [
  { company: '中国移动', type: '央国企 通信 校招 实习', careersUrl: 'https://job.10086.cn/' },
  { company: '中国电信', type: '央国企 通信 校招 实习', careersUrl: 'https://job.chinatelecom.com.cn/wt/TELE/web/index/campus' },
  { company: '中国联通', type: '央国企 通信 校招 实习', careersUrl: 'https://chinaunicom.zhaopin.com/' },
  { company: '国家电网', type: '央国企 能源 电力 校招', careersUrl: 'https://zhaopin.sgcc.com.cn/' },
  { company: '中国石化', type: '央国企 能源 化工 校招', careersUrl: 'http://job.sinopec.com/' },
  { company: '中国工商银行', type: '央国企 银行 金融 校招 实习', careersUrl: 'https://job.icbc.com.cn/' },
  { company: '中国建设银行', type: '央国企 银行 金融 校招 实习', careersUrl: 'https://job.ccb.com/' },
  { company: '中国银行', type: '央国企 银行 金融 校招 实习', careersUrl: 'https://www.boc.cn/aboutboc/bi4/' },
  { company: '中国农业银行', type: '央国企 银行 金融 校招 实习', careersUrl: 'https://career.abchina.com.cn/' },
  { company: '交通银行', type: '央国企 银行 金融 校招 实习', careersUrl: 'https://job.bankcomm.com/' },
  { company: '招商银行', type: '银行 金融 校招 实习', careersUrl: 'https://career.cmbchina.com/' },
  { company: '浦发银行', type: '银行 金融 校招 实习', careersUrl: 'https://spdb.zhaopin.com/' },
  { company: '兴业银行', type: '银行 金融 校招 实习', careersUrl: 'https://job.cib.com.cn/' },
  { company: '中信银行', type: '银行 金融 校招 实习', careersUrl: 'https://job.citicbank.com/' },
  { company: '汇丰', type: '外企 银行 金融 校招 实习', careersUrl: 'https://www.hsbc.com/careers' },
  { company: '平安科技', type: '金融科技 大厂 校招 实习', careersUrl: 'https://talent.pingan.com/' },
  { company: '腾讯', type: '互联网 大厂 校招 实习', careersUrl: 'https://join.qq.com/' },
  { company: '阿里巴巴', type: '互联网 大厂 校招 实习', careersUrl: 'https://talent.alibaba.com/' },
  { company: '蚂蚁集团', type: '金融科技 大厂 校招 实习', careersUrl: 'https://talent.antgroup.com/' },
  { company: '字节跳动', type: '互联网 大厂 AI 校招 实习', careersUrl: 'https://jobs.bytedance.com/campus/' },
  { company: '火山引擎', type: '互联网 大厂 云计算 AI 校招 实习', careersUrl: 'https://jobs.bytedance.com/campus/' },
  { company: '美团', type: '互联网 大厂 校招 实习', careersUrl: 'https://career.meituan.com/' },
  { company: '百度', type: '互联网 大厂 AI 校招 实习', careersUrl: 'https://talent.baidu.com/jobs/list?projectType=1' },
  { company: '携程', type: '互联网 旅游 大厂 校招 实习', careersUrl: 'https://pages.ctrip.com/commerce/promote/201108/other/hire/process.html' },
  { company: '京东', type: '互联网 电商 大厂 校招 实习', careersUrl: 'https://campus.jd.com/' },
  { company: '快手', type: '互联网 大厂 校招 实习', careersUrl: 'https://campus.kuaishou.cn/' },
  { company: '小红书', type: '互联网 内容 社区 大厂 校招 实习', careersUrl: 'https://job.xiaohongshu.com/campus' },
  { company: '哔哩哔哩', type: '互联网 内容 大厂 校招 实习', careersUrl: 'https://jobs.bilibili.com/campus' },
  { company: '网易', type: '互联网 游戏 大厂 校招 实习', careersUrl: 'https://campus.163.com/' },
  { company: '米哈游', type: '互联网 游戏 大厂 校招 实习', careersUrl: 'https://campus.mihoyo.com/' },
  { company: '欧莱雅', type: '外企 女性友好 快消 美妆 校招 实习', careersUrl: 'https://careers.loreal.com/' },
  { company: '雅诗兰黛', type: '外企 女性友好 美妆 校招 实习', careersUrl: 'https://www.elcompanies.com/en/careers' },
  { company: '资生堂', type: '外企 女性友好 美妆 校招 实习', careersUrl: 'https://corp.shiseido.com/en/careers/' },
  { company: '宝洁', type: '外企 女性友好 快消 校招 实习', careersUrl: 'https://www.pgcareers.com/' },
  { company: '联合利华', type: '外企 女性友好 快消 校招 实习', careersUrl: 'https://careers.unilever.com/' },
  { company: 'LVMH', type: '外企 女性友好 奢侈品 美妆 校招 实习', careersUrl: 'https://www.lvmh.com/join-us' },
  { company: '香奈儿', type: '外企 女性友好 奢侈品 美妆 校招 实习', careersUrl: 'https://www.chanel.com/cn/careers/' },
  { company: '宜家', type: '外企 女性友好 零售 校招 实习', careersUrl: 'https://www.ikea.com/global/en/our-business/how-we-work/work-with-us/' },
  { company: '诺和诺德', type: '外企 女性友好 医药 校招 实习', careersUrl: 'https://www.novonordisk.com/careers.html' },
  { company: '强生', type: '外企 女性友好 医药 快消 校招 实习', careersUrl: 'https://www.careers.jnj.com/' },
  { company: '玛氏', type: '外企 女性友好 快消 校招 实习', careersUrl: 'https://careers.mars.com/' },
  { company: '雀巢', type: '外企 女性友好 快消 校招 实习', careersUrl: 'https://www.nestle.com/jobs' },
  { company: '微软', type: '外企 科技 大厂 校招 实习', careersUrl: 'https://jobs.careers.microsoft.com/' },
  { company: '苹果', type: '外企 科技 大厂 校招 实习', careersUrl: 'https://jobs.apple.com/' },
  { company: '亚马逊', type: '外企 科技 大厂 校招 实习', careersUrl: 'https://www.amazon.jobs/' },
  { company: '特斯拉', type: '外企 新能源 制造 校招 实习', careersUrl: 'https://www.tesla.cn/careers/search/' },
  { company: 'SAP', type: '外企 科技 软件 校招 实习', careersUrl: 'https://jobs.sap.com/' },
  { company: 'IBM', type: '外企 科技 软件 校招 实习', careersUrl: 'https://www.ibm.com/careers/' },
  { company: '沃尔沃', type: '外企 制造 校招 实习', careersUrl: 'https://www.volvogroup.com/en/careers.html' },
  { company: '爱立信', type: '外企 通信 校招 实习', careersUrl: 'https://www.ericsson.com/en/careers' },
  { company: 'Spotify', type: '外企 海外远程 校招 实习', careersUrl: 'https://www.lifeatspotify.com/jobs' },
];

const commonChinaCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '苏州', '武汉', '西安', '全国'];
const foreignCompanyCities = ['上海', '北京', '广州', '深圳', '杭州', '全国'];
const companyTypeTags = ['央国企', '大厂', '外企', '银行', '互联网', '金融科技', '女性友好'];
const roleTagByType = {
  AI: ['AI产品经理', '算法工程师', '机器学习', 'AI应用开发', '数据分析'],
  云计算: ['云计算', '后端开发', '运维开发', '解决方案', '产品经理'],
  互联网: ['产品经理', '运营', '数据分析', '前端开发', '后端开发', '商业分析'],
  金融: ['金融科技', '数据分析', '商业分析', '产品经理', '风险管理'],
  银行: ['银行管培生', '金融科技', '数据分析', '商业分析', '运营'],
  通信: ['通信工程师', '网络工程师', '产品经理', '运营', '数据分析'],
  快消: ['品牌市场', '市场营销', '运营', '商业分析', '供应链'],
  美妆: ['品牌市场', '市场营销', '运营', '商业分析'],
  游戏: ['游戏策划', '游戏运营', '客户端开发', '服务端开发', '数据分析'],
  医药: ['市场准入', '医学事务', '数据分析', '运营', '管培生'],
  制造: ['供应链', '制造工程师', '项目管理', '数据分析'],
};
const companiesWithTags = preferredCompanies.map(normalizeCompanyTags);
const jobBoardSources = [
  { name: '牛客网', channel: 'job-board-search', tags: ['校招', '实习', '互联网', '大厂', 'AI'], buildUrl: buildNowcoderSearchUrl },
  { name: '实习僧', channel: 'job-board-search', tags: ['实习', '互联网', '外企', '女性友好'], buildUrl: buildShixisengSearchUrl },
  { name: '应届生求职网', channel: 'job-board-search', tags: ['校招', '央国企', '银行', '外企'], buildUrl: buildYingjieshengSearchUrl },
  { name: 'BOSS直聘', channel: 'job-board-search', tags: ['实习', '校招', '互联网', '大厂'], buildUrl: buildBossSearchUrl },
  { name: '拉勾招聘', channel: 'job-board-search', tags: ['互联网', '大厂', 'AI', '校招', '实习'], buildUrl: buildLagouSearchUrl },
  { name: '前程无忧', channel: 'job-board-search', tags: ['校招', '实习', '央国企', '银行', '外企'], buildUrl: build51JobSearchUrl },
];
const seededJobPool = createSeededJobPool();

const roleKeywords = ['AI', '产品', '算法', '机器学习', '数据', '商业分析', '运营', 'Agent', 'Machine Learning', 'Analyst', 'Product'];
const campusKeywords = ['校招', '校园招聘', '应届', '实习', 'intern', 'campus', 'graduate', 'student'];
const blockedNavTitles = [
  'skip to content',
  'skip to main content',
  'main menu',
  'menu',
  'read more',
  'learn more',
  'explore',
  'students',
  'events',
  'faqs',
  'application guide',
  'global',
  'france',
  'united states',
  'français',
  'french',
];

export async function crawlRecommendedJobs(profile = {}, options = {}) {
  const companies = pickCompanies(profile).slice(0, options.limitCompanies || 10);
  const roles = splitList(profile.roles).concat(roleKeywords).slice(0, 18);
  const results = [
    ...pickSeededJobs(profile, companies, options),
    ...createJobBoardRecommendations(profile, roles, companies, options),
  ];
  const errors = [];

  for (const company of companies) {
    try {
      const jobs = await crawlCompany(company, roles, profile);
      results.push(...jobs);
    } catch (error) {
      errors.push({ company: company.company, message: error.message || '抓取失败' });
    }
  }

  return {
    jobs: uniqueByUrl(results).slice(0, options.limitJobs || 40),
    errors,
    checkedCompanies: companies.length,
    recommendedCompanies: companies.map(toRecommendedCompany),
  };
}

function createSeededJobPool() {
  const observedJobs = [
    {
      company: '中移互联网',
      source: '牛客网',
      sourceUrl: 'https://www.nowcoder.com/jobs/school/schedule',
      title: '中移互联网 2027 届秋季校园招聘',
      city: '广州',
      goal: '校招',
      publishedAt: '2026-09-04',
      deadline: '2026-11-04',
      tags: ['央国企', '通信', '互联网', '校招', '技术', '产品', '运营'],
      companyType: '央国企 通信',
    },
    {
      company: '中国电信',
      source: '牛客网',
      sourceUrl: 'https://www.nowcoder.com/jobs/school/schedule',
      title: '中国电信云计算公司 2027 届秋季校园招聘',
      city: '北京',
      goal: '校招',
      publishedAt: '2026-08-24',
      deadline: '',
      tags: ['央国企', '通信', '云计算', 'AI', '校招'],
      companyType: '央国企 通信',
    },
    {
      company: '携程',
      source: '牛客网',
      sourceUrl: 'https://www.nowcoder.com/jobs/school/schedule',
      title: '携程集团 2027 届秋季校园招聘',
      city: '上海',
      goal: '校招',
      publishedAt: '2026-08-26',
      deadline: '',
      tags: ['大厂', '互联网', '旅游', '校招', '产品经理', '数据分析'],
      companyType: '互联网 大厂',
    },
    {
      company: '快手',
      source: '牛客网',
      sourceUrl: 'https://www.nowcoder.com/jobs/school/schedule',
      title: '快手 2027 届秋季校园招聘',
      city: '北京',
      goal: '校招',
      publishedAt: '2026-08-16',
      deadline: '',
      tags: ['大厂', '互联网', '校招', '产品经理', '算法工程师', '数据分析'],
      companyType: '互联网 大厂',
    },
    {
      company: '网易',
      source: '牛客网',
      sourceUrl: 'https://www.nowcoder.com/jobs/school/schedule',
      title: '网易 2027 届秋季校园招聘',
      city: '杭州',
      goal: '校招',
      publishedAt: '2026-06-12',
      deadline: '',
      tags: ['大厂', '互联网', '游戏', '校招', '产品经理', '运营', '数据分析'],
      companyType: '互联网 大厂',
    },
  ];

  const companyCoverageJobs = companiesWithTags.map((company) => {
    const goal = company.companyTags.includes('外企') ? '校招/实习' : '校招';
    const primaryRole = company.roleTags[0] || '管培生';
    const city = company.cityTags[0] || '全国';
    return {
      company: company.company,
      source: '公司官网',
      sourceUrl: company.careersUrl,
      title: `${company.company} ${primaryRole}${goal}岗位`,
      city,
      salary: '以官网实时岗位为准',
      goal,
      publishedAt: '',
      deadline: '',
      tags: unique([...company.companyTags, ...company.roleTags.slice(0, 4), ...company.cityTags.slice(0, 2), goal]),
      companyType: company.type,
      channel: 'seeded-company-job-pool',
      description: [
        `${company.company} 官方招聘入口，已按公司类型、岗位方向和城市打标签。`,
        '具体岗位、发布时间和截止时间以打开后的官网实时信息为准。',
      ].join('\n'),
    };
  });

  return uniqueByUrl([...observedJobs, ...companyCoverageJobs].map(normalizeSeededJob));
}

function pickCompanies(profile) {
  const types = Array.isArray(profile.industries) ? profile.industries : [];
  const companyTypes = Array.isArray(profile.companyTypes) ? profile.companyTypes : [];
  const roles = splitList(profile.roles);
  const cities = Array.isArray(profile.cities) ? profile.cities : [];
  const preferences = [...types, ...companyTypes, ...roles, ...cities].filter(Boolean);
  if (!preferences.length) return companiesWithTags;

  const ranked = companiesWithTags
    .map((company) => {
      const score = scoreCompany(company, { companyTypes, industries: types, roles, cities });
      return { ...company, matchScore: score.value, matchReasons: score.reasons };
    })
    .filter((company) => company.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.company.localeCompare(b.company, 'zh-Hans-CN'));

  return ranked.length ? ranked : companiesWithTags;
}

async function crawlCompany(company, roles, profile) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(company.careersUrl, {
      headers: {
        'User-Agent': 'KikiJob/0.1 job discovery crawler',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return extractJobsFromHtml(html, company, roles, profile);
  } finally {
    clearTimeout(timeout);
  }
}

function extractJobsFromHtml(html, company, roles, profile) {
  const anchors = [...String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const title = stripTags(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const pageText = stripTags(html).slice(0, 3000);
  const jobs = [];

  for (const anchor of anchors) {
    const href = normalizeUrl(anchor[1], company.careersUrl);
    const text = stripTags(anchor[2]);
    if (!href || !looksLikeJobLink(href, text, roles, profile)) continue;
    const city = inferCity(text);
    jobs.push({
      source: '公司官网',
      sourceUrl: href,
      title: normalizeTitle(text) || `${company.company} 招聘岗位`,
      company: company.company,
      city,
      salary: '暂未公开',
      description: `${normalizeTitle(text)}\n来源页面：${title || company.careersUrl}`,
      tags: [...new Set([...inferTags(`${text} ${pageText}`, roles), ...company.roleTags.slice(0, 4)])].slice(0, 8),
      companyType: company.type,
      goal: inferGoal(`${text} ${pageText}`, profile),
      channel: 'career-site-crawler',
    });
  }

  return jobs;
}

function looksLikeJobLink(href, text, roles, profile = {}) {
  const url = new URL(href);
  const label = stripTags(text);
  const lowerLabel = label.toLowerCase();
  const lowerUrl = href.toLowerCase();
  const hashOnly = url.hash && `${url.origin}${url.pathname}` === href.replace(url.hash, '');
  const blockedTitle = blockedNavTitles.some((title) => lowerLabel === title || lowerLabel.startsWith(`${title} `));
  const genericLabel = /^(中文|english|français|learn more|read more|view opportunities|search jobs|find a programme)$/i.test(label);
  const categoryPath = /\/jobs\/searchjobs\?|\/content\/|\/go\//i.test(lowerUrl);
  const specificJobPath = /\/job\/|\/position\/|jobid=|job_id=|requisition|reqid|apply/i.test(lowerUrl);
  const hasRoleInAnchor = roles.some((role) => role && `${lowerLabel} ${lowerUrl}`.includes(String(role).toLowerCase()));
  const hasCampusInAnchor = campusKeywords.some((keyword) => `${lowerLabel} ${lowerUrl}`.includes(keyword.toLowerCase()));
  const hasChineseJobWord = /岗位|职位|校招|实习|管培|算法|产品|数据|工程师|分析师/.test(label);
  const location = inferCity(label);
  const preferredCities = Array.isArray(profile.cities) ? profile.cities : [];
  const outsidePreferredLocation = location !== '暂未公开' && preferredCities.length && !preferredCities.includes(location);
  const hasUsefulText = label.length >= 6 && label.length <= 90;
  return (
    !hashOnly &&
    !blockedTitle &&
    !genericLabel &&
    !categoryPath &&
    !outsidePreferredLocation &&
    hasUsefulText &&
    specificJobPath &&
    (hasRoleInAnchor || hasCampusInAnchor || hasChineseJobWord)
  );
}

function normalizeUrl(href, baseUrl) {
  try {
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return '';
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(text) {
  return stripTags(text).replace(/^[-|·\s]+|[-|·\s]+$/g, '').slice(0, 90);
}

function inferCity(text) {
  const knownCities = [
    '深圳',
    '香港',
    '上海',
    '杭州',
    '北京',
    '广州',
    '成都',
    '南京',
    '苏州',
    'Singapore',
    'Phnom Penh',
    'Cambodia',
    'Taiwan',
    'Thailand',
    'United States',
    'United Kingdom',
    'France',
    'Germany',
  ];
  return knownCities.find((city) => text.includes(city)) || '暂未公开';
}

function inferGoal(text, profile = {}) {
  if (/实习|intern/i.test(text)) return '实习';
  if (/校招|校园招聘|应届|graduate|campus/i.test(text)) return '校招';
  return Array.isArray(profile.goals) && profile.goals[0] ? profile.goals[0] : '暂未公开';
}

function inferTags(text, roles) {
  return [...new Set(roles.filter((role) => role && text.toLowerCase().includes(String(role).toLowerCase())))].slice(0, 8);
}

function splitList(value) {
  if (Array.isArray(value)) return value.flatMap(splitList);
  return String(value || '')
    .split(/[、,;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCompanyTags(company) {
  const typeTags = splitList(company.type);
  const roleTags = unique(typeTags.flatMap((tag) => roleTagByType[tag] || []));
  const cityTags = typeTags.includes('外企') && !typeTags.includes('央国企') ? foreignCompanyCities : commonChinaCities;
  return {
    ...company,
    companyTags: unique([...typeTags, ...companyTypeTags.filter((tag) => typeTags.includes(tag))]),
    roleTags: roleTags.length ? roleTags : ['产品经理', '运营', '数据分析', '商业分析'],
    cityTags,
  };
}

function scoreCompany(company, preferences) {
  const reasons = [];
  let value = 0;
  for (const type of [...preferences.companyTypes, ...preferences.industries]) {
    if (matchesAnyTag(type, [...company.companyTags, company.type])) {
      value += preferences.companyTypes.includes(type) ? 4 : 3;
      reasons.push(type);
    }
  }
  for (const role of preferences.roles) {
    if (matchesAnyTag(role, [...company.roleTags, ...company.companyTags, company.type])) {
      value += 2;
      reasons.push(role);
    }
  }
  for (const city of preferences.cities) {
    if (matchesAnyTag(city, company.cityTags)) {
      value += city === '全国' ? 1 : 1.5;
      reasons.push(city);
    }
  }
  return { value, reasons: unique(reasons).slice(0, 5) };
}

function matchesAnyTag(value, tags) {
  const normalized = String(value || '').toLowerCase();
  return tags.some((tag) => {
    const candidate = String(tag || '').toLowerCase();
    return candidate && (candidate.includes(normalized) || normalized.includes(candidate));
  });
}

function toRecommendedCompany(company) {
  return {
    company: company.company,
    companyType: company.companyTags.filter((tag) => companyTypeTags.includes(tag)).join('、') || company.type,
    industry: company.companyTags.filter((tag) => !companyTypeTags.includes(tag)).slice(0, 4).join('、') || company.type,
    location: company.cityTags.slice(0, 4).join('、'),
    url: company.careersUrl,
    tags: {
      company: company.companyTags,
      role: company.roleTags,
      city: company.cityTags,
    },
    reason: company.matchReasons?.length ? `匹配：${company.matchReasons.join('、')}` : '根据你的求职偏好推荐',
  };
}

function pickSeededJobs(profile, companies, options = {}) {
  const limit = options.limitSeededJobs ?? 30;
  if (limit <= 0) return [];
  const selectedCompanyNames = new Set(companies.map((company) => company.company));
  const profileTags = buildProfileTags(profile);

  const ranked = seededJobPool
    .filter((job) => selectedCompanyNames.has(job.company) || profileTags.some((tag) => matchesAnyTag(tag.value, job.tags)))
    .map((job) => ({ ...job, matchScore: scoreSeededJob(job, profileTags) }))
    .filter((job) => job.matchScore > 0 || selectedCompanyNames.has(job.company))
    .sort((a, b) => b.matchScore - a.matchScore || a.company.localeCompare(b.company, 'zh-Hans-CN'));

  return ranked.slice(0, limit);
}

function scoreSeededJob(job, profileTags) {
  if (!profileTags.length) return 1;
  return profileTags.reduce((score, tag) => {
    if (!matchesAnyTag(tag.value, [job.company, job.title, job.city, job.goal, job.companyType, ...job.tags])) return score;
    return score + tag.weight;
  }, 0);
}

function buildProfileTags(profile) {
  return [
    ...weightedTags(profile.companyTypes, 5),
    ...weightedTags(profile.industries, 4),
    ...weightedTags(splitList(profile.roles), 2),
    ...weightedTags(profile.goals, 2),
    ...weightedTags(profile.cities, 1),
  ];
}

function weightedTags(values, weight) {
  const list = Array.isArray(values) ? values : [];
  return list.filter(Boolean).map((value) => ({ value, weight }));
}

function createJobBoardRecommendations(profile, roles, companies, options = {}) {
  const limit = options.limitJobBoards ?? 18;
  if (limit <= 0) return [];
  const cities = Array.isArray(profile.cities) && profile.cities.length ? profile.cities.slice(0, 3) : ['全国'];
  const goals = Array.isArray(profile.goals) && profile.goals.length ? profile.goals.slice(0, 2) : ['校招', '实习'];
  const requestedRoles = splitList(profile.roles);
  const companyTags = unique(companies.flatMap((company) => company.companyTags || []));
  const roleTags = unique([...(requestedRoles.length ? requestedRoles : roles), ...companies.flatMap((company) => company.roleTags || [])]).slice(0, 6);
  const boards = rankJobBoards(companyTags).slice(0, 6);
  const jobs = [];

  for (const board of boards) {
    for (const role of roleTags.slice(0, 3)) {
      for (const city of cities) {
        const goal = goals[0] || '';
        const keyword = [role, goal].filter(Boolean).join(' ');
        jobs.push({
          source: board.name,
          sourceUrl: board.buildUrl({ keyword, city, goal }),
          title: `${board.name}：${keyword}${city && city !== '全国' ? ` · ${city}` : ''}`,
          company: '多家公司',
          city,
          salary: '以平台实时岗位为准',
          description: [
            `岗位搜索入口：${keyword}`,
            `目标城市：${city}`,
            '打开后请以平台实时岗位、发布时间和截止时间为准。',
          ].join('\n'),
          tags: unique([role, goal, city, ...board.tags]).slice(0, 8),
          companyType: board.tags.join('、'),
          goal: goal || '校招',
          channel: board.channel,
        });
        if (jobs.length >= limit) return jobs;
      }
    }
  }

  return jobs;
}

function rankJobBoards(companyTags) {
  return jobBoardSources
    .map((board) => ({
      ...board,
      score: board.tags.filter((tag) => matchesAnyTag(tag, companyTags)).length,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function buildNowcoderSearchUrl({ keyword, city }) {
  return buildSearchEngineUrl(`${keyword} ${city} site:nowcoder.com/jobs`);
}

function buildShixisengSearchUrl({ keyword, city }) {
  const params = new URLSearchParams({ keyword });
  if (city && city !== '全国') params.set('city', city);
  return `https://www.shixiseng.com/interns?${params.toString()}`;
}

function buildYingjieshengSearchUrl({ keyword, city }) {
  return `https://s.yingjiesheng.com/search.php?word=${encodeURIComponent([keyword, city].filter(Boolean).join(' '))}`;
}

function buildBossSearchUrl({ keyword, city }) {
  const cityCodes = {
    北京: '101010100',
    上海: '101020100',
    深圳: '101280600',
    广州: '101280100',
    杭州: '101210100',
    成都: '101270100',
    南京: '101190100',
    苏州: '101190400',
    武汉: '101200100',
    西安: '101110100',
  };
  const cityParam = cityCodes[city] ? `&city=${cityCodes[city]}` : '';
  return `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}${cityParam}`;
}

function buildLagouSearchUrl({ keyword, city }) {
  const params = new URLSearchParams({ kd: keyword });
  if (city && city !== '全国') params.set('city', city);
  return `https://www.lagou.com/wn/jobs?${params.toString()}`;
}

function build51JobSearchUrl({ keyword, city }) {
  return `https://we.51job.com/pc/search?keyword=${encodeURIComponent([keyword, city].filter(Boolean).join(' '))}&searchType=2&sortType=0`;
}

function buildSearchEngineUrl(query) {
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
}

function normalizeSeededJob(job) {
  return {
    source: job.source || '岗位池',
    sourceUrl: job.sourceUrl,
    title: job.title,
    company: job.company,
    city: job.city || '全国',
    salary: job.salary || '以实时岗位为准',
    description: job.description || '岗位池种子，打开链接查看实时岗位详情。',
    tags: unique(job.tags || []),
    companyType: job.companyType || '未标注',
    goal: job.goal || '校招',
    channel: job.channel || 'seeded-job-pool',
    publishedAt: job.publishedAt || '',
    deadline: job.deadline || '',
  };
}

function uniqueByUrl(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    if (seen.has(job.sourceUrl)) return false;
    seen.add(job.sourceUrl);
    return true;
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
