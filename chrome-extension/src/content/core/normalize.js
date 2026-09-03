(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  root.utils = {
    norm(value = '') {
      return String(value).toLowerCase().replace(/[\s/_\-:：*（）()[\]{}]+/g, '');
    },
  };
})();
