(() => {
  const root = document.documentElement;
  const key = 'ccna2-theme';
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const readSavedTheme = () => {
    try {
      const saved = localStorage.getItem(key);
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch (_) {
      return null;
    }
  };

  const systemTheme = () => (media && media.matches ? 'dark' : 'light');

  const updateButton = (theme) => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const isDark = theme === 'dark';
    btn.textContent = isDark ? '☀' : '☾';
    btn.setAttribute('aria-label', isDark ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن');
    btn.setAttribute('title', isDark ? 'المظهر الفاتح' : 'المظهر الداكن');
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  };

  const applyTheme = (theme, persist = false) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    updateButton(theme);

    if (persist) {
      try {
        localStorage.setItem(key, theme);
      } catch (_) {
        // The theme still works for the current page if storage is unavailable.
      }
    }
  };

  // Always resolve an explicit initial theme. This fixes the old behaviour
  // where the first click could set the same visual theme and appear to do nothing.
  applyTheme(readSavedTheme() || systemTheme());

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Follow OS changes only until the user explicitly chooses a theme.
  if (media) {
    const handleSystemThemeChange = (event) => {
      if (!readSavedTheme()) applyTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleSystemThemeChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handleSystemThemeChange);
    }
  }


  const simplifyQuizCopy = () => {
    if (!document.body || !document.body.hasAttribute('data-section')) return;

    const renameLabel = (forId, text) => {
      const el = document.querySelector(`label[for="${forId}"]`);
      if (el) el.textContent = text;
    };

    renameLabel('topicFilter', 'الموضوع');
    renameLabel('skillFilter', 'المهارة');

    const mode = document.getElementById('modeSelect');
    if (mode) {
      const review = mode.querySelector('option[value="review"]');
      const exam = mode.querySelector('option[value="exam"]');
      if (review) review.textContent = 'مراجعة';
      if (exam) exam.textContent = 'اختبار';
    }

    const settingsTitle = document.querySelector('.settings h2');
    if (settingsTitle) settingsTitle.textContent = 'الإعدادات';

    const reset = document.getElementById('resetBtn');
    if (reset) reset.textContent = 'إعادة ضبط التقدم';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', simplifyQuizCopy, { once: true });
  } else {
    simplifyQuizCopy();
  }
})();
