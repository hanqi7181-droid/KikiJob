export function buildAnswerBank(profile, parsedResume) {
  const resumeName = profile.resumeName || '';
  const summary = parsedResume?.fullText || parsedResume?.summary || '';

  const fallback = {
    personal: {
      name: parsedResume?.name || '郑涵亓',
      phone: pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, summary) || '18741256546',
      email: pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, summary) || '18741256546@163.com',
      currentCity: '深圳 / 香港 / 上海 / 浙江均可',
      hometown: '辽宁鞍山',
      birthDate: '2002.12',
      politicalStatus: '中共党员',
      jobIntention: 'AI产品经理 / AI应用开发 / 数据分析 / 商业分析 / 运营',
      resumeFile: resumeName || '香港城市大学-商业人工智能-郑涵亓-简历.pdf',
    },
    education: [
      {
        school: '香港城市大学',
        degree: '硕士',
        major: '商业人工智能',
        startDate: '2025.09',
        endDate: '2026.11',
        ranking: 'QS排名63',
        courses: '商业生成式人工智能、商业应用中的人工智能、金融科技与人工智能、商业预测与建模、AI伦理等',
        description:
          '具备商业人工智能、金融科技、生成式AI、预测建模与AI伦理等课程背景，熟悉AI在商业分析和产品场景中的应用。',
      },
      {
        school: '大连交通大学',
        degree: '本科 / 双学位',
        major: '英语 + 软件工程',
        startDate: '2020.09',
        endDate: '2025.06',
        ranking: '专业排名前20%',
        courses: '大型软件系统设计与体系结构、操作系统、软件工程、计算机系统基础、数据结构与算法、离散结构等',
        description:
          '专业课均分83.84/100，获得校级三等奖学金、3次校优秀学生等荣誉；兼具软件工程技术能力与英语跨语言沟通能力。',
      },
    ],
    internships: [
      {
        company: '招商局集团 · 招商局金融科技有限公司',
        department: '集团数智技术研发中心',
        role: 'AI应用开发实习生',
        startDate: '2026.03',
        endDate: '至今',
        description:
          '主导集团品牌管理系统商标OCR识别Agent开发，设计工作流并接入DeepSeek API，实现单张/批量商标图片与文件识别、字段信息自动标准化填充；通过样本优化和Prompt工程提升填充正确率与召回率，功能稳定上线发版。负责集团融媒体平台功能测试，参与新闻生产、审校、发布、媒资管理等模块验证，保障平台流程管控与信息合规传播。承担招商督办系统与招小办智能助手运营，监控对话日志、任务流转与服务稳定性，统计会话成功率、问题解决率等指标，维护知识库并优化RAG召回策略。作为组内唯一参与周例会的实习生，参与团队规划、迭代排期与需求评审，积累央企数字化项目全流程落地经验。',
      },
      {
        company: '华晨宝马汽车有限公司',
        department: 'IT部门',
        role: 'IT部门实习生',
        startDate: '2024.10',
        endDate: '2024.12',
        description:
          '参与IT系统开发、测试与运维，协助排查故障并保障业务系统稳定。全英文参与创新科技项目沟通与落地，负责会议纪要与需求对接，提升英文技术沟通与跨团队协作能力。',
      },
      {
        company: '中国联通（辽宁）产业互联网有限公司',
        department: '研发事业部',
        role: '实习产品经理',
        startDate: '2024.07',
        endDate: '2024.09',
        description:
          '系统了解产品大环境，使用Axure设计开发CMS、AI等产品原型，积累政企、管理类网站设计经验。参与公司对标钉钉的私有化办公通信平台“辽宁-安信空间”项目，多次参与workshop会议和需求评审，整合用户体验地图并提出建设性意见，被团队采纳应用到项目中。',
      },
    ],
    projects: [
      {
        name: '电商用户流失预测',
        role: '商业数据分析课程核心项目成员',
        startDate: '2025.09',
        endDate: '2025.12',
        description:
          '基于5630条电商用户行为样本，用PyTorch搭建数据处理与建模框架，完成数据清洗并解决数据不平衡问题。构建逻辑回归、AdaBoost、随机森林、决策树、Bagging五类模型，并通过超参数调优提升精度。使用准确率、精确率、ROC-AUC等指标评估模型，优选Bagging模型并识别现金返还金额等核心特征，为用户留存决策提供支持。',
        technologies: 'Python、Scikit-learn、Matplotlib、Pandas、特征工程、SMOTE、GridSearchCV、模型调优',
      },
      {
        name: '广发证券投资分析实训项目',
        role: '组长',
        startDate: '2025.07',
        endDate: '2025.08',
        description:
          '带领团队研读金融行业报告，用SQL提取企业财务数据，结合K线等指标完成格力电器个股技术分析与投资预测。运用Excel进行估值建模、制作数据透视表整合多维数据，输出完整个股分析报告并通过考核。',
        technologies: 'SQL、Excel、估值建模、数据透视表、行业研究、投资分析',
      },
      {
        name: '门户网站后台管理系统开发与设计',
        role: '课程项目组长',
        startDate: '2024.09',
        endDate: '2024.10',
        description:
          '根据需求基于Web开发门户网站后台管理系统，提高公司门户网站信息管理效率和准确度。带领团队使用Ajax、CSS、Vue设计网页，利用MVC结构、SpringBoot框架、JeecgBoot工具、MySQL数据库及IDEA完成系统设计、前后端连接和整体开发。撰写8000字以上软件工程综合实践报告，内容包括调研报告、项目管理计划、系统需求规格说明等。',
        technologies: 'Ajax、CSS、Vue、MVC、SpringBoot、JeecgBoot、MySQL、IDEA',
      },
    ],
    practice: [
      {
        title: '院学生会副主席',
        description: '策划军训、迎新晚会、校园环保公益等大型活动，统筹资源与人员分配，保障工作高效运转。',
      },
      {
        title: '大连市优秀青年志愿者',
        description: '担任西岗区社区基层团干部，参与疫情期间社区排查、文明引导，统筹志愿者资源分配。',
      },
      {
        title: '大学生创新创业竞赛校级二等奖',
        description:
          '带领团队打造大连首个有轨电车IP“遇见201”，完成“冬奥电车”IP设计、线上推广与线下活动落地，发布笔记112篇，单月曝光量破317万，项目获得大连市文旅局支持。',
      },
    ],
    skills: {
      programming: 'Python、Java、JSP、Vue、CSS、SpringBoot、Claude、Codex、IDEA/MyEclipse',
      data: 'MySQL、Excel数据透视表/建模/函数分析、Tableau、R、时间序列预测、CNN/GNN模型开发（PyTorch）',
      product: 'Axure、Photoshop、Office办公套件、产品原型设计、需求评审、用户体验地图',
      languages: '英语（雅思6.5、CET-6、CET-4）、日语（熟悉）',
      summary:
        '熟悉AI应用开发、Agent工作流、DeepSeek/API接入、Prompt优化、RAG知识库优化、数据分析建模、产品原型设计和跨团队沟通。',
    },
  };

  return mergeResumeAnswerBank(fallback, profile, parsedResume, summary, resumeName);
}

