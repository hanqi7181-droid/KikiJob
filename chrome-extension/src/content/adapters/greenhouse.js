(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.greenhouse = root.adapterFactory.createGenericAdapter({
    id: 'greenhouse',
    name: 'Greenhouse',
    platform: 'greenhouse',
    hostPatterns: [/(^|\.)greenhouse\.io$/i, /(^|\.)greenhouse\.com$/i],
    urlPatterns: [/greenhouse|boards\.greenhouse\.io/i],
    internalFieldPattern: /csrf|token|captcha|verification|password/i,
  });
})();
