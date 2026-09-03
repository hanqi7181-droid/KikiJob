const roleCandidates = [
  'AI产品经理',
  'AI应用开发',
  '算法工程师',
  '机器学习',
  '计算机视觉',
  '图神经网络',
  '数据分析',
  '商业分析',
  '运营',
];

const bossCityCodes = {
  北京: '101010100',
  上海: '101020100',
  深圳: '101280600',
  广州: '101280100',
  杭州: '101210100',
  浙江: '101210100',
  成都: '101270100',
  南京: '101190100',
  苏州: '101190400',
};

const companyPools = [
  {
    company: '腾讯',
    type: '互联网大厂',
    careersUrl: 'https://join.qq.com/',
  },
  {
    company: '阿里巴巴',
    type: '互联网大厂',
    careersUrl: 'https://talent.alibaba.com/',
  },
  {
    company: '蚂蚁集团',
    type: '金融科技',
    careersUrl: 'https://talent.antgroup.com/',
  },
  {
    company: '平安科技',
    type: '金融科技',
    careersUrl: 'https://talent.pingan.com/',
  },
  {
    company: '招商银行',
    type: '银行中后台',
    careersUrl: 'https://career.cmbchina.com/',
  },
  {
    company: '汇丰',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.hsbc.com/careers',
  },
  {
    company: '欧莱雅',
    type: '福利待遇好的外企',
    careersUrl: 'https://careers.loreal.com/',
  },
  {
    company: '雅诗兰黛',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.elcompanies.com/en/careers',
  },
  {
    company: '资生堂',
    type: '福利待遇好的外企',
    careersUrl: 'https://corp.shiseido.com/en/careers/',
  },
  {
    company: '宝洁',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.pgcareers.com/',
  },
  {
    company: '联合利华',
    type: '福利待遇好的外企',
    careersUrl: 'https://careers.unilever.com/',
  },
  {
    company: '宜家',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.ikea.com/global/en/our-business/how-we-work/work-with-us/',
  },
  {
    company: '诺和诺德',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.novonordisk.com/careers.html',
  },
  {
    company: '沃尔沃',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.volvogroup.com/en/careers.html',
  },
  {
    company: '爱立信',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.ericsson.com/en/careers',
  },
  {
    company: 'Spotify',
    type: '福利待遇好的外企',
    careersUrl: 'https://www.lifeatspotify.com/jobs',
  },
  {
    company: '中国移动',
    type: '央国企',
    careersUrl: 'https://job.10086.cn/',
  },
  {
    company: '微软',
    type: '福利待遇好的外企',
    careersUrl: 'https://jobs.careers.microsoft.com/',
  },
];

export function generateSearchTasks(profile) {
  const roles = extractRoles(profile.roles);
  const cities = (profile.cities || []).slice(0, 4);
  const goals = profile.goals?.length ? profile.goals : [''];
  const tasks = [];

  for (const role of roles.slice(0, 4)) {
    for (const city of cities.slice(0, 3)) {
      const goal = goals[0] || '';
      const keyword = [role, goal].filter(Boolean).join(' ');
      tasks.push(createBossTask(keyword, city));
      tasks.push(createLinkedInTask(keyword, city));
    }
  }

  return tasks.slice(0, 10);
}

export function generateCareerSiteTasks(profile) {
  const roles = extractRoles(profile.roles).slice(0, 3);
  const city = profile.cities?.[0] || '';
  const preferredCompanies = companyPools.filter((company) => profile.industries?.includes(company.type));
  const fallbackCompanies = preferredCompanies.length ? preferredCompanies : companyPools.slice(0, 5);

  return fallbackCompanies.slice(0, 18).map((company) => {
    const keyword = [company.company, roles[0], profile.goals?.[0], city].filter(Boolean).join(' ');
    return {
      id: `career-${company.company}-${keyword}`,
      platform: '公司官网',
      company: company.company,
      companyType: company.type,
      keyword,
      city,
      url: company.careersUrl,
      searchUrl: `https://www.bing.com/search?q=${encodeURIComponent(`${keyword} site:${new URL(company.careersUrl).hostname}`)}`,
      note: `${company.type} · 优先查看官网招聘入口`,
    };
  });
}

function extractRoles(rolesText = '') {
  const matches = roleCandidates.filter((role) => rolesText.includes(role));
  return matches.length ? matches : ['AI产品经理', '数据分析', '机器学习'];
}

function createBossTask(keyword, city) {
  const query = encodeURIComponent(keyword);
  const cityCode = bossCityCodes[city];
  const cityParam = cityCode ? `&city=${cityCode}` : '';

  return {
    id: `boss-${keyword}-${city}`,
    platform: 'Boss直聘',
    keyword,
    city,
    url: `https://www.zhipin.com/web/geek/job?query=${query}${cityParam}`,
    note: cityCode ? '已映射城市代码' : '未映射城市代码，请在打开后手动选择城市',
  };
}

function createLinkedInTask(keyword, city) {
  return {
    id: `linkedin-${keyword}-${city}`,
    platform: 'LinkedIn',
    keyword,
    city,
    url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(city)}`,
    note: '使用 LinkedIn 公开职位搜索入口',
  };
}