function mergeResumeAnswerBank(fallback, profile, parsedResume = {}, summary = '', resumeName = '') {
  parsedResume = parsedResume || {};
  const skillDetails = parsedResume.skillDetails || {};
  const education = parsedResume.educationDetails?.length
    ? parsedResume.educationDetails
    : parseEducationLines(parsedResume.education);
  const internships = parsedResume.workExperienceDetails?.length ? parsedResume.workExperienceDetails : [];
  const projects = parsedResume.projectExperienceDetails?.length ? parsedResume.projectExperienceDetails : [];
  const practice = parsedResume.practiceDetails?.length ? parsedResume.practiceDetails : fallback.practice;

  const programming = skillDetails.programming || fallback.skills.programming;
  const data = skillDetails.data || fallback.skills.data;
  const product = skillDetails.product || fallback.skills.product;
  const languages = skillDetails.languages || fallback.skills.languages;
  const skillSummary = [programming, data, product, languages].filter(Boolean).join('；');

  return {
    personal: {
      ...fallback.personal,
      name: parsedResume?.name || fallback.personal.name,
      phone: pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, summary) || fallback.personal.phone,
      email: pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, summary) || fallback.personal.email,
      hometown: pick(/(?:辽宁|北京|上海|深圳|广州|杭州|香港|浙江|成都|南京|苏州)[\u4e00-\u9fa5]*/, summary) || fallback.personal.hometown,
      birthDate: pick(/(?:19|20)\d{2}[./-]\d{1,2}/, summary) || fallback.personal.birthDate,
      politicalStatus: /中共党员/.test(summary) ? '中共党员' : fallback.personal.politicalStatus,
      jobIntention: extractJobIntention(summary) || profile.roles || fallback.personal.jobIntention,
      resumeFile: resumeName || fallback.personal.resumeFile,
    },
    education: education.length ? education : fallback.education,
    internships: internships.length ? internships : fallback.internships,
    projects: projects.length ? projects : fallback.projects,
    practice,
    skills: {
      programming,
      data,
      product,
      languages,
      summary: skillSummary || fallback.skills.summary,
    },
  };
}

