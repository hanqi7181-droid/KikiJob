const fieldDefinitions = {
  personal: [
    ['fullName', 'name', '姓名', 'personal.name', ['姓名', '名字', '中文姓名', '候选人姓名', '申请人姓名', 'Name', 'Full Name', 'Candidate Name']],
    ['email', 'email', '邮箱', 'personal.email', ['邮箱', '电子邮箱', '邮件', '邮箱地址', 'Email', 'E-mail', 'Email Address']],
    ['phone', 'phone', '电话', 'personal.phone', ['电话', '手机号', '手机号码', '联系电话', '移动电话', '联系方式', 'Phone', 'Mobile', 'Phone Number']],
    ['city', 'currentCity', '当前城市', 'personal.currentCity', ['当前城市', '当前所在地', '所在地', '现居住地', '居住城市', 'Location', 'City', 'Current Location']],
    ['hometown', 'hometown', '籍贯', 'personal.hometown', ['籍贯', '户籍', '生源地', '家乡', 'Hometown', 'Native Place']],
    ['birthDate', 'birthDate', '出生年月', 'personal.birthDate', ['出生年月', '出生日期', '生日', '出生时间', 'Birth Date', 'Birthday', 'Date of Birth']],
    ['politicalStatus', 'politicalStatus', '政治面貌', 'personal.politicalStatus', ['政治面貌', '政治身份', '党员', 'Political Status']],
    ['targetRole', 'jobIntention', '求职意向', 'personal.jobIntention', ['求职意向', '应聘职位', '申请职位', '目标岗位', '岗位方向', 'Position', 'Job Applied', 'Target Role']],
    ['resumeFile', 'resumeFile', '简历文件', 'personal.resumeFile', ['简历文件', '简历附件', '上传简历', '附件', 'Resume', 'CV', 'Resume File']],
  ],
  education: [
    ['School', 'school', '学校', ['学校', '学校名称', '院校', '毕业院校', '大学', 'School', 'University']],
    ['Degree', 'degree', '学历', ['学历', '学历层次', '学位', 'Degree', 'Education Level']],
    ['StudyType', 'studyType', '学习形式', ['学习形式', '培养方式', '全日制', 'Study Type']],
    ['College', 'college', '学院', ['学院', '院系', 'College', 'School Department']],
    ['Major', 'major', '专业', ['专业', '专业名称', '所学专业', '主修专业', 'Major', 'Discipline']],
    ['MajorRank', 'majorRank', '专业排名', ['专业排名', '排名', '成绩排名', 'Major Rank', 'Ranking']],
    ['Gpa', 'gpa', 'GPA', ['GPA', '绩点', '成绩', '平均分', 'Grade']],
    ['StartDate', 'startDate', '开始时间', ['开始时间', '起始时间', '入学时间', '就读开始时间', '起止时间', 'Start Date', 'From']],
    ['EndDate', 'endDate', '结束时间', ['结束时间', '毕业时间', '就读结束时间', '截止时间', '起止时间', 'End Date', 'To']],
    ['Courses', 'courses', '主修课程', ['主修课程', '相关课程', '核心课程', 'Courses', 'Relevant Courses']],
    ['Description', 'description', '教育描述', ['教育描述', '教育经历描述', 'Education Description']],
  ],
  internship: [
    ['Company', 'company', '公司名称', ['公司名称', '公司', '单位名称', '雇主', 'Company', 'Employer']],
    ['Department', 'department', '部门', ['部门', '所属部门', '事业部', 'Department', 'Division']],
    ['Role', 'role', '职位', ['职位', '职位名称', '岗位', '实习岗位', '实习职位', 'Position', 'Job Title', 'Role']],
    ['StartDate', 'startDate', '开始时间', ['开始时间', '起始时间', '入职时间', '实习开始时间', '起止时间', 'Start Date', 'From']],
    ['EndDate', 'endDate', '结束时间', ['结束时间', '离职时间', '实习结束时间', '起止时间', 'End Date', 'To']],
    ['Description', 'description', '职责描述', ['工作职责', '实习职责', '实习内容', '工作内容', '工作描述', '岗位职责', '职责描述', 'Responsibilities', 'Description']],
  ],
  project: [
    ['Name', 'name', '项目名称', ['项目名称', '项目', 'Project Name']],
    ['Role', 'role', '职责/角色', ['角色', '职责', '担任角色', '担任职责', '项目角色', '项目职责', 'Role']],
    ['StartDate', 'startDate', '开始时间', ['开始时间', '起始时间', '项目开始时间', '起止时间', 'Start Date', 'From']],
    ['EndDate', 'endDate', '结束时间', ['结束时间', '截止时间', '项目结束时间', '起止时间', 'End Date', 'To']],
    ['Description', 'description', '项目描述', ['项目描述', '项目内容', '项目介绍', '项目职责', '主要贡献', '项目贡献', 'Description']],
    ['Responsibility', 'responsibility', '项目中职责', ['项目中职责', '项目职责', '承担职责', '主要贡献', 'Responsibilities']],
    ['Technologies', 'technologies', '技术栈', ['技术栈', '使用技术', '工具', 'Technologies', 'Tech Stack']],
  ],
  practice: [
    ['Name', 'name', '奖项/实践名称', ['名称', '奖项名称', '荣誉名称', '活动名称', '获奖名称', 'Name', 'Title']],
    ['Date', 'date', '获奖/实践时间', ['获奖时间', '实践时间', '活动时间', '时间', 'Date']],
    ['Level', 'level', '级别', ['奖项级别', '荣誉级别', '级别', 'Level']],
    ['Description', 'description', '描述', ['获奖描述', '荣誉描述', '实践描述', '活动描述', '描述', 'Description']],
  ],
  skills: [
    ['skillsSummary', 'summary', '技能总结', 'skills.summary', ['技能总结', '技能特长', '专业技能', '个人技能', '技能描述', 'Skills', 'Skill Summary']],
    ['aiSkills', 'ai', 'AI技能', 'skills.ai', ['AI技能', '人工智能技能', 'AI能力', 'Agent', 'RAG', 'Prompt', '生成式AI', '机器学习', 'AI Skills']],
    ['programmingSkills', 'programming', '编程开发', 'skills.programming', ['编程开发', '开发技能', '编程语言', '技术栈', 'Programming', 'Development', 'Coding Skills']],
    ['dataSkills', 'data', '数据技术', 'skills.data', ['数据技术', '数据分析', '数据技能', '数据工具', 'Data Skills', 'Analytics', 'Data Analysis']],
    ['productSkills', 'product', '产品工具', 'skills.product', ['产品工具', '产品技能', '产品能力', '原型工具', 'Product Skills', 'Product Tools']],
    ['language', 'languages', '语言能力', 'skills.languages', ['语言能力', '语言水平', '外语能力', 'Language', 'Languages', 'Language Skills']],
    ['englishLevel', 'english', '英语水平', 'skills.english', ['英语水平', '英语能力', '英语成绩', '雅思', 'CET-6', 'CET-4', 'IELTS', 'English Level']],
    ['otherSkills', 'other', '其他技能', 'skills.other', ['其他技能', '补充技能', '综合技能', 'Additional Skills', 'Other Skills']],
  ],
};

