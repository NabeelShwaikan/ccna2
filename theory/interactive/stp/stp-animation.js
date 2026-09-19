(() => {
  'use strict';

  const NS='http://www.w3.org/2000/svg';

  const STAGES=[
    {
      short:'البداية',
      title:'كل محوّل يبدأ باعتبار نفسه Root Bridge',
      body:'المحوّلات الثلاثة تعمل بالقيم الافتراضية على VLAN 1. Bridge Priority الأساسية 32768، ومع Extended System ID الخاص بـVLAN 1 تصبح قيمة BID الظاهرة 32769. في البداية يضع كل محوّل BID الخاص به في Root ID.',
      decision:'لا يوجد Root Bridge متفق عليه بعد.'
    },
    {
      short:'BPDU',
      title:'رسائل BPDU تبدأ رحلتها بين المحوّلات',
      body:'كل محوّل يرسل BPDU إلى جيرانه. الرسالة تحمل Sender BID وRoot ID. عند استقبال BPDU أفضل، يحتفظ المحوّل بالمعلومة الأفضل ويعلنها في الرسائل التالية.',
      decision:'القرار يُبنى على أفضل BPDU وصلت إلى كل محوّل.'
    },
    {
      short:'BID',
      title:'أقل BID يفوز بانتخاب Root Bridge',
      body:'Bridge Priority وExtended System ID متساويان في هذا السيناريو الافتراضي، لذلك يصل كسر التعادل إلى MAC Address. عنوان S2 هو الأصغر: 000A.0011.1111.',
      decision:'S2 يصبح Root Bridge، وتتعلم S1 وS3 أن Root ID هو BID الخاص بـS2.'
    },
    {
      short:'Root Port',
      title:'كل محوّل غير جذري يختار Root Port',
      body:'جميع الروابط في المثال FastEthernet وتكلفتها 19. S1 يصل مباشرة إلى S2 عبر F0/1 بتكلفة 19، وS3 يصل مباشرة إلى S2 عبر F0/2 بتكلفة 19؛ لذلك يصبح هذان المنفذان Root Ports.',
      decision:'S1 F0/1 = RP، وS3 F0/2 = RP.'
    },
    {
      short:'Designated',
      title:'يُختار Designated Port لكل Segment',
      body:'كل منافذ Root Bridge المتجهة إلى المحوّلات تكون Designated. على الوصلة العليا بين S3 وS1، كلاهما يملك Root Path Cost = 19؛ فيُكسر التعادل بأقل Sender BID. S3 يملك MAC أقل من S1.',
      decision:'S2 F0/1 وS2 F0/2 = DP، وS3 F0/1 = DP.'
    },
    {
      short:'Alternate',
      title:'المنفذ المتبقي يصبح Alternate / Blocking',
      body:'منفذ S1 F0/2 على الوصلة إلى S3 ليس Root Port ولم يفز كـDesignated Port، لذلك يصبح Alternate Port ويُحجب منطقيًا لمنع الحلقة.',
      decision:'S1 F0/2 = Alternate / Blocking.'
    },
    {
      short:'النتيجة',
      title:'الآن أصبحت الطوبولوجيا Loop-Free',
      body:'سنرسل Frame من S1 إلى S3. الرابط المباشر بينهما موجود فيزيائيًا، لكن طرف S1 محجوب بواسطة STP؛ لذلك تسلك الإطارات المسار الفعّال S1 → S2 → S3.',
      decision:'STP أبقى التكرار الفيزيائي ومنع الحلقة منطقيًا.'
    }
  ];

  const DURATIONS=[2200,5200,4300,4600,4800,4200,6000];

  const BIDS={
    S1:{priority:'32769',mac:'000A.0033.3333'},
    S2:{priority:'32769',mac:'000A.0011.1111'},
    S3:{priority:'32769',mac:'000A.0022.2222'}
  };

  const P={
    S3:{x:180,y:150},
    S1:{x:720,y:150},
    S2:{x:450,y:405}
  };

  function svgEl(tag,attrs={}){
    const el=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
    return el;
  }

  function lerp(a,b,t){return a+(b-a)*t}
  function ease(t){
    t=Math.max(0,Math.min(1,t));
    return t*t*(3-2*t);
  }
  function point(a,b,t){
    return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)};
  }

  function markup(){
    return `
      <div class="stp-journey">
        <div class="stp-journey-head">
          <div>
            <div class="stp-journey-kicker">STP INTERACTIVE JOURNEY</div>
            <h4>شاهد STP وهو يتخذ القرار</h4>
            <p>نفس فكرة رحلة البيانات: BPDU تتحرك فعليًا على الوصلات، والقرار يظهر أمامك مرحلة بمرحلة.</p>
          </div>
          <div class="stp-controls" aria-label="أدوات العرض الحركي">
            <button class="stp-btn" type="button" data-stp-prev>السابق</button>
            <button class="stp-btn stp-play" type="button" data-stp-play>تشغيل ▶</button>
            <button class="stp-btn" type="button" data-stp-next>التالي</button>
            <button class="stp-btn" type="button" data-stp-reset>إعادة ↺</button>
          </div>
        </div>

        <div class="stp-main">
          <div class="stp-canvas">
            <svg class="stp-svg" viewBox="0 0 900 540" role="img"
                 aria-label="طوبولوجيا STP مكونة من ثلاثة محوّلات وروابط مفردة">
              <g id="stpScene">
                <line class="stp-link" data-link="S3-S1" x1="250" y1="150" x2="650" y2="150"/>
                <line class="stp-link" data-link="S3-S2" x1="225" y1="202" x2="402" y2="356"/>
                <line class="stp-link" data-link="S2-S1" x1="498" y1="356" x2="675" y2="202"/>

                <text x="450" y="128" fill="var(--muted)" font-size="12" text-anchor="middle">Trunk3</text>
                <text x="287" y="303" fill="var(--muted)" font-size="12" text-anchor="middle">Trunk2</text>
                <text x="613" y="303" fill="var(--muted)" font-size="12" text-anchor="middle">Trunk1</text>

                ${switchMarkup('S3',180,150,'32769','000A.0022.2222')}
                ${switchMarkup('S1',720,150,'32769','000A.0033.3333')}
                ${switchMarkup('S2',450,405,'32769','000A.0011.1111')}

                ${portMarkup('S3-F01',258,132,'F0/1')}
                ${portMarkup('S1-F02',642,132,'F0/2')}
                ${portMarkup('S3-F02',222,216,'F0/2')}
                ${portMarkup('S2-F02',388,350,'F0/2')}
                ${portMarkup('S2-F01',512,350,'F0/1')}
                ${portMarkup('S1-F01',678,216,'F0/1')}

                ${roleMarkup('S3-F01-role',286,172,'DP','dp')}
                ${roleMarkup('S1-F02-role',614,172,'AP','ap')}
                ${roleMarkup('S3-F02-role',252,248,'RP','rp')}
                ${roleMarkup('S2-F02-role',375,330,'DP','dp')}
                ${roleMarkup('S2-F01-role',525,330,'DP','dp')}
                ${roleMarkup('S1-F01-role',648,248,'RP','rp')}

                <g class="stp-block" data-block transform="translate(632 150)">
                  <circle r="18"></circle>
                  <line x1="-10" y1="10" x2="10" y2="-10"></line>
                </g>

                ${calloutMarkup('start-S3',180,65,'Root ID = S3','أعتبر نفسي Root')}
                ${calloutMarkup('start-S1',720,65,'Root ID = S1','أعتبر نفسي Root')}
                ${calloutMarkup('start-S2',450,487,'Root ID = S2','أعتبر نفسي Root')}

                ${calloutMarkup('cost-S1',710,290,'Cost = 19','إلى S2 مباشرة')}
                ${calloutMarkup('cost-S3',190,290,'Cost = 19','إلى S2 مباشرة')}

                <g class="stp-bpdu" data-token="a"><circle r="20"></circle><text y="3">BPDU</text></g>
                <g class="stp-bpdu" data-token="b"><circle r="20"></circle><text y="3">BPDU</text></g>
                <g class="stp-bpdu" data-token="c"><circle r="20"></circle><text y="3">BPDU</text></g>

                <g class="stp-frame" data-frame>
                  <rect x="-31" y="-16" width="62" height="32"></rect>
                  <text y="4">FRAME</text>
                </g>
                <g class="stp-frame" data-ghost-frame opacity=".55">
                  <rect x="-31" y="-16" width="62" height="32"></rect>
                  <text y="4">FRAME</text>
                </g>
              </g>
            </svg>
          </div>

          <aside class="stp-panel">
            <div class="stp-stage-no" data-stage-no></div>
            <h5 class="stp-stage-title" data-stage-title></h5>
            <p class="stp-stage-body" data-stage-body></p>
            <div class="stp-decision">
              <div class="stp-decision-label">القرار في هذه المرحلة</div>
              <div class="stp-decision-text" data-stage-decision></div>
            </div>

            <div class="stp-bid-table" aria-label="قيم BID في السيناريو">
              ${bidRow('S1','000A.0033.3333')}
              ${bidRow('S2','000A.0011.1111',true)}
              ${bidRow('S3','000A.0022.2222')}
            </div>

            <div class="stp-legend">
              <span class="stp-leg root"><i></i>Root Bridge</span>
              <span class="stp-leg rp"><i></i>Root Port</span>
              <span class="stp-leg dp"><i></i>Designated</span>
              <span class="stp-leg ap"><i></i>Alternate</span>
            </div>
          </aside>
        </div>

        <div class="stp-progress" aria-label="مراحل العرض">
          ${STAGES.map((s,i)=>`<button type="button" class="stp-dot" data-stp-stage="${i}">${i+1} · ${s.short}</button>`).join('')}
        </div>
      </div>`;
  }

  function switchMarkup(name,x,y,priority,mac){
    return `
      <g class="stp-switch" data-switch="${name}" transform="translate(${x} ${y})">
        <rect class="sw-body" x="-70" y="-42" width="140" height="84" rx="16"></rect>
        <g stroke="var(--brand)" stroke-width="3" opacity=".9">
          <line x1="-43" y1="-12" x2="-24" y2="-12"></line>
          <line x1="-9" y1="-12" x2="10" y2="-12"></line>
          <line x1="25" y1="-12" x2="44" y2="-12"></line>
        </g>
        <text class="sw-name" y="14">${name}</text>
        <text class="sw-sub" y="32">${priority} · ${mac}</text>
        <g class="root-pill" transform="translate(0 -58)">
          <rect x="-58" y="-13" width="116" height="26" rx="9"></rect>
          <text y="4">ROOT BRIDGE</text>
        </g>
      </g>`;
  }

  function portMarkup(id,x,y,label){
    return `
      <g class="stp-port-label" data-port="${id}" transform="translate(${x} ${y})">
        <rect x="-31" y="-12" width="62" height="24" rx="7"></rect>
        <text y="4">${label}</text>
      </g>`;
  }

  function roleMarkup(id,x,y,label,type){
    return `
      <g class="stp-role ${type}" data-role="${id}" transform="translate(${x} ${y})">
        <rect x="-22" y="-14" width="44" height="28" rx="8"></rect>
        <text y="4">${label}</text>
      </g>`;
  }

  function calloutMarkup(id,x,y,line1,line2){
    return `
      <g class="stp-callout" data-callout="${id}" transform="translate(${x} ${y})">
        <rect x="-75" y="-27" width="150" height="54" rx="11"></rect>
        <text y="-5">${line1}</text>
        <text class="muted" y="14">${line2}</text>
      </g>`;
  }

  function bidRow(name,mac,best=false){
    return `
      <div class="stp-bid-row${best?' is-best':''}" data-bid-row="${name}">
        <span class="stp-bid-name">${name}</span>
        <span class="stp-bid-values">
          <strong>Priority 32769</strong>
          <span>MAC ${mac}</span>
        </span>
      </div>`;
  }

  class STPJourney{
    constructor(host){
      this.host=host;
      this.stage=0;
      this.playing=false;
      this.stageStarted=0;
      this.elapsedBeforePause=0;
      this.raf=0;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      host.innerHTML=markup();

      this.q=s=>host.querySelector(s);
      this.qa=s=>[...host.querySelectorAll(s)];

      this.prev=this.q('[data-stp-prev]');
      this.play=this.q('[data-stp-play]');
      this.next=this.q('[data-stp-next]');
      this.reset=this.q('[data-stp-reset]');
      this.dots=this.qa('[data-stp-stage]');
      this.tokenA=this.q('[data-token="a"]');
      this.tokenB=this.q('[data-token="b"]');
      this.tokenC=this.q('[data-token="c"]');
      this.frame=this.q('[data-frame]');
      this.ghost=this.q('[data-ghost-frame]');

      this.bind();
      this.applyStage(0,true);
      this.animate= this.animate.bind(this);
      this.raf=requestAnimationFrame(this.animate);
    }

    bind(){
      this.prev.addEventListener('click',()=>this.go(this.stage-1));
      this.next.addEventListener('click',()=>this.go(this.stage+1));
      this.reset.addEventListener('click',()=>{this.pause();this.go(0)});
      this.play.addEventListener('click',()=>this.playing?this.pause():this.start());
      this.dots.forEach(b=>b.addEventListener('click',()=>{
        this.pause();
        this.go(Number(b.dataset.stpStage));
      }));
    }

    start(){
      if(this.stage>=STAGES.length-1 && this.elapsedBeforePause>=DURATIONS[this.stage]){
        this.go(0);
      }
      this.playing=true;
      this.stageStarted=performance.now()-this.elapsedBeforePause;
      this.play.textContent='إيقاف مؤقت ❚❚';
      this.play.setAttribute('aria-label','إيقاف العرض مؤقتًا');
    }

    pause(){
      if(this.playing){
        this.elapsedBeforePause=Math.max(0,performance.now()-this.stageStarted);
      }
      this.playing=false;
      this.play.textContent='تشغيل ▶';
      this.play.setAttribute('aria-label','تشغيل العرض');
    }

    go(index,fromAuto=false){
      const n=Math.max(0,Math.min(STAGES.length-1,index));
      this.stage=n;
      this.elapsedBeforePause=0;
      if(this.playing || fromAuto) this.stageStarted=performance.now();
      this.applyStage(n);
    }

    applyStage(i,initial=false){
      const s=STAGES[i];
      this.q('[data-stage-no]').textContent=`المرحلة ${i+1} من ${STAGES.length}`;
      this.q('[data-stage-title]').textContent=s.title;
      this.q('[data-stage-body]').textContent=s.body;
      this.q('[data-stage-decision]').textContent=s.decision;

      this.prev.disabled=i===0;
      this.next.disabled=i===STAGES.length-1;
      this.dots.forEach((b,n)=>{
        b.classList.toggle('current',n===i);
        b.classList.toggle('done',n<i);
        b.setAttribute('aria-current',n===i?'step':'false');
      });

      const swS2=this.q('[data-switch="S2"]');
      swS2.classList.toggle('is-root',i>=2);

      this.qa('.stp-role').forEach(el=>el.classList.remove('show'));
      if(i>=3){
        this.q('[data-role="S1-F01-role"]').classList.add('show');
        this.q('[data-role="S3-F02-role"]').classList.add('show');
      }
      if(i>=4){
        this.q('[data-role="S2-F01-role"]').classList.add('show');
        this.q('[data-role="S2-F02-role"]').classList.add('show');
        this.q('[data-role="S3-F01-role"]').classList.add('show');
      }
      if(i>=5){
        this.q('[data-role="S1-F02-role"]').classList.add('show');
      }

      const top=this.q('[data-link="S3-S1"]');
      const left=this.q('[data-link="S3-S2"]');
      const right=this.q('[data-link="S2-S1"]');
      [top,left,right].forEach(l=>l.setAttribute('class','stp-link'));
      if(i>=3){
        left.classList.add('is-tree');
        right.classList.add('is-tree');
      }
      if(i===4) top.classList.add('is-segment');
      if(i>=5) top.classList.add('is-blocked');

      this.q('[data-block]').classList.toggle('show',i>=5);

      this.qa('.stp-callout').forEach(c=>c.classList.remove('show'));
      if(i===0){
        this.q('[data-callout="start-S1"]').classList.add('show');
        this.q('[data-callout="start-S2"]').classList.add('show');
        this.q('[data-callout="start-S3"]').classList.add('show');
      }
      if(i===3){
        this.q('[data-callout="cost-S1"]').classList.add('show');
        this.q('[data-callout="cost-S3"]').classList.add('show');
      }

      this.hideMoving();
      if(!initial){
        this.q('.stp-panel')?.animate(
          [{opacity:.72,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
          {duration:220,easing:'ease-out'}
        );
      }
    }

    hideMoving(){
      [this.tokenA,this.tokenB,this.tokenC,this.frame,this.ghost].forEach(el=>{
        el.classList.remove('show');
        el.style.opacity='';
      });
    }

    setPos(el,p){
      el.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    }

    animate(now){
      if(!this.host.isConnected){
        cancelAnimationFrame(this.raf);
        return;
      }

      const elapsed=this.playing ? Math.max(0,now-this.stageStarted) : this.elapsedBeforePause;
      const dur=DURATIONS[this.stage];
      const t=Math.max(0,Math.min(1,elapsed/dur));

      this.animateStage(this.stage,t,now);

      if(this.playing && elapsed>=dur){
        if(this.stage<STAGES.length-1){
          this.go(this.stage+1,true);
        }else{
          this.pause();
          this.elapsedBeforePause=dur;
        }
      }

      this.raf=requestAnimationFrame(this.animate);
    }

    animateStage(stage,t,now){
      this.hideMoving();

      if(this.reduced){
        if(stage===1 || stage===2 || stage===3){
          this.tokenA.classList.add('show');
          this.setPos(this.tokenA,P.S2);
        }
        if(stage===6){
          this.frame.classList.add('show');
          this.setPos(this.frame,P.S3);
        }
        return;
      }

      if(stage===1){
        // ثلاث BPDUs تتحرك في حلقة ثم تعكس الاتجاه لتجسيد التبادل المستمر.
        const cycle=(t*2.4)%1;
        const rev=Math.floor(t*2.4)%2===1;
        const u=ease(rev?1-cycle:cycle);
        this.tokenA.classList.add('show');
        this.tokenB.classList.add('show');
        this.tokenC.classList.add('show');
        this.setPos(this.tokenA,point(P.S3,P.S1,u));
        this.setPos(this.tokenB,point(P.S1,P.S2,u));
        this.setPos(this.tokenC,point(P.S2,P.S3,u));
      }

      if(stage===2){
        // Superior BPDU from elected S2 propagates to S1 and S3.
        const u=ease(Math.min(1,t*1.3));
        this.tokenA.classList.add('show');
        this.tokenB.classList.add('show');
        this.setPos(this.tokenA,point(P.S2,P.S1,u));
        this.setPos(this.tokenB,point(P.S2,P.S3,u));
      }

      if(stage===3){
        // Root path cost pulses from the Root toward both non-root switches.
        const cycle=(t*1.8)%1;
        const u=ease(cycle);
        this.tokenA.classList.add('show');
        this.tokenB.classList.add('show');
        this.setPos(this.tokenA,point(P.S2,P.S1,u));
        this.setPos(this.tokenB,point(P.S2,P.S3,u));
      }

      if(stage===4){
        // Highlight the upper segment comparison by a BPDU moving from S3 to S1.
        const u=ease((t*1.25)%1);
        this.tokenA.classList.add('show');
        this.setPos(this.tokenA,point(P.S3,P.S1,u));
      }

      if(stage===5){
        // Small BPDU reaches the blocked side and visually stops.
        const u=ease(Math.min(.83,t*1.15));
        this.tokenA.classList.add('show');
        this.setPos(this.tokenA,point(P.S3,P.S1,u));
      }

      if(stage===6){
        // Actual frame travels S1 -> S2 -> S3.
        this.frame.classList.add('show');
        if(t<.5){
          this.setPos(this.frame,point(P.S1,P.S2,ease(t/.5)));
        }else{
          this.setPos(this.frame,point(P.S2,P.S3,ease((t-.5)/.5)));
        }

        // A ghost frame tries the direct path and stops at the blocked port.
        if(t>.08){
          this.ghost.classList.add('show');
          const g=Math.min(.18,ease((t-.08)/.35)*.18);
          this.setPos(this.ghost,point(P.S1,P.S3,g));
          this.ghost.style.opacity=String(Math.max(.12,.55-(t-.08)*.35));
        }
      }
    }
  }

  function mount(host){
    if(!host || host.dataset.stpMounted==='1') return;
    host.dataset.stpMounted='1';
    new STPJourney(host);
  }

  window.STPAnimation={mount};
  document.querySelectorAll('[data-stp-animation]').forEach(mount);
})();
