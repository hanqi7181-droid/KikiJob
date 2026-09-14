(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.lever = root.adapterFactory.createGenericAdapter({
    id: 'lever',
    name: 'Lever',
    platform: 'lever',
    hostPatterns: [/(^|\.)lever\.co$/i],
    urlPatterns: [/jobs\.lever\.co|lever/i],
    internalFieldPattern: /csrf|token|captcha|verification|password/i,
  });
})();