const sectionAliases = {
  personal: ['个人信息', '基础资料', 'Personal Information', 'Basic Information'],
  education: ['教育经历', '教育背景', '教育经验', '学习经历', '学历经历', 'Education', 'Education Background'],
  internship: ['实习经历', '实习经验', '工作经历', '工作经验', 'Internship', 'Internship Experience', 'Work Experience'],
  project: ['项目经历', '项目经验', '项目', '项目背景', 'Project', 'Project Experience'],
  practice: ['获奖经历', '奖项', '获奖情况', '荣誉奖励', '实践经历', '校园经历', 'Awards', 'Honors', 'Campus Experience'],
  skills: ['技能', '专业技能', '其他技能', '语言能力', 'Skills', 'Languages'],
};

const groupLabels = {
  personal: '基础资料',
  education: '教育经历',
  internship: '实习经历',
  project: '项目经历',
  practice: '实践荣誉',
  skills: '技能',
};

export function buildStandardFormMappings(profile = {}, parsedResume = {}, options = {}) {
  const normalized = normalizeProfileData(profile, parsedResume, options);
  return [
    ...personalRows(normalized),
    ...repeaterRows('education', normalized.education),
    ...repeaterRows('internship', normalized.internships),
    ...repeaterRows('project', normalized.projects),
    ...repeaterRows('practice', normalized.practice),
    ...skillRows(normalized.skills),
  ].filter((row) => hasValue(row.value));
}

