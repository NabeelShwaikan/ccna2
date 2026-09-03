(function(){
  'use strict';

  const THEME_KEY = 'cisco-interactive-theme';
  const NOTE_PREFIX = 'cisco-student-note::';
  let storageAvailableCache;

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g, char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#039;',
      '"':'&quot;'
    }[char]));
  }

  function hasLocalStorage(){
    if(typeof storageAvailableCache === 'boolean') return storageAvailableCache;

    try{
      const probe = `${NOTE_PREFIX}__probe__`;
      localStorage.setItem(probe,'1');
      localStorage.removeItem(probe);
      storageAvailableCache = true;
    }catch(error){
      storageAvailableCache = false;
    }

    return storageAvailableCache;
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

    if(hasLocalStorage()){
      try{
        savedTheme = localStorage.getItem(THEME_KEY);
      }catch(error){
        savedTheme = null;
      }
    }

    applyTheme(savedTheme === 'dark' ? 'dark' : 'light', button);

    if(button){
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next, button);
        if(hasLocalStorage()){
          try{
            localStorage.setItem(THEME_KEY, next);
          }catch(error){
            // يستمر تبديل المظهر حتى لو تعذر الحفظ المحلي.
          }
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

  function makeStudentNoteKey(topicId, sectionId){
    return `${NOTE_PREFIX}${encodeURIComponent(topicId)}::${encodeURIComponent(sectionId)}`;
  }

  function parseStudentNoteKey(key){
    if(!key.startsWith(NOTE_PREFIX)) return null;
    const value = key.slice(NOTE_PREFIX.length);
    const splitAt = value.indexOf('::');
    if(splitAt < 1) return null;

    try{
      return {
        topicId: decodeURIComponent(value.slice(0,splitAt)),
        sectionId: decodeURIComponent(value.slice(splitAt + 2))
      };
    }catch(error){
      return null;
    }
  }

  function getStudentNote(topicId, sectionId){
    if(!hasLocalStorage()) return '';
    try{
      return localStorage.getItem(makeStudentNoteKey(topicId,sectionId)) || '';
    }catch(error){
      return '';
    }
  }

  function setStudentNote(topicId, sectionId, text){
    if(!hasLocalStorage()) return false;

    try{
      const key = makeStudentNoteKey(topicId,sectionId);
      const value = String(text ?? '');
      if(value.trim()){
        localStorage.setItem(key,value);
      }else{
        localStorage.removeItem(key);
      }
      return true;
    }catch(error){
      return false;
    }
  }

  function getAllStudentNotes(){
    const notes = {};
    if(!hasLocalStorage()) return notes;

    try{
      for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if(!key) continue;
        const parsed = parseStudentNoteKey(key);
        if(!parsed) continue;

        const text = localStorage.getItem(key);
        if(typeof text !== 'string' || !text.trim()) continue;

        if(!notes[parsed.topicId]) notes[parsed.topicId] = {};
        notes[parsed.topicId][parsed.sectionId] = text;
      }
    }catch(error){
      return {};
    }

    return notes;
  }

  function countStudentNotes(notes = getAllStudentNotes()){
    return Object.values(notes).reduce((total,sections) => {
      if(!sections || typeof sections !== 'object' || Array.isArray(sections)) return total;
      return total + Object.values(sections).filter(text => typeof text === 'string' && text.trim()).length;
    },0);
  }

  function replaceStudentNotes(notes){
    if(!hasLocalStorage()) return {ok:false,count:0};

    const before = getAllStudentNotes();
    const keysToRemove = [];

    try{
      for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if(key && key.startsWith(NOTE_PREFIX)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      let count = 0;
      Object.entries(notes || {}).forEach(([topicId,sections]) => {
        if(!sections || typeof sections !== 'object' || Array.isArray(sections)) return;
        Object.entries(sections).forEach(([sectionId,text]) => {
          if(typeof text !== 'string' || !text.trim()) return;
          localStorage.setItem(makeStudentNoteKey(topicId,sectionId),text);
          count++;
        });
      });

      return {ok:true,count};
    }catch(error){
      try{
        const rollbackKeys = [];
        for(let i=0;i<localStorage.length;i++){
          const key = localStorage.key(i);
          if(key && key.startsWith(NOTE_PREFIX)) rollbackKeys.push(key);
        }
        rollbackKeys.forEach(key => localStorage.removeItem(key));
        Object.entries(before).forEach(([topicId,sections]) => {
          Object.entries(sections).forEach(([sectionId,text]) => {
            localStorage.setItem(makeStudentNoteKey(topicId,sectionId),text);
          });
        });
      }catch(rollbackError){
        // إذا فشل الاسترجاع أيضًا، نترك المتصفح في حالته المتاحة ونبلغ الواجهة بالفشل.
      }
      return {ok:false,count:0};
    }
  }

  window.CiscoApp = {
    escapeHtml,
    initTheme,
    fetchJson,
    hasLocalStorage,
    getStudentNote,
    setStudentNote,
    getAllStudentNotes,
    countStudentNotes,
    replaceStudentNotes
  };
})();
