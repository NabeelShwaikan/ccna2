(function(){
  'use strict';

  const subjectsEl = document.getElementById('subjects');
  const exportNotesBtn = document.getElementById('exportNotesBtn');
  const importNotesBtn = document.getElementById('importNotesBtn');
  const importNotesFile = document.getElementById('importNotesFile');
  const notesCount = document.getElementById('notesCount');
  const backupStatus = document.getElementById('backupStatus');

  const {
    escapeHtml,
    initTheme,
    fetchJson,
    hasLocalStorage,
    getAllStudentNotes,
    countStudentNotes,
    replaceStudentNotes
  } = window.CiscoApp;

  const BACKUP_TYPE = 'cisco-student-notes-backup';
  const BACKUP_VERSION = 1;
  const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

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

  function setBackupStatus(message,type=''){
    backupStatus.textContent = message;
    backupStatus.className = `backup-status${type ? ` ${type}` : ''}`;
  }

  function refreshNotesCount(){
    if(!hasLocalStorage()){
      notesCount.textContent = 'الحفظ المحلي غير متاح في هذا المتصفح.';
      exportNotesBtn.disabled = true;
      importNotesBtn.disabled = true;
      return;
    }

    const count = countStudentNotes();
    notesCount.textContent = count === 0
      ? 'لا توجد ملاحظات محفوظة حاليًا.'
      : `الملاحظات المحفوظة: ${count}`;
    exportNotesBtn.disabled = count === 0;
    importNotesBtn.disabled = false;
  }

  function downloadJson(filename,data){
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),0);
  }

  function exportNotes(){
    const notes = getAllStudentNotes();
    const count = countStudentNotes(notes);

    if(!count){
      setBackupStatus('لا توجد ملاحظات محفوظة لتصديرها.','warning');
      refreshNotesCount();
      return;
    }

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g,'-');
    const backup = {
      type: BACKUP_TYPE,
      schema_version: BACKUP_VERSION,
      exported_at: now.toISOString(),
      notes
    };

    downloadJson(`cisco-student-notes-${stamp}.json`,backup);
    setBackupStatus(`تم تجهيز نسخة احتياطية تحتوي على ${count} ملاحظة.`,'success');
  }

  function validateBackup(payload){
    if(!payload || typeof payload !== 'object' || Array.isArray(payload)){
      throw new Error('صيغة الملف غير صحيحة.');
    }
    if(payload.type !== BACKUP_TYPE || payload.schema_version !== BACKUP_VERSION){
      throw new Error('الملف ليس نسخة ملاحظات معتمدة لهذا الموقع.');
    }
    if(!payload.notes || typeof payload.notes !== 'object' || Array.isArray(payload.notes)){
      throw new Error('ملف النسخة الاحتياطية لا يحتوي على ملاحظات صالحة.');
    }

    const normalized = {};
    let count = 0;

    Object.entries(payload.notes).forEach(([topicId,sections]) => {
      if(!topicId || !sections || typeof sections !== 'object' || Array.isArray(sections)) return;
      Object.entries(sections).forEach(([sectionId,text]) => {
        if(!sectionId || typeof text !== 'string' || !text.trim()) return;
        if(text.length > 50000) throw new Error('إحدى الملاحظات أكبر من الحد المسموح.');
        if(!normalized[topicId]) normalized[topicId] = {};
        normalized[topicId][sectionId] = text;
        count++;
      });
    });

    return {notes:normalized,count};
  }

  async function importNotes(file){
    if(!file) return;
    if(file.size > MAX_BACKUP_BYTES){
      setBackupStatus('ملف النسخة الاحتياطية كبير جدًا.','error');
      return;
    }

    try{
      const text = await file.text();
      const payload = JSON.parse(text);
      const validated = validateBackup(payload);

      const confirmed = window.confirm(
        `سيتم استبدال الملاحظات الحالية بالملاحظات الموجودة في النسخة الاحتياطية (${validated.count}). هل تريد المتابعة؟`
      );
      if(!confirmed){
        setBackupStatus('تم إلغاء الاستعادة.');
        return;
      }

      const result = replaceStudentNotes(validated.notes);
      if(!result.ok) throw new Error('تعذر الكتابة إلى التخزين المحلي.');

      setBackupStatus(`تمت استعادة ${result.count} ملاحظة بنجاح.`,'success');
      refreshNotesCount();
    }catch(error){
      setBackupStatus(error.message || 'تعذر استعادة النسخة الاحتياطية.','error');
    }finally{
      importNotesFile.value = '';
    }
  }

  async function init(){
    refreshNotesCount();

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

  exportNotesBtn.addEventListener('click', exportNotes);
  importNotesBtn.addEventListener('click', () => importNotesFile.click());
  importNotesFile.addEventListener('change', () => importNotes(importNotesFile.files && importNotesFile.files[0]));

  window.addEventListener('storage', refreshNotesCount);

  init();
})();
