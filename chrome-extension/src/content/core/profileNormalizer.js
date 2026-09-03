(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  const collectionMap = {
    education: 'education',
    internship: 'experiences',
    workExperience: 'experiences',
    work: 'experiences',
    experience: 'experiences',
    project: 'projects',
    projectExperience: 'projects',
    award: 'awards',
  };

  function normalizeFillSteps(steps = []) {
    const profile = {
      basic: {},
      education: [],
      experiences: [],
      projects: [],
      awards: [],
      other: {},
      rawSteps: steps,
    };
    const handledSteps = new Set();

    for (const step of steps) {
      const value = valueForStep(step);
      if (!hasValue(value)) continue;
      const parsed = parseRepeaterStep(step);
      if (parsed) {
        const collectionName = collectionMap[parsed.type];
        if (!collectionName) continue;
        profile[collectionName][parsed.index] = profile[collectionName][parsed.index] || {};
        profile[collectionName][parsed.index][parsed.field] = value;
        if (parsed.type === 'internship') profile[collectionName][parsed.index].experienceType = 'internship';
        handledSteps.add(step);
        continue;
      }
      const basicField = parseBasicField(step);
      if (basicField) {
        profile.basic[basicField] = value;
        handledSteps.add(step);
      }
    }

    profile.education = compact(profile.education).map(normalizeEducation);
    profile.experiences = compact(profile.experiences);
    profile.projects = compact(profile.projects);
    profile.awards = compact(profile.awards);
    return { profile, handledSteps };
  }

  function parseRepeaterStep(step = {}) {
    const text = [step.id, step.key, step.field, step.sourceLabel, step.canonicalField].filter(Boolean).join(' ');
    const english = text.match(/\b(education|internship|workExperience|work|experience|project|projectExperience|award)(\d+)([A-Z][a-zA-Z]+)\b/);
    if (english) {
      return {
        type: normalizeType(english[1]),
        index: Number(english[2]) - 1,
        field: canonicalField(english[3], english[1]),
      };
    }
    const dotted = text.match(/\b(education|internship|workExperience|work|experience|project|projectExperience|award)\.(\d+)\.([a-zA-Z]+)\b/);
    if (dotted) {
      return {
        type: normalizeType(dotted[1]),
        index: Number(dotted[2]) - 1,
        field: canonicalField(dotted[3], dotted[1]),
      };
    }
    const chinese = text.match(/(教育经历|教育背景|实习经历|工作经历|项目经历|项目经验|获奖经历|奖项)(\d+)[-－—]?\s*([^/\s]+)/);
    if (!chinese) return null;
    return {
      type: normalizeType(chinese[1]),
      index: Number(chinese[2]) - 1,
      field: canonicalField(chinese[3], chinese[1]),
    };
  }

  function parseBasicField(step = {}) {
    const text = [step.id, step.key, step.field, step.sourceLabel, step.canonicalField].filter(Boolean).join(' ');
    if (/email|邮箱/i.test(text)) return 'email';
    if (/phone|mobile|手机|电话/i.test(text)) return 'phone';
    if (/name|姓名/i.test(text) && !/项目名称|奖项名称|公司名称/.test(text)) return 'name';
    if (/gender|性别/i.test(text)) return 'gender';
    if (/birth|出生/i.test(text)) return 'birthDate';
    if (/nationality|国籍/i.test(text)) return 'nationality';
    if (/resume|cv|简历文件|上传简历/i.test(text)) return 'resumeFile';
    if (/highest.*school|最高学历毕业院校|毕业院校/i.test(text)) return 'highestSchool';
    if (/highest.*degree|最高学历/i.test(text)) return 'highestDegree';
    return '';
  }

  function canonicalField(token = '', type = '') {
    const text = String(token).toLowerCase();
    const original = String(token);
    if (/school|学校|院校/.test(text) || /学校|院校/.test(original)) return 'school';
    if (/degreelevel|学历|最高学历/.test(text) || /学历|最高学历/.test(original)) return 'degree';
    if (/studytype|学习形式|培养方式/.test(text) || /学习形式|培养方式/.test(original)) return 'studyType';
    if (/startdate|开始|起始|入学|入职/.test(text) || /开始|起始|入学|入职/.test(original)) return 'startDate';
    if (/enddate|结束|截止|毕业|离职/.test(text) || /结束|截止|毕业|离职/.test(original)) return 'endDate';
    if (/date|时间|获奖时间/.test(text) || /时间|获奖时间/.test(original)) return 'date';
    if (/college|学院|院系/.test(text) || /学院|院系/.test(original)) return 'college';
    if (/majorrank|排名/.test(text) || /排名/.test(original)) return 'majorRank';
    if (/major|专业/.test(text) || /专业/.test(original)) return 'major';
    if (/gpa|绩点|成绩/.test(text) || /绩点|成绩/.test(original)) return 'gpa';
    if (/company|公司|单位/.test(text) || /公司|单位/.test(original)) return 'company';
    if (/department|部门/.test(text) || /部门/.test(original)) return 'department';
    if (/role|position|职位|岗位|角色/.test(text) || /职位|岗位|角色/.test(original)) return 'role';
    if (/responsibility|项目中职责|主要贡献/.test(text) || /项目中职责|主要贡献/.test(original)) return 'responsibility';
    if (/description|职责描述|项目描述|工作职责|实习职责|描述|内容/.test(text) || /职责描述|项目描述|工作职责|实习职责|描述|内容/.test(original)) return 'description';
    if (/name|项目名称|奖项名称|名称/.test(text) || /项目名称|奖项名称|名称/.test(original)) {
      if (/award|获奖|奖项/.test(type)) return 'name';
      return normalizeType(type) === 'projectExperience' ? 'name' : 'role';
    }
    return text;
  }

  function normalizeType(value = '') {
    if (/education|教育/i.test(value)) return 'education';
    if (/project|项目/i.test(value)) return 'projectExperience';
    if (/award|获奖|奖项/i.test(value)) return 'award';
    if (/internship|实习/i.test(value)) return 'internship';
    if (/work|experience|工作/i.test(value)) return 'workExperience';
    return '';
  }

  function normalizeEducation(item = {}) {
    const next = { ...item };
    if (next.degree && !next.degreeLevel) next.degreeLevel = normalizeDegree(next.degree);
    return next;
  }

  function normalizeDegree(value = '') {
    const text = root.utils?.norm?.(value) || String(value).toLowerCase();
    if (/硕士|研究生|master|msc|ms/.test(text)) return '硕士';
    if (/本科|学士|双学位|bachelor|bs|ba/.test(text)) return '本科';
    if (/博士|phd|doctor/.test(text)) return '博士';
    if (/大专|专科|associate/.test(text)) return '大专';
    return String(value || '').trim();
  }

  function valueForStep(step = {}) {
    return step.value ?? step.answer ?? step.confirmedAnswer ?? '';
  }

  function hasValue(value) {
    const text = String(value ?? '').trim();
    return Boolean(text) && text !== '待补充' && text !== '待选择简历文件';
  }

  function compact(items = []) {
    return items.filter((item) => item && Object.values(item).some(hasValue));
  }

  root.profileNormalizer = {
    normalizeFillSteps,
    parseRepeaterStep,
    parseBasicField,
    canonicalField,
  };
})();
