(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  function scoreControl(element, step, adapter = {}) {
    if (!groupCompatible(element, step, adapter)) return 0;
    const text = root.utils.norm(root.scanner.textAround(element));
    const strongText = root.utils.norm(
      [element.name, element.id, element.placeholder, element.getAttribute('aria-label')].filter(Boolean).join(' ')
    );
    const keys = buildKeys(step, adapter);
    let score = 0;
    for (const key of keys) {
      if (!key) continue;
      if (strongText.includes(key)) score = Math.max(score, key.length + 45);
      if (text.includes(key)) score = Math.max(score, key.length + 25);
    }
    const group = parseGroup(step);
    const section = root.utils.norm(root.scanner.sectionText(element));
    if (
      group &&
      (text.includes(root.utils.norm(group.name)) || section.includes(root.utils.norm(group.name))) &&
      (!group.index || `${text}${section}`.includes(String(group.index)))
    ) {
      score += 30;
    }
    return adapter.adjustScore ? adapter.adjustScore({ element, step, score }) : score;
  }

  function buildKeys(step, adapter = {}) {
    const aliasItems = String(step.aliases || '')
      .split(/[、,/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const base = [
      step.field,
      step.sourceLabel,
      step.matchedLabel,
      step.id,
      ...aliasItems,
      ...synonymsFor(step),
      ...(adapter.synonymsFor ? adapter.synonymsFor(step) : []),
    ].filter(Boolean);
    const group = parseGroup(step);
    if (!group) return base.map(root.utils.norm);

    return [
      ...base,
      group.shortLabel,
      group.sourceField,
      group.name,
      `${group.name}${group.index}${group.sourceField}`,
      `${group.name}${group.index}-${group.sourceField}`,
    ]
      .filter(Boolean)
      .map(root.utils.norm);
  }

  function synonymsFor(step) {
    const text = [step.field, step.sourceLabel, step.id].filter(Boolean).join(' ');
    const synonyms = [];
    if (/手机|电话|phone|mobile/i.test(text)) {
      synonyms.push('手机号', '手机', '手机号码', '联系电话', '移动电话', '电话', '联系方式', 'Phone', 'Mobile');
    }
    if (/出生|生日|birth|birthday/i.test(text)) {
      synonyms.push('出生年月', '出生日期', '生日', '出生时间', '出生', 'Birth Date', 'Birthday', 'Date of Birth');
    }
    if (/邮箱|email|mail/i.test(text)) {
      synonyms.push('邮箱', '电子邮箱', '邮件', 'Email', 'E-mail');
    }
    if (/政治|党员|political/i.test(text)) {
      synonyms.push('政治面貌', '政治身份', '党员', 'Political Status');
    }
    if (/城市|所在地|location|city/i.test(text)) {
      synonyms.push('当前所在地', '所在地', '现居住地', '居住城市', '城市', 'Location', 'City');
    }
    if (/姓名|name/i.test(text)) {
      synonyms.push('姓名', '名字', '中文姓名', 'Name', 'Full Name');
    }
    return synonyms;
  }

  function parseGroup(step) {
    const text = [step.group, step.field, step.sourceLabel].filter(Boolean).join(' ');
    const match = text.match(/(教育经历|实习经历|项目经历|实践荣誉)(\d+)?[-－—]?(.*)$/);
    if (!match) return null;
    return {
      name: match[1],
      index: match[2] || '',
      sourceField: match[3] || '',
      shortLabel: match[3] || match[1],
    };
  }

  function groupKindFromText(text = '') {
    if (/项目|project/i.test(text)) return 'project';
    if (/实习|工作经历|工作经验|工作职责|任职|公司名称|职位名称|internship|work experience/i.test(text)) return 'internship';
    if (/教育|学历|学习|院校|学校|专业|education/i.test(text)) return 'education';
    if (/获奖|奖项|荣誉|实践|校园经历|award|honor/i.test(text)) return 'award';
    return '';
  }

  function stepGroupKind(step) {
    return groupKindFromText([step.group, step.field, step.sourceLabel, step.aliases].filter(Boolean).join(' '));
  }

  function elementGroupKind(element) {
    const snippets = root.scanner.sectionSnippets(element);
    for (const snippet of snippets) {
      const kind = groupKindFromText(snippet);
      if (kind) return kind;
    }
    return '';
  }

  function groupCompatible(element, step) {
    const stepKind = stepGroupKind(step);
    if (!stepKind) return true;
    const elementKind = elementGroupKind(element);
    if (!elementKind) return true;
    return stepKind === elementKind;
  }

  function findControl(step, usedControls, adapter = {}, scope = document) {
    const candidates = root.scanner
      .controls(adapter, scope)
      .filter((element) => !usedControls.has(element))
      .map((element) => ({ element, score: scoreControl(element, step, adapter) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.element || null;
  }

  root.matcher = {
    buildKeys,
    elementGroupKind,
    findControl,
    groupCompatible,
    groupKindFromText,
    parseGroup,
    scoreControl,
    stepGroupKind,
    synonymsFor,
  };
})();
