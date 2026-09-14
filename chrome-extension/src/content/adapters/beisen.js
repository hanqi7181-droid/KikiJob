(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.beisen = root.adapterFactory.createGenericAdapter({
    id: 'beisen',
    name: 'Beisen 北森',
    platform: 'beisen',
    hostPatterns: [/(^|\.)italent\.cn$/i, /(^|\.)beisen\.com$/i],
    urlPatterns: [/beisen|italent/i],
    internalFieldPattern: /csrf|token|captcha|验证码|password|密码/i,
  });
})();
