(() => {
  const key = 'tront.community.theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  let picker;

  function readPreference() {
    try { return localStorage.getItem(key); }
    catch { return root.dataset.theme; }
  }

  function commentTheme() {
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && system.matches);
    return dark ? 'dark_dimmed' : 'light';
  }

  function syncComments() {
    const frame = document.querySelector('iframe.giscus-frame');
    frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: commentTheme() } } }, 'https://giscus.app');
  }

  function apply(value) {
    if (value === 'dark' || value === 'light') root.dataset.theme = value;
    else delete root.dataset.theme;
    if (picker) picker.value = root.dataset.theme || 'system';
    syncComments();
  }

  // This script runs in the head so the first paint uses the saved palette.
  apply(readPreference());
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(readPreference());
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) apply(readPreference());
  });
  system.addEventListener('change', syncComments);

  document.addEventListener('DOMContentLoaded', () => {
    picker = document.getElementById('theme');
    picker.value = root.dataset.theme || 'system';
    picker.closest('label').hidden = false;
    picker.addEventListener('change', () => {
      apply(picker.value);
      try {
        if (picker.value === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, picker.value);
      } catch { /* The choice still applies to this page when storage is blocked. */ }
    });

    const comments = document.querySelector('.giscus[data-repo]');
    if (!comments) return;
    const client = document.createElement('script');
    client.src = 'https://giscus.app/client.js';
    client.crossOrigin = 'anonymous';
    Object.assign(client.dataset, comments.dataset, {theme:commentTheme()});
    document.addEventListener('load', event => {
      if (event.target.matches?.('iframe.giscus-frame')) syncComments();
    }, true);
    comments.after(client);
  });
})();
