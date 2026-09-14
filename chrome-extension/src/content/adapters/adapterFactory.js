(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  function createGenericAdapter(config = {}) {
    const {
      id,
      name,
      platform = id,
      hostPatterns = [],
      urlPatterns = [],
      internalFieldPattern = null,
      detectExtra = null,
    } = config;

    function detect(url = location.href) {
      const textUrl = String(url || '');
      let parsed = null;
      try {
        parsed = new URL(textUrl, location.href);
      } catch (_error) {
        parsed = null;
      }
      const host = parsed?.hostname || textUrl;
      const hostMatched = hostPatterns.some((pattern) => pattern.test(host));
      const urlMatched = urlPatterns.some((pattern) => pattern.test(textUrl));
      return Boolean(hostMatched || urlMatched || detectExtra?.({ url: textUrl, host, parsed }));
    }

    function normalizeField(field = {}) {
      return {
        ...field,
        adapterName: name,
        platform,
      };
    }

    function scanFields() {
      return root.scanner.scanFields(this).map((field) => this.normalizeField(field));
    }

    function fillField({ target, value }) {
      return root.filler.fillControl(target, value);
    }

    function fillSteps(steps = []) {
      return root.filler.fillSteps(steps, this);
    }

    function isInternalField(element) {
      if (!internalFieldPattern) return false;
      const target = element.querySelector?.('input,textarea,select') || element;
      const text = [
        target.name,
        target.id,
        target.placeholder,
        target.getAttribute?.('aria-label'),
        target.getAttribute?.('data-name'),
        element.innerText,
      ]
        .filter(Boolean)
        .join(' ');
      return internalFieldPattern.test(text);
    }

    function detectSuccess() {
      const text = document.body?.innerText || '';
      const success = /投递成功|申请成功|提交成功|已投递|successfully submitted|application submitted/i.test(text);
      return {
        success,
        confidence: success ? '中' : '低',
        reason: success ? `${name} 页面出现成功状态文案` : `${name} adapter 未检测到明确成功状态`,
      };
    }

    function observeChanges(callback) {
      const observer = new MutationObserver(() => callback?.({ adapter: id }));
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    return {
      id,
      name,
      platform,
      detect,
      matches: detect,
      normalizeField,
      scanFields,
      fillField,
      fillSteps,
      isInternalField,
      detectSuccess,
      observeChanges,
    };
  }

  root.adapterFactory = {
    createGenericAdapter,
  };
})();
