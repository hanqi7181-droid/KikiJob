import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { crawlRecommendedJobs } from './jobCrawler.js';

afterEach(() => {
  delete global.fetch;
});

test('smart recommendation ranks companies by company, role, and city tags', async () => {
  const requestedUrls = [];
  global.fetch = async (url) => {
    requestedUrls.push(String(url));
    return {
      ok: true,
      async text() {
        return `
          <html>
            <title>校园招聘</title>
            <body>
              <a href="/job/123">AI产品经理实习 杭州</a>
            </body>
          </html>
        `;
      },
    };
  };

  const result = await crawlRecommendedJobs(
    {
      companyTypes: ['大厂'],
      industries: ['互联网'],
      roles: 'AI产品经理',
      cities: ['杭州'],
      goals: ['实习'],
    },
    { limitCompanies: 4, limitSeededJobs: 0, limitJobBoards: 0, limitJobs: 4 }
  );

  assert.equal(result.checkedCompanies, 4);
  assert.ok(result.recommendedCompanies.length > 0);
  assert.ok(result.recommendedCompanies.every((company) => company.tags.company.includes('大厂')));
  assert.ok(result.recommendedCompanies.some((company) => company.tags.role.includes('AI产品经理')));
  assert.ok(result.recommendedCompanies.every((company) => company.tags.city.includes('杭州')));
  assert.equal(result.jobs.length, 4);
  assert.equal(requestedUrls.length, 4);
});

test('smart recommendation adds zero-budget job board search links after click', async () => {
  global.fetch = async () => ({
    ok: true,
    async text() {
      return '<html><title>暂无公开岗位</title><body><a href="/about">关于我们</a></body></html>';
    },
  });

  const result = await crawlRecommendedJobs(
    {
      companyTypes: ['央国企'],
      industries: ['银行'],
      roles: '数据分析',
      cities: ['北京'],
      goals: ['校招'],
    },
    { limitCompanies: 2, limitSeededJobs: 0, limitJobBoards: 6, limitJobs: 10 }
  );

  const boardJobs = result.jobs.filter((job) => job.channel === 'job-board-search');
  assert.equal(boardJobs.length, 6);
  assert.ok(boardJobs.some((job) => job.source === '牛客网' || job.source === '应届生求职网'));
  assert.ok(boardJobs.every((job) => job.sourceUrl));
  assert.ok(boardJobs[0].title.includes('数据分析') || boardJobs[0].tags.includes('数据分析'));
});

test('smart recommendation returns tagged seeded company jobs', async () => {
  global.fetch = async () => ({
    ok: true,
    async text() {
      return '<html><title>暂无公开岗位</title><body><a href="/about">关于我们</a></body></html>';
    },
  });

  const result = await crawlRecommendedJobs(
    {
      companyTypes: ['央国企'],
      industries: ['通信'],
      roles: '产品经理',
      cities: ['广州'],
      goals: ['校招'],
    },
    { limitCompanies: 3, limitSeededJobs: 6, limitJobBoards: 0, limitJobs: 8 }
  );

  const seededJobs = result.jobs.filter((job) => job.channel === 'seeded-job-pool' || job.channel === 'seeded-company-job-pool');
  assert.ok(seededJobs.length > 0);
  assert.ok(seededJobs.some((job) => job.company.includes('移动') || job.company.includes('电信') || job.company.includes('联通')));
  assert.ok(seededJobs.every((job) => job.tags.includes('央国企') || job.companyType.includes('央国企')));
});
