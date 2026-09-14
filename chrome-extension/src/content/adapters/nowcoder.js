(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});
  root.adapters = root.adapters || {};

  root.adapters.nowcoder = root.adapterFactory.createGenericAdapter({
    id: 'nowcoder',
    name: 'Nowcoder 牛客',
    platform: 'nowcoder',
    hostPatterns: [/(^|\.)nowcoder\.com$/i],
    urlPatterns: [/nowcoder|牛客/i],
    internalFieldPattern: /csrf|token|captcha|验证码|password|密码/i,
  });
})();
