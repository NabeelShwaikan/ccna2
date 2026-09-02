(function(){
  'use strict';

  const THEME_KEY = 'cisco-interactive-theme';

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g, char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#039;',
      '"':'&quot;'
    }[char]));
  }

  function applyTheme(theme, button){
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';

    if(button){
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
      button.title = dark ? 'الوضع الفاتح' : 'الوضع الداكن';
      button.textContent = dark ? '☀' : '◐';
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if(themeColor){
      themeColor.setAttribute('content', dark ? '#0E1522' : '#F6F8FB');
    }
  }

  function initTheme(buttonId){
    const button = document.getElementById(buttonId);
    let savedTheme = null;

    try{
      savedTheme = localStorage.getItem(THEME_KEY);
    }catch(error){
      savedTheme = null;
    }

    applyTheme(savedTheme === 'dark' ? 'dark' : 'light', button);

    if(button){
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next, button);
        try{
          localStorage.setItem(THEME_KEY, next);
        }catch(error){
          // يستمر تبديل المظهر حتى لو تعذر الحفظ المحلي.
        }
      });
    }
  }

  async function fetchJson(path){
    const response = await fetch(path, {cache:'no-store'});
    if(!response.ok){
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  window.CiscoApp = {
    escapeHtml,
    initTheme,
    fetchJson
  };
})();
