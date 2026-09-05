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
  const cache=new Map();
  let course=null, currentModule=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

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
    const sections=(m.sections||[]).map(sec=>`<section class="section" id="${esc(sec.id)}" data-title="${esc(sec.toc_title)}">
      <div class="section-top"><div class="num">${esc(sec.number)}</div><div><h3>${esc(sec.title)}</h3>${sec.subtitle?`<div class="sub">${esc(sec.subtitle)}</div>`:''}</div></div>
      ${sec.body_html||''}
    </section>`).join('');
    content.innerHTML=`<article class="unit">${moduleHeader(m)}${sections}</article>`;
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

  async function selectModule(meta){
    tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',Number(b.dataset.module)===meta.number));
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

  function buildTabs(modules){
    tabs.innerHTML=modules.map(m=>`<button class="tab" type="button" data-module="${m.number}">الوحدة ${m.number} · ${esc(m.title)}</button>`).join('');
    tabs.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>selectModule(modules.find(m=>m.number===Number(b.dataset.module)))));
  }

  tocToggle.addEventListener('click',()=>sidebar.classList.toggle('open'));

  async function init(){
    try{
      course=await getJSON('Lects/course.json');
      const group=course.groups[0];
      document.getElementById('groupTitle').textContent=group.title;
      buildTabs(group.modules);
      const requested=Number(new URL(location.href).searchParams.get('module'));
      const first=group.modules.find(m=>m.number===requested)||group.modules[0];
      await selectModule(first);
    }catch(err){
      content.innerHTML=`<div class="errorbox">تعذر تحميل هيكل المقرر. ${esc(err.message)}<br><small>تحتاج النسخة الرسمية إلى تشغيلها عبر HTTP/HTTPS لأن البيانات منفصلة في ملفات JSON.</small></div>`;
    }
  }
  init();
})();