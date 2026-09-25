(() => {
  'use strict';

  const page = document.body;
  const dataUrl = page.dataset.source;
  const storagePrefix = 'ccna2-review-v1.1';
  const state = {
    section: null,
    bank: [],
    selected: [],
    answers: new Map(),
    checked: new Set(),
    flagged: new Set(),
    current: 0,
    mode: 'review',
    display: 'single'
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    title: $('sectionTitle'), subtitle: $('sectionSubtitle'), topic: $('topicFilter'), difficulty: $('difficultyFilter'),
    skill: $('skillFilter'), mode: $('modeSelect'), display: $('displaySelect'), count: $('countSelect'), start: $('startBtn'),
    reset: $('resetBtn'), content: $('quizContent')
  };

  const shuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const unique = (items) => [...new Set(items.filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'en'));

  function safeText(value) { return value == null ? '' : String(value); }
  function slug(value) { return safeText(value).replace(/[^a-zA-Z0-9_-]/g, '_'); }

  async function load() {
    try {
      const res = await fetch(dataUrl, {cache:'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.section = data.section || {};
      state.bank = Array.isArray(data.questions) ? data.questions.filter(q => (q.status || 'approved').toLowerCase() === 'approved') : [];
      applySectionMeta();
      populateFilters();
      renderWelcome();
    } catch (err) {
      renderError(`تعذر تحميل ملف البيانات: ${err.message}`);
    }
  }

  function applySectionMeta() {
    if (state.section.title) els.title.textContent = state.section.title;
    if (state.section.description) els.subtitle.textContent = state.section.description;
    document.title = `${state.section.title || 'CCNA2 Review'} | CCNA2`;
  }

  function fillSelect(select, values, firstLabel) {
    select.innerHTML = '';
    const all = document.createElement('option'); all.value = ''; all.textContent = firstLabel; select.append(all);
    values.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; select.append(o); });
  }

  function populateFilters() {
    fillSelect(els.topic, unique(state.bank.map(q => q.topic)), 'كل الموضوعات');
    fillSelect(els.difficulty, unique(state.bank.map(q => q.difficulty)), 'كل المستويات');
    fillSelect(els.skill, unique(state.bank.map(q => q.skill)), 'كل المهارات');
    els.start.disabled = state.bank.length === 0;
    [els.topic, els.difficulty, els.skill, els.mode, els.display, els.count].forEach(x => x.disabled = state.bank.length === 0);
  }

  function renderWelcome() {
    if (!state.bank.length) {
      els.content.innerHTML = `<div class="empty-state"><div class="box"><div class="mark">◇</div><h2>القسم جاهز لاستقبال بنك الأسئلة</h2><p>ملف JSON الخاص بهذا القسم موجود لكنه فارغ حاليًا.</p><p>عند إضافة الأسئلة المعتمدة ستظهر أدوات المراجعة والاختبار تلقائيًا دون تعديل المحرك.</p></div></div>`;
      return;
    }
    els.content.innerHTML = `<div class="empty-state"><div class="box"><div class="mark">✓</div><h2>${state.bank.length} سؤالًا معتمدًا متاحًا</h2><p>اختر إعداداتك من اللوحة ثم ابدأ المراجعة أو الاختبار.</p></div></div>`;
  }

  function renderError(message) {
    els.content.innerHTML = `<div class="empty-state"><div class="box"><div class="mark">!</div><h2>تعذر فتح القسم</h2><p>${safeText(message)}</p></div></div>`;
  }

  function filteredBank() {
    return state.bank.filter(q => (!els.topic.value || q.topic === els.topic.value) && (!els.difficulty.value || q.difficulty === els.difficulty.value) && (!els.skill.value || q.skill === els.skill.value));
  }

  function weightedPick(pool, requested) {
    if (requested >= pool.length) return shuffle(pool);
    const groups = new Map();
    pool.forEach(q => {
      const key = `${q.topic || 'General'}|${q.difficulty || 'General'}|${q.skill || 'General'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(q);
    });
    const queues = [...groups.values()].map(shuffle);
    const result = [];
    while (result.length < requested && queues.some(q => q.length)) {
      for (const queue of shuffle(queues)) {
        if (queue.length && result.length < requested) result.push(queue.pop());
      }
    }
    return shuffle(result);
  }

  function startQuiz() {
    const pool = filteredBank();
    if (!pool.length) return renderError('لا توجد أسئلة تطابق عوامل التصفية الحالية.');
    state.mode = els.mode.value;
    state.display = els.display.value;
    const requested = state.display === 'all' ? pool.length : Math.min(Number(els.count.value || 10), pool.length);
    state.selected = weightedPick(pool, requested);
    state.answers.clear(); state.checked.clear(); state.flagged.clear(); state.current = 0;
    renderQuiz();
  }

  function renderQuiz() {
    els.content.innerHTML = '';
    const toolbar = document.createElement('div'); toolbar.className = 'quiz-toolbar';
    const progress = document.createElement('div'); progress.className = 'progress-wrap';
    progress.innerHTML = `<div class="progress-track"><div class="progress-bar" id="progressBar"></div></div><div class="progress-text" id="progressText"></div>`;
    const finish = document.createElement('button'); finish.className = 'small-btn primary'; finish.type = 'button'; finish.textContent = 'إنهاء المحاولة'; finish.addEventListener('click', finishQuiz);
    toolbar.append(progress, finish); els.content.append(toolbar);

    if (state.display === 'single') renderSingle();
    else state.selected.forEach((q, i) => els.content.append(renderQuestion(q, i)));
    updateProgress();
  }

  function renderSingle() {
    [...els.content.querySelectorAll('.question-card,.single-nav')].forEach(n => n.remove());
    const q = state.selected[state.current];
    els.content.append(renderQuestion(q, state.current));
    const nav = document.createElement('div'); nav.className = 'single-nav question-actions';
    const prev = button('السابق', false, () => { if (state.current > 0) { state.current--; renderSingle(); updateProgress(); }}); prev.disabled = state.current === 0;
    const next = button('التالي', true, () => { if (state.current < state.selected.length - 1) { state.current++; renderSingle(); updateProgress(); }}); next.disabled = state.current === state.selected.length - 1;
    nav.append(prev, next); els.content.append(nav);
  }

  function button(label, primary, handler) {
    const b = document.createElement('button'); b.type='button'; b.className = `small-btn${primary?' primary':''}`; b.textContent=label; b.addEventListener('click',handler); return b;
  }

  function renderQuestion(q, index) {
    const card = document.createElement('article'); card.className='question-card'; card.dataset.qid=q.id;
    const meta = document.createElement('div'); meta.className='question-meta';
    [q.topic,q.difficulty,q.skill].filter(Boolean).forEach(v => { const s=document.createElement('span'); s.className='tag'; s.textContent=v; meta.append(s); });
    const title = document.createElement('div'); title.className='question-text'; title.textContent = `${index+1}. ${safeText(q.question)}`;
    card.append(meta,title);

    const support = q.cliOutput || q.configuration || q.scenario || q.support;
    if (support) { const pre=document.createElement('pre'); pre.className='support-block'; pre.textContent=safeText(support); card.append(pre); }

    card.append(renderResponseControl(q));
    const actions = document.createElement('div'); actions.className='question-actions';
    const flag = button('☆ مراجعة لاحقًا', false, () => { state.flagged.has(q.id) ? state.flagged.delete(q.id) : state.flagged.add(q.id); flag.textContent = state.flagged.has(q.id) ? '★ محدد للمراجعة' : '☆ مراجعة لاحقًا'; saveProgress(); });
    actions.append(flag);
    if (state.mode === 'review') actions.append(button('تحقق من الإجابة', true, () => checkOne(q, card)));
    card.append(actions);
    return card;
  }

  function renderResponseControl(q) {
    const wrap = document.createElement('div');
    const type = String(q.type || 'single').toLowerCase();
    if (type === 'matching') return renderMatching(q);
    if (type === 'ordering') return renderOrdering(q);

    const options = Array.isArray(q.options) ? [...q.options] : (type === 'true_false' ? ['صح','خطأ'] : []);
    wrap.className='options';
    const inputType = type === 'multiple' ? 'checkbox' : 'radio';
    const randomized = q.shuffleOptions === false ? options : shuffle(options);
    randomized.forEach((opt, i) => {
      const label=document.createElement('label'); label.className='option';
      const input=document.createElement('input'); input.type=inputType; input.name=`q_${slug(q.id)}`; input.value=safeText(opt); input.addEventListener('change',()=>captureAnswer(q,wrap));
      const span=document.createElement('span'); span.textContent=safeText(opt); label.append(input,span); wrap.append(label);
    });
    return wrap;
  }

  function captureAnswer(q, wrap) {
    const checked=[...wrap.querySelectorAll('input:checked')].map(i=>i.value);
    state.answers.set(q.id, String(q.type).toLowerCase()==='multiple' ? checked : checked[0]);
    updateProgress(); saveProgress();
  }

  function renderMatching(q) {
    const wrap=document.createElement('div'); wrap.className='match-grid';
    const leftCol=document.createElement('div'); leftCol.className='match-col';
    const rightCol=document.createElement('div'); rightCol.className='match-col';
    const pairs=Array.isArray(q.pairs)?q.pairs:[];
    const lefts=shuffle(pairs.map((p,i)=>({id:p.id || `p${i}`,text:p.left})));
    const rights=shuffle(pairs.map((p,i)=>({id:p.id || `p${i}`,text:p.right})));
    let selectedLeft=null;
    lefts.forEach(item=>{
      const d=document.createElement('div'); d.className='draggable'; d.draggable=true; d.dataset.pair=item.id; d.textContent=safeText(item.text);
      d.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',item.id));
      d.addEventListener('click',()=>{ leftCol.querySelectorAll('.draggable').forEach(x=>x.classList.remove('selected')); selectedLeft=item.id; d.classList.add('selected'); });
      leftCol.append(d);
    });
    rights.forEach(item=>{
      const z=document.createElement('div'); z.className='dropzone'; z.dataset.right=item.id;
      const label=document.createElement('span'); label.className='drop-label'; label.textContent=safeText(item.text);
      const answer=document.createElement('span'); answer.className='drop-answer'; answer.textContent='—'; z.append(label,answer);
      const assign=(leftId)=>{ if(!leftId)return; wrap.querySelectorAll('.dropzone').forEach(x=>{ if(x.dataset.left===leftId){x.dataset.left='';x.querySelector('.drop-answer').textContent='—';}}); z.dataset.left=leftId; const source=leftCol.querySelector(`[data-pair="${CSS.escape(leftId)}"]`); answer.textContent=source?source.textContent:leftId; state.answers.set(q.id,[...wrap.querySelectorAll('.dropzone')].map(x=>({left:x.dataset.left||'',right:x.dataset.right}))); updateProgress(); saveProgress(); };
      z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('over')}); z.addEventListener('dragleave',()=>z.classList.remove('over'));
      z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('over');assign(e.dataTransfer.getData('text/plain'))});
      z.addEventListener('click',()=>assign(selectedLeft)); rightCol.append(z);
    });
    wrap.append(leftCol,rightCol); return wrap;
  }

  function renderOrdering(q) {
    const list=document.createElement('div'); list.className='order-list';
    const items=shuffle((q.items||[]).map((x,i)=>typeof x==='object'?x:{id:`i${i}`,text:x}));
    const sync=()=>{state.answers.set(q.id,[...list.children].map(x=>x.dataset.item));updateProgress();saveProgress();};
    items.forEach(item=>{
      const row=document.createElement('div'); row.className='order-item'; row.draggable=true; row.dataset.item=item.id;
      const h=document.createElement('span'); h.className='order-handle'; h.textContent='↕'; const t=document.createElement('span'); t.textContent=safeText(item.text);
      const controls=document.createElement('span'); controls.className='order-controls';
      const up=button('↑',false,()=>{const p=row.previousElementSibling;if(p){list.insertBefore(row,p);sync();}}); up.setAttribute('aria-label','تحريك لأعلى');
      const down=button('↓',false,()=>{const n=row.nextElementSibling;if(n){list.insertBefore(n,row);sync();}}); down.setAttribute('aria-label','تحريك لأسفل'); controls.append(up,down); row.append(h,t,controls);
      row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',item.id)}); row.addEventListener('dragover',e=>e.preventDefault()); row.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const dragged=list.querySelector(`[data-item="${CSS.escape(id)}"]`);if(dragged&&dragged!==row){list.insertBefore(dragged,row);sync();}});
      list.append(row);
    }); sync(); return list;
  }

  function normalizeAnswer(q, value) {
    if (String(q.type).toLowerCase()==='multiple') return [...(value||[])].map(String).sort();
    return value;
  }

  function isCorrect(q) {
    const given=state.answers.get(q.id); if (given == null) return false;
    const type=String(q.type||'single').toLowerCase();
    if(type==='matching') return (q.pairs||[]).every((p,i)=>{const id=p.id||`p${i}`;return (given||[]).some(x=>x.left===id&&x.right===id)});
    if(type==='ordering') { const target=(q.correctOrder || (q.items||[]).map((x,i)=>typeof x==='object'?x.id:`i${i}`)).map(String); return JSON.stringify((given||[]).map(String))===JSON.stringify(target); }
    const expected=normalizeAnswer(q,q.correctAnswer);
    const actual=normalizeAnswer(q,given);
    return JSON.stringify(actual)===JSON.stringify(expected);
  }

  function checkOne(q, card) {
    card.querySelector('.feedback')?.remove();
    const ok=isCorrect(q); state.checked.add(q.id);
    const fb=document.createElement('div'); fb.className=`feedback ${ok?'correct':'incorrect'}`;
    const strong=document.createElement('strong'); strong.textContent=ok?'✓ إجابة صحيحة':'✗ تحتاج مراجعة';
    const p=document.createElement('div'); p.textContent=safeText(q.explanation || 'لا يوجد شرح مضاف بعد.'); fb.append(strong,p); card.append(fb); saveProgress();
  }

  function updateProgress() {
    const answered=state.selected.filter(q=>state.answers.has(q.id)).length;
    const pct=state.selected.length?Math.round((answered/state.selected.length)*100):0;
    const bar=$('progressBar'), text=$('progressText'); if(bar)bar.style.width=`${pct}%`; if(text)text.textContent=`تمت الإجابة عن ${answered} من ${state.selected.length}`;
  }

  function finishQuiz() {
    const correct=state.selected.filter(isCorrect).length;
    const answered=state.selected.filter(q=>state.answers.has(q.id)).length;
    const total=state.selected.length, incorrect=answered-correct, unanswered=total-answered, pct=total?Math.round(correct/total*100):0;
    saveAttempt({correct,incorrect,unanswered,total,pct});
    renderResults({correct,incorrect,unanswered,total,pct});
  }

  function renderResults(r) {
    els.content.innerHTML='';
    const section=document.createElement('section'); section.className='result-section';
    const h=document.createElement('h2'); h.textContent='النتيجة النهائية'; section.append(h);
    const grid=document.createElement('div'); grid.className='result-grid';
    [['النسبة',`${r.pct}%`],['صحيح',r.correct],['خطأ',r.incorrect],['بدون إجابة',r.unanswered]].forEach(([label,val])=>{const m=document.createElement('div');m.className='metric';m.innerHTML=`<strong>${val}</strong><span>${label}</span>`;grid.append(m)}); section.append(grid);
    const breakdown=document.createElement('div'); breakdown.className='breakdown';
    const topics=unique(state.selected.map(q=>q.topic));
    topics.forEach(topic=>{const qs=state.selected.filter(q=>q.topic===topic);const c=qs.filter(isCorrect).length;const row=document.createElement('div');row.className='breakdown-row';const a=document.createElement('span');a.textContent=topic;const b=document.createElement('strong');b.textContent=`${Math.round(c/qs.length*100)}%`;row.append(a,b);breakdown.append(row)}); section.append(breakdown);
    const again=button('محاولة جديدة',true,renderWelcome); again.style.marginTop='18px'; section.append(again);
    if(state.mode==='exam'){
      state.selected.forEach((q,i)=>{const card=renderQuestion(q,i);const controls=card.querySelectorAll('input,button');controls.forEach(x=>x.disabled=true);const fb=document.createElement('div');const ok=isCorrect(q);fb.className=`feedback ${ok?'correct':'incorrect'}`;fb.innerHTML=`<strong>${ok?'✓ إجابة صحيحة':'✗ إجابة غير صحيحة'}</strong>`;const t=document.createElement('div');t.textContent=safeText(q.explanation||'');fb.append(t);card.append(fb);section.append(card)});
    }
    els.content.append(section);
  }

  function sectionKey() { return `${storagePrefix}:${state.section.id || page.dataset.section || 'section'}`; }
  function saveProgress(){ try{ localStorage.setItem(`${sectionKey()}:progress`,JSON.stringify({flagged:[...state.flagged],updatedAt:new Date().toISOString()})); }catch{} }
  function saveAttempt(result){ try{ const key=`${sectionKey()}:history`;const old=JSON.parse(localStorage.getItem(key)||'[]');old.unshift({...result,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(old.slice(0,20))); }catch{} }
  function resetProgress(){ if(confirm('سيتم حذف سجل المراجعة لهذا القسم من هذا الجهاز. هل تريد المتابعة؟')){ Object.keys(localStorage).filter(k=>k.startsWith(sectionKey())).forEach(k=>localStorage.removeItem(k)); renderWelcome(); } }

  els.start?.addEventListener('click',startQuiz);
  els.reset?.addEventListener('click',resetProgress);
  load();
})();
