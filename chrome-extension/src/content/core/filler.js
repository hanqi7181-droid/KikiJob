(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  function setValue(element, value) {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
    element.focus();
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setChecked(element, checked) {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'checked')?.set;
    if (setter) {
      setter.call(element, checked);
    } else {
      element.checked = checked;
    }
    element.focus();
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function parseDateParts(value = '') {
    const match = String(value).match(/(20\d{2}|19\d{2})[.\-/年\s]*(\d{1,2})?/);
    if (!match) return null;
    return {
      year: match[1],
      month: match[2] ? String(Number(match[2])) : '',
    };
  }

  function isDateStep(step) {
    return /开始时间|结束时间|起始时间|截止时间|入学时间|毕业时间|start|end|from|to/i.test(
      [step.field, step.sourceLabel, step.aliases].filter(Boolean).join(' ')
    );
  }

  function isStartDateStep(step) {
    return /开始|起始|入学|start|from/i.test([step.field, step.sourceLabel, step.aliases].filter(Boolean).join(' '));
  }

  function dateControlsForStep(step, adapter = {}, scope = document) {
    return root.scanner
      .controls(adapter, scope)
      .filter((element) => root.matcher.groupCompatible(element, step))
      .filter((element) => {
        const text = root.utils.norm(root.scanner.textAround(element));
        const descriptor = root.utils.norm(
          [element.placeholder, element.name, element.id, element.getAttribute('aria-label')].filter(Boolean).join(' ')
        );
        return /年|月|year|month/.test(`${text}${descriptor}`);
      });
  }

  function fillDateStep(step, usedControls, adapter = {}, scope = document) {
    if (!isDateStep(step)) return null;
    const parts = parseDateParts(step.value);
    if (!parts) return { status: 'manual', reason: 'date value requires manual handling' };

    const candidates = dateControlsForStep(step, adapter, scope);
    if (candidates.length < 2) return null;

    const start = isStartDateStep(step);
    const offset = start ? 0 : 2;
    const yearControl = candidates[offset];
    const monthControl = candidates[offset + 1];
    if (!yearControl || !monthControl) return null;

    const yearFilled = performFill(yearControl, parts.year, step, adapter);
    const monthFilled = parts.month ? performFill(monthControl, parts.month, step, adapter) : true;
    if (yearFilled) usedControls.add(yearControl);
    if (monthFilled) usedControls.add(monthControl);

    return {
      status: yearFilled && monthFilled ? 'filled' : 'not_found',
      selector: `${describeControl(yearControl, step.field)} / ${describeControl(monthControl, step.field)}`,
    };
  }

  function selectOption(select, value) {
    const normalizedValue = root.utils.norm(value);
    const option = Array.from(select.options).find((item) => {
      const text = root.utils.norm(item.textContent || '');
      return text.includes(normalizedValue) || normalizedValue.includes(text);
    });
    if (option) {
      setValue(select, option.value);
      return true;
    }
    return false;
  }

  function fillControl(target, value) {
    const type = (target.getAttribute('type') || '').toLowerCase();
    if (target.tagName === 'SELECT') {
      return selectOption(target, value);
    }
    if (type === 'checkbox') {
      return fillCheckbox(target, value);
    }
    if (type === 'radio') {
      return fillRadio(target, value);
    }
    setValue(target, value);
    return true;
  }

  function fillCheckbox(target, value) {
    const desired = booleanFromValue(value);
    if (desired === null) {
      const matchesOption = optionText(target).includes(root.utils.norm(value));
      if (matchesOption) setChecked(target, true);
      return matchesOption;
    }
    setChecked(target, desired);
    return true;
  }

  function fillRadio(target, value) {
    const group = target.name
      ? Array.from(document.querySelectorAll(`input[type="radio"][name="${cssAttr(target.name)}"]`))
      : [target];
    const normalizedValue = root.utils.norm(value);
    const option = group.find((item) => {
      const text = optionText(item);
      return text.includes(normalizedValue) || normalizedValue.includes(text) || root.utils.norm(item.value).includes(normalizedValue);
    });
    if (!option) return false;
    setChecked(option, true);
    return true;
  }

  function describeControl(element, fallback) {
    return element.name || element.id || element.placeholder || root.scanner.textAround(element).slice(0, 60) || fallback;
  }

  async function fillSteps(steps = [], adapter = {}) {
    const repeaterResult = root.repeaters?.fillRepeaterSteps ? await root.repeaters.fillRepeaterSteps(steps, adapter) : { results: [], handledSteps: new Set() };
    const remainingSteps = steps.filter((step) => !repeaterResult.handledSteps?.has?.(step));
    return [...(repeaterResult.results || []), ...fillStepsScoped(remainingSteps, adapter, document)];
  }

  function fillStepsScoped(steps = [], adapter = {}, scope = document) {
    const results = [];
    const usedControls = new Set();
    for (const step of steps) {
      const value = valueForStep(step);
      if (!isAllowedToFill(step)) {
        const pendingTarget = controlForStep(step, usedControls, adapter, scope);
        const lowConfidence = ['低', 'low'].includes(String(step.confidence || '').toLowerCase()) || step.confidence === '低';
        if (pendingTarget) highlightControl(pendingTarget, lowConfidence ? 'error' : 'needs_confirmation');
        results.push(
          resultFor(step, {
            status: lowConfidence ? 'not_found' : 'needs_confirmation',
            selector: pendingTarget ? selectorForResult(step, pendingTarget) : step.selector || step.scannedField?.selector || '',
            reason: lowConfidence ? 'low confidence field was not filled' : 'field is not high confidence or explicitly confirmed',
          })
        );
        continue;
      }
      if (!value || value === '待补充' || value === '待选择简历文件') {
        results.push(resultFor(step, { status: 'skipped', reason: 'empty value' }));
        continue;
      }
      if (step.type === 'file') {
        results.push(resultFor(step, { status: 'manual', reason: 'file upload requires manual selection' }));
        continue;
      }
      const dateResult = fillDateStep(step, usedControls, adapter, scope);
      if (dateResult) {
        results.push(resultFor(step, dateResult));
        continue;
      }
      const target = controlForStep(step, usedControls, adapter, scope);
      if (!target) {
        const kind = root.matcher.stepGroupKind(step);
        results.push(resultFor(step, {
          status: 'not_found',
          reason: kind ? `no matching ${kind} field on current tab` : 'no matching field on current tab',
        }));
        continue;
      }
      try {
        if (hasExistingValue(target)) {
          highlightControl(target, 'skipped');
          results.push(
            resultFor(step, {
              status: 'skipped',
              selector: selectorForResult(step, target),
              reason: 'field already has a value; existing user input was preserved',
            })
          );
          continue;
        }
        const originalValue = readControlValue(target);
        const filled = performFill(target, value, step, adapter);
        const verified = filled && verifyFilled(target, value);
        if (filled) usedControls.add(target);
        highlightControl(target, verified ? 'filled' : 'error');
        results.push(
          resultFor(step, {
            status: verified ? 'filled' : 'error',
            selector: selectorForResult(step, target),
            reason: verified ? 'filled and verified' : 'value did not persist after writing',
            originalHadValue: Boolean(originalValue),
          })
        );
      } catch (error) {
        highlightControl(target, 'error');
        results.push(resultFor(step, { status: 'error', selector: selectorForResult(step, target), reason: error.message }));
      }
    }
    return results;
  }

  function controlForStep(step, usedControls, adapter, scope = document) {
    const selector = step.selector || step.scannedField?.selector;
    if (selector) {
      try {
        const target = document.querySelector(selector);
        if (target && scope.contains(target) && !usedControls.has(target) && root.scanner.controls(adapter, scope).includes(target)) return target;
      } catch (_error) {
        // Fall back to semantic matching when a saved selector is no longer valid.
      }
    }
    return root.matcher.findControl(step, usedControls, adapter, scope);
  }

  function performFill(target, value, step, adapter = {}) {
    if (adapter.fillField) {
      const result = adapter.fillField({ target, value, step, fallback: fillControl });
      if (typeof result === 'boolean') return result;
    }
    return fillControl(target, value);
  }

  function valueForStep(step) {
    return step.value ?? step.answer ?? step.confirmedAnswer ?? '';
  }

  function isAllowedToFill(step) {
    if (step.confirmed === true || step.userConfirmed === true || step.isConfirmed === true) return true;
    if (step.requiresUserCheck === false) return true;
    return ['高', 'high', 'confirmed', '人工确认'].includes(String(step.confidence || '').toLowerCase()) || step.confidence === '高' || step.confidence === '人工确认';
  }

  function hasExistingValue(element) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox') return element.checked;
    if (type === 'radio') {
      if (!element.name) return element.checked;
      return Boolean(document.querySelector(`input[type="radio"][name="${cssAttr(element.name)}"]:checked`));
    }
    return Boolean(String(element.value || '').trim());
  }

  function readControlValue(element) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox') return element.checked ? element.value || 'on' : '';
    if (type === 'radio') {
      const checked = element.name ? document.querySelector(`input[type="radio"][name="${cssAttr(element.name)}"]:checked`) : element.checked ? element : null;
      return checked?.value || '';
    }
    if (element.tagName === 'SELECT') return element.value || '';
    return element.value || '';
  }

  function verifyFilled(element, value) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox') {
      const desired = booleanFromValue(value);
      return desired === null ? element.checked || optionText(element).includes(root.utils.norm(value)) : element.checked === desired;
    }
    if (type === 'radio') {
      const current = readControlValue(element);
      const normalizedValue = root.utils.norm(value);
      return root.utils.norm(current).includes(normalizedValue) || optionText(document.querySelector(`input[type="radio"][name="${cssAttr(element.name)}"]:checked`) || element).includes(normalizedValue);
    }
    if (element.tagName === 'SELECT') {
      return selectValueMatches(element, value);
    }
    return String(element.value || '') === String(value);
  }

  function selectValueMatches(select, value) {
    const normalizedValue = root.utils.norm(value);
    const selected = select.selectedOptions?.[0];
    return root.utils.norm(select.value).includes(normalizedValue) || root.utils.norm(selected?.textContent || '').includes(normalizedValue);
  }

  function booleanFromValue(value) {
    const text = root.utils.norm(value);
    if (['true', 'yes', 'y', '1', 'on', 'checked', '是', '同意', '可以', '愿意'].includes(text)) return true;
    if (['false', 'no', 'n', '0', 'off', '否', '不同意', '不可以', '不愿意'].includes(text)) return false;
    return null;
  }

  function optionText(element) {
    if (!element) return '';
    return root.utils.norm([element.value, root.scanner.textAround(element)].filter(Boolean).join(' '));
  }

  function selectorForResult(step, element) {
    return step.selector || step.scannedField?.selector || selectorForElement(element) || describeControl(element, step.field);
  }

  function selectorForElement(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    if (element.name) return `${element.tagName.toLowerCase()}[name="${cssAttr(element.name)}"]`;
    return '';
  }

  function highlightControl(element, status) {
    injectHighlightStyles();
    const className = status === 'filled' ? 'jobpilot-fill-success' : status === 'skipped' || status === 'needs_confirmation' ? 'jobpilot-fill-warning' : 'jobpilot-fill-error';
    const targets = radioGroupFor(element);
    targets.forEach((target) => {
      target.classList.remove('jobpilot-fill-success', 'jobpilot-fill-warning', 'jobpilot-fill-error', 'jobpilot-fill-focus');
      target.classList.add(className);
    });
  }

  function focusControl(selector) {
    const element = findBySelector(selector);
    if (!element) return false;
    injectHighlightStyles();
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    element.focus?.({ preventScroll: true });
    radioGroupFor(element).forEach((target) => {
      target.classList.add('jobpilot-fill-focus');
      window.setTimeout(() => target.classList.remove('jobpilot-fill-focus'), 1800);
    });
    return true;
  }

  function findBySelector(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (_error) {
      return null;
    }
  }

  function radioGroupFor(element) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type !== 'radio' || !element.name) return [element];
    return Array.from(document.querySelectorAll(`input[type="radio"][name="${cssAttr(element.name)}"]`));
  }

  function resultFor(step, patch) {
    return {
      step: step.step,
      id: step.id,
      field: step.field || step.canonicalField || step.scannedField?.label || step.scannedField?.name || '字段',
      canonicalField: step.canonicalField || step.field || '',
      confidence: step.confidence || '',
      matchSource: step.matchSource || '',
      riskLevel: step.riskLevel || '',
      selector: patch.selector || step.selector || step.scannedField?.selector || '',
      ...patch,
    };
  }

  function summarizeResults(results = []) {
    return {
      success: results.filter((item) => item.status === 'filled').length,
      skipped: results.filter((item) => ['skipped', 'manual', 'needs_confirmation'].includes(item.status)).length,
      failed: results.filter((item) => ['error', 'not_found'].includes(item.status)).length,
    };
  }

  function injectHighlightStyles() {
    if (document.getElementById('jobpilot-autofill-highlight-style')) return;
    const style = document.createElement('style');
    style.id = 'jobpilot-autofill-highlight-style';
    style.textContent = `
      .jobpilot-fill-success { outline: 3px solid #18b487 !important; outline-offset: 2px !important; }
      .jobpilot-fill-warning { outline: 3px solid #f6c350 !important; outline-offset: 2px !important; }
      .jobpilot-fill-error { outline: 3px solid #e45858 !important; outline-offset: 2px !important; }
      .jobpilot-fill-focus { box-shadow: 0 0 0 6px rgba(24, 180, 135, 0.22) !important; }
    `;
    document.documentElement.appendChild(style);
  }

  function cssAttr(value = '') {
    return CSS.escape(String(value));
  }

  root.filler = {
    dateControlsForStep,
    describeControl,
    fillControl,
    fillDateStep,
    fillSteps,
    fillStepsScoped,
    focusControl,
    performFill,
    parseDateParts,
    summarizeResults,
    selectOption,
    setValue,
  };
})();
