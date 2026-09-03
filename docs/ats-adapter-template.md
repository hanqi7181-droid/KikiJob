# JobPilot ATS Adapter Template

Each ATS adapter should register itself on `window.JobPilotAutofill.adapters`.

```js
(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.example = {
    id: 'example',
    name: 'Example ATS',

    detect(url = location.href) {
      return /example\.com/i.test(url);
    },

    scanFields() {
      return root.scanner.scanFields(this).map((field) => this.normalizeField(field));
    },

    normalizeField(field) {
      return {
        ...field,
        adapterName: this.name,
        platform: this.id,
      };
    },

    fillField({ target, value, step, fallback }) {
      return fallback(target, value, step);
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
        reason: 'No success state detected',
      };
    },
  };
})();
```

Adapter rules:
- Keep ATS-specific selectors and component behavior inside the adapter.
- Use `fallback` for standard input, textarea, select, checkbox, and radio fields.
- Never click submit, next, or save-and-submit buttons from an adapter.
- Return low confidence when success state is ambiguous.
