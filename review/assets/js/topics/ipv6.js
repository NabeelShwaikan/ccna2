window.QRTopicRenderers = window.QRTopicRenderers || {};
window.QRTopicRenderers["ipv6"] = (data, app, h) => {
  const {esc}=h;
  const sections=data.sections;
  app.insertAdjacentHTML("beforeend", h.navForSections(sections));
  const grid=document.createElement("section");grid.className="content-grid";app.appendChild(grid);
  const card=(s,body,wide=false)=>`<article class="card ${wide?"wide":""}" id="${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.text?`<p>${esc(s.text)}</p>`:""}${body}</article>`;

  for(const s of sections){
    if(s.type==="facts"){
      grid.insertAdjacentHTML("beforeend",card(s,`<div class="kpis">${s.facts.map(f=>`<div class="kpi"><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join("")}</div>${s.example?`<div class="ipv6-example">${esc(s.example)}</div>`:""}`));
    }
    if(s.type==="ipv6-compression"){
      grid.insertAdjacentHTML("beforeend",card(s,`
        <div class="form-row"><label>عنوان IPv6<input id="ipv6Input" type="text" value="${esc(s.default)}"></label><button class="primary" id="compressBtn" type="button">اختصر</button></div>
        <div class="error" id="compressError"></div>
        <div class="result"><span>الخطوة 1 — حذف الأصفار البادئة</span><strong id="stage1" class="ltr"></strong></div>
        <div class="compression-arrow">↓</div>
        <div class="result"><span>الخطوة 2 — ضغط مجموعات الأصفار</span><strong id="stage2" class="ltr"></strong></div>`));
    }
    if(s.type==="ipv6-types"){
      grid.insertAdjacentHTML("beforeend",card(s,`
        <div class="grid2">${s.items.map(x=>`<div class="box"><strong>${esc(x.name)}</strong><p>${esc(x.desc)}</p></div>`).join("")}</div>
        <div class="prefix-list">${s.prefixes.map(x=>`<div class="prefix-row"><span>${esc(x.label)}</span><code>${esc(x.value)}</code></div>`).join("")}</div>
        <div class="form-row"><label>تعرّف على نوع العنوان<input id="typeInput" type="text" value="${esc(s.classifierDefault)}"></label><button class="primary" id="typeBtn" type="button">تحقق</button></div>
        <div class="result type-result"><span>النتيجة</span><strong id="typeResult"></strong><small id="typeReason"></small></div>
        <div class="note">Anycast يستخدم عنوانًا من نطاق Unicast؛ لذلك لا يمكن تحديده من شكل العنوان وحده.</div>`,true));
    }
    if(s.type==="fields"){
      grid.insertAdjacentHTML("beforeend",card(s,`<div class="grid2">${s.items.map(x=>`<div class="box"><strong>${esc(x.name)}</strong><p>${esc(x.desc)}</p></div>`).join("")}</div>`));
    }
    if(s.type==="ipv6-subnetting"){
      grid.insertAdjacentHTML("beforeend",card(s,`
        <div class="grid2">
          <div class="box"><span>أول 64 bit</span><strong>بادئة الشبكة (Network Prefix)</strong></div>
          <div class="box"><span>آخر 64 bit</span><strong>معرّف الواجهة (Interface Identifier)</strong></div>
        </div>
        <div class="note">في شبكات LAN التي تستخدم SLAAC يكون /64 هو الطول القياسي المطلوب لعمل SLAAC، مع وجود استخدامات IPv6 أخرى قد تستخدم أطوالًا مختلفة.</div>`,true));
    }
    if(s.type==="ndp"){
      grid.insertAdjacentHTML("beforeend",card(s,`
        <div class="grid4">${s.messages.map(x=>`<div class="box"><strong>${esc(x.abbr)} — ${esc(x.name)}</strong><p>${esc(x.desc)}</p></div>`).join("")}</div>
        <div class="quiz">
          <strong>سؤال سريع: أي رسالة يرسلها المضيف لطلب Router Advertisement؟</strong>
          <div class="quiz-options" id="ndpQuiz">${["NS","NA","RS","RA"].map(x=>`<button type="button" data-a="${x}">${x}</button>`).join("")}</div>
          <div class="quiz-feedback" id="ndpFeedback"></div>
        </div>`,true));
    }
    if(s.type==="commands"){
      grid.insertAdjacentHTML("beforeend",card(s,`<div class="cmd-list">${s.items.map(x=>`<div class="cmd"><span>${esc(x.label)}</span><code>${esc(x.cmd)}</code></div>`).join("")}</div>`,true));
    }
  }

  function parseIPv6(value){
    const s=value.trim().toLowerCase();
    if(!s || /[^0-9a-f:]/.test(s) || (s.match(/::/g)||[]).length>1) return null;
    let parts;
    if(s.includes("::")){
      const [a,b]=s.split("::"), left=a?a.split(":"):[], right=b?b.split(":"):[];
      if(left.some(x=>x.length<1||x.length>4)||right.some(x=>x.length<1||x.length>4)||left.length+right.length>=8) return null;
      parts=[...left,...Array(8-left.length-right.length).fill("0"),...right];
    }else{
      parts=s.split(":");
      if(parts.length!==8 || parts.some(x=>x.length<1||x.length>4)) return null;
    }
    if(parts.some(x=>!/^[0-9a-f]{1,4}$/.test(x))) return null;
    return parts.map(x=>parseInt(x,16));
  }
  function compress(parts){
    const hex=parts.map(n=>n.toString(16)); let best=-1,len=0;
    for(let i=0;i<8;){
      if(hex[i]!=="0"){i++;continue}
      let j=i;while(j<8&&hex[j]==="0")j++;
      if(j-i>=2 && j-i>len){best=i;len=j-i}
      i=j;
    }
    if(best<0)return hex.join(":");
    const left=hex.slice(0,best).join(":"),right=hex.slice(best+len).join(":");
    return left&&right?left+"::"+right:left?left+"::":right?"::"+right:"::";
  }
  function doCompress(){
    const p=parseIPv6(document.getElementById("ipv6Input").value);
    const er=document.getElementById("compressError");
    if(!p){er.textContent="صيغة عنوان IPv6 غير صحيحة.";return}
    er.textContent="";
    document.getElementById("stage1").textContent=p.map(n=>n.toString(16)).join(":");
    document.getElementById("stage2").textContent=compress(p);
  }
  document.getElementById("compressBtn").addEventListener("click",doCompress);doCompress();

  function classify(value){
    const p=parseIPv6(value);
    if(!p)return ["عنوان غير صحيح","تحقق من الصيغة."];
    if(p.every(n=>n===0))return ["غير المحدد (Unspecified)","العنوان هو ::"];
    if(p.slice(0,7).every(n=>n===0)&&p[7]===1)return ["الاسترجاع (Loopback)","العنوان هو ::1"];
    const first=p[0];
    if(first>=0xfe80&&first<=0xfebf)return ["محلي للوصلة (Link-Local)","يقع ضمن fe80::/10"];
    if(first>=0x2000&&first<=0x3fff)return ["أحادي عالمي (Global Unicast)","يقع ضمن 2000::/3"];
    if(first>=0xfc00&&first<=0xfdff)return ["محلي فريد (Unique Local)","يقع ضمن fc00::/7"];
    if(first>=0xff00)return ["متعدد الإرسال (Multicast)","يقع ضمن ff00::/8"];
    return ["Unicast أو نطاق آخر","لا يطابق البادئات الخاصة المعروضة في المرجع."];
  }
  const doType=()=>{
    const [t,r]=classify(document.getElementById("typeInput").value);
    document.getElementById("typeResult").textContent=t;document.getElementById("typeReason").textContent=r;
  };
  document.getElementById("typeBtn").addEventListener("click",doType);doType();

  document.querySelectorAll("#ndpQuiz button").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("#ndpQuiz button").forEach(x=>x.classList.remove("ok","no"));
    if(b.dataset.a==="RS"){b.classList.add("ok");document.getElementById("ndpFeedback").textContent="صحيح: RS = Router Solicitation."}
    else{b.classList.add("no");document.getElementById("ndpFeedback").textContent="الإجابة الصحيحة: RS."}
  }));
};