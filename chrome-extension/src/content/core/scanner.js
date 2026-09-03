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
    labels.push(element.placeholder || '');
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
    sectionSnippets,
    sectionText,
    textAround,
  };
})();
