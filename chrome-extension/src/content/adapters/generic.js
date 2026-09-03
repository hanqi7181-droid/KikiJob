(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.generic = {
    id: 'generic',
    name: 'Generic Careers',
    detect() {
      return true;
    },
    matches() {
      return this.detect();
    },
    normalizeField(field) {
      return field;
    },
    scanFields() {
      return root.scanner.scanFields(this).map((field) => this.normalizeField(field));
    },
    fillField({ target, value }) {
      return root.filler.fillControl(target, value);
    },
    fillSteps(steps = []) {
      return root.filler.fillSteps(steps, this);
    },
    observeChanges(callback) {
      const observer = new MutationObserver(() => callback?.());
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    },
    detectSuccess() {
      return {
        success: false,
        confidence: '低',
        reason: 'generic adapter does not infer application success',
      };
    },
  };
})();
