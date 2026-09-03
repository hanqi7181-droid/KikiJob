(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  const selectors = {
    appHost: 'app.mokahr.com',
    fieldRoot: '.moka-form-item,.moka-form-item-control,.ant-form-item,.form-item,[class*="formItem"],[class*="field"]',
    title: 'h1,h2,h3,h4,[class*="title"],[class*="Title"]',
    successText: '投递成功|申请成功|提交成功|已投递|successfully submitted|application submitted',
    internalField: 'moka-version|mokaVersion',
  };

  const repeaterConfigs = {
    education: {
      labels: ['教育经历', '教育背景', '教育', '学历经历', 'Education'],
      reject: ['工作经历', '实习经历', '项目经历', '获奖经历', '实践经历'],
      fields: ['学校', '院校', '专业', '学历', '学位', '起止时间', '入学', '毕业'],
      add: ['添加教育', '新增教育', '添加学历', '添加', '+'],
      resultLabel: '教育经历',
      groupLabel: '教育经历',
      canonicalFields: ['school', 'degreeLevel', 'degreeName', 'studyType', 'startDate', 'endDate', 'college', 'major', 'majorRank', 'gpa', 'courses'],
      labelsByField: {
        school: '学校名称',
        degree: '学历',
        degreeLevel: '学历',
        degreeName: '学位名称',
        studyType: '学习形式',
        startDate: '开始时间',
        endDate: '结束时间',
        college: '学院',
        major: '专业',
        majorRank: '专业排名',
        gpa: 'GPA',
        courses: '主修课程',
      },
    },
    workExperience: {
      labels: ['实习经历', '工作经历', '工作经验', '实习经验', 'Experience'],
      reject: ['教育经历', '教育背景', '项目经历', '获奖经历', '实践经历'],
      fields: ['公司名称', '公司', '单位', '职位名称', '岗位', '工作职责', '实习职责', '起止时间'],
      add: ['添加实习', '新增实习', '添加工作', '新增工作', '添加经历', '添加', '+'],
      resultLabel: '工作/实习经历',
      groupLabel: '实习经历',
      canonicalFields: ['company', 'department', 'role', 'startDate', 'endDate', 'description'],
      labelsByField: {
        company: '公司名称',
        department: '部门',
        role: '职位名称',
        startDate: '开始时间',
        endDate: '结束时间',
        description: '工作职责',
      },
    },
    projectExperience: {
      labels: ['项目经历', '项目经验', '项目'],
      reject: ['教育经历', '工作经历', '实习经历', '获奖经历', '实践经历'],
      fields: ['项目名称', '项目描述', '项目职责', '项目中职责', '职责', '角色', '起止时间'],
      add: ['添加项目', '新增项目', '添加', '+'],
      resultLabel: '项目经历',
      groupLabel: '项目经历',
      canonicalFields: ['name', 'role', 'startDate', 'endDate', 'description', 'responsibility'],
      labelsByField: {
        name: '项目名称',
        role: '项目角色',
        startDate: '开始时间',
        endDate: '结束时间',
        description: '项目描述',
        responsibility: '项目中职责',
      },
    },
  };

  const canonicalFieldMeta = {
    school: { aliases: ['学校', '学校名称', '院校', '毕业院校', '大学', 'school', 'university'], elementTypes: ['input'] },
    degree: { aliases: ['学历', '学历层次', '学位', '最高学历', 'degree', 'education level'], elementTypes: ['select', 'input'] },
    degreeLevel: { aliases: ['学历', '学历层次', '最高学历', 'education level'], elementTypes: ['select', 'input'] },
    degreeName: { aliases: ['学位', '学位名称', 'degree name'], elementTypes: ['select', 'input'] },
    studyType: { aliases: ['学习形式', '培养方式', 'study type'], elementTypes: ['select', 'input', 'radio'] },
    college: { aliases: ['学院', '院系', 'college'], elementTypes: ['input'] },
    major: { aliases: ['专业', '专业名称', '所学专业', '主修专业', 'major', 'discipline'], elementTypes: ['input'] },
    majorRank: { aliases: ['专业排名', '排名', 'rank'], elementTypes: ['input'] },
    gpa: { aliases: ['gpa', '绩点', '成绩'], elementTypes: ['input', 'number'] },
    courses: { aliases: ['主修课程', '相关课程', '核心课程', 'courses'], elementTypes: ['textarea', 'input'] },
    company: { aliases: ['公司名称', '单位名称', '实习单位', '工作单位', '公司', '单位', 'company', 'employer'], elementTypes: ['input'] },
    department: { aliases: ['部门', '所属部门', '事业部', 'department', 'division'], elementTypes: ['input'] },
    role: { aliases: ['职位名称', '岗位名称', '职位', '岗位', '角色', '担任角色', 'position', 'role', 'title'], elementTypes: ['input'] },
    name: { aliases: ['项目名称', '项目', 'project name'], elementTypes: ['input'] },
    description: { aliases: ['工作职责', '实习职责', '项目描述', '项目内容', '项目介绍', '职责描述', 'description', 'responsibilities'], elementTypes: ['textarea', 'input'] },
    responsibility: { aliases: ['项目中职责', '项目职责', '主要贡献', '项目贡献', 'responsibilities'], elementTypes: ['textarea', 'input'] },
    startDate: { aliases: ['开始时间', '起始时间', '入学时间', '入职时间', '项目开始时间', 'from', 'start date'], elementTypes: ['date', 'input', 'select'] },
    endDate: { aliases: ['结束时间', '截止时间', '毕业时间', '离职时间', '项目结束时间', 'to', 'end date'], elementTypes: ['date', 'input', 'select'] },
  };

  const selectValueGroups = {
    degree: [
      { canonical: '硕士', values: ['硕士', '硕士研究生', '研究生', 'master', "master's degree", 'ms', 'msc'] },
      { canonical: '本科', values: ['本科', '学士', '大学本科', 'bachelor', "bachelor's degree", 'bs', 'ba'] },
      { canonical: '博士', values: ['博士', '博士研究生', 'phd', 'doctor'] },
      { canonical: '大专', values: ['大专', '专科', 'associate'] },
    ],
    degreeLevel: [
      { canonical: '硕士', values: ['硕士', '硕士研究生', '研究生', 'master', "master's degree", 'ms', 'msc'] },
      { canonical: '本科', values: ['本科', '学士', '大学本科', 'bachelor', "bachelor's degree", 'bs', 'ba'] },
      { canonical: '博士', values: ['博士', '博士研究生', 'phd', 'doctor'] },
      { canonical: '大专', values: ['大专', '专科', 'associate'] },
    ],
    studyType: [
      { canonical: '全日制', values: ['全日制', 'full time', 'full-time'] },
      { canonical: '非全日制', values: ['非全日制', 'part time', 'part-time'] },
    ],
  };

  function detect(url = location.href) {
    try {
      return /(^|\.)mokahr\.com/i.test(new URL(url, location.href).hostname);
    } catch (_error) {
      return /mokahr\.com/i.test(String(url));
    }
  }

  function normalizeField(field) {
    const normalized = {
      ...field,
      adapterName: 'MokaHR',
      platform: 'mokahr',
      mokaFieldKind: inferMokaFieldKind(field),
    };
    if (!normalized.label && normalized.nearbyText) normalized.label = normalized.nearbyText.slice(0, 120);
    return normalized;
  }

  function inferMokaFieldKind(field) {
    const text = root.utils?.norm?.([field.label, field.name, field.id, field.placeholder, field.nearbyText].filter(Boolean).join(' ')) || '';
    if (/简历|resume|cv/.test(text)) return 'resume';
    if (/手机|电话|mobile|phone/.test(text)) return 'phone';
    if (/邮箱|email|mail/.test(text)) return 'email';
    if (/教育|学历|学校|院校|专业/.test(text)) return 'education';
    if (/实习|工作|公司|职位/.test(text)) return 'experience';
    if (/项目/.test(text)) return 'project';
    return 'generic';
  }

  function isInternalField(element) {
    const text = [element.name, element.id, element.placeholder, element.getAttribute('data-name'), element.getAttribute('aria-label')]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return new RegExp(selectors.internalField, 'i').test(text);
  }

  function scanFields() {
    return root.scanner.scanFields(this).map((field) => this.normalizeField(field));
  }

  function fillField({ target, value }) {
    return root.filler.fillControl(target, value);
  }

  async function fillSteps(steps = []) {
    const normalized = normalizeRepeaterProfile(steps);
    const repeaterResults = await fillMokaRepeaters(normalized.profile);
    const remainingSteps = steps.filter((step) => !normalized.handledSteps.has(step));
    const ordinaryResults = root.filler.fillStepsScoped(remainingSteps, this, document);
    return [...repeaterResults, ...ordinaryResults];
  }

  function detectRepeaterSection(type) {
    const config = repeaterConfigs[type];
    if (!config) return null;

    const heading = findSectionHeading(config);
    const element = heading ? bestSectionContainer(heading, config) : bestSectionByContent(type, config);
    if (!element) return null;

    return {
      type,
      element,
      adapterName: 'MokaHR',
      addButton: findSectionAddButton(element, config),
      findAddButton: () => findSectionAddButton(element, config),
      getItems: () => getMokaRepeaterItems(element, config),
    };
  }

  async function addRepeaterItem(section) {
    const button = section.findAddButton?.() || findSectionAddButton(section.element, repeaterConfigs[section.type]);
    if (!button) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return true;
  }

  async function fillMokaRepeaters(profile) {
    const results = [];
    const typeToItems = {
      education: profile.education,
      workExperience: profile.internships,
      projectExperience: profile.projects,
    };

    for (const [type, profileItems] of Object.entries(typeToItems)) {
      if (!profileItems.length) continue;

      const section = detectRepeaterSection(type);
      if (!section) {
        results.push(repeaterResult(type, 'needs_confirmation', `检测到 ${profileItems.length} 条${repeaterConfigs[type].resultLabel}，但没有高置信识别到对应区块`));
        continue;
      }

      const beforeCount = getExistingItemCount(section);
      const expectedCount = profileItems.length;
      const needAdd = Math.max(expectedCount - beforeCount, 0);
      results.push(repeaterResult(type, 'repeater_status', `${repeaterConfigs[type].resultLabel}：个人资料 ${expectedCount} 条，网页已有 ${beforeCount} 条，需要新增 ${needAdd} 条`));

      const ensured = await ensureItemCount(section, expectedCount);
      if (!ensured.ok) {
        results.push(repeaterResult(type, 'needs_confirmation', ensured.reason));
      }

      const items = getRepeaterItems(section).slice(0, expectedCount);
      for (let index = 0; index < expectedCount; index += 1) {
        const item = items[index];
        if (!item) {
          results.push(repeaterResult(type, 'needs_confirmation', `${repeaterConfigs[type].resultLabel}${index + 1} 不存在，请手动添加后继续填写`));
          continue;
        }
        results.push(...fillRepeaterItem(type, index, item.element, profileItems[index]));
      }
    }

    return results;
  }

  function fillRepeaterItem(sectionType, index, itemElement, profileItem) {
    const config = repeaterConfigs[sectionType];
    const itemResults = config.canonicalFields
      .filter((field) => hasUsableValue(profileItem[field]))
      .flatMap((field) => fillCanonicalFieldInItem(sectionType, index, field, profileItem[field], itemElement));
    return [
      repeaterResult(sectionType, 'filled', `${config.resultLabel}${index + 1} 已按 item[${index}] 处理`),
      ...itemResults,
    ];
  }

  function fillCanonicalFieldInItem(sectionType, itemIndex, canonicalField, rawValue, itemElement) {
    const step = buildCanonicalStep(sectionType, itemIndex, canonicalField, rawValue);
    const value = normalizeValueForField(canonicalField, rawValue);
    const match = findBestFieldInItem(sectionType, itemIndex, canonicalField, itemElement);
    if (!match.target || match.confidence !== 'high') {
      return [
        resultForMokaField(step, {
          status: match.confidence === 'medium' ? 'needs_confirmation' : 'not_found',
          reason: match.confidence === 'medium' ? 'medium confidence; waiting for user confirmation' : 'low confidence or no matching field in item',
          score: match.score,
          matchReasons: match.reasons,
          pageLabel: match.pageLabel,
          valuePreview: previewValue(value),
          fillResult: 'not_filled',
        }),
      ];
    }

    if (hasExistingValue(match.target) && !wasWrittenByJobPilot(match.target)) {
      return [
        resultForMokaField(step, {
          status: 'skipped',
          selector: selectorForElement(match.target),
          reason: 'field already has a value; existing user input was preserved',
          score: match.score,
          matchReasons: match.reasons,
          pageLabel: match.pageLabel,
          valuePreview: previewValue(value),
          fillResult: 'skipped_existing_value',
        }),
      ];
    }

    const fill = fillMokaControl(match.target, value, canonicalField);
    if (fill.ok) markWrittenByJobPilot(match.target);
    return [
      resultForMokaField(step, {
        status: fill.ok ? 'filled' : 'error',
        selector: selectorForElement(match.target),
        reason: fill.reason,
        score: match.score,
        matchReasons: [...match.reasons, ...fill.reasons],
        pageLabel: match.pageLabel,
        valuePreview: previewValue(value),
        fillResult: fill.ok ? 'filled' : 'failed',
      }),
    ];
  }

  function findBestFieldInItem(sectionType, itemIndex, canonicalField, itemElement) {
    const controls = root.scanner.controls(thisAdapter(), itemElement);
    const scored = controls
      .map((element) => scoreMokaControl(element, sectionType, itemIndex, canonicalField))
      .sort((a, b) => b.score - a.score);
    const best = scored[0] || { target: null, score: 0, reasons: ['no controls in item'], pageLabel: '' };
    return {
      ...best,
      confidence: best.score >= 75 ? 'high' : best.score >= 55 ? 'medium' : 'low',
    };
  }

  function scoreMokaControl(element, sectionType, itemIndex, canonicalField) {
    const meta = canonicalFieldMeta[canonicalField] || { aliases: [canonicalField], elementTypes: ['input'] };
    const pageLabel = pageLabelForControl(element);
    const labelText = normText(pageLabel.label);
    const nearbyText = normText(pageLabel.nearby);
    const strongText = normText([element.name, element.id, element.placeholder, element.getAttribute('aria-label')].filter(Boolean).join(' '));
    const elementType = controlKind(element);
    const reasons = [`section=${sectionType} ✓`, `itemIndex=${itemIndex} ✓`, `canonicalField=${canonicalField} ✓`];
    let score = 0;

    if (meta.aliases.some((alias) => labelText === normText(alias))) {
      score += 45;
      reasons.push('exact label +45');
    } else {
      const labelHits = meta.aliases.filter((alias) => labelText.includes(normText(alias)));
      if (labelHits.length) {
        score += 34;
        reasons.push(`label alias ${labelHits[0]} +34`);
      }
    }

    const strongHits = meta.aliases.filter((alias) => strongText.includes(normText(alias)));
    if (strongHits.length) {
      score += 28;
      reasons.push(`name/id/placeholder/aria ${strongHits[0]} +28`);
    }

    const nearbyHits = meta.aliases.filter((alias) => nearbyText.includes(normText(alias)));
    if (nearbyHits.length) {
      score += 16;
      reasons.push(`nearbyText ${nearbyHits[0]} +16`);
    }

    const typeScore = typeScoreForField(elementType, canonicalField, meta);
    score += typeScore.score;
    reasons.push(typeScore.reason);

    if (isDescriptionLike(canonicalField) && elementType !== 'textarea') {
      score -= 20;
      reasons.push('description prefers textarea -20');
    }
    if (!isDescriptionLike(canonicalField) && elementType === 'textarea') {
      score -= 30;
      reasons.push('non-description textarea penalty -30');
    }
    if (isDateField(canonicalField) && !dateLikeControl(element)) {
      score -= 12;
      reasons.push('date field on non-date-like control -12');
    }
    if (!isDateField(canonicalField) && dateLikeControl(element)) {
      score -= 18;
      reasons.push('non-date field on date-like control -18');
    }

    return {
      target: element,
      score,
      reasons,
      pageLabel: pageLabel.display,
    };
  }

  function buildCanonicalStep(sectionType, index, canonicalField, value) {
    const config = repeaterConfigs[sectionType];
    const label = config.labelsByField[canonicalField] || canonicalField;
    return {
      id: `${sectionType}.${index}.${canonicalField}`,
      field: label,
      sourceLabel: label,
      canonicalField,
      canonicalPath: `${profilePathForType(sectionType)}[${index}].${canonicalField}`,
      group: config.groupLabel,
      aliases: aliasesForCanonicalField(sectionType, canonicalField, label).join(' / '),
      value,
      confidence: '高',
      requiresUserCheck: false,
      mokaRepeater: {
        sectionType,
        itemIndex: index,
        canonicalField,
      },
    };
  }

  function fillMokaControl(target, value, canonicalField) {
    if (target.tagName === 'SELECT') return fillMokaSelect(target, value, canonicalField);
    if (isDateField(canonicalField)) return fillMokaDate(target, value);
    const ok = root.filler.fillControl(target, value);
    const verified = ok && verifyMokaValue(target, value, canonicalField);
    return {
      ok: verified,
      reason: verified ? 'filled by Moka local filler' : ok ? 'value did not persist after writing' : 'control rejected value',
      reasons: [verified ? 'fillControl verified' : ok ? 'fillControl ok but verification failed' : 'fillControl failed'],
    };
  }

  function fillMokaSelect(select, value, canonicalField) {
    const option = bestSelectOption(select, value, canonicalField);
    if (!option) {
      return {
        ok: false,
        reason: 'no confident select option match',
        reasons: ['select option match failed'],
      };
    }
    root.filler.setValue(select, option.value);
    const ok = verifyMokaValue(select, value, canonicalField);
    return {
      ok,
      reason: ok ? `selected option: ${option.label}` : 'selected option did not persist',
      reasons: [`select option ${option.label} score=${option.score}`],
    };
  }

  function bestSelectOption(select, value, canonicalField) {
    const normalizedValue = normalizeSelectValue(canonicalField, value);
    const options = Array.from(select.options || []).map((option) => ({
      option,
      label: option.textContent || option.label || option.value || '',
      value: option.value || '',
    }));
    const scored = options
      .map((item) => {
        const label = normalizeSelectValue(canonicalField, item.label);
        const rawLabel = normText(item.label);
        const rawValue = normText(item.value);
        let score = 0;
        if (label && label === normalizedValue) score = 100;
        else if (rawLabel && rawLabel === normText(value)) score = 88;
        else if (rawValue && rawValue === normText(value)) score = 84;
        else if (label && (label.includes(normalizedValue) || normalizedValue.includes(label))) score = 72;
        return { ...item, score };
      })
      .filter((item) => item.score >= 72)
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    return best ? { value: best.value, label: best.label, score: best.score } : null;
  }

  function fillMokaDate(target, value) {
    const normalizedDate = normalizeDateValue(value);
    if (!normalizedDate) {
      return { ok: false, reason: 'date value is not parseable', reasons: ['date normalization failed'] };
    }
    const ok = root.filler.fillControl(target, normalizedDate);
    const verified = ok && verifyMokaValue(target, normalizedDate, 'startDate');
    return {
      ok: verified,
      reason: verified ? `date normalized to ${normalizedDate}` : ok ? 'date value did not persist after writing' : 'date control rejected value',
      reasons: [`date normalized ${value} -> ${normalizedDate}`, verified ? 'date verified' : 'date verification failed'],
    };
  }

  function normalizeValueForField(canonicalField, value) {
    if (isDateField(canonicalField)) return normalizeDateValue(value) || value;
    if (canonicalField === 'degree' || canonicalField === 'degreeLevel') return normalizeDegreeValue(value);
    return value;
  }

  function normalizeDateValue(value) {
    const text = String(value || '').trim();
    const match = text.match(/(19|20)\d{2}[.\-/年\s]*(\d{1,2})?([.\-/月\s]*(\d{1,2}))?/);
    if (!match) return '';
    const year = match[0].match(/(19|20)\d{2}/)?.[0] || '';
    const monthRaw = match[2] || '';
    if (!year) return '';
    if (!monthRaw) return year;
    return `${year}-${String(Number(monthRaw)).padStart(2, '0')}`;
  }

  function normalizeDegreeValue(value) {
    const text = normText(value);
    if (/硕士|研究生|master|msc|ms/.test(text)) return '硕士';
    if (/本科|学士|双学位|bachelor|bs|ba/.test(text)) return '本科';
    if (/博士|phd|doctor/.test(text)) return '博士';
    if (/大专|专科|associate/.test(text)) return '大专';
    return String(value || '').trim();
  }

  function normalizeSelectValue(canonicalField, value) {
    if (canonicalField === 'degree' || canonicalField === 'degreeLevel') return normText(normalizeDegreeValue(value));
    const groups = selectValueGroups[canonicalField] || [];
    const text = normText(value);
    const group = groups.find((item) => item.values.some((candidate) => text.includes(normText(candidate)) || normText(candidate).includes(text)));
    return group ? normText(group.canonical) : text;
  }

  function verifyMokaValue(target, value, canonicalField) {
    if (target.tagName === 'SELECT') {
      const selected = target.selectedOptions?.[0];
      const expected = normalizeSelectValue(canonicalField, value);
      return normalizeSelectValue(canonicalField, selected?.textContent || target.value || '') === expected;
    }
    return String(target.value || '').trim() === String(value || '').trim();
  }

  function hasExistingValue(element) {
    if (element.tagName === 'SELECT') return Boolean(String(element.value || '').trim());
    return Boolean(String(element.value || '').trim());
  }

  function wasWrittenByJobPilot(element) {
    return element.dataset?.jobpilotWritten === 'true';
  }

  function markWrittenByJobPilot(element) {
    if (element.dataset) element.dataset.jobpilotWritten = 'true';
  }

  function resultForMokaField(step, patch) {
    return {
      id: step.id,
      field: step.field,
      canonicalField: step.canonicalField,
      canonicalPath: step.canonicalPath,
      sectionType: step.mokaRepeater.sectionType,
      itemIndex: step.mokaRepeater.itemIndex,
      confidence: patch.score >= 75 ? '高' : patch.score >= 55 ? '中' : '低',
      debugReport: formatDebugReport(step, patch),
      ...patch,
    };
  }

  function formatDebugReport(step, patch) {
    return [
      `${repeaterConfigs[step.mokaRepeater.sectionType]?.resultLabel || step.mokaRepeater.sectionType} > 第${step.mokaRepeater.itemIndex + 1}条 > ${patch.pageLabel || step.field}`,
      `section = ${step.mokaRepeater.sectionType} ✓`,
      `itemIndex = ${step.mokaRepeater.itemIndex} ✓`,
      `canonicalField = ${step.canonicalField} ✓`,
      ...(patch.matchReasons || []),
      `final score = ${patch.score || 0}`,
      `→ ${patch.valuePreview || ''}`,
      `fillResult = ${patch.fillResult || patch.status}`,
    ].join('\n');
  }

  function pageLabelForControl(element) {
    const label = [
      element.closest?.('label')?.innerText,
      element.getAttribute('aria-label'),
      element.placeholder,
      element.name,
      element.id,
    ]
      .filter(Boolean)
      .join(' ');
    const nearby = root.scanner.textAround(element) || '';
    return {
      label,
      nearby,
      display: (label || nearby || element.placeholder || element.name || element.id || '').slice(0, 80),
    };
  }

  function controlKind(element) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (element.tagName === 'TEXTAREA') return 'textarea';
    if (element.tagName === 'SELECT') return 'select';
    if (type === 'radio') return 'radio';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'date' || dateLikeControl(element)) return 'date';
    if (type === 'number') return 'number';
    return 'input';
  }

  function typeScoreForField(elementType, canonicalField, meta) {
    if (meta.elementTypes.includes(elementType)) return { score: 12, reason: `type ${elementType} match +12` };
    if (elementType === 'date' && isDateField(canonicalField)) return { score: 12, reason: 'date picker type match +12' };
    if (elementType === 'select' && ['degree', 'degreeLevel', 'degreeName', 'studyType'].includes(canonicalField)) return { score: 14, reason: 'select type match +14' };
    return { score: -18, reason: `type ${elementType} mismatch -18` };
  }

  function isDateField(canonicalField) {
    return ['startDate', 'endDate', 'birthDate'].includes(canonicalField);
  }

  function isDescriptionLike(canonicalField) {
    return ['description', 'responsibility', 'courses'].includes(canonicalField);
  }

  function dateLikeControl(element) {
    const text = normText([element.getAttribute('type'), element.placeholder, element.name, element.id, element.getAttribute('aria-label'), root.scanner.textAround(element)].filter(Boolean).join(' '));
    return /date|time|日期|时间|年|月|起止/.test(text);
  }

  function selectorForElement(element) {
    if (element.id) return `#${cssEscape(element.id)}`;
    if (element.name) return `${element.tagName.toLowerCase()}[name="${cssEscape(element.name)}"]`;
    return '';
  }

  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function previewValue(value) {
    return String(value || '').slice(0, 80);
  }

  function normalizeRepeaterProfile(steps = []) {
    const profile = {
      education: [],
      internships: [],
      projects: [],
    };
    const handledSteps = new Set();

    for (const step of steps) {
      const parsed = parseFlatRepeaterStep(step);
      if (!parsed) continue;
      const collection = collectionForParsed(profile, parsed.type);
      if (!collection) continue;
      collection[parsed.index] = collection[parsed.index] || {};
      collection[parsed.index][parsed.canonicalField] = step.value ?? step.answer ?? step.confirmedAnswer ?? '';
      handledSteps.add(step);
    }

    profile.education = compactProfileItems(profile.education).map(normalizeEducationItem);
    profile.internships = compactProfileItems(profile.internships);
    profile.projects = compactProfileItems(profile.projects);
    return { profile, handledSteps };
  }

  function normalizeEducationItem(item = {}) {
    const normalized = { ...item };
    if (hasUsableValue(normalized.degree) && !hasUsableValue(normalized.degreeLevel)) {
      normalized.degreeLevel = normalizeDegreeValue(normalized.degree);
    }
    if (hasUsableValue(normalized.degreeName) && !hasUsableValue(normalized.degree)) {
      normalized.degree = normalized.degreeName;
    }
    return normalized;
  }

  function parseFlatRepeaterStep(step = {}) {
    const text = [step.id, step.key, step.field, step.sourceLabel, step.canonicalField].filter(Boolean).join(' ');
    const idMatch = text.match(/\b(education|internship|workExperience|work|project|projectExperience)(\d+)([A-Z][a-zA-Z]+)\b/);
    if (idMatch) {
      return {
        type: normalizeRepeaterType(idMatch[1]),
        index: Number(idMatch[2]) - 1,
        canonicalField: canonicalFieldFromToken(idMatch[3], idMatch[1]),
      };
    }

    const dottedMatch = text.match(/\b(education|internship|workExperience|work|project|projectExperience)\.(\d+)\.([a-zA-Z]+)\b/);
    if (dottedMatch) {
      return {
        type: normalizeRepeaterType(dottedMatch[1]),
        index: Number(dottedMatch[2]) - 1,
        canonicalField: canonicalFieldFromToken(dottedMatch[3], dottedMatch[1]),
      };
    }

    const labelMatch = text.match(/(教育经历|实习经历|工作经历|项目经历)(\d+)[-－—]?\s*([^/\s]+)/);
    if (!labelMatch) return null;
    return {
      type: normalizeRepeaterType(labelMatch[1]),
      index: Number(labelMatch[2]) - 1,
      canonicalField: canonicalFieldFromToken(labelMatch[3], labelMatch[1]),
    };
  }

  function canonicalFieldFromToken(token = '', type = '') {
    const text = String(token).toLowerCase();
    const original = String(token);
    if (/school|学校|院校/.test(text) || /学校|院校/.test(original)) return 'school';
    if (/degreelevel|学历|最高学历/.test(text) || /学历|最高学历/.test(original)) return 'degreeLevel';
    if (/degreename|学位名称|学位/.test(text) || /学位名称|学位/.test(original)) return 'degreeName';
    if (/degree/.test(text)) return 'degree';
    if (/studytype|学习形式/.test(text) || /学习形式/.test(original)) return 'studyType';
    if (/startdate|开始|起始|入学/.test(text) || /开始|起始|入学/.test(original)) return 'startDate';
    if (/enddate|结束|截止|毕业|离职/.test(text) || /结束|截止|毕业|离职/.test(original)) return 'endDate';
    if (/college|学院/.test(text) || /学院/.test(original)) return 'college';
    if (/majorrank|排名/.test(text) || /排名/.test(original)) return 'majorRank';
    if (/major|专业/.test(text) || /专业/.test(original)) return 'major';
    if (/gpa/.test(text)) return 'gpa';
    if (/courses|课程/.test(text) || /课程/.test(original)) return 'courses';
    if (/company|公司|单位/.test(text) || /公司|单位/.test(original)) return 'company';
    if (/department|部门/.test(text) || /部门/.test(original)) return 'department';
    if (/role|position|职位|岗位|角色/.test(text) || /职位|岗位|角色/.test(original)) return 'role';
    if (/description|responsibilities|职责描述|项目描述|描述|内容/.test(text) || /职责描述|项目描述|描述|内容/.test(original)) return 'description';
    if (/responsibility|项目中职责|主要贡献/.test(text) || /项目中职责|主要贡献/.test(original)) return 'responsibility';
    if (/name|项目名称|名称/.test(text) || /项目名称|名称/.test(original)) return normalizeRepeaterType(type) === 'projectExperience' ? 'name' : 'role';
    return text;
  }

  function normalizeRepeaterType(value = '') {
    if (/education|教育/i.test(value)) return 'education';
    if (/project|项目/i.test(value)) return 'projectExperience';
    if (/internship|work|实习|工作/i.test(value)) return 'workExperience';
    return '';
  }

  function collectionForParsed(profile, type) {
    if (type === 'education') return profile.education;
    if (type === 'workExperience') return profile.internships;
    if (type === 'projectExperience') return profile.projects;
    return null;
  }

  function compactProfileItems(items = []) {
    return items.filter((item) => item && Object.values(item).some(hasUsableValue));
  }

  function hasUsableValue(value) {
    const text = String(value ?? '').trim();
    return Boolean(text) && text !== '待补充' && text !== '待选择简历文件';
  }

  function profilePathForType(type) {
    if (type === 'education') return 'education';
    if (type === 'workExperience') return 'internships';
    if (type === 'projectExperience') return 'projects';
    return type;
  }

  function aliasesForCanonicalField(sectionType, canonicalField, label) {
    const common = [label];
    const map = {
      school: ['学校', '学校名称', '院校', '毕业院校', 'University', 'School'],
      degree: ['学历', '学位', '最高学历', 'Degree'],
      degreeLevel: ['学历', '学历层次', '最高学历', 'Education Level'],
      degreeName: ['学位', '学位名称', 'Degree Name'],
      studyType: ['学习形式', '培养方式', 'Study Type'],
      startDate: ['开始时间', '起始时间', '起止时间', '入学时间', '入职时间', '项目开始时间', 'From', 'Start Date'],
      endDate: ['结束时间', '截止时间', '毕业时间', '离职时间', '项目结束时间', 'To', 'End Date'],
      college: ['学院', '院系', 'College'],
      major: ['专业', '专业名称', '所学专业', '主修专业', 'Major'],
      majorRank: ['专业排名', '排名', 'Rank'],
      gpa: ['GPA', '绩点', '成绩'],
      courses: ['主修课程', '相关课程', '核心课程', 'Courses'],
      company: ['公司名称', '单位名称', '实习单位', '公司', '单位', 'Company'],
      department: ['部门', '所属部门', '事业部', 'Department'],
      role: sectionType === 'projectExperience' ? ['项目角色', '角色', '担任角色', '职责', 'Role'] : ['职位名称', '岗位名称', '职位', '岗位', '实习职位', 'Position'],
      description: sectionType === 'projectExperience' ? ['项目描述', '项目内容', '项目介绍', 'Description'] : ['工作职责', '实习职责', '工作内容', '职责描述', 'Responsibilities'],
      responsibility: ['项目中职责', '项目职责', '主要贡献', '项目贡献', 'Responsibilities'],
      name: ['项目名称', '项目', 'Project Name'],
    };
    return [...new Set([...common, ...(map[canonicalField] || [])])];
  }

  function getRepeaterItems(section) {
    return section.getItems?.() || getMokaRepeaterItems(section.element, repeaterConfigs[section.type]);
  }

  function getExistingItemCount(section) {
    return getRepeaterItems(section).length;
  }

  async function ensureItemCount(section, expectedCount) {
    const maxAdds = Math.max(expectedCount - getExistingItemCount(section), 0);
    for (let attempt = 0; attempt < maxAdds; attempt += 1) {
      const before = getExistingItemCount(section);
      const button = section.findAddButton?.() || findSectionAddButton(section.element, repeaterConfigs[section.type]);
      if (!button) {
        return {
          ok: false,
          reason: `检测到 ${expectedCount} 条${repeaterConfigs[section.type].resultLabel}，网页当前只有 ${before} 条，请手动点击添加，JobPilot 将继续填写。`,
        };
      }

      const clicked = await safeClickAddButton(section, button);
      if (!clicked) {
        return {
          ok: false,
          reason: `未能高置信点击 ${repeaterConfigs[section.type].resultLabel} 的添加按钮，请手动添加。`,
        };
      }

      const changed = await waitForNewItem(section, before);
      if (!changed) {
        return {
          ok: false,
          reason: `点击添加后 ${repeaterConfigs[section.type].resultLabel} 没有新增，已停止自动添加。`,
        };
      }
    }
    return { ok: true };
  }

  async function safeClickAddButton(section, button) {
    if (!button || !root.scanner.isVisible(button) || isDangerousButton(button)) return false;
    const config = repeaterConfigs[section.type];
    const text = normText([button.innerText, button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')].filter(Boolean).join(' '));
    if (!/添加|新增|增加|\+|add/.test(text)) return false;
    const parentText = normText((button.parentElement?.innerText || '').slice(0, 800));
    const confident =
      config.add.some((label) => text.includes(normText(label))) ||
      config.labels.some((label) => parentText.includes(normText(label))) ||
      config.fields.some((field) => parentText.includes(normText(field)));
    if (!confident) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return true;
  }

  function waitForNewItem(section, previousCount) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const observer = new MutationObserver(() => {
        if (getExistingItemCount(section) > previousCount) {
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(section.element, { childList: true, subtree: true });
      const timer = window.setInterval(() => {
        if (getExistingItemCount(section) > previousCount) {
          window.clearInterval(timer);
          observer.disconnect();
          resolve(true);
        } else if (Date.now() - startedAt > waitTimeoutMs()) {
          window.clearInterval(timer);
          observer.disconnect();
          resolve(false);
        }
      }, 100);
    });
  }

  function repeaterResult(type, status, reason) {
    return {
      field: repeaterConfigs[type]?.resultLabel || type,
      canonicalField: type,
      status,
      reason,
      riskLevel: status === 'needs_confirmation' ? 'medium' : 'low',
    };
  }

  function thisAdapter() {
    return root.adapters.moka;
  }

  function waitTimeoutMs() {
    return root.adapters.moka?.testWaitMs || 3000;
  }

  function synonymsFor(step = {}) {
    const text = [step.field, step.sourceLabel, step.canonicalField, step.aliases].filter(Boolean).join(' ');
    const synonyms = [];
    if (/学校|院校|school|university/i.test(text)) synonyms.push('学校名称', '院校名称', '毕业院校', '学校', '院校');
    if (/专业|major/i.test(text)) synonyms.push('专业名称', '所学专业', '主修专业', '专业');
    if (/学历|学位|degree/i.test(text)) synonyms.push('学历', '学位', '学历/学位');
    if (/公司|company|employer/i.test(text)) synonyms.push('公司名称', '单位名称', '实习单位', '工作单位', '公司', '单位');
    if (/职位|岗位|角色|role|position|title/i.test(text)) synonyms.push('职位名称', '岗位名称', '担任职位', '担任角色', '职位', '岗位', '角色');
    if (/职责|描述|内容|description|responsibilities/i.test(text)) {
      synonyms.push('工作职责', '实习职责', '项目职责', '项目中职责', '项目描述', '项目内容', '职责', '内容');
    }
    if (/项目名称|项目|project/i.test(text)) synonyms.push('项目名称', '项目');
    if (/开始|起始|入学|start|from/i.test(text)) synonyms.push('开始时间', '起始时间', '起止时间', '入学时间');
    if (/结束|截止|毕业|end|to/i.test(text)) synonyms.push('结束时间', '截止时间', '起止时间', '毕业时间');
    if (/技能|skill/i.test(text)) synonyms.push('技能', '专业技能', '技能特长', '核心技能', '其他技能');
    return synonyms;
  }

  function adjustScore({ element, step, score }) {
    const stepKind = root.matcher.stepGroupKind(step);
    const text = root.utils.norm(root.scanner.textAround(element));
    if (stepKind === 'education' && /学校名称|院校|专业|学历|学位/.test(text)) return score + 25;
    if (stepKind === 'internship' && /公司名称|职位名称|工作职责|实习职责|单位/.test(text)) return score + 25;
    if (stepKind === 'project' && /项目名称|项目描述|项目中职责|项目职责/.test(text)) return score + 25;
    return score;
  }

  function observeChanges(callback) {
    const rootElement = document.querySelector('#root') || document.body;
    const observer = new MutationObserver((mutations) => {
      const hasUsefulChange = mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length);
      if (hasUsefulChange) callback?.({ adapter: 'mokahr', mutations });
    });
    observer.observe(rootElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }

  function detectSuccess() {
    const text = document.body?.innerText || '';
    const success = new RegExp(selectors.successText, 'i').test(text);
    return {
      success,
      confidence: success ? '中' : '低',
      reason: success ? '页面出现 MokaHR 成功状态文案' : '未检测到 MokaHR 成功状态文案',
    };
  }

  function findSectionHeading(config) {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,legend,.title,.form-title,[class*="title"],[class*="Title"]'))
      .filter(root.scanner.isVisible)
      .filter((element) => {
        const text = normText(element.innerText || element.textContent || '');
        return config.labels.some((label) => text.includes(normText(label))) && !config.reject.some((label) => text.includes(normText(label)));
      });
    return headings[0] || null;
  }

  function bestSectionContainer(heading, config) {
    let best = null;
    let current = heading;
    for (let depth = 0; current && depth < 8; depth += 1) {
      const controls = root.scanner.controls(root.adapters.moka, current);
      const text = normText(current.innerText || current.textContent || '');
      const hasOwnTitle = config.labels.some((label) => text.includes(normText(label)));
      const hasFieldHints = config.fields.some((field) => text.includes(normText(field)));
      const addButton = findSectionAddButton(current, config);
      if (!best && hasOwnTitle && (controls.length > 0 || addButton) && hasFieldHints) {
        best = current;
      }
      current = current.parentElement;
    }
    return best;
  }

  function bestSectionByContent(type, config) {
    const candidates = Array.from(document.querySelectorAll('section,fieldset,form,div'))
      .filter(root.scanner.isVisible)
      .map((element) => ({ element, score: scoreMokaSection(element, config) }))
      .filter((item) => item.score >= 7)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.element || null;
  }

  function scoreMokaSection(element, config) {
    const text = normText((element.innerText || element.textContent || '').slice(0, 2000));
    if (config.reject.some((label) => text.includes(normText(label))) && !config.labels.some((label) => text.includes(normText(label)))) return 0;
    let score = 0;
    if (config.labels.some((label) => text.includes(normText(label)))) score += 6;
    score += config.fields.filter((field) => text.includes(normText(field))).slice(0, 5).length;
    if (findSectionAddButton(element, config)) score += 2;
    return score;
  }

  function findSectionAddButton(sectionElement, config) {
    const buttons = Array.from(sectionElement.querySelectorAll('button,a[role="button"],.ant-btn,[class*="button"],[class*="Button"]'))
      .filter(root.scanner.isVisible)
      .filter((button) => !isDangerousButton(button));
    return (
      buttons.find((button) => {
        const text = normText([button.innerText, button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')].filter(Boolean).join(' '));
        const hasAdd = /添加|新增|增加|\+|add/.test(text);
        if (!hasAdd) return false;
        return config.add.some((label) => text.includes(normText(label))) || sectionButtonContextMatches(button, config);
      }) || null
    );
  }

  function sectionButtonContextMatches(button, config) {
    const parentText = normText((button.parentElement?.innerText || button.closest('div')?.innerText || '').slice(0, 800));
    return config.labels.some((label) => parentText.includes(normText(label))) || config.fields.some((field) => parentText.includes(normText(field)));
  }

  function isDangerousButton(button) {
    const type = (button.getAttribute('type') || '').toLowerCase();
    const text = normText([button.innerText, button.textContent, button.value, button.getAttribute('aria-label')].filter(Boolean).join(' '));
    return type === 'submit' || /提交|保存并提交|确认提交|下一步|继续|完成|submit|next|continue|save/.test(text);
  }

  function getMokaRepeaterItems(sectionElement, config) {
    const controls = root.scanner.controls(root.adapters.moka, sectionElement);
    const containers = uniqueElements(
      controls
        .map((control) => nearestMokaItem(control, sectionElement))
        .filter(Boolean)
        .filter((element) => root.scanner.controls(root.adapters.moka, element).length >= 2)
    );
    if (containers.length > 1) return containers.map((element, index) => ({ index, element }));

    const byDateRows = splitByDateRows(sectionElement, config);
    if (byDateRows.length) return byDateRows.map((element, index) => ({ index, element }));

    return controls.length ? [{ index: 0, element: sectionElement }] : [];
  }

  function nearestMokaItem(control, sectionElement) {
    let current = control.parentElement;
    while (current && current !== sectionElement) {
      const controlCount = root.scanner.controls(root.adapters.moka, current).length;
      const text = normText((current.innerText || current.textContent || '').slice(0, 1200));
      const hasFields = repeaterFieldHit(text);
      if (controlCount >= 3 && hasFields) return current;
      current = current.parentElement;
    }
    return sectionElement;
  }

  function splitByDateRows(sectionElement, config) {
    return Array.from(sectionElement.querySelectorAll('div,fieldset'))
      .filter(root.scanner.isVisible)
      .filter((element) => {
        const text = normText((element.innerText || element.textContent || '').slice(0, 1000));
        const controlCount = root.scanner.controls(root.adapters.moka, element).length;
        return controlCount >= 2 && /起止时间|开始时间|结束时间|年|月/.test(text) && config.fields.some((field) => text.includes(normText(field)));
      });
  }

  function repeaterFieldHit(text) {
    return /学校|院校|专业|学历|公司|单位|职位|岗位|职责|项目名称|项目描述|起止时间|开始时间|结束时间/.test(text);
  }

  function uniqueElements(elements) {
    return [...new Set(elements)];
  }

  function normText(value = '') {
    return root.utils.norm(value);
  }

  root.adapters.moka = {
    id: 'mokahr',
    name: 'MokaHR',
    selectors,
    detect,
    matches: detect,
    scanFields,
    normalizeField,
    fillField,
    fillSteps,
    detectRepeaterSection,
    addRepeaterItem,
    synonymsFor,
    adjustScore,
    observeChanges,
    detectSuccess,
    isInternalField,
    _test: {
      fillMokaRepeaters,
      fillRepeaterItem,
      getExistingItemCount,
      normalizeRepeaterProfile,
      parseFlatRepeaterStep,
    },
  };
})();
