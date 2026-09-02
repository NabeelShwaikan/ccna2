(function(){
  'use strict';

  const {escapeHtml, initTheme, fetchJson} = window.CiscoApp;

  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const topicsEl = document.getElementById('topics');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTopicTitle');
  const modalSub = document.getElementById('modalTopicSub');
  const terminal = document.getElementById('terminal');
  const terminalLabel = document.getElementById('terminalLabel');
  const terminalStatus = document.getElementById('terminalStatus');
  const closeModalBtn = document.getElementById('closeModal');
  const replayBtn = document.getElementById('replayBtn');
  const showAllBtn = document.getElementById('showAllBtn');

  let sections = [];
  let currentSection = null;
  let runToken = 0;
  let lastFocused = null;

  initTheme('themeBtn');

  function getTopicId(){
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'basic-configuration';
  }

  function renderSections(items){
    const sorted = [...items].sort((a,b) => (a.order || 0) - (b.order || 0));

    topicsEl.innerHTML = sorted.map((section,index) => {
      const explanation = section.explanation || {};
      const points = Array.isArray(explanation.points) ? explanation.points : [];
      const note = explanation.note || null;

      return `
        <article class="topic">
          <div class="topic-top">
            <div class="topic-num" aria-hidden="true">${index + 1}</div>
            <div class="topic-title-wrap">
              <h3>${escapeHtml(section.title || '')}</h3>
              <div class="sub">${escapeHtml(section.subtitle || '')}</div>
            </div>
          </div>

          <div class="expert">
            <strong>${escapeHtml(explanation.label || 'شرح خبير Cisco')}</strong>
            ${explanation.intro ? `<p class="expert-intro">${escapeHtml(explanation.intro)}</p>` : ''}
            ${points.length ? `<ul class="expert-points">${points.map(point => `<li>${escapeHtml(point.text || '')}</li>`).join('')}</ul>` : ''}
          </div>

          ${note ? `<div class="expert-note"><b>${escapeHtml(note.label || 'ملاحظة')}:</b> ${escapeHtml(note.text || '')}</div>` : ''}

          <div class="topic-actions">
            <button class="show-btn" type="button" data-section="${escapeHtml(section.id)}" aria-haspopup="dialog">عرض الأوامر</button>
          </div>
        </article>`;
    }).join('');

    topicsEl.querySelectorAll('[data-section]').forEach(button => {
      button.addEventListener('click', () => openSection(button.dataset.section));
    });
  }

  function openSection(id){
    const section = sections.find(item => item.id === id);
    if(!section) return;

    const commands = section.terminal && Array.isArray(section.terminal.commands)
      ? [...section.terminal.commands].sort((a,b) => (a.order || 0) - (b.order || 0))
      : [];

    currentSection = {...section, commands};
    lastFocused = document.activeElement;
    modalTitle.textContent = section.title || 'الأوامر';
    modalSub.textContent = `${commands.length} أوامر`;
    terminalLabel.textContent = section.terminal?.label || 'Router / Switch';
    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    closeModalBtn.focus();
    playCommands(currentSection);
  }

  function closeModal(){
    runToken++;
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    terminal.innerHTML = '';
    terminalStatus.textContent = '';
    currentSection = null;
    if(lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function useReducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function typeLine(prompt,command,token){
    const line = document.createElement('div');
    line.className = 'term-line';

    const promptSpan = document.createElement('span');
    promptSpan.className = 'prompt';
    promptSpan.textContent = prompt;

    const typedSpan = document.createElement('span');
    typedSpan.className = 'typed';
    typedSpan.textContent = ' ';

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden','true');

    line.append(promptSpan, typedSpan, cursor);
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;

    if(useReducedMotion()){
      typedSpan.textContent += command;
      cursor.remove();
      return true;
    }

    for(let i=0;i<command.length;i++){
      if(token !== runToken) return false;
      typedSpan.textContent += command[i];
      terminal.scrollTop = terminal.scrollHeight;
      await sleep(command[i] === ' ' ? 20 : 15);
    }

    cursor.remove();
    return true;
  }

  async function playCommands(section){
    const commands = section.commands || [];
    const token = ++runToken;
    terminal.innerHTML = '';
    replayBtn.disabled = true;
    showAllBtn.disabled = false;
    terminalStatus.textContent = 'جاري كتابة الأوامر…';

    if(!commands.length){
      terminalStatus.textContent = 'لا توجد أوامر في هذا القسم';
      replayBtn.disabled = true;
      showAllBtn.disabled = true;
      return;
    }

    if(!useReducedMotion()) await sleep(180);

    for(let i=0;i<commands.length;i++){
      if(token !== runToken) return;
      const item = commands[i];
      const completed = await typeLine(item.prompt || '', item.command || '', token);
      if(!completed) return;
      terminalStatus.textContent = `الخطوة ${i + 1} من ${commands.length}`;
      if(!useReducedMotion()) await sleep(260);
    }

    if(token !== runToken) return;
    terminalStatus.textContent = 'اكتمل تسلسل الأوامر';
    replayBtn.disabled = false;
    showAllBtn.disabled = true;
  }

  function showAll(){
    if(!currentSection) return;
    runToken++;
    const commands = currentSection.commands || [];

    terminal.innerHTML = commands.map(item => `
      <div class="term-line"><span class="prompt">${escapeHtml(item.prompt || '')}</span><span class="typed"> ${escapeHtml(item.command || '')}</span></div>`
    ).join('');

    terminalStatus.textContent = 'تم إظهار جميع الأوامر';
    replayBtn.disabled = false;
    showAllBtn.disabled = true;
    terminal.scrollTop = terminal.scrollHeight;
  }

  async function init(){
    const topicId = getTopicId();

    try{
      const manifest = await fetchJson('../Data/topics.json');
      const meta = (manifest.topics || []).find(item => item.id === topicId);

      if(!meta || meta.status !== 'ready'){
        throw new Error('Topic is not ready');
      }

      const data = await fetchJson(`../Data/${meta.data_file}`);
      const topic = data.topic || {};
      sections = Array.isArray(topic.sections) ? topic.sections : [];

      document.title = `أوامر Cisco — ${topic.title || meta.title}`;
      pageTitle.textContent = topic.title || meta.title;
      pageSubtitle.textContent = topic.subtitle || '';
      renderSections(sections);
    }catch(error){
      pageTitle.textContent = 'تعذر تحميل الموضوع';
      pageSubtitle.textContent = '';
      topicsEl.innerHTML = `
        <div class="error-box">
          تعذر تحميل ملف البيانات. شغّل الموقع من خلال خادم محلي أو ارفعه إلى الاستضافة، ثم افتح الموضوع من الصفحة الرئيسية.
        </div>`;
    }
  }

  closeModalBtn.addEventListener('click', closeModal);
  replayBtn.addEventListener('click', () => currentSection && playCommands(currentSection));
  showAllBtn.addEventListener('click', showAll);
  modalBackdrop.addEventListener('click', event => {
    if(event.target === modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', event => {
    if(!modalBackdrop.classList.contains('open')) return;

    if(event.key === 'Escape'){
      event.preventDefault();
      closeModal();
      return;
    }

    if(event.key === 'Tab'){
      const focusable = [...modalBackdrop.querySelectorAll('button:not([disabled])')];
      if(!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
      }else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
      }
    }
  });

  init();
})();
