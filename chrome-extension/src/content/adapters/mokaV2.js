(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};
  root.featureFlags = root.featureFlags || {};
  if (typeof root.featureFlags.useMokaV2 === 'undefined') root.featureFlags.useMokaV2 = true;

  const legacy = root.adapters.moka;
  if (legacy && !root.adapters.mokaLegacy) root.adapters.mokaLegacy = legacy;

  const schemaRules = {
    personal: {
      title: '个人信息',
      repeatable: false,
      fields: [
        { label: /姓名/, canonicalField: 'name', profilePath: 'basic.name', componentType: 'input' },
        { label: /邮箱/, canonicalField: 'email', profilePath: 'basic.email', componentType: 'input' },
        { label: /手机号|手机号码|电话/, canonicalField: 'phone', profilePath: 'basic.phone', componentType: 'input' },
        { label: /出生日期|出生年月/, canonicalField: 'birthDate', profilePath: 'basic.birthDate', componentType: 'datePicker' },
        { label: /国籍/, canonicalField: 'nationality', profilePath: 'basic.nationality', componentType: 'input' },
        { label: /最高学历毕业院校/, canonicalField: 'highestSchool', profilePath: 'basic.highestSchool', componentType: 'input' },
        { label: /最高学历/, canonicalField: 'highestDegree', profilePath: 'basic.highestDegree', componentType: 'customSelect' },
      ],
    },
    education: {
      title: '教育背景',
      repeatable: true,
      collection: 'education',
      addLabel: /添加/,
      itemStart: /学历|就读时间/,
      fields: [
        { label: /学历/, canonicalField: 'degree', profileKey: 'degreeLevel', componentType: 'customSelect' },
        { label: /学习形式/, canonicalField: 'studyType', profileKey: 'studyType', componentType: 'customSelect' },
        { label: /就读时间|起止时间/, canonicalField: 'startDate', profileKey: 'startDate', componentType: 'monthRangePicker' },
        { label: /就读时间|起止时间/, canonicalField: 'endDate', profileKey: 'endDate', componentType: 'monthRangePicker' },
        { label: /学校名称|院校|学校/, canonicalField: 'school', profileKey: 'school', componentType: 'autocomplete' },
        { label: /学院/, canonicalField: 'college', profileKey: 'college', componentType: 'input' },
        { label: /专业名称|专业/, canonicalField: 'major', profileKey: 'major', componentType: 'autocomplete' },
        { label: /专业排名/, canonicalField: 'majorRank', profileKey: 'majorRank', componentType: 'customSelect' },
        { label: /绩点|GPA|成绩/, canonicalField: 'gpa', profileKey: 'gpa', componentType: 'input' },
        { label: /课程/, canonicalField: 'courses', profileKey: 'courses', componentType: 'textarea' },
      ],
    },
    internship: {
      title: '实习经历',
      repeatable: true,
      collection: 'experiences',
      addLabel: /添加/,
      itemStart: /起止时间|开始时间/,
      fields: [
        { label: /起止时间|开始时间/, canonicalField: 'startDate', profileKey: 'startDate', componentType: 'monthRangePicker' },
        { label: /起止时间|结束时间/, canonicalField: 'endDate', profileKey: 'endDate', componentType: 'monthRangePicker' },
        { label: /公司名称|单位名称|公司/, canonicalField: 'company', profileKey: 'company', componentType: 'input' },
        { label: /部门/, canonicalField: 'department', profileKey: 'department', componentType: 'input' },
        { label: /职位名称|岗位名称|职位/, canonicalField: 'role', profileKey: 'role', componentType: 'input' },
        { label: /工作职责|实习职责|内容/, canonicalField: 'description', profileKey: 'description', componentType: 'textarea' },
      ],
    },
    projectExperience: {
      title: '项目经验',
      repeatable: true,
      collection: 'projects',
      addLabel: /添加/,
      itemStart: /起止时间|开始时间/,
      fields: [
        { label: /起止时间|开始时间/, canonicalField: 'startDate', profileKey: 'startDate', componentType: 'monthRangePicker' },
        { label: /起止时间|结束时间/, canonicalField: 'endDate', profileKey: 'endDate', componentType: 'monthRangePicker' },
        { label: /项目名称/, canonicalField: 'name', profileKey: 'name', componentType: 'input' },
        { label: /^职责$|角色/, canonicalField: 'role', profileKey: 'role', componentType: 'input' },
        { label: /项目描述|项目内容|内容/, canonicalField: 'description', profileKey: 'description', componentType: 'textarea' },
        { label: /项目中职责|项目职责/, canonicalField: 'responsibility', profileKey: 'responsibility', componentType: 'textarea' },
      ],
    },
    award: {
      title: '获奖经历',
      repeatable: true,
      collection: 'awards',
      addLabel: /添加/,
      itemStart: /获奖时间|时间/,
      fields: [
        { label: /获奖时间|时间/, canonicalField: 'date', profileKey: 'date', componentType: 'monthPicker' },
        { label: /奖项名称|奖项/, canonicalField: 'name', profileKey: 'name', componentType: 'input' },
        { label: /奖项级别|级别/, canonicalField: 'level', profileKey: 'level', componentType: 'customSelect' },
        { label: /奖项描述|描述/, canonicalField: 'description', profileKey: 'description', componentType: 'textarea' },
      ],
    },
  };

  function detect(url = location.href) {
    try {
      return /(^|\.)mokahr\.com/i.test(new URL(url, location.href).hostname);
    } catch (_error) {
      return /mokahr\.com/i.test(String(url));
    }
  }

  function scanFields() {
    return scanCurrentSchema().flatMap((section) => section.items.length ? section.items.flatMap((item) => item.fields) : section.fields);
  }

  async function fillSteps(steps = []) {
    const { profile, handledSteps } = root.profileNormalizer.normalizeFillSteps(steps);
    const results = [];
    const sections = scanCurrentSchema();

    for (const type of ['education', 'internship', 'projectExperience', 'award']) {
      const rule = schemaRules[type];
      const profileItems = profile[rule.collection] || [];
      if (!profileItems.length) continue;
      const section = findSection(type, sections);
      if (!section) {
        results.push(sectionResult(type, 'NOT_FOUND', `${rule.title} section 未找到`));
        continue;
      }
      results.push(...(await ensureSectionItemCount(type, section, profileItems.length)));
    }

    const rescanned = scanCurrentSchema();
    results.push(...(await fillBasic(profile, rescanned)));
    for (const type of ['education', 'internship', 'projectExperience', 'award']) {
      const rule = schemaRules[type];
      const profileItems = profile[rule.collection] || [];
      const section = findSection(type, rescanned);
      if (!section || !profileItems.length) continue;
      results.push(...(await fillRepeaterSection(type, section, profileItems)));
    }

    const remaining = steps.filter((step) => !handledSteps.has(step));
    if (remaining.length && root.adapters.mokaLegacy?.fillSteps) {
      const legacyResults = await root.adapters.mokaLegacy.fillSteps(remaining);
      results.push(...legacyResults.map((item) => ({ ...item, adapter: 'mokaLegacy', reason: `legacy fallback: ${item.reason || ''}` })));
    }
    return results;
  }

  function scanCurrentSchema() {
    return Object.keys(schemaRules)
      .map((type) => scanSection(type))
      .filter(Boolean);
  }

  function scanSection(type) {
    const rule = schemaRules[type];
    const heading = findSectionHeading(rule.title);
    if (!heading) return null;
    const nextHeading = nextKnownHeading(heading);
    const container = sectionContainer(heading, nextHeading);
    const section = {
      section: rule.title,
      sectionType: type,
      sectionTitle: textOf(heading),
      sectionSelector: selectorFor(container),
      container,
      repeatable: rule.repeatable,
      addButton: findAddButton(container, rule),
      items: [],
      fields: [],
    };
    if (rule.repeatable) {
      const itemElements = findItems(container, rule);
      section.items = itemElements.map((itemElement, itemIndex) => ({
        itemIndex,
        itemSelector: selectorFor(itemElement),
        element: itemElement,
        fields: scanRuleFields(rule, itemElement, section, itemIndex),
        deleteButton: findDeleteButton(itemElement),
      }));
      section.fields = section.items.flatMap((item) => item.fields);
    } else {
      section.fields = scanRuleFields(rule, container, section, -1);
    }
    return section;
  }

  function scanRuleFields(rule, scope, section, itemIndex) {
    const controls = componentControls(scope);
    return rule.fields
      .map((fieldRule, fieldIndex) => {
        const element = findFieldElement(controls, fieldRule);
        if (!element) return null;
        return {
          section: section.sectionTitle,
          sectionType: section.sectionType,
          itemIndex,
          label: labelFor(element),
          canonicalField: fieldRule.canonicalField,
          profilePath: fieldRule.profilePath || `${rule.collection || 'basic'}[${itemIndex}].${fieldRule.profileKey || fieldRule.canonicalField}`,
          profileKey: fieldRule.profileKey || fieldRule.canonicalField,
          componentType: fieldRule.componentType || inferComponentType(element),
          selector: selectorFor(element),
          relativeSelector: relativeSelectorFor(scope, element),
          element,
          status: 'SCANNED',
          reason: 'Golden Schema rule matched',
          fieldIndex,
        };
      })
      .filter(Boolean);
  }

  async function fillBasic(profile, sections) {
    const section = findSection('personal', sections);
    if (!section) return [];
    const results = [];
    for (const field of section.fields) {
      const value = valueAt(profile, field.profilePath);
      if (!hasValue(value)) continue;
      results.push(await fillField(field, value));
    }
    return results;
  }

  async function fillRepeaterSection(type, section, profileItems) {
    const results = [];
    for (let index = 0; index < profileItems.length; index += 1) {
      const item = section.items[index];
      if (!item) {
        results.push(sectionResult(type, 'NEED_CONFIRMATION', `${schemaRules[type].title} item ${index} 不存在，请手动添加`));
        continue;
      }
      for (const field of item.fields) {
        const value = profileItems[index]?.[field.profileKey];
        if (!hasValue(value)) continue;
        results.push(await fillField(field, value));
      }
    }
    return results;
  }

  async function fillField(field, value) {
    if (!field.element) return report(field, 'NOT_FOUND', '字段元素不存在', '', value, '', '');
    const driver = root.mokaDrivers.driverFor(field, field.element);
    const before = driver.read(field.element);
    if (hasValue(before) && field.element.dataset?.jobpilotV2Written !== 'true') {
      return report(field, 'SKIPPED', '已有值，默认不覆盖', driver.name, value, before, before);
    }
    const result = await driver.fill(field.element, value, field);
    if (result.ok) field.element.dataset.jobpilotV2Written = 'true';
    const after = driver.read(field.element);
    return report(field, result.status || (result.ok ? 'SUCCESS' : 'FAILED'), result.reason, driver.name, value, before, after);
  }

  async function ensureSectionItemCount(type, section, expectedCount) {
    const results = [];
    const rule = schemaRules[type];
    let count = section.items.length;
    const needAdd = Math.max(expectedCount - count, 0);
    results.push(sectionResult(type, 'REPEATER_STATUS', `${rule.title}: profile=${expectedCount}, page=${count}, needAdd=${needAdd}`));
    for (let attempt = 0; attempt < needAdd; attempt += 1) {
      const fresh = scanSection(type);
      count = fresh?.items.length || 0;
      if (count >= expectedCount) break;
      const button = fresh?.addButton;
      if (!button) {
        results.push(sectionResult(type, 'NEED_CONFIRMATION', `${rule.title} 添加按钮未高置信识别，请手动添加`));
        break;
      }
      const before = count;
      button.click();
      const changed = await waitForItemCount(type, before + 1);
      if (!changed) {
        results.push(sectionResult(type, 'NEED_CONFIRMATION', `${rule.title} 点击添加后未新增 item，已停止`));
        break;
      }
      results.push(sectionResult(type, 'SUCCESS', `${rule.title} 已新增 item ${before}`));
    }
    return results;
  }

  function findItems(container, rule) {
    const deleteBased = Array.from(container.querySelectorAll('button,a,[role="button"]'))
      .filter(isVisible)
      .filter((button) => /删除本条|删除/.test(textOf(button)))
      .map((button) => nearestItem(button, container))
      .filter(Boolean);
    if (deleteBased.length) return unique(deleteBased);

    const starters = componentControls(container).filter((control) => rule.itemStart.test(labelFor(control)));
    const items = unique(starters.map((control) => nearestItem(control, container)).filter(Boolean));
    return items.length > 1 ? items : componentControls(container).length ? [container] : [];
  }

  function findFieldElement(controls, fieldRule) {
    const exact = controls.find((element) => fieldRule.label.test(labelFor(element)));
    if (exact) return exact;
    return null;
  }

  function componentControls(scope) {
    const raw = Array.from(scope.querySelectorAll('input,textarea,select,.ant-select,.ant-picker,.ant-radio-group,.ant-checkbox-wrapper,.ant-upload,[role="combobox"]'))
      .filter(isVisible)
      .map((element) => componentRoot(element))
      .filter((element) => !isInternalField(element));
    return unique(raw);
  }

  function componentRoot(element) {
    return element.closest('.ant-select,.ant-picker,.ant-radio-group,.ant-checkbox-wrapper,.ant-upload,[role="combobox"]') || element;
  }

  function labelFor(element) {
    const item = element.closest('.apply-field-Q2iJ7AtQGX,.ant-form-item,.moka-form-item,.form-item,[class*="formItem"]');
    return compactText(
      item?.querySelector('.label-sL4kEWLIRC,.label,[class*="label"],[class*="Label"],label')?.innerText ||
        item?.innerText?.split('\n')?.[0] ||
        element.getAttribute('aria-label') ||
        element.querySelector?.('input,textarea')?.placeholder ||
        element.placeholder ||
        ''
    );
  }

  function findSectionHeading(title) {
    return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,legend,[class*="title"],[class*="Title"]'))
      .filter(isVisible)
      .find((element) => textOf(element).includes(title));
  }

  function nextKnownHeading(heading) {
    const all = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,legend,[class*="title"],[class*="Title"]')).filter(isVisible);
    const after = all.filter((element) => heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    return after.find((element) => Object.values(schemaRules).some((rule) => textOf(element).includes(rule.title))) || null;
  }

  function sectionContainer(heading, nextHeading) {
    let current = heading;
    for (let depth = 0; current && depth < 8; depth += 1) {
      const controls = componentControls(current).length;
      const hasNext = nextHeading && current.contains(nextHeading);
      if (controls > 0 && !hasNext) return current;
      current = current.parentElement;
    }
    return heading.parentElement || heading;
  }

  function nearestItem(element, sectionContainerElement) {
    let current = element.parentElement;
    while (current && current !== sectionContainerElement) {
      const count = componentControls(current).length;
      const text = textOf(current);
      if (count >= 2 && text.length < 5000) return current;
      current = current.parentElement;
    }
    return sectionContainerElement;
  }

  function findAddButton(container, rule) {
    if (!rule.addLabel) return null;
    return Array.from(container.querySelectorAll('button,a,[role="button"],.ant-btn'))
      .filter(isVisible)
      .find((button) => rule.addLabel.test(textOf(button)) && !isDangerousButton(button)) || null;
  }

  function findDeleteButton(container) {
    return Array.from(container.querySelectorAll('button,a,[role="button"],.ant-btn')).filter(isVisible).find((button) => /删除本条|删除/.test(textOf(button))) || null;
  }

  function waitForItemCount(type, expectedCount) {
    return new Promise((resolve) => {
      const started = Date.now();
      const observer = new MutationObserver(() => {
        if ((scanSection(type)?.items.length || 0) >= expectedCount) {
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const timer = setInterval(() => {
        if ((scanSection(type)?.items.length || 0) >= expectedCount) {
          clearInterval(timer);
          observer.disconnect();
          resolve(true);
        } else if (Date.now() - started > waitTimeoutMs()) {
          clearInterval(timer);
          observer.disconnect();
          resolve(false);
        }
      }, 120);
    });
  }

  function inferComponentType(element) {
    if (element.matches?.('.ant-select')) return 'customSelect';
    if (element.matches?.('.ant-picker')) return element.querySelectorAll('input').length > 1 ? 'monthRangePicker' : 'datePicker';
    if (element.matches?.('.ant-upload')) return 'upload';
    const tag = element.tagName;
    if (tag === 'TEXTAREA') return 'textarea';
    if (tag === 'SELECT') return 'nativeSelect';
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'radio') return 'radio';
    if (type === 'checkbox') return 'checkbox';
    return 'input';
  }

  function valueAt(profile, path = '') {
    return path.split('.').reduce((current, key) => current?.[key], profile);
  }

  function findSection(type, sections) {
    return sections.find((section) => section.sectionType === type);
  }

  function report(field, status, reason, driver = '', profileValue = '', readBefore = '', readAfter = '') {
    return {
      section: field.section,
      itemIndex: field.itemIndex,
      pageLabel: field.label,
      label: field.label,
      canonicalField: field.canonicalField,
      profilePath: field.profilePath,
      profileValuePreview: previewValue(profileValue),
      componentType: field.componentType,
      selector: field.selector,
      fillMethod: driver,
      readBefore: previewValue(readBefore),
      readAfter: previewValue(readAfter),
      status,
      failureReason: ['FAILED', 'NEED_CONFIRMATION', 'NOT_FOUND'].includes(status) ? reason : '',
      reason,
      driver,
      adapter: 'mokaV2',
    };
  }

  function sectionResult(type, status, reason) {
    return {
      section: schemaRules[type]?.title || type,
      itemIndex: -1,
      pageLabel: schemaRules[type]?.title || type,
      label: schemaRules[type]?.title || type,
      canonicalField: type,
      profilePath: schemaRules[type]?.collection || type,
      profileValuePreview: '',
      componentType: 'section',
      selector: '',
      fillMethod: 'repeaterEngine',
      readBefore: '',
      readAfter: '',
      status,
      failureReason: ['FAILED', 'NEED_CONFIRMATION', 'NOT_FOUND'].includes(status) ? reason : '',
      reason,
      adapter: 'mokaV2',
    };
  }

  function previewValue(value) {
    const text = String(value ?? '');
    if (!text) return '';
    if (/@/.test(text)) return text.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    if (/1[3-9]\d{9}/.test(text)) return text.replace(/(1[3-9]\d)\d{4}(\d{4})/, '$1****$2');
    return text.length > 80 ? `${text.slice(0, 80)}...` : text;
  }

  function isInternalField(element) {
    const target = element.querySelector?.('input,textarea,select') || element;
    const type = (target.getAttribute('type') || '').toLowerCase();
    const text = [target.name, target.id, target.placeholder, element.innerText].filter(Boolean).join(' ').toLowerCase();
    return ['hidden', 'password', 'submit', 'button', 'reset', 'file'].includes(type) || /captcha|验证码|token|csrf|moka-version/.test(text);
  }

  function isDangerousButton(button) {
    const text = textOf(button);
    return /删除|下一步|继续|保存|提交|预览并提交|确认投递|submit|next|continue|save|delete/i.test(text);
  }

  function selectorFor(element) {
    if (element.id) return `#${cssEscape(element.id)}`;
    const parts = [];
    let current = element;
    while (current && current !== document.body && parts.length < 8) {
      let part = current.tagName.toLowerCase();
      const stable = stableClasses(current)[0];
      if (stable) part += `.${cssEscape(stable)}`;
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((item) => item.tagName === current.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ');
  }

  function relativeSelectorFor(container, element) {
    if (!container || !element) return selectorFor(element);
    const parts = [];
    let current = element;
    while (current && current !== container && current !== document.body && parts.length < 6) {
      let part = current.tagName.toLowerCase();
      const stable = stableClasses(current)[0];
      if (stable) part += `.${cssEscape(stable)}`;
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((item) => item.tagName === current.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ');
  }

  function stableClasses(element) {
    return String(element.className || '').split(/\s+/).filter((item) => item && !/^css-/.test(item)).slice(0, 2);
  }

  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\#.:,[\]>+~*^$|=()]/g, '\\$&');
  }

  function isVisible(element) {
    if (!element || !element.getBoundingClientRect) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
  }

  function hasValue(value) {
    const text = String(value ?? '').trim();
    return Boolean(text) && text !== '待补充' && text !== '待选择简历文件';
  }

  function unique(items) {
    return [...new Set(items)];
  }

  function compactText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function textOf(element) {
    return compactText(element?.innerText || element?.textContent || '');
  }

  function waitTimeoutMs() {
    return root.adapters.mokaV2?.testWaitMs || 3000;
  }

  const adapter = {
    id: 'mokahr',
    version: 'v2',
    name: 'MokaHR V2',
    detect,
    matches: detect,
    scanFields,
    fillSteps,
    scanCurrentSchema,
    schemaRules,
    _test: {
      schemaRules,
      scanCurrentSchema,
      ensureSectionItemCount,
    },
  };

  root.adapters.mokaV2 = adapter;
  if (root.featureFlags.useMokaV2) root.adapters.moka = adapter;
})();