function parseEducationLines(lines = []) {
  return lines
    .filter((line) => /20\d{2}[./-]\d{1,2}/.test(line) && /大学|University/.test(line))
    .map((line) => {
      const parts = line.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
      const dateRange = parseDateRange(parts[0] || line);
      const school = (parts[1] || '').replace(/[（(].*?[)）]/g, '').trim();
      const majorDegree = parts.slice(2).join(' ');
      const degree = pick(/(硕士|本科|学士|博士|Master|Bachelor|PhD)/i, majorDegree);
      const major = majorDegree.replace(degree, '').trim();
      return {
        school,
        degree,
        major,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ranking: pick(/QS排名\d+|专业排名前\d+%/i, line),
        courses: '',
        description: line,
      };
    });
}

function parseDateRange(text = '') {
  const match = text.match(/(20\d{2}[./-]\d{1,2})\s*[-–—至]\s*((?:20\d{2}[./-]\d{1,2})|至今)/);
  return {
    startDate: normalizeDate(match?.[1] || ''),
    endDate: normalizeDate(match?.[2] || ''),
  };
}

function normalizeDate(value) {
  return value ? value.replace(/[/-]/g, '.') : '';
}

function extractJobIntention(text = '') {
  const match = text.match(/求职意向[:：]\s*([^。；\n]+)/);
  return match?.[1]?.trim() || '';
}

export function flattenAnswerBank(answerBank) {
  const rows = [
    item('姓名', answerBank.personal.name, 'personal.name', '基础资料', aliases('姓名')),
    item('邮箱', answerBank.personal.email, 'personal.email', '基础资料', aliases('邮箱')),
    item('电话', answerBank.personal.phone, 'personal.phone', '基础资料', aliases('电话')),
    item('当前城市', answerBank.personal.currentCity, 'personal.currentCity', '基础资料', aliases('当前城市')),
    item('籍贯', answerBank.personal.hometown, 'personal.hometown', '基础资料', aliases('籍贯')),
    item('出生年月', answerBank.personal.birthDate, 'personal.birthDate', '基础资料', aliases('出生年月')),
    item('政治面貌', answerBank.personal.politicalStatus, 'personal.politicalStatus', '基础资料', aliases('政治面貌')),
    item('求职意向', answerBank.personal.jobIntention, 'personal.jobIntention', '基础资料', aliases('求职意向')),
    item('简历文件', answerBank.personal.resumeFile, 'personal.resumeFile', '基础资料', aliases('简历文件')),
    item('技能总结', answerBank.skills.summary, 'skills.summary', '技能', aliases('技能总结')),
    item('AI技能', answerBank.skills.summary, 'skills.ai', '技能', aliases('AI技能')),
    item('语言能力', answerBank.skills.languages, 'skills.languages', '技能', aliases('语言能力')),
    item('英语水平', answerBank.skills.languages, 'skills.english', '技能', aliases('英语水平')),
    item('编程开发', answerBank.skills.programming, 'skills.programming', '技能', aliases('编程开发')),
    item('数据技术', answerBank.skills.data, 'skills.data', '技能', aliases('数据技术')),
    item('产品工具', answerBank.skills.product, 'skills.product', '技能', aliases('产品工具')),
    item('其他技能', `${answerBank.skills.programming}；${answerBank.skills.data}；${answerBank.skills.product}`, 'skills.other', '技能', aliases('其他技能')),
  ];

  answerBank.education.forEach((education, index) => {
    rows.push(...groupRows('教育经历', `education.${index + 1}`, education));
  });
  answerBank.internships.forEach((internship, index) => {
    rows.push(...groupRows('实习经历', `internship.${index + 1}`, internship));
  });
  answerBank.projects.forEach((project, index) => {
    rows.push(...groupRows('项目经历', `project.${index + 1}`, project));
  });
  answerBank.practice.forEach((practice, index) => {
    rows.push(...groupRows('实践荣誉', `practice.${index + 1}`, practice));
  });

  return rows;
}

