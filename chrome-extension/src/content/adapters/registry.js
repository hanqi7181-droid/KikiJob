(() => {
  const root = (window.JobPilotAutofill = window.JobPilotAutofill || {});

  function getAdapter(url = location.href) {
    const adapters = [root.adapters?.moka, root.adapters?.generic].filter(Boolean);
    return adapters.find((adapter) => safelyDetect(adapter, url)) || root.adapters.generic;
  }

  function safelyDetect(adapter, url) {
    try {
      const detector = adapter.detect || adapter.matches;
      return Boolean(detector ? detector.call(adapter, url) : false);
    } catch (_error) {
      return false;
    }
  }

  root.registry = {
    getAdapter,
    safelyDetect,
  };
})();
