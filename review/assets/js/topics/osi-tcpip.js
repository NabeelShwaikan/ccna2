window.QRTopicRenderers = window.QRTopicRenderers || {};
window.QRTopicRenderers["osi-tcpip"] = (data, app, h) => {
  const {esc}=h;
  const c=data.layerColors;
  const sections=[
    {id:"basics",title:"1) الفكرة الأساسية"},
    {id:"models",title:"2) مقارنة النموذجين"},
    {id:"pdu",title:"3) التغليف"},
    {id:"protocols",title:"4) البروتوكولات"},
    {id:"devices",title:"5) الأجهزة"},
    {id:"journey",title:"6) رحلة البيانات"},
    {id:"quiz",title:"7) اختبر نفسك"}
  ];
  app.insertAdjacentHTML("beforeend",h.navForSections(sections));
  const grid=document.createElement("section");grid.className="content-grid";app.appendChild(grid);

  grid.insertAdjacentHTML("beforeend",`
  <article class="card" id="basics"><h2>1) الفكرة الأساسية</h2>
    <p>نموذج OSI مرجعي من 7 طبقات، بينما TCP/IP نموذج عملي من 4 طبقات.</p>
    <div class="kpis"><div class="kpi"><span>OSI</span><strong>7 Layers</strong></div><div class="kpi"><span>TCP/IP</span><strong>4 Layers</strong></div><div class="kpi"><span>الفائدة</span><strong>فهم + Troubleshooting</strong></div></div>
  </article>
  <article class="card"><h2>لماذا الطبقات؟</h2><p>تفصل الوظائف وتسهّل الفهم وحل الأعطال: من الإشارة، إلى Frame، إلى IP، إلى النقل، ثم التطبيق.</p></article>`);

  const osi=data.layers.map(x=>`<button class="osi-layer" type="button" data-layer="${x.n}" style="--c:${c[x.n]}"><span class="layer-num">${x.n}</span><span><strong>${esc(x.ar)} (${esc(x.en)})</strong><small>${esc(x.function)}</small></span></button>`).join("");
  const tcp=data.tcpip.map((x,i)=>{
    let bg;
    if(x.layers.length===3) bg=`linear-gradient(135deg,${c[7]},${c[6]} 50%,${c[5]})`;
    else if(x.layers.length===2) bg=`linear-gradient(135deg,${c[2]},${c[1]})`;
    else bg=c[x.layers[0]];
    return `<div class="tcp-layer" style="background:${bg}"><strong>${esc(x.name)}</strong><small>${esc(x.maps)}</small></div>`;
  }).join("");
  grid.insertAdjacentHTML("beforeend",`
  <article class="card wide" id="models"><h2>2) مقارنة OSI مع TCP/IP</h2><p>اضغط على طبقة OSI لعرض وظيفتها وPDU والمفاهيم المرتبطة بها.</p>
    <div class="compare"><div><div class="model-title">OSI — 7 طبقات</div><div class="osi-stack">${osi}</div></div><div><div class="model-title">TCP/IP — 4 طبقات</div><div class="tcp-stack">${tcp}</div></div></div>
    <div class="layer-detail"><span>الطبقة المحددة</span><h3 id="layerTitle"></h3><div class="grid3">
      <div class="box"><span>الوظيفة</span><strong id="layerFunction"></strong></div>
      <div class="box"><span>PDU</span><strong id="layerPdu"></strong></div>
      <div class="box"><span>بروتوكولات / وظائف مرتبطة</span><strong id="layerExamples"></strong></div>
    </div></div>
  </article>`);

  grid.insertAdjacentHTML("beforeend",`
  <article class="card wide" id="pdu"><h2>3) التغليف (Encapsulation)</h2><p>عند الإرسال تتحول البيانات بالتسلسل التالي.</p>
    <div class="pdu-flow">${data.pdu.map(x=>`<button class="pdu" type="button" data-layer="${x.layer}" style="background:${c[x.layer]}"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></button>`).join("")}</div>
    <div class="note ltr">Data → Segment / Datagram → Packet → Frame → Bits</div>
  </article>`);

  grid.insertAdjacentHTML("beforeend",`
  <article class="card wide" id="protocols"><h2>4) بروتوكولات وأمثلة سريعة</h2><div class="grid4">
    ${data.protocolGroups.map(g=>`<div class="box"><strong>${esc(g.title)}</strong><div class="pill-row">${g.items.map(i=>`<span class="pill">${esc(i)}</span>`).join("")}</div></div>`).join("")}
  </div></article>`);

  grid.insertAdjacentHTML("beforeend",`
  <article class="card" id="devices"><h2>5) الأجهزة والطبقات</h2><div class="devices">${data.devices.map(d=>`<div class="device"><span>${esc(d.layer)}</span><strong>${esc(d.name)}</strong></div>`).join("")}</div><div class="note">تصنيف مبسط للأجهزة التقليدية؛ بعض الأجهزة مثل Multilayer Switch تعمل في أكثر من طبقة.</div></article>
  <article class="card" id="quiz"><h2>7) اختبر نفسك</h2><div class="quiz"><strong id="quizQ"></strong><div class="quiz-options" id="quizOptions"></div><div class="quiz-feedback" id="quizFeedback"></div><div class="journey-controls"><button class="ghost" id="nextQuiz" type="button">سؤال جديد</button></div></div></article>`);

  const sender=data.layers.map(x=>`<div class="j-layer" data-point="s${x.n}" style="--c:${c[x.n]}"><strong>L${x.n} ${esc(x.en)}</strong><small>${esc(x.pdu==="Segment / Datagram"?"Segment":x.pdu)}</small></div>`).join("");
  const receiver=[...data.layers].reverse().map(x=>`<div class="j-layer" data-point="r${x.n}" style="--c:${c[x.n]}"><strong>L${x.n} ${esc(x.en)}</strong><small>${esc(x.pdu==="Segment / Datagram"?"Segment":x.pdu)}</small></div>`).join("");

  grid.insertAdjacentHTML("beforeend",`
  <article class="card wide" id="journey"><h2>6) رحلة البيانات بين المرسل والمستقبل</h2><p>تتحرك PDU فعليًا بين الطبقات: Encapsulation عند المرسل ثم Decapsulation عند المستقبل.</p>
    <div class="journey-stage" id="journeyStage">
      <div class="journey-grid">
        <div><div class="model-title">المرسل (Sender) — Encapsulation ↓</div><div class="osi-stack">${sender}</div></div>
        <div class="media-point" data-point="media"><strong>الوسط الناقل</strong><small>Transmission Media</small></div>
        <div><div class="model-title">المستقبل (Receiver) — Decapsulation ↑</div><div class="osi-stack">${receiver}</div></div>
      </div>
      <div class="data-token" id="dataToken">Data</div>
    </div>
    <div class="journey-controls"><button class="primary" id="autoBtn" type="button">تشغيل تلقائي</button><button class="ghost" id="stepBtn" type="button">الخطوة التالية</button><button class="ghost" id="resetBtn" type="button">إعادة</button></div>
    <div class="status-card"><span>الخطوة الحالية</span><strong id="journeyStatus">جاهز لبدء الرحلة.</strong><div class="status-meta"><span class="chip" id="phaseChip">Encapsulation</span><span class="chip" id="pduChip">PDU: Data</span><span class="chip" id="layerChip">Layer 7</span></div></div>
  </article>`);

  function selectLayer(n){
    document.querySelectorAll(".osi-layer").forEach(x=>x.classList.toggle("active",Number(x.dataset.layer)===n));
    const x=data.layers.find(v=>v.n===n);
    document.getElementById("layerTitle").textContent=`${x.ar} (${x.en}) — Layer ${x.n}`;
    document.getElementById("layerFunction").textContent=x.function;
    document.getElementById("layerPdu").textContent=x.pdu;
    document.getElementById("layerExamples").textContent=x.examples;
  }
  document.querySelectorAll(".osi-layer").forEach(x=>x.addEventListener("click",()=>selectLayer(Number(x.dataset.layer))));
  document.querySelectorAll(".pdu").forEach(x=>x.addEventListener("click",()=>{selectLayer(Number(x.dataset.layer));document.getElementById("models").scrollIntoView({behavior:"smooth"})}));
  selectLayer(7);

  let qi=-1;
  function loadQuiz(){
    qi=(qi+1)%data.quiz.length;const q=data.quiz[qi];
    document.getElementById("quizQ").textContent=q.q;
    const box=document.getElementById("quizOptions"),fb=document.getElementById("quizFeedback");box.innerHTML="";fb.textContent="";
    q.options.forEach(opt=>{const b=document.createElement("button");b.type="button";b.textContent=opt;b.addEventListener("click",()=>{[...box.children].forEach(x=>x.classList.remove("ok","no"));if(opt===q.answer){b.classList.add("ok");fb.textContent="صحيح"}else{b.classList.add("no");fb.textContent="الإجابة الصحيحة: "+q.answer}});box.appendChild(b)});
  }
  document.getElementById("nextQuiz").addEventListener("click",loadQuiz);loadQuiz();

  const stage=document.getElementById("journeyStage"),token=document.getElementById("dataToken");
  const status=document.getElementById("journeyStatus"),phase=document.getElementById("phaseChip"),pdu=document.getElementById("pduChip"),layer=document.getElementById("layerChip");
  let idx=0,timer=null,playing=false;
  const colorFor=l=>l==="media"?"#7aa7ff":c[l];
  const target=id=>stage.querySelector(`[data-point="${id}"]`);
  function clearActive(){stage.querySelectorAll(".j-layer,.media-point").forEach(x=>x.classList.remove("active"))}
  function move(id,animate=true){
    const el=target(id);if(!el)return;const sr=stage.getBoundingClientRect(),tr=el.getBoundingClientRect();
    const x=tr.left-sr.left+(tr.width-token.offsetWidth)/2,y=tr.top-sr.top+(tr.height-token.offsetHeight)/2;
    if(!animate){const old=token.style.transition;token.style.transition="none";token.style.transform=`translate(${x}px,${y}px)`;token.getBoundingClientRect();token.style.transition=old}
    else token.style.transform=`translate(${x}px,${y}px)`;
  }
  function render(i,animate=true){
    const s=data.journey[i];clearActive();const el=target(s.id);if(el)el.classList.add("active");
    token.textContent=s.pdu;token.style.backgroundColor=colorFor(s.layer);token.style.opacity="1";move(s.id,animate);
    status.textContent=s.text;phase.textContent=s.phase;pdu.textContent="PDU: "+s.pdu;layer.textContent=s.layer==="media"?"Transmission Media":"Layer "+s.layer;
  }
  function reset(){if(timer)clearTimeout(timer);timer=null;playing=false;idx=0;document.getElementById("autoBtn").textContent="تشغيل تلقائي";render(0,false);status.textContent="جاهز. البيانات عند طبقة التطبيق في المرسل."}
  function step(){if(idx<data.journey.length-1){idx++;render(idx,true)}else{playing=false;document.getElementById("autoBtn").textContent="إعادة التشغيل";status.textContent="اكتملت الرحلة."}}
  function auto(){
    const btn=document.getElementById("autoBtn");
    if(playing){playing=false;if(timer)clearTimeout(timer);btn.textContent="متابعة";return}
    if(idx>=data.journey.length-1)reset();
    playing=true;btn.textContent="إيقاف مؤقت";
    const tick=()=>{if(!playing)return;if(idx>=data.journey.length-1){playing=false;btn.textContent="إعادة التشغيل";status.textContent="اكتملت الرحلة.";return}step();timer=setTimeout(tick,900)};
    timer=setTimeout(tick,400);
  }
  document.getElementById("autoBtn").addEventListener("click",auto);
  document.getElementById("stepBtn").addEventListener("click",()=>{if(playing){playing=false;if(timer)clearTimeout(timer);document.getElementById("autoBtn").textContent="متابعة"}step()});
  document.getElementById("resetBtn").addEventListener("click",reset);
  window.addEventListener("resize",()=>move(data.journey[idx].id,false));
  requestAnimationFrame(()=>requestAnimationFrame(reset));
};