function groupRows(group, keyPrefix, data) {
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

  const index = keyPrefix.match(/\d+/)?.[0] || '';
  return Object.entries(data).map(([key, value]) => {
    const fieldLabel = labelMap[key] || key;
    return item(`${group}${index}-${fieldLabel}`, value, `${keyPrefix}.${key}`, group, aliasesForGroupField(group, index, fieldLabel));
  });
}

function item(label, value, key, group = '基础资料', aliasList = []) {
  return {
    label,
    value: value || '',
    key,
    group,
    aliases: unique([label, ...aliasList]).join(' / '),
  };
}

function aliases(kind) {
  const map = {
    姓名: ['姓名', '名字', '中文姓名', '候选人姓名', '申请人姓名', 'Name', 'Full Name', 'Candidate Name'],
    邮箱: ['邮箱', '电子邮箱', '邮件', '邮箱地址', 'Email', 'E-mail', 'Email Address'],
    电话: ['电话', '手机号', '手机号码', '联系电话', '移动电话', '联系方式', 'Phone', 'Mobile', 'Phone Number'],
    当前城市: ['当前城市', '当前所在地', '所在地', '现居住地', '居住城市', '城市', 'Location', 'City', 'Current Location'],
    籍贯: ['籍贯', '户籍', '生源地', '家乡', 'Hometown', 'Native Place'],
    出生年月: ['出生年月', '出生日期', '生日', '出生时间', 'Birth Date', 'Birthday', 'Date of Birth'],
    政治面貌: ['政治面貌', '政治身份', '党员', 'Political Status'],
    求职意向: ['求职意向', '应聘职位', '申请职位', '目标岗位', '岗位方向', 'Position', 'Job Applied', 'Target Role'],
    简历文件: ['简历文件', '简历附件', '上传简历', '附件', 'Resume', 'CV', 'Resume File'],
    技能总结: ['技能总结', '技能特长', '专业技能', '个人技能', '技能描述', 'Skills', 'Skill Summary'],
    AI技能: ['AI技能', '人工智能技能', 'AI能力', 'Agent', 'RAG', 'Prompt', '生成式AI', '机器学习', 'AI Skills'],
    语言能力: ['语言能力', '语言水平', '外语能力', 'Language', 'Languages', 'Language Skills'],
    英语水平: ['英语水平', '英语能力', '英语成绩', '雅思', 'CET-6', 'CET-4', 'IELTS', 'English Level'],
    编程开发: ['编程开发', '开发技能', '编程语言', '技术栈', 'Programming', 'Development', 'Coding Skills'],
    数据技术: ['数据技术', '数据分析', '数据技能', '数据工具', 'Data Skills', 'Analytics', 'Data Analysis'],
    产品工具: ['产品工具', '产品技能', '产品能力', '原型工具', 'Product Skills', 'Product Tools'],
    其他技能: ['其他技能', '补充技能', '综合技能', 'Additional Skills', 'Other Skills'],
  };
  return map[kind] || [kind];
}

