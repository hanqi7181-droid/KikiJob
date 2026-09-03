(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  const driverNames = [
    'textInputDriver',
    'textareaDriver',
    'nativeSelectDriver',
    'customSelectDriver',
    'autocompleteDriver',
    'radioDriver',
    'checkboxDriver',
    'datePickerDriver',
    'monthPickerDriver',
    'rangePickerDriver',
    'cascaderDriver',
    'multiSelectDriver',
    'uploadDetector',
  ];

  function driverFor(field, element) {
    const type = field.componentType || inferComponentType(element);
    if (type === 'textarea') return textareaDriver;
    if (type === 'nativeSelect') return nativeSelectDriver;
    if (type === 'customSelect') return customSelectDriver;
    if (type === 'autocomplete') return autocompleteDriver;
    if (type === 'radio') return radioDriver;
    if (type === 'checkbox') return checkboxDriver;
    if (type === 'datePicker') return datePickerDriver;
    if (type === 'monthPicker') return monthPickerDriver;
    if (type === 'monthRangePicker') return rangePickerDriver;
    if (type === 'cascader') return cascaderDriver;
    if (type === 'multiSelect') return multiSelectDriver;
    if (type === 'upload') return uploadDetector;
    return textInputDriver;
  }

  const textInputDriver = makeValueDriver('textInputDriver', (element) => inputOf(element), normalizeText);
  const textareaDriver = makeValueDriver('textareaDriver', (element) => inputOf(element), normalizeText);
  const datePickerDriver = makeValueDriver('datePickerDriver', (element) => inputOf(element), (value, field) => normalizeDate(value, field));
  const monthPickerDriver = makeValueDriver('monthPickerDriver', (element) => inputOf(element), (value, field) => normalizeDate(value, field));
  const rangePickerDriver = makeRangeDriver();

  const nativeSelectDriver = {
    name: 'nativeSelectDriver',
    detect: (element) => inputOf(element)?.tagName === 'SELECT',
    read: readValue,
    fill(element, value, field) {
      const select = inputOf(element);
      const option = bestOption(Array.from(select?.options || []), value, field);
      if (!option) return { ok: false, status: 'NEED_CONFIRMATION', reason: '没有可靠匹配的 select option' };
      root.filler.setValue(select, option.value);
      return this.verify(element, value, field)
        ? { ok: true, status: 'SUCCESS', reason: `已选择 ${option.label}` }
        : { ok: false, status: 'FAILED', reason: 'select 写入后验证失败' };
    },
    verify(element, value, field) {
      return sameValue(readValue(element), value, field);
    },
  };

  const customSelectDriver = makePopupSelectDriver('customSelectDriver');
  const autocompleteDriver = makePopupSelectDriver('autocompleteDriver', true);
  const multiSelectDriver = makePopupSelectDriver('multiSelectDriver');
  const cascaderDriver = makePopupSelectDriver('cascaderDriver');

  const radioDriver = {
    name: 'radioDriver',
    detect: (element) => inferComponentType(element) === 'radio',
    read: readValue,
    fill(element, value, field) {
      const group = Array.from(element.querySelectorAll('input[type="radio"]'));
      const target = group.find((item) => sameLoose(optionText(item), value, field) || sameLoose(item.value, value, field));
      if (!target) return { ok: false, status: 'NEED_CONFIRMATION', reason: '没有可靠匹配的 radio 选项' };
      root.filler.fillControl(target, true);
      return target.checked ? { ok: true, status: 'SUCCESS', reason: 'radio 已选择并验证' } : { ok: false, status: 'FAILED', reason: 'radio 验证失败' };
    },
    verify(element, value, field) {
      return sameValue(readValue(element), value, field);
    },
  };

  const checkboxDriver = {
    name: 'checkboxDriver',
    detect: (element) => inferComponentType(element) === 'checkbox',
    read: readValue,
    fill(element, value) {
      const input = inputOf(element);
      const desired = /^(true|yes|是|同意|checked|1)$/i.test(String(value));
      root.filler.fillControl(input, desired);
      return input.checked === desired ? { ok: true, status: 'SUCCESS', reason: 'checkbox 已设置并验证' } : { ok: false, status: 'FAILED', reason: 'checkbox 验证失败' };
    },
    verify(element, value) {
      const desired = /^(true|yes|是|同意|checked|1)$/i.test(String(value));
      return Boolean(inputOf(element)?.checked) === desired;
    },
  };

  const uploadDetector = {
    name: 'uploadDetector',
    detect: (element) => inferComponentType(element) === 'upload',
    read: readValue,
    fill() {
      return { ok: false, status: 'MANUAL', reason: '文件上传需要用户手动确认，不由 V2 自动上传' };
    },
    verify() {
      return false;
    },
  };

  function makeValueDriver(name, targetOf, normalize) {
    return {
      name,
      detect(element) {
        return Boolean(targetOf(element));
      },
      read: readValue,
      fill(element, value, field) {
        const target = targetOf(element, field);
        if (!target) return { ok: false, status: 'NOT_FOUND', reason: '未找到可写控件' };
        const normalized = normalize(value, field);
        root.filler.fillControl(target, normalized);
        return this.verify(element, normalized, field)
          ? { ok: true, status: 'SUCCESS', reason: '写入并验证成功' }
          : { ok: false, status: 'FAILED', reason: '写入后页面值未保持' };
      },
      verify(element, value, field) {
        return sameValue(readValue(element), value, field);
      },
    };
  }

  function makeRangeDriver() {
    return {
      name: 'rangePickerDriver',
      detect: (element) => inferComponentType(element) === 'monthRangePicker',
      read: readValue,
      fill(element, value, field) {
        const ownInput = inputOf(element);
        const inputs = Array.from(element.querySelectorAll?.('input') || []).filter((input) => !input.disabled);
        if (!inputs.length && ownInput) inputs.push(ownInput);
        if (!inputs.length) return { ok: false, status: 'NOT_FOUND', reason: '未找到年月范围输入框' };
        const normalized = normalizeDate(value, field);
        const index = field.canonicalField === 'endDate' ? Math.min(1, inputs.length - 1) : 0;
        root.filler.fillControl(inputs[index], normalized);
        return this.verify(element, normalized, field)
          ? { ok: true, status: 'SUCCESS', reason: `年月范围 ${field.canonicalField} 写入成功` }
          : { ok: false, status: 'FAILED', reason: '年月范围写入后验证失败' };
      },
      verify(element, value, field) {
        const values = Array.from(element.querySelectorAll('input')).map((input) => input.value);
        return values.some((item) => sameValue(item, value, field));
      },
    };
  }

  function makePopupSelectDriver(name, searchable = false) {
    return {
      name,
      detect: (element) => ['customSelect', 'autocomplete', 'multiSelect', 'cascader'].includes(inferComponentType(element)),
      read: readValue,
      async fill(element, value, field) {
        const before = readValue(element);
        element.click();
        await wait(120);
        if (searchable) {
          const input = inputOf(element);
          if (input) root.filler.fillControl(input, value);
          await wait(120);
        }
        const popup = visiblePopup();
        if (!popup) {
          const afterTyping = readValue(element);
          if (searchable && sameValue(afterTyping, value, field)) {
            return { ok: true, status: 'SUCCESS', reason: 'autocomplete 未出现 popup，但文本已写入并验证' };
          }
          return { ok: false, status: 'NEED_CONFIRMATION', reason: '未检测到 MokaHR portal popup' };
        }
        const option = bestPopupOption(popup, value, field);
        if (!option) {
          closePopup();
          return { ok: false, status: 'NEED_CONFIRMATION', reason: 'popup 中没有可靠匹配选项' };
        }
        option.click();
        await wait(160);
        const after = readValue(element);
        if (sameValue(after, value, field) || after !== before) return { ok: true, status: 'SUCCESS', reason: `popup 选择 ${compactText(option.innerText || option.textContent)}` };
        return { ok: false, status: 'FAILED', reason: 'popup 选择后页面值未变化' };
      },
      verify(element, value, field) {
        return sameValue(readValue(element), value, field);
      },
    };
  }

  function readValue(element) {
    const input = inputOf(element);
    if (element.matches?.('.ant-select')) return compactText(element.querySelector('.ant-select-selection-item,.ant-select-selection-overflow')?.innerText || input?.value || '');
    if (element.matches?.('.ant-picker')) return compactText(Array.from(element.querySelectorAll('input')).map((item) => item.value).filter(Boolean).join(' - ') || element.innerText || '');
    if (input?.tagName === 'SELECT') return compactText(input.selectedOptions?.[0]?.textContent || input.value || '');
    if (input?.type === 'checkbox' || input?.type === 'radio') return input.checked ? optionText(input) || input.value || 'checked' : '';
    return compactText(input?.value || element.value || element.innerText || '');
  }

  function inputOf(element) {
    if (!element) return null;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return element;
    return element.querySelector?.('input,textarea,select') || null;
  }

  function inferComponentType(element) {
    if (!element) return 'input';
    const input = inputOf(element);
    const className = String(element.className || '');
    if (element.matches?.('.ant-upload')) return 'upload';
    if (element.matches?.('.ant-picker')) return className.includes('range') || element.querySelectorAll('input').length >= 2 ? 'monthRangePicker' : 'datePicker';
    if (element.matches?.('.ant-select') || element.getAttribute?.('role') === 'combobox') return 'customSelect';
    if (input?.tagName === 'TEXTAREA') return 'textarea';
    if (input?.tagName === 'SELECT') return 'nativeSelect';
    if (input?.type === 'radio') return 'radio';
    if (input?.type === 'checkbox') return 'checkbox';
    return 'input';
  }

  function bestOption(options, value, field) {
    return options
      .map((option) => ({ option, label: compactText(option.textContent || option.label || option.value || ''), value: option.value || '', score: scoreOption(option.textContent || option.label || option.value || '', value, field) }))
      .filter((item) => item.score >= 80)
      .sort((a, b) => b.score - a.score)[0];
  }

  function bestPopupOption(popup, value, field) {
    return Array.from(popup.querySelectorAll('[role="option"],.ant-select-item-option,.ant-cascader-menu-item,.ant-picker-cell,.ant-picker-month-btn,.ant-picker-year-btn'))
      .filter(isVisible)
      .map((element) => ({ element, score: scoreOption(element.innerText || element.textContent || '', value, field) }))
      .filter((item) => item.score >= 80)
      .sort((a, b) => b.score - a.score)[0]?.element || null;
  }

  function scoreOption(optionTextValue, value, field) {
    const option = normalizeForField(optionTextValue, field);
    const expected = normalizeForField(value, field);
    if (!option || !expected) return 0;
    if (option === expected) return 100;
    if (option.includes(expected) || expected.includes(option)) return 82;
    return 0;
  }

  function sameValue(actual, expected, field) {
    return sameLoose(actual, expected, field);
  }

  function sameLoose(actual, expected, field) {
    const a = normalizeForField(actual, field);
    const b = normalizeForField(expected, field);
    return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
  }

  function normalizeForField(value, field = {}) {
    if (/date|time/i.test(field.canonicalField || '') || /时间|日期/.test(field.label || '')) return normalizeDate(value, field);
    if (/degree|学历/i.test(field.canonicalField || '') || /学历/.test(field.label || '')) return normalizeDegree(value);
    return normalizeText(value);
  }

  function normalizeText(value = '') {
    return String(value).trim();
  }

  function normalizeDegree(value = '') {
    const text = root.utils?.norm?.(value) || String(value).toLowerCase();
    if (/硕士|研究生|master|msc|ms/.test(text)) return '硕士';
    if (/本科|学士|双学位|bachelor|bs|ba/.test(text)) return '本科';
    if (/博士|phd|doctor/.test(text)) return '博士';
    if (/大专|专科|associate/.test(text)) return '大专';
    return text;
  }

  function normalizeDate(value = '') {
    const text = String(value || '').trim();
    const match = text.match(/(19|20)\d{2}[.\-/年\s]*(\d{1,2})?/);
    if (!match) return text;
    const year = text.match(/(19|20)\d{2}/)?.[0] || '';
    const month = match[2] ? String(Number(match[2])).padStart(2, '0') : '';
    return month ? `${year}-${month}` : year;
  }

  function optionText(input) {
    return compactText(input.closest('label')?.innerText || input.parentElement?.innerText || input.value || '');
  }

  function visiblePopup() {
    return Array.from(document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden),.ant-picker-dropdown:not(.ant-picker-dropdown-hidden),[role="listbox"]')).find(isVisible) || null;
  }

  function closePopup() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function compactText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  root.mokaDrivers = {
    driverNames,
    driverFor,
    readValue,
    normalizeDate,
    normalizeDegree,
  };
})();
