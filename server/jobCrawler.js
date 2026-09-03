const preferredCompanies = [
  { company: '腾讯', type: '互联网大厂', careersUrl: 'https://join.qq.com/' },
  { company: '阿里巴巴', type: '互联网大厂', careersUrl: 'https://talent.alibaba.com/' },
  { company: '蚂蚁集团', type: '金融科技', careersUrl: 'https://talent.antgroup.com/' },
  { company: '平安科技', type: '金融科技', careersUrl: 'https://talent.pingan.com/' },
  { company: '招商银行', type: '银行中后台', careersUrl: 'https://career.cmbchina.com/' },
  { company: '汇丰', type: '福利待遇好的外企', careersUrl: 'https://www.hsbc.com/careers' },
  { company: '欧莱雅', type: '福利待遇好的外企', careersUrl: 'https://careers.loreal.com/' },
  { company: '雅诗兰黛', type: '福利待遇好的外企', careersUrl: 'https://www.elcompanies.com/en/careers' },
  { company: '资生堂', type: '福利待遇好的外企', careersUrl: 'https://corp.shiseido.com/en/careers/' },
  { company: '宝洁', type: '福利待遇好的外企', careersUrl: 'https://www.pgcareers.com/' },
  { company: '联合利华', type: '福利待遇好的外企', careersUrl: 'https://careers.unilever.com/' },
  { company: '宜家', type: '福利待遇好的外企', careersUrl: 'https://www.ikea.com/global/en/our-business/how-we-work/work-with-us/' },
  { company: '诺和诺德', type: '福利待遇好的外企', careersUrl: 'https://www.novonordisk.com/careers.html' },
  { company: '沃尔沃', type: '福利待遇好的外企', careersUrl: 'https://www.volvogroup.com/en/careers.html' },
  { company: '爱立信', type: '福利待遇好的外企', careersUrl: 'https://www.ericsson.com/en/careers' },
  { company: 'Spotify', type: '福利待遇好的外企', careersUrl: 'https://www.lifeatspotify.com/jobs' },
  { company: '微软', type: '福利待遇好的外企', careersUrl: 'https://jobs.careers.microsoft.com/' },
  { company: '中国移动', type: '央国企', careersUrl: 'https://job.10086.cn/' },
];

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
  const results = [];
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
  };
}

function pickCompanies(profile) {
  const types = Array.isArray(profile.industries) ? profile.industries : [];
  const companyTypes = Array.isArray(profile.companyTypes) ? profile.companyTypes : [];
  const preferredTypes = [...types, ...companyTypes];
  const matched = preferredCompanies.filter((company) => preferredTypes.some((type) => company.type.includes(type) || type.includes(company.type)));
  return matched.length ? matched : preferredCompanies;
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
      tags: inferTags(`${text} ${pageText}`, roles),
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

function uniqueByUrl(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    if (seen.has(job.sourceUrl)) return false;
    seen.add(job.sourceUrl);
    return true;
  });
}
