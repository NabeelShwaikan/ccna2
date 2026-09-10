const QRApp = (() => {
  "use strict";

  const esc = s => String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function loadJson(path, fallbackKey){
    try{
      const r = await fetch(path, {cache:"no-store"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      return await r.json();
    }catch(e){
      if(window.QR_FALLBACK_DATA && window.QR_FALLBACK_DATA[fallbackKey]){
        return window.QR_FALLBACK_DATA[fallbackKey];
      }
      throw e;
    }
  }

  function icon(type){
    if(type==="layers") return "7/4";
    if(type==="subnet") return "/24";
    if(type==="ipv6") return "::";
    return "•";
  }

  async function bootIndex(){
    const d = await loadJson("data/topics.json","topics");
    document.getElementById("siteTitle").textContent = d.siteTitle;
    document.getElementById("courseTitle").textContent = d.course;
    document.getElementById("topicGrid").innerHTML = d.topics.map(t => `
      <a class="topic-card" href="review.html?topic=${encodeURIComponent(t.id)}">
        <div class="topic-icon">${esc(icon(t.icon))}</div>
        <h2>${esc(t.title)}</h2>
        <p>${esc(t.subtitle)}</p>
        <span class="status">${t.status==="approved"?"معتمد":"تجريبي"}</span>
      </a>`).join("");
  }

  function navForSections(sections){
    return `<nav class="quick-nav">${sections.map(s=>`<a href="#${esc(s.id)}">${esc(s.title.replace(/^\d+\)\s*/,""))}</a>`).join("")}</nav>`;
  }

  function topicHero(d){
    return `<header class="topic-hero"><span class="badge">المراجعة السريعة</span><h1>${esc(d.title)}</h1><p>${esc(d.intro)}</p></header>`;
  }

  async function bootReview(){
    const p = new URLSearchParams(location.search);
    const topic = p.get("topic") || "osi-tcpip";
    const app = document.getElementById("app");
    try{
      const data = await loadJson(`data/${topic}.json`,topic);
      document.title = data.title;
      app.innerHTML = topicHero(data);
      const renderer = window.QRTopicRenderers?.[topic];
      if(!renderer) throw new Error("لا يوجد Renderer للموضوع: "+topic);
      renderer(data, app, {esc, navForSections});
      document.getElementById("buildLabel").textContent = "Modular data-driven build";
    }catch(e){
      app.innerHTML = `<section class="card"><h2>تعذر تحميل الموضوع</h2><p>${esc(e.message)}</p></section>`;
    }
  }

  return {bootIndex,bootReview,esc};
})();