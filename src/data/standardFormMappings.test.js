import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStandardFormMappings, normalizeProfileData } from './standardFormMappings.js';

const parsedResume = {
  name: '郑涵亓',
  fullText: '郑涵亓 86-18741256546 | 18741256546@163.com | 辽宁鞍山 | 2002.12 求职意向:AI算法工程师/AI应用开发 中共党员',
  educationDetails: [
    {
      school: '香港城市大学',
      degree: '硕士',
      major: '商业人工智能',
      startDate: '2025.09',
      endDate: '2026.10',
      courses: '商业生成式人工智能、金融科技与人工智能',
    },
    {
      school: '大连交通大学',
      degree: '英语+软件工程双学位',
      major: '英语+软件工程',
      startDate: '2020.09',
      endDate: '2025.06',
      ranking: '专业排名前20%',
    },
  ],
  workExperienceDetails: [
    {
      company: '大连商品交易所·飞创信息技术有限公司',
      department: '智能产品部',
      role: 'AI算法实习生',
      startDate: '2026.07',
      endDate: '2026.08',
      description: 'RAG-BGE-M3领域模型微调',
    },
    {
      company: '招商局集团 ·招商局金融科技有限公司',
      department: '集团数智技术研发中心',
      role: 'AI应用开发实习生',
      startDate: '2026.03',
      endDate: '2026.09',
      description: '商标OCR识别Agent开发',
    },
  ],
  projectExperienceDetails: [
    {
      name: '电商促销ROI优化与时序销量预测项目',
      role: '深度学习',
      startDate: '2026.02',
      endDate: '2026.05',
      description: '构建时序面板并输出ROI策略',
    },
  ],
  practiceDetails: [
    {
      title: '大学生创新创业竞赛校级二等奖',
      description: '打造有轨电车IP',
    },
  ],
  skillDetails: {
    programming: 'Python, Java, Vue',
    data: 'MySQL、Tableau、PyTorch',
    product: 'Axure、需求评审',
    languages: '英语（雅思 6.5） | CET-6',
  },
  skills: ['Python', 'PyTorch', '机器学习'],
};

test('standard form mappings keep repeater fields bound by section and item index', () => {
  const mappings = buildStandardFormMappings(
    { cities: ['深圳', '香港'], resumeName: '香港城市大学-商业人工智能-郑涵亓-简历.pdf' },
    parsedResume
  );

  const education1School = mappings.find((item) => item.id === 'education1School');
  const education2School = mappings.find((item) => item.id === 'education2School');
  const internship2Company = mappings.find((item) => item.id === 'internship2Company');
  const project1Name = mappings.find((item) => item.id === 'project1Name');
  const award1Name = mappings.find((item) => item.id === 'award1Name');

  assert.equal(education1School.value, '香港城市大学');
  assert.equal(education1School.sectionType, 'education');
  assert.equal(education1School.itemIndex, 0);
  assert.equal(education1School.canonicalField, 'school');
  assert.equal(education1School.profilePath, 'education[0].school');
  assert.equal(education2School.value, '大连交通大学');
  assert.equal(education2School.profilePath, 'education[1].school');
  assert.equal(internship2Company.value, '招商局集团 ·招商局金融科技有限公司');
  assert.equal(internship2Company.profilePath, 'experiences[1].company');
  assert.equal(project1Name.profilePath, 'projects[0].name');
  assert.equal(award1Name.profilePath, 'awards[0].name');
});

test('standard profile data covers skills and normalizes degree/date values', () => {
  const normalized = normalizeProfileData({ cities: ['深圳'] }, parsedResume);
  assert.equal(normalized.education[1].degree, '本科');
  assert.equal(normalized.education[0].startDate, '2025.09');
  assert.equal(normalized.skills.languages, '英语（雅思 6.5） | CET-6');
  assert.match(normalized.skills.summary, /Python/);
  assert.match(normalized.skills.ai, /PyTorch/);
});
