(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  function start(adapter = {}) {
    stop();
    root.dynamicFormsState = {
      running: true,
      adapterId: adapter.id || 'generic',
      steps: [],
      filledSnapshots: root.dynamicFormsState?.filledSnapshots || {},
      timer: null,
      lastSignature: '',
      startedAt: new Date().toISOString(),
    };
    recordStep(adapter, 'initial');

    const observer = new MutationObserver((mutations) => {
      const hasFieldChange = mutations.some((mutation) =>
        Array.from(mutation.addedNodes || [])
          .concat(Array.from(mutation.removedNodes || []))
          .some((node) => node.nodeType === Node.ELEMENT_NODE && hasFormField(node))
      );
      if (!hasFieldChange) return;
      scheduleScan(adapter, 'mutation');
    });
    observer.observe(document.body, { childList: true, subtree: true });
    root.dynamicFormsState.observer = observer;
    window.addEventListener('pagehide', stop, { once: true });
    return getStatus();
  }

  function stop() {
    const state = root.dynamicFormsState;
    if (state?.observer) state.observer.disconnect();
    if (state?.timer) window.clearTimeout(state.timer);
    if (state) state.running = false;
    window.removeEventListener('pagehide', stop);
    return getStatus();
  }

  function scheduleScan(adapter, reason) {
    const state = root.dynamicFormsState;
    if (!state?.running) return;
    if (state.timer) window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => recordStep(adapter, reason), 450);
  }

  function recordStep(adapter = {}, reason = 'scan') {
    const state = root.dynamicFormsState;
    if (!state?.running) return null;
    const fields = adapter.scanFields ? adapter.scanFields() : root.scanner.scanFields(adapter);
    const signature = fields.map((field) => field.selector || field.fieldId || field.name || field.label).join('|');
    if (signature === state.lastSignature && reason !== 'initial') return state.steps[state.steps.length - 1] || null;
    state.lastSignature = signature;
    const lostFields = detectLostFilledValues(fields);
    const step = {
      stepIndex: state.steps.length + 1,
      reason,
      detectedAt: new Date().toISOString(),
      fieldCount: fields.length,
      matchedCount: fields.filter((field) => field.status === 'learned' || field.mappingSource || field.field || field.canonicalField).length,
      fillSuccessCount: 0,
      needsConfirmationCount: fields.filter((field) => field.status === 'needs_confirmation').length,
      failedCount: 0,
      lostFieldCount: lostFields.length,
      lostFields,
    };
    state.steps.push(step);
    return step;
  }

  function noteFillResults(results = [], adapter = {}) {
    const state = root.dynamicFormsState;
    if (!state?.running) return getStatus();
    const latest = state.steps[state.steps.length - 1] || recordStep(adapter, 'fill');
    latest.fillSuccessCount += results.filter((item) => item.status === 'filled').length;
    latest.needsConfirmationCount += results.filter((item) => item.status === 'needs_confirmation').length;
    latest.failedCount += results.filter((item) => ['error', 'not_found'].includes(item.status)).length;
    rememberFilledValues(results);
    return getStatus();
  }

  function rememberFilledValues(results = []) {
    const state = root.dynamicFormsState;
    if (!state) return;
    state.filledSnapshots = state.filledSnapshots || {};
    for (const result of results) {
      if (result.status !== 'filled' || !result.selector) continue;
      const element = find(result.selector);
      if (!element) continue;
      state.filledSnapshots[result.selector] = readValue(element);
    }
  }

  function detectLostFilledValues() {
    const state = root.dynamicFormsState;
    const lost = [];
    for (const [selector, value] of Object.entries(state?.filledSnapshots || {})) {
      const element = find(selector);
      if (element && value && !readValue(element)) {
        lost.push({ selector, expected: maskValue(value), reason: 'previously filled value is now empty after rerender' });
      }
    }
    return lost;
  }

  function getStatus() {
    const state = root.dynamicFormsState || {};
    return {
      running: Boolean(state.running),
      adapterId: state.adapterId || '',
      startedAt: state.startedAt || '',
      steps: state.steps || [],
    };
  }

  function hasFormField(node) {
    return Boolean(node.matches?.('input,textarea,select') || node.querySelector?.('input,textarea,select'));
  }

  function find(selector) {
    try {
      return document.querySelector(selector);
    } catch (_error) {
      return null;
    }
  }

  function readValue(element) {
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') return element.checked ? element.value || 'checked' : '';
    return element.value || '';
  }

  function maskValue(value = '') {
    const text = String(value);
    if (/@/.test(text)) return text.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    if (/^\d{7,}$/.test(text)) return `${text.slice(0, 3)}****${text.slice(-2)}`;
    return text.length > 12 ? `${text.slice(0, 4)}***` : text;
  }

  root.dynamicForms = {
    getStatus,
    noteFillResults,
    recordStep,
    start,
    stop,
  };
})();
