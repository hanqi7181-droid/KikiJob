(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  const sectionPatterns = [
    { type: 'notice', pattern: /填写须知|须知|申请信息/ },
    { type: 'upload', pattern: /上传/ },
    { type: 'personal', pattern: /个人信息|基本信息/ },
    { type: 'education', pattern: /教育背景|教育经历|学历背景/ },
    { type: 'internship', pattern: /实习经历|实习经验/ },
    { type: 'workExperience', pattern: /工作经历|工作经验/ },
    { type: 'projectExperience', pattern: /项目经历|项目经验/ },
    { type: 'award', pattern: /获奖经历|获奖情况|荣誉奖项/ },
    { type: 'language', pattern: /英语水平|语言能力|语言水平/ },
    { type: 'skills', pattern: /其他技能|技能|职业技能/ },
    { type: 'other', pattern: /^其他$|其他信息|自我评价/ },
    { type: 'update', pattern: /更新说明|在线简历/ },
    { type: 'authorization', pattern: /授权文本|隐私协议/ },
  ];

  const repeatableTypes = new Set(['education', 'internship', 'workExperience', 'projectExperience', 'award', 'language', 'skills']);

  async function exportGoldenSchema(options = {}) {
    if (!/mokahr\.com/i.test(location.hostname)) {
      throw new Error('当前页面不是 MokaHR 页面，请切换到 Shopee MokaHR 申请页后再导出。');
    }

    const scannedAt = new Date().toISOString();
    const sections = detectSections();
    const probes = options.probeComponents ? await probeComponents(sections) : [];
    const schema = sanitizeSchema({
      schemaName: 'MokaHR Golden Schema',
      platform: 'mokahr',
      sourceUrl: location.href,
      pageTitle: document.title,
      scannedAt,
      probeComponents: Boolean(options.probeComponents),
      sections,
      componentTypes: componentTypesFromSections(sections),
      portalPopups: probes.filter((item) => item.usesPortal),
      probes,
    });
    const filledSample = {
      schemaName: 'MokaHR Filled Sample',
      localOnly: true,
      sourceUrl: location.href,
      pageTitle: document.title,
      scannedAt,
      sections: sections.map(sampleSection),
    };
    const markdown = renderMarkdown(schema, filledSample);
    const stamp = scannedAt.replace(/[:.]/g, '-');
    const files = [
      [`moka-golden-schema.${stamp}.json`, JSON.stringify(schema, null, 2)],
      [`moka-filled-sample.local.${stamp}.json`, JSON.stringify(filledSample, null, 2)],
      [`moka-golden-schema.${stamp}.md`, markdown],
    ];
    for (const [name, text] of files) downloadText(name, text);
    return {
      files: files.map(([name]) => name),
      summary: summarize(schema),
      schema,
    };
  }

  function detectSections() {
    const headings = sectionHeadings();
    const fallback = headings.length ? [] : fallbackHeadings();
    const anchors = headings.length ? headings : fallback;
    return anchors.map((anchor, index) => buildSection(anchor, anchors[index + 1], index)).filter((section) => section.fields.length || section.buttons.length);
  }

  function sectionHeadings() {
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,legend,[class*="title"],[class*="Title"],[class*="section"],[class*="Section"]'))
      .filter(isVisible)
      .map((element) => ({ element, title: directText(element) || compactText(element.innerText || element.textContent || '') }))
      .filter((item) => item.title && item.title.length <= 80)
      .map((item) => ({ ...item, sectionType: inferSectionType(item.title) }))
      .filter((item) => item.sectionType);
    return uniqueByElement(candidates).sort((a, b) => documentPosition(a.element, b.element));
  }

  function fallbackHeadings() {
    return sectionPatterns
      .map((pattern) => {
        const element = Array.from(document.querySelectorAll('body *')).find((candidate) => {
          if (!isVisible(candidate)) return false;
          const text = directText(candidate);
          return text && text.length <= 30 && pattern.pattern.test(text);
        });
        return element ? { element, title: directText(element), sectionType: pattern.type } : null;
      })
      .filter(Boolean)
      .sort((a, b) => documentPosition(a.element, b.element));
  }

  function buildSection(anchor, nextAnchor, index) {
    const rangeElements = elementsInRange(anchor.element, nextAnchor?.element);
    const container = bestSectionContainer(anchor.element, rangeElements);
    const section = {
      sectionId: `section-${index}-${anchor.sectionType}`,
      sectionTitle: anchor.title,
      sectionType: anchor.sectionType,
      sectionContainer: describeElement(container),
      sectionSelector: selectorFor(container),
      repeatable: repeatableTypes.has(anchor.sectionType),
      addButton: null,
      deleteButton: null,
      buttons: [],
      fields: [],
      items: [],
      unstableItemFields: [],
    };
    section.buttons = scanButtons(rangeElements, container, anchor.sectionType);
    section.addButton = section.buttons.find((button) => button.buttonType === 'ADD_ITEM') || null;
    section.deleteButton = section.buttons.find((button) => button.buttonType === 'DELETE_ITEM') || null;
    section.fields = scanFieldsInRange(rangeElements, container, section);
    section.items = buildItems(section, container);
    section.unstableItemFields = section.fields.filter((field) => section.repeatable && field.itemIndex < 0).map((field) => field.label || field.placeholder || field.relativeSelector);
    return section;
  }

  function elementsInRange(start, end) {
    return Array.from(document.body.querySelectorAll('*')).filter((element) => {
      if (!isVisible(element)) return false;
      if (element === start) return true;
      const afterStart = Boolean(start.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
      const beforeEnd = !end || Boolean(element.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING);
      return afterStart && beforeEnd;
    });
  }

  function bestSectionContainer(anchor, rangeElements) {
    let current = anchor;
    for (let depth = 0; current && depth < 8; depth += 1) {
      const controls = rangeElements.filter((element) => isControlLike(element) && current.contains(element));
      const buttons = rangeElements.filter((element) => isButtonLike(element) && current.contains(element));
      if ((controls.length || buttons.length) && controls.length <= 80) return current;
      current = current.parentElement;
    }
    return anchor.parentElement || anchor;
  }

  function scanFieldsInRange(rangeElements, container, section) {
    const roots = uniqueByElement(
      rangeElements
        .filter(isControlLike)
        .map((element) => componentRoot(element))
        .filter((element) => !isInternalOrDangerousField(element))
    );
    return roots.map((element, index) => {
      const label = fieldLabel(element);
      const itemContainer = section.repeatable ? inferItemContainer(element, container, section.sectionType) : container;
      const componentType = inferComponentType(element, label);
      return {
        fieldId: `${section.sectionId}-field-${index}`,
        sectionType: section.sectionType,
        sectionTitle: section.sectionTitle,
        itemIndex: -1,
        fieldIndex: index,
        label,
        nearbyText: nearbyText(element),
        placeholder: placeholderText(element),
        name: inputOf(element)?.name || element.getAttribute('name') || '',
        id: inputOf(element)?.id || element.id || '',
        ariaLabel: element.getAttribute('aria-label') || inputOf(element)?.getAttribute('aria-label') || '',
        role: element.getAttribute('role') || inputOf(element)?.getAttribute('role') || '',
        elementType: element.tagName.toLowerCase(),
        inputType: inputType(element),
        required: isRequired(element),
        readonly: Boolean(inputOf(element)?.readOnly || element.getAttribute('aria-readonly') === 'true'),
        disabled: Boolean(inputOf(element)?.disabled || element.getAttribute('aria-disabled') === 'true'),
        currentValue: readValue(element),
        hasValue: Boolean(readValue(element)),
        selector: selectorFor(element),
        relativeSelector: relativeSelectorFor(itemContainer || container, element),
        itemContainer: itemContainer ? describeElement(itemContainer) : '',
        itemSelector: itemContainer ? selectorFor(itemContainer) : '',
        componentType,
        popupType: popupTypeFor(componentType),
        optionTexts: optionTexts(element),
        validationText: validationText(element),
        canonicalCandidate: canonicalCandidate(section.sectionType, label, element),
      };
    });
  }

  function buildItems(section, container) {
    if (!section.repeatable) {
      section.fields.forEach((field) => {
        field.itemIndex = -1;
      });
      return [];
    }

    const itemContainers = detectItemContainers(section, container);
    if (!itemContainers.length) {
      section.fields.forEach((field) => {
        field.itemIndex = -1;
      });
      return [];
    }

    return itemContainers.map((itemElement, itemIndex) => {
      const fields = section.fields.filter((field) => {
        const element = elementFromSelector(field.selector);
        return element && itemElement.contains(element);
      });
      fields.forEach((field, fieldIndex) => {
        field.itemIndex = itemIndex;
        field.fieldIndex = fieldIndex;
        field.relativeSelector = relativeSelectorFor(itemElement, elementFromSelector(field.selector));
        field.itemContainer = describeElement(itemElement);
        field.itemSelector = selectorFor(itemElement);
      });
      return {
        itemId: `${section.sectionId}-item-${itemIndex}`,
        itemIndex,
        itemContainer: describeElement(itemElement),
        itemSelector: selectorFor(itemElement),
        deleteButton: scanButtons(Array.from(itemElement.querySelectorAll('*')).filter(isVisible), itemElement, section.sectionType).find((button) => button.buttonType === 'DELETE_ITEM') || null,
        fields,
      };
    });
  }

  function detectItemContainers(section, container) {
    const deleteButtons = section.buttons.filter((button) => button.buttonType === 'DELETE_ITEM').map((button) => elementFromSelector(button.selector)).filter(Boolean);
    const byDelete = deleteButtons.map((button) => nearestItemContainer(button, container)).filter(Boolean);
    if (byDelete.length) return uniqueByElement(byDelete);

    const fields = section.fields.map((field) => elementFromSelector(field.selector)).filter(Boolean);
    const byStructure = uniqueByElement(fields.map((field) => inferItemContainer(field, container, section.sectionType)).filter(Boolean));
    if (byStructure.length > 1) return byStructure;

    const grouped = splitByRepeatedFirstField(section, container);
    if (grouped.length) return grouped;
    return fields.length ? [container] : [];
  }

  function inferItemContainer(element, sectionContainer, sectionType) {
    const minControls = sectionType === 'award' || sectionType === 'language' ? 2 : 3;
    let current = element.parentElement;
    while (current && current !== sectionContainer) {
      const controlCount = uniqueByElement(Array.from(current.querySelectorAll('input,textarea,select,.ant-select,.ant-picker')).map(componentRoot)).length;
      const text = compactText(current.innerText || current.textContent || '');
      const hasDelete = /删除本条|删除/.test(text);
      if ((controlCount >= minControls && text.length <= 2500) || hasDelete) return current;
      current = current.parentElement;
    }
    return sectionContainer;
  }

  function nearestItemContainer(button, sectionContainer) {
    let current = button.parentElement;
    while (current && current !== sectionContainer) {
      if ((current.innerText || '').length <= 3000 && current.querySelectorAll('input,textarea,select,.ant-select,.ant-picker').length >= 1) return current;
      current = current.parentElement;
    }
    return null;
  }

  function splitByRepeatedFirstField(section, container) {
    const starts = section.fields
      .filter((field) => isLikelyItemStart(section.sectionType, field.label))
      .map((field) => elementFromSelector(field.selector))
      .filter(Boolean);
    return uniqueByElement(starts.map((element) => inferItemContainer(element, container, section.sectionType)).filter(Boolean)).filter((item) => item !== container);
  }

  function scanButtons(rangeElements, container, sectionType) {
    return uniqueByElement(rangeElements.filter(isButtonLike)).map((element, index) => {
      const text = buttonText(element);
      return {
        buttonId: `${sectionType}-button-${index}`,
        sectionType,
        buttonType: classifyButton(text, element),
        buttonText: text,
        selector: selectorFor(element),
        relativeSelector: relativeSelectorFor(container, element),
        relativePosition: relativePosition(container, element),
        componentType: inferButtonComponentType(text, element),
      };
    });
  }

  async function probeComponents(sections) {
    const components = uniqueByElement(
      sections
        .flatMap((section) => section.fields)
        .map((field) => elementFromSelector(field.selector))
        .filter(Boolean)
        .filter((element) => ['customSelect', 'datePicker', 'monthRangePicker', 'autocomplete', 'multiSelect'].includes(inferComponentType(element, fieldLabel(element))))
    ).slice(0, 20);

    const probes = [];
    for (const element of components) {
      probes.push(await probeComponent(element));
    }
    return probes;
  }

  async function probeComponent(element) {
    const before = readValue(element);
    const componentType = inferComponentType(element, fieldLabel(element));
    const result = {
      selector: selectorFor(element),
      componentType,
      beforeValue: before ? '[HAS_VALUE]' : '',
      afterValue: '',
      valueChanged: false,
      usesPortal: false,
      popupType: '',
      popupSelector: '',
      popupRole: '',
      popupClass: '',
      optionTexts: [],
      selectedTexts: [],
    };
    try {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      element.click();
      await wait(180);
      const popup = visiblePopupFor(componentType);
      if (popup) {
        result.usesPortal = !element.contains(popup) && !popup.contains(element);
        result.popupType = popupTypeFor(componentType);
        result.popupSelector = selectorFor(popup);
        result.popupRole = popup.getAttribute('role') || '';
        result.popupClass = String(popup.className || '');
        result.optionTexts = popupOptions(popup).slice(0, 30);
        result.selectedTexts = selectedOptions(popup).slice(0, 20);
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      await wait(80);
    } catch (error) {
      result.error = error.message;
    }
    const after = readValue(element);
    result.afterValue = after ? '[HAS_VALUE]' : '';
    result.valueChanged = before !== after;
    return result;
  }

  function sanitizeSchema(schema) {
    return {
      ...schema,
      sections: schema.sections.map((section) => ({
        ...section,
        fields: section.fields.map(sanitizeField),
        items: section.items.map((item) => ({
          ...item,
          fields: item.fields.map(sanitizeField),
        })),
      })),
    };
  }

  function sanitizeField(field) {
    const { currentValue, ...rest } = field;
    return {
      ...rest,
      currentValue: currentValue ? '[REDACTED_HAS_VALUE]' : '',
    };
  }

  function sampleSection(section) {
    return {
      sectionId: section.sectionId,
      sectionTitle: section.sectionTitle,
      sectionType: section.sectionType,
      repeatable: section.repeatable,
      items: section.items.map((item) => ({
        itemIndex: item.itemIndex,
        fields: item.fields.map(sampleField),
      })),
      fields: section.items.length ? [] : section.fields.map(sampleField),
    };
  }

  function sampleField(field) {
    return {
      fieldId: field.fieldId,
      sectionType: field.sectionType,
      sectionTitle: field.sectionTitle,
      itemIndex: field.itemIndex,
      label: field.label,
      canonicalCandidate: field.canonicalCandidate,
      componentType: field.componentType,
      currentValue: field.currentValue,
    };
  }

  function renderMarkdown(schema, filledSample) {
    const lines = [
      '# MokaHR Golden Schema',
      '',
      `Source: ${schema.sourceUrl}`,
      `Scanned At: ${schema.scannedAt}`,
      '',
    ];
    for (const section of schema.sections) {
      lines.push(`## ${section.sectionTitle || section.sectionType}`);
      lines.push(`- sectionType: ${section.sectionType}`);
      lines.push(`- repeatable: ${section.repeatable ? 'yes' : 'no'}`);
      if (section.addButton) lines.push(`- addButton: ${section.addButton.buttonText} (${section.addButton.buttonType})`);
      if (!section.items.length) {
        for (const field of section.fields) lines.push(`- ${field.label || field.placeholder || field.relativeSelector}: ${field.componentType}`);
      } else {
        for (const item of section.items) {
          lines.push(`- Item ${item.itemIndex}`);
          for (const field of item.fields) {
            const sample = filledSample.sections
              .find((sampleSectionItem) => sampleSectionItem.sectionId === section.sectionId)
              ?.items.find((sampleItem) => sampleItem.itemIndex === item.itemIndex)
              ?.fields.find((sampleFieldItem) => sampleFieldItem.fieldId === field.fieldId);
            lines.push(`  - ${field.label || field.placeholder || field.relativeSelector}: ${field.componentType}${sample?.currentValue ? ' = [HAS_VALUE]' : ''}`);
          }
        }
      }
      lines.push('');
    }
    lines.push('## Component Types');
    for (const type of schema.componentTypes) lines.push(`- ${type}`);
    lines.push('');
    lines.push('## Portal Popups');
    for (const popup of schema.portalPopups) lines.push(`- ${popup.componentType}: ${popup.popupSelector || 'unknown'} (${popup.optionTexts?.slice(0, 6).join(' / ') || 'no options captured'})`);
    return lines.join('\n');
  }

  function summarize(schema) {
    const sections = schema.sections.map((section) => ({
      sectionTitle: section.sectionTitle,
      sectionType: section.sectionType,
      repeatable: section.repeatable,
      itemCount: section.items.length,
      fieldCount: section.fields.length,
      hasAddButton: Boolean(section.addButton),
      hasDeleteButton: Boolean(section.deleteButton || section.items.some((item) => item.deleteButton)),
      fieldsPreview: (section.items.length ? section.items.flatMap((item) => item.fields) : section.fields)
        .slice(0, 10)
        .map((field) => `${field.itemIndex >= 0 ? `item${field.itemIndex}.` : ''}${field.label || field.componentType}`),
    }));
    return {
      sectionCount: sections.length,
      fieldCount: schema.sections.reduce((sum, section) => sum + section.fields.length, 0),
      componentTypes: schema.componentTypes,
      portalPopupCount: schema.portalPopups.length,
      sections,
    };
  }

  function componentTypesFromSections(sections) {
    return [...new Set(sections.flatMap((section) => section.fields.map((field) => field.componentType)))].sort();
  }

  function isControlLike(element) {
    if (!isVisible(element)) return false;
    const tag = element.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    return Boolean(element.matches('.ant-select,.ant-picker,.ant-radio-group,.ant-checkbox-wrapper,.ant-upload,[role="combobox"],[contenteditable="true"]'));
  }

  function isButtonLike(element) {
    if (!isVisible(element)) return false;
    const tag = element.tagName.toLowerCase();
    return tag === 'button' || tag === 'a' || element.getAttribute('role') === 'button' || element.className?.toString().includes('ant-btn');
  }

  function componentRoot(element) {
    return (
      element.closest('.ant-select,.ant-picker,.ant-radio-group,.ant-checkbox-wrapper,.ant-upload') ||
      element.closest('[role="combobox"]') ||
      element
    );
  }

  function inputOf(element) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return element;
    return element.querySelector('input,textarea,select');
  }

  function inferComponentType(element, label = '') {
    const input = inputOf(element);
    const text = `${label} ${element.className || ''} ${element.getAttribute('role') || ''} ${input?.getAttribute('type') || ''} ${input?.getAttribute('placeholder') || ''}`;
    if (element.matches('.ant-upload') || /上传|upload/i.test(text)) return 'upload';
    if (element.matches('.ant-picker') || /datepicker|ant-picker|日期|时间|获奖时间|就读时间|起止时间/i.test(text)) return /起止|就读时间|工作时间|项目时间/i.test(text) ? 'monthRangePicker' : 'datePicker';
    if (element.matches('.ant-select') || element.getAttribute('role') === 'combobox') {
      if (/多选|multiple|tags/i.test(text) || element.className?.toString().includes('multiple')) return 'multiSelect';
      if (/学校|专业|公司|院校|autocomplete/i.test(text)) return 'autocomplete';
      return 'customSelect';
    }
    if (input?.tagName === 'SELECT') return 'nativeSelect';
    if ((input?.getAttribute('type') || '').toLowerCase() === 'radio' || element.matches('.ant-radio-group')) return 'radio';
    if ((input?.getAttribute('type') || '').toLowerCase() === 'checkbox' || element.matches('.ant-checkbox-wrapper')) return 'checkbox';
    if (input?.tagName === 'TEXTAREA') return 'textarea';
    return 'input';
  }

  function fieldLabel(element) {
    const formItem = element.closest('.ant-form-item,.moka-form-item,.form-item,[class*="formItem"]');
    const label = formItem?.querySelector('.ant-form-item-label label,label,[class*="label"],[class*="Label"]');
    return compactText(label?.innerText || label?.textContent || element.getAttribute('aria-label') || inputOf(element)?.getAttribute('placeholder') || element.getAttribute('placeholder') || '');
  }

  function nearbyText(element) {
    const formItem = element.closest('.ant-form-item,.moka-form-item,.form-item,[class*="formItem"]');
    return compactText(formItem?.innerText || element.parentElement?.innerText || '').slice(0, 360);
  }

  function placeholderText(element) {
    return inputOf(element)?.getAttribute('placeholder') || element.getAttribute('placeholder') || '';
  }

  function inputType(element) {
    const input = inputOf(element);
    return (input?.getAttribute('type') || element.tagName.toLowerCase()).toLowerCase();
  }

  function readValue(element) {
    const input = inputOf(element);
    if (element.matches('.ant-select')) return compactText(element.querySelector('.ant-select-selection-item,.ant-select-selection-overflow')?.innerText || input?.value || '');
    if (element.matches('.ant-picker')) return compactText(element.innerText || input?.value || '');
    if (input?.tagName === 'SELECT') return compactText(input.selectedOptions?.[0]?.textContent || input.value || '');
    if (input?.type === 'checkbox' || input?.type === 'radio') return input.checked ? input.value || 'checked' : '';
    return compactText(input?.value || element.innerText || '');
  }

  function optionTexts(element) {
    const input = inputOf(element);
    if (input?.tagName === 'SELECT') return Array.from(input.options).map((option) => compactText(option.textContent || option.value)).filter(Boolean);
    if (input?.list) return Array.from(input.list.options).map((option) => compactText(option.label || option.value)).filter(Boolean);
    return [];
  }

  function isRequired(element) {
    const formItem = element.closest('.ant-form-item,.moka-form-item,.form-item,[class*="formItem"]');
    return Boolean(inputOf(element)?.required || inputOf(element)?.getAttribute('aria-required') === 'true' || formItem?.querySelector('.ant-form-item-required') || /\*/.test(fieldLabel(element)));
  }

  function validationText(element) {
    const formItem = element.closest('.ant-form-item,.moka-form-item,.form-item,[class*="formItem"]');
    return compactText(formItem?.querySelector('.ant-form-item-explain-error,[class*="error"],[class*="Error"]')?.innerText || '').slice(0, 200);
  }

  function canonicalCandidate(sectionType, label, element) {
    const text = compactText(`${label} ${placeholderText(element)} ${nearbyText(element)}`).toLowerCase();
    if (/姓名|name/.test(text)) return 'name';
    if (/邮箱|email/.test(text)) return 'email';
    if (/手机|电话|phone|mobile/.test(text)) return 'phone';
    if (/学校|院校/.test(text)) return 'school';
    if (/学历/.test(text)) return 'degreeLevel';
    if (/学习形式/.test(text)) return 'studyType';
    if (/学院/.test(text)) return 'college';
    if (/专业排名|排名/.test(text)) return 'majorRank';
    if (/专业/.test(text)) return 'major';
    if (/gpa|绩点|成绩/.test(text)) return 'gpa';
    if (/公司|单位/.test(text)) return 'company';
    if (/职位|岗位|角色|职责$/.test(text)) return sectionType === 'projectExperience' ? 'role' : 'role';
    if (/项目名称|奖项名称|证书名称/.test(text)) return 'name';
    if (/描述|内容|职责/.test(text)) return /项目中职责|职责/.test(text) ? 'responsibility' : 'description';
    if (/开始|起始|入学|入职/.test(text)) return 'startDate';
    if (/结束|截止|毕业|离职/.test(text)) return 'endDate';
    if (/获奖时间|时间/.test(text)) return 'date';
    return '';
  }

  function isLikelyItemStart(sectionType, label) {
    if (sectionType === 'education') return /学历/.test(label);
    if (sectionType === 'internship' || sectionType === 'workExperience' || sectionType === 'projectExperience') return /起止时间|开始时间|时间/.test(label);
    if (sectionType === 'award') return /获奖时间|时间/.test(label);
    if (sectionType === 'language') return /英语等级证书|语言/.test(label);
    return false;
  }

  function classifyButton(text, element) {
    if (/添加|新增|增加|add/i.test(text)) return 'ADD_ITEM';
    if (/删除|delete/i.test(text)) return 'DELETE_ITEM';
    if (/上传|upload/i.test(text)) return 'UPLOAD';
    if (/下一步|继续|next|continue/i.test(text)) return 'NEXT';
    if (/保存|save/i.test(text)) return 'SAVE';
    if (/提交|投递|预览并提交|submit/i.test(text) || (element.getAttribute('type') || '').toLowerCase() === 'submit') return 'SUBMIT';
    if (element.closest('.ant-select,.ant-picker')) return 'OPEN_SELECTOR';
    return 'OTHER';
  }

  function inferButtonComponentType(text, element) {
    if (/上传|upload/i.test(text)) return 'upload';
    if (/添加|新增|增加|add/i.test(text)) return 'addButton';
    if (/删除|delete/i.test(text)) return 'deleteButton';
    if (element.closest('.ant-select')) return 'customSelectTrigger';
    if (element.closest('.ant-picker')) return 'datePickerTrigger';
    return 'button';
  }

  function buttonText(element) {
    return compactText(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || element.value || '');
  }

  function isInternalOrDangerousField(element) {
    const input = inputOf(element) || element;
    const type = (input.getAttribute('type') || '').toLowerCase();
    const text = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${fieldLabel(element)}`.toLowerCase();
    return ['hidden', 'password', 'submit', 'button', 'reset'].includes(type) || /captcha|验证码|token|csrf|password|moka-version/.test(text);
  }

  function visiblePopupFor(componentType) {
    const selectors =
      componentType === 'datePicker' || componentType === 'monthRangePicker'
        ? ['.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)']
        : ['.ant-select-dropdown:not(.ant-select-dropdown-hidden)', '[role="listbox"]'];
    return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).find(isVisible) || null;
  }

  function popupTypeFor(componentType) {
    if (componentType === 'datePicker') return 'datePopup';
    if (componentType === 'monthRangePicker') return 'monthRangePopup';
    if (componentType === 'customSelect' || componentType === 'autocomplete' || componentType === 'multiSelect') return 'selectPopup';
    return '';
  }

  function popupOptions(popup) {
    return Array.from(popup.querySelectorAll('[role="option"],.ant-select-item-option,.ant-picker-cell,.ant-picker-month-btn,.ant-picker-year-btn'))
      .filter(isVisible)
      .map((element) => compactText(element.innerText || element.textContent || ''))
      .filter(Boolean);
  }

  function selectedOptions(popup) {
    return Array.from(popup.querySelectorAll('[aria-selected="true"],.ant-select-item-option-selected,.ant-picker-cell-selected'))
      .filter(isVisible)
      .map((element) => compactText(element.innerText || element.textContent || ''))
      .filter(Boolean);
  }

  function describeElement(element) {
    if (!element) return '';
    return compactText([element.tagName.toLowerCase(), element.id ? `#${element.id}` : '', element.className ? `.${String(element.className).split(/\s+/).slice(0, 4).join('.')}` : ''].join(''));
  }

  function selectorFor(element) {
    if (!element) return '';
    if (element.id) return `#${cssEscape(element.id)}`;
    const parts = [];
    let current = element;
    while (current && current !== document.body && parts.length < 8) {
      let part = current.tagName.toLowerCase();
      const stableClass = stableClasses(current)[0];
      if (stableClass) part += `.${cssEscape(stableClass)}`;
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

  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\#.:,[\]>+~*^$|=()]/g, '\\$&');
  }

  function relativeSelectorFor(container, element) {
    if (!container || !element) return selectorFor(element);
    if (element.id) return `#${cssEscape(element.id)}`;
    const parts = [];
    let current = element;
    while (current && current !== container && current !== document.body && parts.length < 6) {
      let part = current.tagName.toLowerCase();
      const stableClass = stableClasses(current)[0];
      if (stableClass) part += `.${cssEscape(stableClass)}`;
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
    return String(element.className || '')
      .split(/\s+/)
      .filter((className) => className && !/css-|hash|active|focused|open|disabled|selected/.test(className))
      .slice(0, 3);
  }

  function relativePosition(container, element) {
    const containerRect = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left - containerRect.left),
      y: Math.round(rect.top - containerRect.top),
    };
  }

  function elementFromSelector(selector) {
    try {
      return selector ? document.querySelector(selector) : null;
    } catch (_error) {
      return null;
    }
  }

  function inferSectionType(title = '') {
    return sectionPatterns.find((item) => item.pattern.test(title))?.type || '';
  }

  function directText(element) {
    return compactText(Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(' ') || element.innerText || element.textContent || '');
  }

  function compactText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function isVisible(element) {
    if (!element || !(element instanceof Element)) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 1 && rect.height > 1 && element.getClientRects().length > 0;
  }

  function documentPosition(a, b) {
    if (a === b) return 0;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  function uniqueByElement(items) {
    const seen = new Set();
    return items.filter((item) => {
      const element = item.element || item;
      if (!element || seen.has(element)) return false;
      seen.add(element);
      return true;
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  root.mokaGoldenSchema = {
    exportGoldenSchema,
  };
})();
