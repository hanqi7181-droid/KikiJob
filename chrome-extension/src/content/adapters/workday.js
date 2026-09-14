(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.workday = root.adapterFactory.createGenericAdapter({
    id: 'workday',
    name: 'Workday',
    platform: 'workday',
    hostPatterns: [/(^|\.)myworkdayjobs\.com$/i, /(^|\.)workdayjobs\.com$/i, /(^|\.)workday\.com$/i],
    urlPatterns: [/myworkdayjobs|workday/i],
    internalFieldPattern: /csrf|token|captcha|verification|password/i,
  });
})();
