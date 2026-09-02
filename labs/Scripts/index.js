(function(){
  'use strict';

  const subjectsEl = document.getElementById('subjects');
  const {escapeHtml, initTheme, fetchJson} = window.CiscoApp;

  initTheme('themeBtn');

  function renderTopics(items){
    const sorted = [...items].sort((a,b) => (a.order || 0) - (b.order || 0));

    subjectsEl.innerHTML = sorted.map((topic,index) => {
      const ready = topic.status === 'ready';
      const statusText = ready ? 'متاح' : 'قيد الإعداد';
      const cardBody = `
        <div class="subject-top">
          <div class="subject-num" aria-hidden="true">${index + 1}</div>
          <div class="subject-title-wrap">
            <h3>${escapeHtml(topic.title)}</h3>
            <p>${escapeHtml(topic.short_description || '')}</p>
          </div>
        </div>
        <div class="subject-meta">
          <span class="status-badge ${ready ? 'ready' : ''}">${statusText}</span>
          ${ready ? '<span class="open-label">فتح الموضوع ←</span>' : ''}
        </div>`;

      if(ready){
        return `<a class="subject-card is-ready" href="Pages/topic.html?id=${encodeURIComponent(topic.id)}">${cardBody}</a>`;
      }

      return `<article class="subject-card is-planned" aria-disabled="true">${cardBody}</article>`;
    }).join('');
  }

  async function init(){
    try{
      const data = await fetchJson('Data/topics.json');
      renderTopics(Array.isArray(data.topics) ? data.topics : []);
    }catch(error){
      subjectsEl.innerHTML = `
        <div class="error-box">
          تعذر تحميل ملفات JSON. شغّل الموقع من خلال خادم محلي أو ارفعه إلى الاستضافة ثم افتح الصفحة من جديد.
        </div>`;
    }
  }

  init();
})();
