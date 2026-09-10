window.QRTopicRenderers = window.QRTopicRenderers || {};
window.QRTopicRenderers["subnetting"] = (data, app, h) => {
  const {esc} = h;
  const sections = data.sections;
  app.insertAdjacentHTML("beforeend", h.navForSections(sections));
  const grid = document.createElement("section");
  grid.className = "content-grid";
  app.appendChild(grid);

  const card = (s, body, wide=false) => `
    <article class="card ${wide?"wide":""}" id="${esc(s.id)}">
      <h2>${esc(s.title)}</h2>${s.text?`<p>${esc(s.text)}</p>`:""}${body}
    </article>`;

  for(const s of sections){
    if(s.type==="facts"){
      grid.insertAdjacentHTML("beforeend", card(s, `
        <div class="kpis">${s.facts.map(f=>`<div class="kpi"><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join("")}</div>`));
    }
    if(s.type==="binary"){
      grid.insertAdjacentHTML("beforeend", card(s, `
        <div class="bits-box">
          <div class="weights" id="weights">${s.weights.map((w,i)=>`<div class="weight"><small>2^${i}</small><strong>${w}</strong></div>`).join("")}</div>
          <div class="bit-buttons" id="bitButtons">${s.weights.map((_,i)=>`<button class="bit-btn" type="button" data-i="${i}">0</button>`).join("")}</div>
          <div class="binary-output">
            <div class="result"><span>القيمة الثنائية</span><strong id="binOut" class="ltr">00000000</strong></div>
            <div class="result"><span>القيمة العشرية</span><strong id="decOut">0</strong></div>
          </div>
        </div>`));
    }
    if(s.type==="prefix"){
      grid.insertAdjacentHTML("beforeend", card(s, `
        <div class="range-row">
          <input id="prefixRange" type="range" min="8" max="30" value="24">
          <div class="calc-results">
            <div class="result"><span>اللاحقة</span><strong id="prefixOut">/24</strong></div>
            <div class="result"><span>قناع الشبكة</span><strong id="maskOut" class="ltr">255.255.255.0</strong></div>
            <div class="result"><span>عدد المضيفين المتاح</span><strong id="hostsOut">254</strong></div>
          </div>
        </div>`));
    }
    if(s.type==="subnet-calculator"){
      grid.insertAdjacentHTML("beforeend", card(s, `
        <div class="form-row">
          <label>عنوان IPv4<input id="calcIp" type="text" value="${esc(s.defaultIp)}"></label>
          <label>اللاحقة (Prefix)<input id="calcPrefix" type="number" min="${s.minPrefix}" max="${s.maxPrefix}" value="${s.defaultPrefix}"></label>
        </div>
        <div class="error" id="calcError"></div>
        <div class="calc-results">
          <div class="result"><span>عنوان الشبكة</span><strong id="networkOut" class="ltr"></strong></div>
          <div class="result"><span>عنوان البث</span><strong id="broadcastOut" class="ltr"></strong></div>
          <div class="result"><span>أول عنوان مضيف</span><strong id="firstOut" class="ltr"></strong></div>
          <div class="result"><span>آخر عنوان مضيف</span><strong id="lastOut" class="ltr"></strong></div>
          <div class="result"><span>قناع الشبكة</span><strong id="calcMaskOut" class="ltr"></strong></div>
          <div class="result"><span>عدد المضيفين المتاح</span><strong id="calcHostsOut"></strong></div>
        </div>
        <div class="and-box">
          <strong>كيف حُسب عنوان الشبكة؟</strong>
          <p>حوّل عنوان IPv4 والقناع إلى Binary ثم طبّق AND بين كل بتين. الناتج يكون 1 فقط عندما تكون القيمتان 1.</p>
          <div class="and-rules"><code>1 AND 1 = 1</code><code>1 AND 0 = 0</code><code>0 AND 1 = 0</code><code>0 AND 0 = 0</code></div>
          <div class="result"><span>مثال على المجموعة المؤثرة</span><strong id="andExample" class="ltr"></strong></div>
        </div>`, true));
    }
    if(s.type==="subnet-table"){
      grid.insertAdjacentHTML("beforeend", card(s, `
        <div class="table-wrap"><table><thead><tr><th>اللاحقة (Prefix)</th><th>قناع الشبكة</th><th>عدد المضيفين المتاح</th></tr></thead><tbody id="subnetTable"></tbody></table></div>
        <div class="note">${esc(s.auditNote)}</div>`, true));
    }
  }

  const ipToInt = ip => ip.split(".").reduce((a,o)=>((a<<8) + Number(o))>>>0,0);
  const intToIp = n => [24,16,8,0].map(s=>(n>>>s)&255).join(".");
  const maskInt = p => p===0 ? 0 : (0xffffffff << (32-p))>>>0;
  const maskString = p => intToIp(maskInt(p));
  const hostCount = p => 2**(32-p)-2;

  const bits = Array(8).fill(0);
  document.querySelectorAll(".bit-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const i=Number(btn.dataset.i);
      bits[i]=bits[i]?0:1; btn.textContent=bits[i]; btn.classList.toggle("on",!!bits[i]);
      document.getElementById("binOut").textContent=bits.slice().reverse().join("");
      document.getElementById("decOut").textContent=bits.reduce((sum,b,i)=>sum+b*data.sections.find(x=>x.type==="binary").weights[i],0);
    });
  });

  const pr=document.getElementById("prefixRange");
  const updatePrefix=()=>{
    const p=Number(pr.value);
    document.getElementById("prefixOut").textContent="/"+p;
    document.getElementById("maskOut").textContent=maskString(p);
    document.getElementById("hostsOut").textContent=hostCount(p).toLocaleString("en-US");
  };
  pr.addEventListener("input",updatePrefix); updatePrefix();

  const calc=()=>{
    const ip=document.getElementById("calcIp").value.trim();
    const p=Number(document.getElementById("calcPrefix").value);
    const err=document.getElementById("calcError");
    const oct=ip.split(".");
    if(oct.length!==4 || oct.some(x=>!/^\d+$/.test(x)||Number(x)<0||Number(x)>255) || p<8 || p>30){
      err.textContent="تحقق من عنوان IPv4 والـ Prefix."; return;
    }
    err.textContent="";
    const ipi=ipToInt(ip), m=maskInt(p), net=(ipi&m)>>>0, bc=(net | (~m>>>0))>>>0;
    document.getElementById("networkOut").textContent=intToIp(net);
    document.getElementById("broadcastOut").textContent=intToIp(bc);
    document.getElementById("firstOut").textContent=intToIp((net+1)>>>0);
    document.getElementById("lastOut").textContent=intToIp((bc-1)>>>0);
    document.getElementById("calcMaskOut").textContent=maskString(p);
    document.getElementById("calcHostsOut").textContent=hostCount(p).toLocaleString("en-US");

    const oi=Math.min(3,Math.floor(p/8));
    const ipOct=Number(oct[oi]);
    const maskOct=Number(maskString(p).split(".")[oi]);
    const res=ipOct & maskOct;
    const b=n=>n.toString(2).padStart(8,"0");
    document.getElementById("andExample").textContent=`${ipOct} (${b(ipOct)}) AND ${maskOct} (${b(maskOct)}) = ${res} (${b(res)})`;
  };
  document.getElementById("calcIp").addEventListener("input",calc);
  document.getElementById("calcPrefix").addEventListener("input",calc);
  calc();

  const tbody=document.getElementById("subnetTable");
  const ref=data.sections.find(x=>x.type==="subnet-table");
  for(let p=ref.minPrefix;p<=ref.maxPrefix;p++){
    tbody.insertAdjacentHTML("beforeend",`<tr><td>/${p}</td><td class="ltr">${maskString(p)}</td><td>${hostCount(p).toLocaleString("en-US")}</td></tr>`);
  }
};