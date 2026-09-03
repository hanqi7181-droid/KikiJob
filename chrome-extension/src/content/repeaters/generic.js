(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  const typeConfigs = {
    education: {
      labels: ['教育经历', '教育背景', '教育', '学历经历', 'education', 'education background'],
      addLabels: ['添加教育', '新增教育', '添加学历', 'add education'],
      fieldHints: ['学校', '院校', '专业', '学历', '学位', 'school', 'university', 'major', 'degree'],
      resultLabel: '教育经历',
    },
    workExperience: {
      labels: ['工作经历', '实习经历', '实习经验', '工作经验', 'work experience', 'internship', 'experience'],
      addLabels: ['添加工作', '新增工作', '添加实习', '新增实习', 'add experience', 'add work', 'add internship'],
      fieldHints: ['公司', '单位', '职位', '岗位', '职责', 'company', 'employer', 'position', 'role', 'responsibilities'],
      resultLabel: '工作/实习经历',
    },
    projectExperience: {
      labels: ['项目经历', '项目经验', '项目', 'project experience', 'project'],
      addLabels: ['添加项目', '新增项目', 'add project'],
      fieldHints: ['项目名称', '项目描述', '项目职责', '角色', 'project name', 'project description', 'project role'],
      resultLabel: '项目经历',
    },
  };

  async function fillRepeaterSteps(steps = [], adapter = {}) {
    const groups = groupRepeaterSteps(steps);
    const results = [];
    const handledSteps = new Set();

    for (const [type, indexMap] of Object.entries(groups)) {
      const desiredCount = Math.max(...Object.keys(indexMap).map(Number));
      const section = adapter.detectRepeaterSection?.(type) || detectRepeaterSections().find((item) => item.type === type);
      if (!section) {
        results.push(sectionResult(type, 'needs_confirmation', `检测到个人资料 ${desiredCount} 条，但没有高置信识别到对应经历区块`));
        continue;
      }

      const existingCount = getExistingItemCount(section);
      const needAdd = Math.max(0, desiredCount - existingCount);
      results.push(sectionResult(type, 'repeater_status', `${typeConfigs[type].resultLabel}：个人资料 ${desiredCount} 条，网页已有 ${existingCount} 条，需要新增 ${needAdd} 条`));

      const expanded = await ensureItemCount(section, desiredCount, adapter);
      if (!expanded.ok) {
        results.push(sectionResult(type, 'needs_confirmation', expanded.reason));
      }

      const items = getRepeaterItems(section).slice(0, desiredCount);
      for (let index = 1; index <= desiredCount; index += 1) {
        const item = items[index - 1];
        const itemSteps = indexMap[index] || [];
        if (!item) {
          results.push(sectionResult(type, 'needs_confirmation', `${typeConfigs[type].resultLabel}${index} 不存在，请手动添加后继续填写`));
          continue;
        }
        const scopedSteps = itemSteps.map(toScopedStep);
        const itemResults = root.filler.fillStepsScoped(scopedSteps, adapter, item.element);
        itemSteps.forEach((step) => handledSteps.add(step));
        results.push(sectionResult(type, 'filled', `${typeConfigs[type].resultLabel}${index} 已处理`));
        results.push(...itemResults);
      }
    }

    return { results, handledSteps };
  }

  function groupRepeaterSteps(steps = []) {
    const groups = {};
    for (const step of steps) {
      const parsed = parseRepeaterStep(step);
      if (!parsed) continue;
      groups[parsed.type] = groups[parsed.type] || {};
      groups[parsed.type][parsed.index] = groups[parsed.type][parsed.index] || [];
      groups[parsed.type][parsed.index].push({ ...step, repeater: parsed });
    }
    return groups;
  }

  function parseRepeaterStep(step = {}) {
    const text = [step.key, step.group, step.field, step.sourceLabel, step.canonicalField].filter(Boolean).join(' ');
    const keyMatch = text.match(/\b(education|internship|workExperience|work|project|projectExperience)\.(\d+)\.([a-zA-Z]+)\b/);
    if (keyMatch) {
      return {
        type: normalizeType(keyMatch[1]),
        index: Number(keyMatch[2]),
        fieldName: keyMatch[3],
      };
    }

    const labelMatch = text.match(/(教育经历|实习经历|工作经历|项目经历)(\d+)[-－—]?\s*([^/\s]+)/);
    if (!labelMatch) return null;
    return {
      type: normalizeType(labelMatch[1]),
      index: Number(labelMatch[2]),
      fieldName: labelMatch[3],
    };
  }

  function normalizeType(value = '') {
    if (/education|教育/i.test(value)) return 'education';
    if (/project|项目/i.test(value)) return 'projectExperience';
    if (/internship|work|实习|工作/i.test(value)) return 'workExperience';
    return '';
  }

  function toScopedStep(step) {
    const fieldName = step.repeater?.fieldName || step.field;
    return {
      ...step,
      field: fieldName,
      sourceLabel: fieldName,
      selector: '',
      scannedField: undefined,
      group: step.group,
    };
  }

  function detectRepeaterSections() {
    const sections = [];
    const candidates = Array.from(document.querySelectorAll('[data-repeater-type], section, fieldset, form, div'))
      .filter(root.scanner.isVisible)
      .filter((element) => root.scanner.controls({}, element).length > 0 || element.querySelector('button,a[role="button"]'));

    for (const type of Object.keys(typeConfigs)) {
      let best = null;
      for (const element of candidates) {
        const score = scoreSection(element, type);
        if (score >= 6 && (!best || score > best.score)) {
          best = {
            type,
            element,
            items: getRepeaterItems({ type, element }),
            addButton: findAddButton({ type, element }),
            adapterName: 'generic',
            score,
          };
        }
      }
      if (best) sections.push(best);
    }
    return sections;
  }

  function scoreSection(element, type) {
    const config = typeConfigs[type];
    const title = normalized(sectionTitle(element));
    const text = normalized([sectionTitle(element), element.getAttribute('data-repeater-type'), element.getAttribute('aria-label')].filter(Boolean).join(' '));
    const controlText = normalized(root.scanner.controls({}, element).map((control) => root.scanner.textAround(control)).join(' '));
    let score = 0;
    if (config.labels.some((label) => text.includes(normalized(label)) || title.includes(normalized(label)))) score += 6;
    score += config.fieldHints.filter((hint) => controlText.includes(normalized(hint))).slice(0, 4).length;
    if (findAddButton({ type, element })) score += 2;
    return score;
  }

  function sectionTitle(element) {
    const directHeading = element.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > legend,[data-section-title]');
    if (directHeading) return directHeading.innerText || directHeading.textContent || '';
    const heading = element.querySelector('h1,h2,h3,h4,legend,[data-section-title]');
    return heading?.innerText || heading?.textContent || '';
  }

  function getRepeaterItems(section) {
    const adapterItems = section.getItems?.();
    if (adapterItems?.length) return adapterItems;

    const explicit = Array.from(section.element.querySelectorAll(`[data-repeater-item="${section.type}"],[data-repeater-item],.repeater-item`))
      .filter(root.scanner.isVisible)
      .filter((element) => root.scanner.controls({}, element).length > 0)
      .map((element, index) => ({ index, element }));
    if (explicit.length) return explicit;

    const controls = root.scanner.controls({}, section.element);
    const containers = uniqueElements(
      controls
        .map((control) => nearestItemContainer(control, section.element))
        .filter(Boolean)
        .filter((element) => root.scanner.controls({}, element).length >= 2)
    );
    if (containers.length) return containers.map((element, index) => ({ index, element }));
    return controls.length ? [{ index: 0, element: section.element }] : [];
  }

  function nearestItemContainer(control, sectionElement) {
    let current = control.parentElement;
    while (current && current !== sectionElement) {
      if (
        current.matches('[data-repeater-item],.repeater-item,.education-item,.experience-item,.project-item,fieldset,.form-row,.form-group') ||
        root.scanner.controls({}, current).length >= 2
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return sectionElement;
  }

  function getExistingItemCount(section) {
    return getRepeaterItems(section).length;
  }

  function findAddButton(section) {
    if (section.addButton && root.scanner.isVisible(section.addButton)) return section.addButton;
    if (section.findAddButton) {
      const adapterButton = section.findAddButton();
      if (adapterButton && root.scanner.isVisible(adapterButton)) return adapterButton;
    }

    const config = typeConfigs[section.type];
    const buttons = Array.from(section.element.querySelectorAll('button,a[role="button"],input[type="button"]')).filter(root.scanner.isVisible);
    return (
      buttons.find((button) => {
        const text = normalized([button.innerText, button.textContent, button.value, button.getAttribute('aria-label')].filter(Boolean).join(' '));
        const buttonType = (button.getAttribute('type') || '').toLowerCase();
        if (buttonType === 'submit') return false;
        if (/提交|保存并提交|下一步|继续|submit|next|continue|save/.test(text)) return false;
        const hasAddText = /添加|新增|增加|\+|add/.test(text);
        const hasTypeText = config.addLabels.some((label) => text.includes(normalized(label))) || config.labels.some((label) => text.includes(normalized(label)));
        return hasAddText && hasTypeText;
      }) || null
    );
  }

  async function ensureItemCount(section, desiredCount, adapter = {}) {
    const maxAdds = Math.max(0, desiredCount - getExistingItemCount(section));
    for (let attempt = 0; attempt < maxAdds; attempt += 1) {
      const before = getExistingItemCount(section);
      const added = adapter.addRepeaterItem ? await adapter.addRepeaterItem(section) : await addItem(section);
      if (!added) {
        return { ok: false, reason: `无法高置信识别 ${typeConfigs[section.type].resultLabel} 的添加按钮，请手动添加` };
      }
      const changed = await waitForNewItem(section, before);
      if (!changed) {
        return { ok: false, reason: `点击添加后没有检测到新的 ${typeConfigs[section.type].resultLabel} 区块，已停止` };
      }
    }
    return { ok: true };
  }

  async function addItem(section) {
    const button = findAddButton(section);
    if (!button) return false;
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
        } else if (Date.now() - startedAt > 2500) {
          window.clearInterval(timer);
          observer.disconnect();
          resolve(false);
        }
      }, 100);
    });
  }

  function sectionResult(type, status, reason) {
    return {
      field: typeConfigs[type]?.resultLabel || type,
      canonicalField: type,
      status,
      reason,
      riskLevel: status === 'needs_confirmation' ? 'medium' : 'low',
    };
  }

  function normalized(value = '') {
    return root.utils.norm(value);
  }

  function uniqueElements(elements) {
    return [...new Set(elements)];
  }

  root.repeaters = {
    detectRepeaterSections,
    fillRepeaterSteps,
    findAddButton,
    getExistingItemCount,
    getRepeaterItems,
  };
})();