function aliasesForGroupField(group, index, fieldLabel) {
  const groupAliases = {
    教育经历: ['教育经历', '教育背景', '教育经验', '学习经历', '学历经历', 'Education', 'Education Background'],
    实习经历: ['实习经历', '实习经验', '工作经历', '工作经验', 'Internship', 'Internship Experience', 'Work Experience'],
    项目经历: ['项目经历', '项目经验', '项目', '项目背景', 'Project', 'Project Experience'],
    实践荣誉: ['获奖经历', '奖项', '获奖情况', '荣誉奖励', '实践经历', '校园经历', 'Awards', 'Honors'],
  };
  const fieldAliases = {
    学校: ['学校', '院校', '毕业院校', '大学', 'School', 'University'],
    学历: ['学历', '学位', '最高学历', 'Degree', 'Education Level'],
    专业: ['专业', '所学专业', '主修专业', 'Major', 'Discipline'],
    开始时间: ['开始时间', '起始时间', '入学时间', '开始日期', 'Start Date', 'From'],
    结束时间: ['结束时间', '毕业时间', '离职时间', '截止时间', 'End Date', 'To'],
    '排名/成绩': ['排名', '成绩', 'GPA', '专业排名', '学习成绩', 'Ranking', 'Grade'],
    主修课程: ['主修课程', '相关课程', '核心课程', 'Courses', 'Relevant Courses'],
    '职责/描述': ['职责描述', '经历描述', '主要职责', 'Description', 'Responsibilities'],
    公司名称: ['公司名称', '公司', '单位', '雇主', 'Company', 'Employer'],
    部门: ['部门', '所属部门', '事业部', 'Department', 'Division'],
    '职位/角色': ['职位', '岗位', '角色', '职责', '担任角色', '担任职责', 'Position', 'Role', 'Title'],
    项目名称: ['项目名称', '项目', 'Project Name'],
    技术栈: ['技术栈', '使用技术', '工具', 'Technologies', 'Tech Stack'],
    名称: ['名称', '奖项名称', '荣誉名称', '活动名称', 'Name', 'Title'],
  };
  const groupFieldAliases = {
    实习经历: {
      '职责/描述': ['工作职责', '实习职责', '实习内容', '工作内容', '工作描述', '岗位职责', 'Responsibilities'],
      '职位/角色': ['职位', '职位名称', '岗位', '实习岗位', '实习职位', 'Position', 'Job Title'],
      开始时间: ['开始时间', '起始时间', '入职时间', '实习开始时间', '起止时间', 'Start Date', 'From'],
      结束时间: ['结束时间', '离职时间', '实习结束时间', '起止时间', 'End Date', 'To'],
    },
    项目经历: {
      '职责/描述': ['项目描述', '项目职责', '项目中职责', '项目内容', '项目介绍', '主要贡献', '项目贡献', 'Description', 'Responsibilities'],
      '职位/角色': ['角色', '职责', '担任角色', '担任职责', '项目角色', '项目职责', 'Role'],
      开始时间: ['开始时间', '起始时间', '项目开始时间', '起止时间', 'Start Date', 'From'],
      结束时间: ['结束时间', '截止时间', '项目结束时间', '起止时间', 'End Date', 'To'],
    },
    教育经历: {
      开始时间: ['开始时间', '起始时间', '入学时间', '起止时间', 'Start Date', 'From'],
      结束时间: ['结束时间', '毕业时间', '截止时间', '起止时间', 'End Date', 'To'],
    },
    实践荣誉: {
      名称: ['名称', '奖项名称', '荣誉名称', '活动名称', '获奖名称', 'Name', 'Title'],
      '职责/描述': ['获奖描述', '荣誉描述', '实践描述', '活动描述', 'Description'],
      开始时间: ['获奖时间', '开始时间', '起始时间', '时间', 'Date'],
      结束时间: ['结束时间', '截止时间', '时间', 'Date'],
    },
  };
  const indexedGroup = index ? [`${group}${index}`, `第${index}段${group}`, `${group} ${index}`] : [];
  return [
    ...(groupAliases[group] || [group]),
    ...indexedGroup,
    ...(fieldAliases[fieldLabel] || [fieldLabel]),
    ...((groupFieldAliases[group] || {})[fieldLabel] || []),
    `${group}${index}-${fieldLabel}`,
  ];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function pick(pattern, text = '') {
  const match = text.match(pattern);
  return match ? match[0] : '';
}
