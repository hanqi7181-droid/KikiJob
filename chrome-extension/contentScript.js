(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  if (root.messageListenerReady) return;
  root.messageListenerReady = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const adapter = root.registry?.getAdapter?.() || root.adapters?.generic;

    if (message?.type === 'AUTO_CV_SCAN_FIELDS') {
      ensureObserved(adapter);
      sendResponse({
        ok: true,
        url: location.href,
        adapter: adapter?.id || 'generic',
        successState: adapter?.detectSuccess?.() || null,
        fields: adapter?.scanFields?.() || [],
      });
      return true;
    }

    if (message?.type === 'AUTO_CV_FILL_STEPS') {
      Promise.resolve(adapter?.fillSteps?.(message.steps || []) || [])
        .then((results) => {
          root.dynamicForms?.noteFillResults?.(results, adapter);
          sendResponse({
            ok: true,
            url: location.href,
            adapter: adapter?.id || 'generic',
            summary: root.filler?.summarizeResults?.(results) || { success: 0, skipped: 0, failed: 0 },
            successState: adapter?.detectSuccess?.() || null,
            results,
          });
        })
        .catch((error) => {
          sendResponse({ ok: false, url: location.href, adapter: adapter?.id || 'generic', error: error.message, results: [] });
        });
      return true;
    }

    if (message?.type === 'AUTO_CV_FILL_ONE_FIELD') {
      const step = message.step || {};
      Promise.resolve(root.filler?.fillStepsScoped?.([step], adapter, document) || [])
        .then((results) => {
          root.dynamicForms?.noteFillResults?.(results, adapter);
          sendResponse({
            ok: true,
            url: location.href,
            adapter: adapter?.id || 'generic',
            summary: root.filler?.summarizeResults?.(results) || { success: 0, skipped: 0, failed: 0 },
            results,
          });
        })
        .catch((error) => {
          sendResponse({ ok: false, url: location.href, adapter: adapter?.id || 'generic', error: error.message, results: [] });
        });
      return true;
    }

    if (message?.type === 'AUTO_CV_FOCUS_FIELD') {
      sendResponse({
        ok: Boolean(root.filler?.focusControl?.(message.selector)),
        url: location.href,
      });
      return true;
    }

    if (message?.type === 'AUTO_CV_DETECT_SUCCESS') {
      sendResponse({
        ok: true,
        url: location.href,
        adapter: adapter?.id || 'generic',
        successState: adapter?.detectSuccess?.() || null,
      });
      return true;
    }

    if (message?.type === 'AUTO_CV_START_DYNAMIC_WATCH') {
      sendResponse({ ok: true, url: location.href, adapter: adapter?.id || 'generic', dynamic: root.dynamicForms?.start?.(adapter) || null });
      return true;
    }

    if (message?.type === 'AUTO_CV_STOP_DYNAMIC_WATCH') {
      sendResponse({ ok: true, url: location.href, adapter: adapter?.id || 'generic', dynamic: root.dynamicForms?.stop?.() || null });
      return true;
    }

    if (message?.type === 'AUTO_CV_DYNAMIC_STATUS') {
      sendResponse({ ok: true, url: location.href, adapter: adapter?.id || 'generic', dynamic: root.dynamicForms?.getStatus?.() || null });
      return true;
    }

    if (message?.type === 'AUTO_CV_EXPORT_MOKA_SCHEMA') {
      Promise.resolve(root.mokaGoldenSchema?.exportGoldenSchema?.({ probeComponents: Boolean(message.probeComponents) }))
        .then((result) => {
          sendResponse({
            ok: true,
            url: location.href,
            adapter: adapter?.id || 'generic',
            files: result?.files || [],
            summary: result?.summary || {},
          });
        })
        .catch((error) => {
          sendResponse({ ok: false, url: location.href, adapter: adapter?.id || 'generic', error: error.message });
        });
      return true;
    }

    return false;
  });

  function ensureObserved(adapter) {
    if (!adapter?.observeChanges) return;
    root.observedAdapters = root.observedAdapters || {};
    if (root.observedAdapters[adapter.id]) return;
    root.observedAdapters[adapter.id] = adapter.observeChanges(() => {});
  }
})();