export function normalizeProfileData(profile = {}, parsedResume = {}, options = {}) {
  const text = parsedResume?.fullText || parsedResume?.summary || '';
  const skillDetails = parsedResume?.skillDetails || {};
  const education = normalizeEducationItems(Array.isArray(profile?.education) && profile.education.length ? profile.education : parsedResume?.educationDetails || []);
  const internships = normalizeExperienceItems(
    Array.isArray(profile?.experiences) && profile.experiences.length ? profile.experiences : parsedResume?.workExperienceDetails || []
  );
  const projects = normalizeProjectItems(Array.isArray(profile?.projects) && profile.projects.length ? profile.projects : parsedResume?.projectExperienceDetails || []);
  const practice = normalizePracticeItems(Array.isArray(profile?.practice) && profile.practice.length ? profile.practice : parsedResume?.practiceDetails || []);
  const programming = clean(skillDetails.programming);
  const data = clean(skillDetails.data);
  const product = clean(skillDetails.product);
  const languages = clean(skillDetails.languages || (parsedResume?.languages || []).join('、'));
  const skillKeywords = (parsedResume?.skills || []).join('、');
  const summary = uniqueJoin([programming, data, product, languages], '；');

  return {
    personal: {
      name: clean(parsedResume?.name || profile.name),
      email: clean(pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, text) || profile.email),
      phone: clean(pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, text) || profile.phone),
      currentCity: clean(Array.isArray(profile.cities) ? `${profile.cities.join(' / ')}均可` : profile.city),
      hometown: clean(pick(/(?:辽宁|北京|上海|深圳|广州|杭州|香港|浙江|成都|南京|苏州)[\u4e00-\u9fa5]*/, text)),
      birthDate: clean(pick(/(?:19|20)\d{2}[./-]\d{1,2}/, text)),
      politicalStatus: /中共党员/.test(text) ? '中共党员' : '',
      jobIntention: clean(extractJobIntention(text) || profile.roles),
      resumeFile: clean(options.resumeFileName || profile.resumeName),
    },
    education,
    internships,
    projects,
    practice,
    skills: {
      summary,
      ai: uniqueJoin([skillKeywords, data, programming].filter((item) => /AI|Agent|RAG|Prompt|机器学习|深度学习|PyTorch|CNN|GNN|时间序列/i.test(item)), '；') || summary,
      programming,
      data,
      product,
      languages,
      english: languages,
      other: uniqueJoin([programming, data, product], '；'),
    },
  };
}

function personalRows(data) {
  return fieldDefinitions.personal.map(([id, canonicalField, label, profilePath, aliases]) =>
    mappingRow({
      id,
      label,
      value: data.personal[canonicalField],
      group: groupLabels.personal,
      sectionType: 'personal',
      itemIndex: -1,
      canonicalField,
      profilePath,
      aliases,
    })
  );
}

function skillRows(skills = {}) {
  return fieldDefinitions.skills.map(([id, canonicalField, label, profilePath, aliases]) =>
    mappingRow({
      id,
      label,
      value: skills[canonicalField],
      group: groupLabels.skills,
      sectionType: 'skills',
      itemIndex: -1,
      canonicalField,
      profilePath,
      aliases,
    })
  );
}

function repeaterRows(sectionType, items = []) {
  const definitions = fieldDefinitions[sectionType];
  return items.flatMap((item, itemIndex) =>
    definitions.map(([suffix, canonicalField, label, aliases]) => {
      const oneBased = itemIndex + 1;
      const legacyPrefix = sectionType === 'project' ? 'project' : sectionType === 'practice' ? 'award' : sectionType;
      const profileCollection = sectionType === 'project' ? 'projects' : sectionType === 'practice' ? 'awards' : sectionType === 'internship' ? 'experiences' : 'education';
      const value = item[canonicalField];
      return mappingRow({
        id: `${legacyPrefix}${oneBased}${suffix}`,
        key: `${legacyPrefix}.${oneBased}.${canonicalField}`,
        label: `${groupLabels[sectionType]}${oneBased}-${label}`,
        sourceLabel: `${groupLabels[sectionType]}${oneBased}-${label}`,
        value,
        group: groupLabels[sectionType],
        sectionType,
        itemIndex,
        canonicalField,
        profilePath: `${profileCollection}[${itemIndex}].${canonicalField}`,
        aliases: [
          ...(sectionAliases[sectionType] || []),
          `${groupLabels[sectionType]}${oneBased}`,
          `第${oneBased}段${groupLabels[sectionType]}`,
          ...aliases,
          `${groupLabels[sectionType]}${oneBased}-${label}`,
        ],
      });
    })
  );
}

