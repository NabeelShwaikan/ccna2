(() => {
  const root=document.documentElement;
  const content=document.getElementById('content');
  const tabs=document.getElementById('moduleTabs');
  const toc=document.getElementById('toc');
  const tocCount=document.getElementById('tocCount');
  const sidebar=document.getElementById('sidebar');
  const tocToggle=document.getElementById('tocToggle');
  const themeButton=document.getElementById('themeButton');
  const classroomButton=document.getElementById('classroomButton');
  const groupTitle=document.getElementById('groupTitle');
  const groupMeta=document.getElementById('groupMeta');
  const cache=new Map();
  let course=null, currentModule=null, moduleEntries=[];
  const NOTE_PREFIX='cisco-theory-student-note::';
  const noteTimers=new Map();
  let storageAvailableCache;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function hasLocalStorage(){
    if(typeof storageAvailableCache==='boolean') return storageAvailableCache;
    try{
      const probe=`${NOTE_PREFIX}__probe__`;
      localStorage.setItem(probe,'1');
      localStorage.removeItem(probe);
      storageAvailableCache=true;
    }catch(_){ storageAvailableCache=false; }
    return storageAvailableCache;
  }

  function makeStudentNoteKey(moduleNumber,sectionId){
    return `${NOTE_PREFIX}${encodeURIComponent(String(moduleNumber))}::${encodeURIComponent(String(sectionId))}`;
  }

  function getStudentNote(moduleNumber,sectionId){
    if(!hasLocalStorage()) return '';
    try{return localStorage.getItem(makeStudentNoteKey(moduleNumber,sectionId))||''}catch(_){return ''}
  }

  function setStudentNote(moduleNumber,sectionId,text){
    if(!hasLocalStorage()) return false;
    try{
      const key=makeStudentNoteKey(moduleNumber,sectionId);
      const value=String(text??'');
      if(value.trim()) localStorage.setItem(key,value);
      else localStorage.removeItem(key);
      return true;
    }catch(_){return false}
  }

  function noteFieldId(moduleNumber,sectionId){
    return `student-note-${String(moduleNumber).replace(/[^a-zA-Z0-9_-]/g,'-')}-${String(sectionId).replace(/[^a-zA-Z0-9_-]/g,'-')}`;
  }

  function resizeStudentNote(textarea){
    textarea.style.height='auto';
    textarea.style.height=`${Math.max(76,Math.min(textarea.scrollHeight,260))}px`;
  }

  function updateStudentNoteStatus(statusEl,message,state=''){
    statusEl.textContent=message;
    statusEl.className=`student-note-status${state?` ${state}`:''}`;
  }

  function saveStudentNote(textarea,statusEl){
    const moduleNumber=textarea.dataset.noteModule;
    const sectionId=textarea.dataset.noteSection;
    if(!moduleNumber||!sectionId) return;
    const ok=setStudentNote(moduleNumber,sectionId,textarea.value);
    updateStudentNoteStatus(
      statusEl,
      ok?(textarea.value.trim()?'تم الحفظ ✓':'لا توجد ملاحظة'):'تعذر الحفظ المحلي',
      ok?'saved':'error'
    );
  }

  function flushStudentNotes(){
    content.querySelectorAll('.student-note-input').forEach(textarea=>{
      const timer=noteTimers.get(textarea);
      if(timer){clearTimeout(timer);noteTimers.delete(textarea)}
      const statusEl=textarea.closest('.student-note')?.querySelector('.student-note-status');
      if(statusEl) saveStudentNote(textarea,statusEl);
    });
  }

  function bindStudentNotes(){
    const storageReady=hasLocalStorage();
    content.querySelectorAll('.student-note-input').forEach(textarea=>{
      const moduleNumber=textarea.dataset.noteModule;
      const sectionId=textarea.dataset.noteSection;
      const statusEl=textarea.closest('.student-note')?.querySelector('.student-note-status');
      if(!moduleNumber||!sectionId||!statusEl) return;

      textarea.value=storageReady?getStudentNote(moduleNumber,sectionId):'';
      resizeStudentNote(textarea);

      if(!storageReady){
        textarea.disabled=true;
        updateStudentNoteStatus(statusEl,'الحفظ المحلي غير متاح','error');
        return;
      }

      updateStudentNoteStatus(
        statusEl,
        textarea.value.trim()?'محفوظة على هذا الجهاز':'تُحفظ تلقائيًا على هذا الجهاز',
        textarea.value.trim()?'saved':''
      );

      textarea.addEventListener('input',()=>{
        resizeStudentNote(textarea);
        updateStudentNoteStatus(statusEl,'جارٍ الحفظ…');
        const existing=noteTimers.get(textarea);
        if(existing) clearTimeout(existing);
        const timer=setTimeout(()=>{
          noteTimers.delete(textarea);
          saveStudentNote(textarea,statusEl);
        },350);
        noteTimers.set(textarea,timer);
      });

      textarea.addEventListener('blur',()=>{
        const existing=noteTimers.get(textarea);
        if(existing){clearTimeout(existing);noteTimers.delete(textarea)}
        saveStudentNote(textarea,statusEl);
      });
    });
  }

  function setTheme(theme){
    root.dataset.theme=theme;
    themeButton.textContent=theme==='dark'?'☀':'◐';
    themeButton.setAttribute('aria-label',theme==='dark'?'تفعيل الوضع الفاتح':'تفعيل الوضع الداكن');
    try{localStorage.setItem('cisco-theory-theme',theme)}catch(_){ }
  }
  setTheme((()=>{try{return localStorage.getItem('cisco-theory-theme')||'dark'}catch(_){return 'dark'}})());
  themeButton.addEventListener('click',()=>setTheme(root.dataset.theme==='dark'?'light':'dark'));

  function setClassroom(on){
    document.body.classList.toggle('classroom',on);
    classroomButton.classList.toggle('active',on);
    classroomButton.textContent=on?'إنهاء العرض':'وضع المحاضرة';
  }
  classroomButton.addEventListener('click',()=>setClassroom(!document.body.classList.contains('classroom')));

  window.toggleAnswer=function(btn){
    const quiz=btn.closest('.quiz'); if(!quiz)return;
    const ans=quiz.querySelector('.answer'); if(!ans)return;
    const open=ans.classList.toggle('show');
    btn.textContent=open?'إخفاء الإجابة':'اعرض الإجابة';
  };

  async function getJSON(path){
    if(cache.has(path)) return cache.get(path);
    const r=await fetch(path,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data=await r.json(); cache.set(path,data); return data;
  }

  function moduleHeader(m){
    const steps=(m.lecture?.steps||[]).map(s=>`<div class="lecture-step"><b>${esc(s.time)}</b><span>${esc(s.topic)}</span></div>`).join('');
    return `<section class="unit-head">
      <div class="unit-head-top"><div><h2>${esc(m.title)}</h2><p>${esc(m.summary)}</p></div><span class="unit-badge">${esc(m.title_en)}</span></div>
      <div class="module-objective"><strong>هدف الوحدة:</strong> ${esc(m.official_objective)}</div>
      <div class="lecture-path"><div class="lecture-path-title"><strong>مسار المحاضرة</strong><span>${esc(m.lecture?.duration||'')}</span></div><div class="lecture-strip">${steps}</div></div>
    </section>`;
  }

  function renderModule(m){
    currentModule=m;
    const sections=(m.sections||[]).map(sec=>{
      const fieldId=noteFieldId(m.module_number,sec.id);
      return `<section class="section" id="${esc(sec.id)}" data-title="${esc(sec.toc_title)}">
      <div class="section-top"><div class="num">${esc(sec.number)}</div><div><h3>${esc(sec.title)}</h3>${sec.subtitle?`<div class="sub">${esc(sec.subtitle)}</div>`:''}</div></div>
      ${sec.body_html||''}
      <div class="student-note study-detail">
        <div class="student-note-head">
          <label for="${esc(fieldId)}">ملاحظتي</label>
          <span class="student-note-status">تُحفظ تلقائيًا على هذا الجهاز</span>
        </div>
        <textarea class="student-note-input" id="${esc(fieldId)}" data-note-module="${esc(m.module_number)}" data-note-section="${esc(sec.id)}" rows="2" maxlength="50000" spellcheck="true" placeholder="اكتب شرحك أو ما تريد تذكره عن هذا الموضوع…"></textarea>
      </div>
    </section>`;
    }).join('');
    content.innerHTML=`<article class="unit">${moduleHeader(m)}${sections}</article>`;
    bindStudentNotes();
    renderTOC(m);
    attachObservers();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderTOC(m){
    toc.innerHTML=(m.sections||[]).map((s,i)=>`<button type="button" data-target="${esc(s.id)}" class="${i===0?'current':''}">${esc(s.toc_title)}</button>`).join('');
    tocCount.textContent=`${m.sections.length} أقسام`;
    toc.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      document.getElementById(b.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});
      if(innerWidth<=900) sidebar.classList.remove('open');
    }));
  }

  let observer;
  function attachObservers(){
    if(observer) observer.disconnect();
    const btns=[...toc.querySelectorAll('button')];
    const map=new Map(btns.map(b=>[b.dataset.target,b]));
    observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      btns.forEach(b=>b.classList.toggle('current',b===map.get(visible.target.id)));
    },{rootMargin:'-25% 0px -60% 0px',threshold:[0,.1,.4]});
    document.querySelectorAll('.section').forEach(s=>observer.observe(s));
  }

  function showGroup(group){
    groupTitle.textContent=group.title;
    if(groupMeta) groupMeta.textContent=group.meta||'';
  }

  async function selectModule(entry){
    flushStudentNotes();
    const {module:meta,group}=entry;
    tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',Number(b.dataset.module)===meta.number));
    showGroup(group);
    content.innerHTML='<div class="loading">جاري تحميل الوحدة…</div>';
    try{
      const data=await getJSON(meta.path);
      if(!data.review?.approved) throw new Error('بيانات الوحدة لم تعتمد بعد.');
      renderModule(data);
      const url=new URL(location.href); url.searchParams.set('module',meta.number); history.replaceState(null,'',url);
    }catch(err){
      content.innerHTML=`<div class="errorbox">تعذر تحميل بيانات الوحدة. ${esc(err.message)}<br><small>إذا فتحت الملف مباشرة من الجهاز، شغّله عبر خادم محلي أو من موقع المنصة.</small></div>`;
    }
  }

  function buildTabs(entries){
    tabs.innerHTML=entries.map(({module:m})=>`<button class="tab" type="button" data-module="${m.number}">الوحدة ${m.number} · ${esc(m.title)}</button>`).join('');
    tabs.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
      const entry=entries.find(e=>e.module.number===Number(b.dataset.module));
      if(entry) selectModule(entry);
    }));
  }

  tocToggle.addEventListener('click',()=>sidebar.classList.toggle('open'));
  window.addEventListener('beforeunload',flushStudentNotes);

  async function init(){
    try{
      course=await getJSON('Lects/course.json');
      moduleEntries=(course.groups||[]).flatMap(group=>(group.modules||[]).map(module=>({group,module})));
      if(!moduleEntries.length) throw new Error('لا توجد وحدات متاحة في هيكل المقرر.');
      buildTabs(moduleEntries);
      const requested=Number(new URL(location.href).searchParams.get('module'));
      const first=moduleEntries.find(e=>e.module.number===requested)||moduleEntries[0];
      await selectModule(first);
    }catch(err){
      content.innerHTML=`<div class="errorbox">تعذر تحميل هيكل المقرر. ${esc(err.message)}<br><small>تحتاج النسخة الرسمية إلى تشغيلها عبر HTTP/HTTPS لأن البيانات منفصلة في ملفات JSON.</small></div>`;
    }
  }
  init();
})();
