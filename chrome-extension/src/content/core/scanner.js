(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  function textAround(element) {
    const explicitLabel = element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.innerText : '';
    const wrappedLabel = element.closest('label')?.innerText || '';
    const ariaLabel = ariaLabelText(element);
    const formItem = nearestUsefulContainerText(element);
    const previous = element.previousElementSibling?.innerText || '';
    const previousSibling = element.parentElement?.previousElementSibling?.innerText || '';
    const parent = element.parentElement?.innerText || '';
    return [
      explicitLabel,
      wrappedLabel,
      ariaLabel,
      formItem,
      previous,
      previousSibling,
      parent,
      element.name,
      element.id,
      element.placeholder,
      element.getAttribute('aria-label'),
      element.getAttribute('autocomplete'),
      element.getAttribute('data-name'),
    ]
      .filter(Boolean)
      .join(' ');
  }

  function sectionText(element) {
    return sectionSnippets(element).join(' ');
  }

  function sectionSnippets(element) {
    const parts = [];
    let current = element;
    for (let depth = 0; current && depth < 7; depth += 1) {
      let sibling = current.previousElementSibling;
      let seen = 0;
      while (sibling && seen < 6) {
        const text = (sibling.innerText || sibling.textContent || '').trim();
        if (text && text.length <= 120) parts.push(text);
        sibling = sibling.previousElementSibling;
        seen += 1;
      }
      current = current.parentElement;
    }

    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="Title"]'))
      .filter(isVisible)
      .filter((node) => node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
      .map((node) => (node.innerText || node.textContent || '').trim())
      .filter((text) => text && text.length <= 80)
      .slice(-8)
      .reverse();

    const ownText = [
      element.closest('label')?.innerText,
      nearestUsefulContainerText(element),
      element.placeholder,
      element.name,
      element.id,
    ]
      .filter(Boolean)
      .join(' ');

    return [ownText, ...parts, ...headings].filter(Boolean);
  }

  function nearestUsefulContainerText(element) {
    let current = element.parentElement;
    for (let depth = 0; current && depth < 5; depth += 1) {
      const text = (current.innerText || '').trim();
      const controlCount = current.querySelectorAll('input, textarea, select').length;
      if (text && controlCount <= 2 && text.length <= 220) return text;
      current = current.parentElement;
    }
    return '';
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) !== 0 &&
      rect.width > 1 &&
      rect.height > 1 &&
      element.getClientRects().length > 0
    );
  }

  function isBaseInternalField(element) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    const text = [element.name, element.id, element.placeholder, element.getAttribute('data-name'), element.getAttribute('aria-label')]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (
      ['hidden', 'password', 'submit', 'button', 'reset', 'image'].includes(type) ||
      /password|passwd|pwd|验证码|校验码|captcha|verify|verification|otp|smscode|mfa|2fa|version|csrf|token|session|fingerprint|trace|uuid/.test(text)
    );
  }

  function controls(adapter = {}, scope = document) {
    return Array.from(scope.querySelectorAll('input, textarea, select')).filter((element) => {
      const type = (element.getAttribute('type') || '').toLowerCase();
      return (
        !['hidden', 'submit', 'button', 'reset', 'image', 'file'].includes(type) &&
        !element.disabled &&
        !isBaseInternalField(element) &&
        !(adapter.isInternalField && adapter.isInternalField(element)) &&
        isVisible(element)
      );
    });
  }

  function scanControls(adapter = {}, scope = document) {
    return Array.from(scope.querySelectorAll('input, textarea, select')).filter(
      (element) => !isBaseInternalField(element) && !(adapter.isInternalField && adapter.isInternalField(element))
    );
  }

  function scanFields(adapter = {}, scope = document) {
    const forms = Array.from(document.querySelectorAll('form'));
    return scanControls(adapter, scope).map((element, index) => {
      const form = element.closest('form');
      const context = fieldGroupContext(element, adapter);
      const elementType = element.tagName.toLowerCase();
      const inputType = (element.getAttribute('type') || elementType).toLowerCase();
      return {
        index,
        fieldId: buildFieldId(element, index),
        elementType,
        inputType,
        label: labelText(element),
        placeholder: element.placeholder || '',
        name: element.name || '',
        id: element.id || '',
        type: inputType,
        autocomplete: element.getAttribute('autocomplete') || '',
        required: Boolean(element.required || element.getAttribute('aria-required') === 'true'),
        disabled: Boolean(element.disabled),
        readonly: Boolean(element.readOnly),
        readOnly: Boolean(element.readOnly),
        visible: isVisible(element),
        options: fieldOptions(element),
        selector: selectorFor(element),
        nearbyText: nearbyText(element).slice(0, 360),
        section: context.section,
        sectionType: context.sectionType,
        sectionTitle: context.sectionTitle,
        sectionSelector: context.sectionSelector,
        itemIndex: context.itemIndex,
        itemSelector: context.itemSelector,
        itemText: context.itemText,
        sectionItemKey: context.sectionItemKey,
        sectionItemLabel: context.sectionItemLabel,
        pageUrl: location.href,
        adapterName: adapter.name || adapter.id || 'Generic Careers',
        formIndex: form ? forms.indexOf(form) : -1,
        formId: form?.id || '',
        formName: form?.getAttribute('name') || '',
        tag: elementType,
        isFile: inputType === 'file',
      };
    });
  }

  function fieldGroupContext(element, adapter = {}) {
    const adapterContext = adapter.fieldGroupContext?.(element);
    if (adapterContext) return adapterContext;

    const section = nearestSection(element);
    const sectionTitle = section?.title || '';
    const sectionType = inferSectionType([sectionTitle, section?.text, sectionSnippets(element).join(' ')].filter(Boolean).join(' '));
    const item = sectionType ? nearestSectionItem(element, section?.element || document.body, sectionType) : null;
    const titleIndex = inferItemIndexFromText([sectionTitle, section?.text, sectionSnippets(element).join(' ')].filter(Boolean).join(' '));
    const itemIndex = titleIndex >= 0 ? titleIndex : item?.index ?? -1;
    return {
      section: sectionTitle,
      sectionType,
      sectionTitle,
      sectionSelector: section?.element ? selectorFor(section.element) : '',
      itemIndex,
      itemSelector: item?.element ? selectorFor(item.element) : '',
      itemText: item?.text || '',
      sectionItemKey: sectionType ? `${sectionType}:${itemIndex >= 0 ? itemIndex : 'single'}` : '',
      sectionItemLabel: sectionType ? `${readableSectionTitle(sectionType)}${itemIndex >= 0 ? itemIndex + 1 : ''}` : '',
    };
  }

  function nearestSection(element) {
    const candidates = [];
    let current = element.parentElement;
    for (let depth = 0; current && current !== document.body && depth < 9; depth += 1) {
      const title = directSectionTitle(current);
      const aria = current.getAttribute('aria-label') || current.getAttribute('data-section-title') || '';
      const text = compactText([title, aria, current.getAttribute('class') || '', current.id || ''].filter(Boolean).join(' '));
      const type = inferSectionType(text);
      if (type) candidates.push({ element: current, title: title || aria || readableSectionTitle(type), text, depth, score: title ? 3 : 1 });
      current = current.parentElement;
    }
    if (candidates.length) {
      return candidates.sort((a, b) => b.score - a.score || a.depth - b.depth)[0];
    }

    const heading = nearestPreviousHeading(element);
    if (!heading) return null;
    const container = sectionContainerForHeading(heading, element);
    const title = compactText(heading.innerText || heading.textContent || '');
    return { element: container || heading.parentElement || document.body, title, text: title, depth: 0, score: 1 };
  }

  function directSectionTitle(element) {
    const direct = Array.from(element.children || []).find((child) =>
      /^(H1|H2|H3|H4|LEGEND)$/i.test(child.tagName) ||
      /title|heading|section/i.test(child.getAttribute('class') || '') ||
      child.hasAttribute('data-section-title')
    );
    const text = compactText(direct?.innerText || direct?.textContent || '');
    if (text && text.length <= 80) return text;
    return '';
  }

  function nearestPreviousHeading(element) {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,legend,[data-section-title],[class*="title"],[class*="Title"]'))
      .filter(isVisible)
      .filter((node) => (node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)
      .map((node) => ({ node, text: compactText(node.innerText || node.textContent || '') }))
      .filter((item) => item.text && item.text.length <= 80 && inferSectionType(item.text));
    return headings.at(-1)?.node || null;
  }

  function sectionContainerForHeading(heading, element) {
    let current = heading.parentElement;
    for (let depth = 0; current && current !== document.body && depth < 5; depth += 1) {
      if (current.contains(element) && current.querySelectorAll('input,textarea,select').length >= 1) return current;
      current = current.parentElement;
    }
    return heading.parentElement;
  }

  function nearestSectionItem(element, sectionElement, sectionType) {
    const repeatable = ['education', 'internship', 'project', 'award'].includes(sectionType);
    if (!repeatable) return { element: sectionElement, index: -1, text: '' };

    const container = nearestItemContainer(element, sectionElement);
    if (!container) return { element: sectionElement, index: 0, text: '' };
    const items = sectionItems(sectionElement)
      .filter((item) => item.querySelectorAll('input,textarea,select').length > 0);
    const index = Math.max(0, items.indexOf(container));
    return {
      element: container,
      index,
      text: compactText(container.innerText || container.textContent || '').slice(0, 260),
    };
  }

  function nearestItemContainer(element, sectionElement) {
    const candidates = [];
    let current = element.parentElement;
    for (let depth = 0; current && current !== sectionElement && depth < 7; depth += 1) {
      const controlCount = current.querySelectorAll('input,textarea,select').length;
      const classText = `${current.className || ''} ${current.id || ''}`;
      const hasItemMarker =
        current.matches?.('[data-repeater-item],.repeater-item,fieldset') ||
        /item|card|record|block|entry|experience|education|project|resume|form-list|ant-form-list/i.test(classText);
      if (controlCount >= 2 && controlCount <= 20) {
        candidates.push({ element: current, score: hasItemMarker ? 3 : 1, depth });
      }
      current = current.parentElement;
    }
    if (!candidates.length) return sectionElement;
    return candidates.sort((a, b) => b.score - a.score || b.depth - a.depth)[0].element;
  }

  function sectionItems(sectionElement) {
    const explicit = Array.from(sectionElement.querySelectorAll('[data-repeater-item],.repeater-item,.education-item,.experience-item,.project-item,.ant-form-list-item'))
      .filter(isVisible);
    if (explicit.length) return uniqueElements(explicit);

    const controlsInSection = scanControls({}, sectionElement).filter((control) => !control.closest('button'));
    const grouped = controlsInSection
      .map((control) => nearestItemContainer(control, sectionElement))
      .filter(Boolean);
    const unique = uniqueElements(grouped);
    return unique.length ? unique : [sectionElement];
  }

  function inferSectionType(text = '') {
    const value = String(text || '');
    if (/项目|project/i.test(value)) return 'project';
    if (/实习|工作经历|工作经验|任职经历|公司名称|职位名称|internship|work experience|employment|experience/i.test(value)) return 'internship';
    if (/教育|学历|学习经历|学校|院校|专业|education|school|university/i.test(value)) return 'education';
    if (/获奖|奖项|荣誉|实践|校园经历|award|honou?r/i.test(value)) return 'award';
    if (/技能|语言|英语|证书|skill|language|certificate/i.test(value)) return 'skills';
    if (/个人信息|基础信息|联系方式|姓名|邮箱|手机|personal|contact|basic/i.test(value)) return 'personal';
    return '';
  }

  function readableSectionTitle(sectionType = '') {
    return {
      personal: '个人信息',
      education: '教育经历',
      internship: '工作/实习经历',
      project: '项目经历',
      award: '实践荣誉',
      skills: '技能',
    }[sectionType] || '';
  }

  function inferItemIndexFromText(text = '') {
    const value = String(text || '');
    const match = value.match(/(?:教育|学历|实习|工作|项目|获奖|实践|经历|经验|education|work|internship|project|award)[^\d一二三四五六七八九十]{0,8}([1-9]\d?|[一二三四五六七八九十])/i);
    if (!match) return -1;
    const number = chineseNumber(match[1]);
    return number > 0 ? number - 1 : -1;
  }

  function chineseNumber(value = '') {
    const text = String(value || '').trim();
    if (/^\d+$/.test(text)) return Number(text);
    const map = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    if (map[text]) return map[text];
    if (/^十[一二三四五六七八九]$/.test(text)) return 10 + map[text.slice(1)];
    if (/^[一二三四五六七八九]十$/.test(text)) return map[text[0]] * 10;
    if (/^[一二三四五六七八九]十[一二三四五六七八九]$/.test(text)) return map[text[0]] * 10 + map[text[2]];
    return 0;
  }

  function uniqueElements(elements = []) {
    return elements.filter((element, index) => elements.indexOf(element) === index);
  }

  function buildFieldId(element, index) {
    return element.id || element.name || element.getAttribute('autocomplete') || `${element.tagName.toLowerCase()}-${index}`;
  }

  function labelText(element) {
    const labels = [];
    if (element.id) {
      labels.push(...Array.from(document.querySelectorAll(`label[for="${CSS.escape(element.id)}"]`)).map((label) => label.innerText));
    }
    labels.push(element.closest('label')?.innerText || '');
    labels.push(element.getAttribute('aria-label') || '');
    labels.push(ariaLabelText(element));
    labels.push(fieldsetLegendText(element));
    return compactText(labels.join(' ')).slice(0, 220);
  }

  function ariaLabelText(element) {
    const ids = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    return ids
      .map((id) => document.getElementById(id)?.innerText || document.getElementById(id)?.textContent || '')
      .filter(Boolean)
      .join(' ');
  }

  function fieldsetLegendText(element) {
    const fieldset = element.closest('fieldset');
    return fieldset?.querySelector('legend')?.innerText || '';
  }

  function nearbyText(element) {
    return compactText(
      [
        labelText(element),
        nearestUsefulContainerText(element),
        element.parentElement?.innerText || '',
        element.parentElement?.previousElementSibling?.innerText || '',
        element.previousElementSibling?.innerText || '',
        element.nextElementSibling?.innerText || '',
        element.getAttribute('title') || '',
        element.getAttribute('data-name') || '',
      ].join(' ')
    );
  }

  function fieldOptions(element) {
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (tag === 'select') {
      return Array.from(element.options).map((option) => ({
        label: compactText(option.textContent || ''),
        value: option.value,
        selected: option.selected,
        disabled: option.disabled,
      }));
    }
    if (type === 'radio' || type === 'checkbox') {
      const groupKey = element.name ? `input[type="${CSS.escape(type)}"][name="${CSS.escape(element.name)}"]` : '';
      const group = groupKey ? Array.from(document.querySelectorAll(groupKey)) : [element];
      return group
        .filter((item) => !isBaseInternalField(item))
        .map((item) => ({
          label: labelText(item),
          value: item.value || 'on',
          checked: item.checked,
          disabled: item.disabled,
        }));
    }
    if (element instanceof HTMLInputElement && element.list) {
      return Array.from(element.list.options).map((option) => ({
        label: compactText(option.label || option.textContent || option.value),
        value: option.value,
      }));
    }
    return [];
  }

  function selectorFor(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let part = current.tagName.toLowerCase();
      if (current.getAttribute('name')) {
        part += `[name="${cssAttr(current.getAttribute('name'))}"]`;
        parts.unshift(part);
        break;
      }
      const parent = current.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children).filter((item) => item.tagName === current.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ');
  }

  function cssAttr(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function compactText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  root.scanner = {
    controls,
    isVisible,
    nearestUsefulContainerText,
    scanControls,
    scanFields,
    fieldGroupContext,
    sectionSnippets,
    sectionText,
    textAround,
  };
})();