function mappingRow({ id, key = id, label, sourceLabel = label, value, group, sectionType, itemIndex, canonicalField, profilePath, aliases }) {
  return {
    id,
    key,
    kind: 'standardFormMapping',
    label,
    sourceLabel,
    value: clean(value),
    group,
    sectionType,
    itemIndex,
    canonicalField,
    profilePath,
    aliases: unique([label, sourceLabel, ...(sectionAliases[sectionType] || []), ...(aliases || [])]).join(' / '),
  };
}

function normalizeEducationItems(items) {
  return items.map((item) => ({
    school: clean(item.school),
    degree: clean(normalizeDegree(item.degree)),
    degreeName: clean(item.degree),
    studyType: clean(item.studyType || inferStudyType(item.description)),
    college: clean(item.college),
    major: clean(item.major),
    majorRank: clean(item.majorRank || item.ranking),
    gpa: clean(item.gpa || pick(/(?:GPA|绩点)[:：]?\s*[\d.]+(?:\s*\/\s*[\d.]+)?|均分\s*[\d.]+(?:\/100)?/i, item.description || item.ranking || '')),
    startDate: clean(normalizeMonth(item.startDate)),
    endDate: clean(normalizeMonth(item.endDate)),
    courses: clean(item.courses),
    description: clean(item.description),
  }));
}

function normalizeExperienceItems(items) {
  return items.map((item) => ({
    company: clean(item.company),
    department: clean(item.department),
    role: clean(item.role),
    startDate: clean(normalizeMonth(item.startDate)),
    endDate: clean(normalizeMonth(item.endDate)),
    description: clean(item.description),
    experienceType: 'internship',
  }));
}

function normalizeProjectItems(items) {
  return items.map((item) => ({
    name: clean(item.name),
    role: clean(item.role),
    startDate: clean(normalizeMonth(item.startDate)),
    endDate: clean(normalizeMonth(item.endDate)),
    description: clean(item.description),
    responsibility: clean(item.responsibility || item.description),
    technologies: clean(item.technologies),
  }));
}

function normalizePracticeItems(items) {
  return items.map((item) => ({
    name: clean(item.name || item.title),
    date: clean(normalizeMonth(item.date || item.startDate)),
    level: clean(item.level),
    description: clean(item.description),
  }));
}

function normalizeDegree(value = '') {
  const text = clean(value);
  if (/硕士|研究生|master|msc|ms/i.test(text)) return '硕士';
  if (/本科|学士|双学位|bachelor|bs|ba/i.test(text)) return '本科';
  if (/博士|phd|doctor/i.test(text)) return '博士';
  if (/大专|专科|associate/i.test(text)) return '大专';
  return text;
}

function inferStudyType(text = '') {
  if (/非全日制/.test(text)) return '非全日制';
  if (/全日制|硕士|本科|大学/.test(text)) return '全日制';
  return '';
}

function normalizeMonth(value = '') {
  const text = clean(value);
  if (!text) return '';
  if (/至今|present/i.test(text)) return '至今';
  const match = text.match(/((?:19|20)\d{2})[./-]?(\d{1,2})?/);
  if (!match) return text;
  return match[2] ? `${match[1]}.${match[2].padStart(2, '0')}` : match[1];
}

function extractJobIntention(text = '') {
  return (
    text
      .match(/求职意向[:：]\s*([\s\S]*?)(?:\s+教育背景|\s+工作经历|\s+项目经历|[。；\n]|$)/)?.[1]
      ?.trim() || ''
  );
}

function pick(pattern, text = '') {
  return text.match(pattern)?.[0] || '';
}

function uniqueJoin(values = [], separator = '；') {
  return unique(values.map(clean).filter(Boolean)).join(separator);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function hasValue(value) {
  return Boolean(clean(value));
}

function clean(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
