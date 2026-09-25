(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('ccna2-theme');
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;

  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('ccna2-theme', next);
  });
})();
