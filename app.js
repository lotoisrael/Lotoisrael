// ─── Constants ───────────────────────────────────────────────
const PENDING_KEY='loto_pending_reveal';
const EXPIRY_MS=12*60*60*1000;
const CACHE_KEY='loto_v6';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const NEXT_DRAW_DATE=new Date('2026-03-17T21:00:00Z').getTime();

// ─── Fallback Data ────────────────────────────────────────────
const DEFAULT_DATA={
  drawNumber:3906,date:'14/03/2026',
  numbers:[5,7,20,22,31,35],strongNumber:2,
  firstPrize:8000000,totalPrizes:4240648,
  history:[
    {numbers:[5,7,20,22,31,35],strong:2},
    {numbers:[19,20,23,24,31,33],strong:6},
    {numbers:[3,8,10,17,29,35],strong:7},
    {numbers:[13,15,16,20,35,36],strong:7},
    {numbers:[4,8,11,18,19,35],strong:7},
    {numbers:[7,9,25,26,35,36],strong:3},
    {numbers:[7,10,14,25,29,36],strong:7},
    {numbers:[6,9,10,11,21,22],strong:2},
    {numbers:[1,3,8,20,24,37],strong:1},
    {numbers:[13,14,26,31,33,36],strong:4},
    {numbers:[5,8,30,32,33,34],strong:2},
    {numbers:[5,23,25,27,28,32],strong:2},
    {numbers:[5,14,18,22,26,31],strong:5},
    {numbers:[2,11,15,19,28,34],strong:3},
    {numbers:[6,12,17,23,30,37],strong:6},
    {numbers:[1,9,16,22,27,33],strong:4},
    {numbers:[4,10,18,24,31,36],strong:1},
    {numbers:[3,7,14,20,28,35],strong:7},
    {numbers:[8,13,19,25,32,37],strong:2},
    {numbers:[2,6,15,21,29,34],strong:5},
    {numbers:[5,11,17,23,30,36],strong:3},
    {numbers:[1,8,14,22,28,33],strong:6},
    {numbers:[4,9,16,24,31,37],strong:4},
    {numbers:[3,10,18,20,27,35],strong:1},
    {numbers:[7,12,15,23,29,36],strong:7},
    {numbers:[2,6,13,19,26,34],strong:2},
    {numbers:[5,11,17,22,30,37],strong:5},
    {numbers:[1,8,14,21,28,33],strong:3},
    {numbers:[4,9,16,24,29,36],strong:6},
    {numbers:[3,7,15,20,27,35],strong:4},
  ]
};

// ─── State ────────────────────────────────────────────────────
let currentData=null,strat='smart',running=false,revealed=false;
let _nums=[],_strong=0,_reasons=[],lastFocus=null;

// ─── GA4 ──────────────────────────────────────────────────────
function gtag_event(n,p={}){if(typeof gtag==='function')gtag('event',n,p);}

// ─── Cache ────────────────────────────────────────────────────
function cacheGet(){try{const v=sessionStorage.getItem(CACHE_KEY);return v?JSON.parse(v):null;}catch{return null;}}
function cacheSet(o){try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(o));}catch{}}

// ─── Draw Schedule ────────────────────────────────────────────
function nextDrawAfter(ms){
  if(ms<NEXT_DRAW_DATE)return NEXT_DRAW_DATE;
  const SLOTS=[[2,21],[6,21]];
  for(let a=0;a<=7;a++){
    const c=new Date(ms+a*86400000);
    for(const[dow,h]of SLOTS){
      const d=new Date(Date.UTC(c.getUTCFullYear(),c.getUTCMonth(),c.getUTCDate(),h));
      if(d.getUTCDay()===dow&&d.getTime()>ms)return d.getTime();
    }
  }
  return ms+3*86400000;
}

function renderNextDraw(){
  const next=nextDrawAfter(Date.now());
  const d=new Date(next);
  const days=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const dateStr=d.toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jerusalem'});
  document.getElementById('next-draw-label').textContent=`🗓 הגרלה הבאה: יום ${days[d.getUTCDay()]}, ${dateStr}`;
}

// ─── Render Results ───────────────────────────────────────────
function fmtMoney(n){return n?Number(n).toLocaleString('he-IL')+' ₪':'—';}

function renderResults(data){
  const nums=(data.numbers||[]).slice(0,6);
  document.getElementById('results-card').innerHTML=
    `<h2 class="results-heading">תוצאות הגרלת לוטו מס׳ ${data.drawNumber||'—'}</h2>
     <p class="results-date"><time>${data.date||''}</time></p>
     <div class="results-row">
       <div class="main-balls">${nums.map((n,i)=>`<div class="ball ball-main" aria-label="מספר ${i+1}: ${n}">${n}</div>`).join('')}</div>
       <div class="strong-wrap">
         <div class="ball ball-strong">${data.strongNumber||'?'}</div>
         <p class="strong-lbl">מספר<br>חזק</p>
       </div>
     </div>
     <div class="prize-row">
       <div class="prize-item"><p class="prize-lbl">פרס ראשון</p><p class="prize-val">${fmtMoney(data.firstPrize)}</p></div>
       <div class="prize-divider"></div>
       <div class="prize-item"><p class="prize-lbl">סך הפרסים</p><p class="prize-val">${fmtMoney(data.totalPrizes)}</p></div>
     </div>`;
}

// ─── Live Fetch ───────────────────────────────────────────────
async function fetchLive(){
  const controller=new AbortController();
  const tid=setTimeout(()=>controller.abort(),6000);
  try{
    const res=await fetch('/api/lotto',{signal:controller.signal});
    clearTimeout(tid);
    if(!res.ok)throw new Error(`http ${res.status}`);
    const data=await res.json();
    if(data.error||!data.numbers||data.numbers.length<6)throw new Error('bad');
    if(!data.history||data.history.length<5)data.history=DEFAULT_DATA.history;
    return data;
  }catch(e){clearTimeout(tid);throw e;}
}

function scheduleResultsRefresh(){
  const delay=nextDrawAfter(Date.now())-Date.now()+5*60*1000;
  setTimeout(async()=>{
    try{
      const data=await fetchLive();
      currentData=data;
      cacheSet({data,savedAt:Date.now(),nextDraw:nextDrawAfter(Date.now())});
      renderResults(data);
    }catch{}
    scheduleResultsRefresh();
  },Math.min(delay,2147483647));
}

// ─── Init ─────────────────────────────────────────────────────
function init(){
  const now=Date.now();
  const cached=cacheGet();
  const cacheValid=cached?.data&&cached?.savedAt&&cached?.nextDraw&&now<cached.nextDraw;
  currentData=cacheValid?cached.data:DEFAULT_DATA;
  renderResults(currentData);
  renderNextDraw();
  document.getElementById('go-btn').disabled=false;
  if(!cacheValid){
    fetchLive().then(data=>{
      currentData=data;
      cacheSet({data,savedAt:now,nextDraw:nextDrawAfter(now)});
      renderResults(data);
    }).catch(()=>{});
  }
  scheduleResultsRefresh();
}

// ─── Strategy ─────────────────────────────────────────────────
function selectStrat(s){strat=s;}

// ─── Claude API ───────────────────────────────────────────────
function extractJSON(raw){
  if(!raw)throw new Error('empty');
  const c=raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
  try{return JSON.parse(c);}catch{}
  const m=c.match(/\{[\s\S]*\}/);
  if(m){try{return JSON.parse(m[0]);}catch{}}
  throw new Error('no JSON');
}

async function claudeCall(prompt){
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})
  });
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  const d=await res.json();
  return d.content.filter(b=>b.type==='text').map(b=>b.text).join('');
}

// ─── Analysis ─────────────────────────────────────────────────
async function runAnalysis(){
  if(running)return;
  running=true;revealed=false;
  const btn=document.getElementById('go-btn');
  btn.disabled=true;
  document.getElementById('go-icon').className='spin-icon';
  document.getElementById('go-icon').textContent='⟳';
  document.getElementById('go-txt').textContent='מנתח...';
  document.getElementById('result-wrap').classList.remove('show');
  document.getElementById('copy-btn').style.display='none';

  const steps={
    smart:['בודק תדירות היסטורית...','בודק כמה זמן לא יצאו...','מנתח תבניות...','בוחר מספרים...'],
    hot:['סורק הגרלות אחרונות...','מדרג לפי תדירות...','מסנן קרים...','בוחר חמים...'],
    due:['בודק כמה הגרלות לא יצא...','מוצא שלא יצאו הרבה...','בודק ממוצע...','בוחר "בתורם"...']
  }[strat];

  const think=document.getElementById('thinking');
  think.classList.add('show');
  ['t1','t2','t3','t4'].forEach((id,i)=>{
    document.getElementById(id).classList.remove('done','active');
    document.getElementById(id+'l').textContent=steps[i];
  });

  const history=currentData?.history||DEFAULT_DATA.history;
  const[pick]=await Promise.all([
    claudeCall(`Analyze Israel Pais Lotto (balls 1-37, strong 1-7). History: ${JSON.stringify(history.slice(-20))}. Strategy: "${strat}". Return ONLY raw JSON: {"numbers":[6 distinct sorted ints 1-37],"strong":<1-7>,"reasons":["short Hebrew reason",...6 items]}`)
      .then(r=>{const j=extractJSON(r);if(!Array.isArray(j.numbers)||j.numbers.length!==6)throw new Error('bad');return j;})
      .catch(()=>null),
    (async()=>{
      for(let i=0;i<4;i++){
        const el=document.getElementById(['t1','t2','t3','t4'][i]);
        el.classList.add('active');
        await sleep(500+Math.random()*150);
        el.classList.remove('active');el.classList.add('done');
        el.querySelector('span:first-child').textContent='✅';
      }
    })()
  ]);

  if(!pick){
    const pool=[...Array(37)].map((_,i)=>i+1).sort(()=>Math.random()-.5);
    _nums=pool.slice(0,6).sort((a,b)=>a-b);
    _strong=Math.ceil(Math.random()*7);
    _reasons=_nums.map(()=>'בחירה חכמה');
  }else{
    _nums=pick.numbers;_strong=pick.strong;_reasons=pick.reasons||_nums.map(()=>'');
  }

  _renderBalls(false);
  document.getElementById('blur-overlay').classList.remove('hidden');
  document.getElementById('strong-hint').textContent='☝️ המספר החזק מוסתר';
  document.getElementById('result-wrap').classList.add('show');
  think.classList.remove('show');
  setTimeout(()=>document.querySelectorAll('.why-fill[data-w]').forEach(b=>b.style.width=b.dataset.w+'%'),80);

  btn.disabled=false;
  document.getElementById('go-icon').className='';
  document.getElementById('go-icon').textContent='✨';
  document.getElementById('go-txt').textContent='צור שורת מספרים בשבילי';
  running=false;
}

// ─── Render Balls ─────────────────────────────────────────────
function _renderBalls(showReasons){
  const rb=document.getElementById('result-balls');rb.innerHTML='';
  _nums.forEach((n,i)=>{
    const b=document.createElement('div');
    b.className='rball rball-main';b.textContent=String(n);
    b.setAttribute('role','listitem');b.style.animationDelay=i*.08+'s';
    rb.appendChild(b);
  });
  const pl=document.createElement('span');pl.className='plus-sep';pl.textContent='+';rb.appendChild(pl);
  const sb=document.createElement('div');
  sb.className='rball rball-strong';sb.textContent=String(_strong);
  sb.setAttribute('role','listitem');sb.style.animationDelay='.55s';rb.appendChild(sb);

  const wg=document.getElementById('why-grid');wg.innerHTML='';
  _nums.forEach((n,i)=>{
    const pct=55+Math.floor(Math.random()*45);
    let content=_reasons[i]||'';
    if(!showReasons){
      [n,_strong].forEach(num=>{
        content=content.replace(new RegExp('(?<![\\u0590-\\u05FF\\w])'+num+'(?![\\u0590-\\u05FF\\w])','g'),'<span class="num-mask">??</span>');
      });
    }
    const c=document.createElement('div');c.className='why-card';
    c.innerHTML=`<div class="why-ball-row"><div class="why-mini">${showReasons?n:'?'}</div></div><p class="why-reason">${content}</p><div class="why-bar"><div class="why-fill" data-w="${pct}"></div></div>`;
    wg.appendChild(c);
  });
}

// ─── Copy ─────────────────────────────────────────────────────
function copyNumbers(){
  gtag_event('copy_numbers',{event_category:'engagement'});
  const txt=_nums.join(', ')+' | חזק: '+_strong;
  navigator.clipboard.writeText(txt).then(()=>{
    const btn=document.getElementById('copy-btn');
    btn.textContent='✅ הועתק!';
    setTimeout(()=>{btn.textContent='📋 העתק מספרים';},2000);
  }).catch(()=>{
    const ta=document.createElement('textarea');ta.value=txt;
    document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
    const btn=document.getElementById('copy-btn');
    btn.textContent='✅ הועתק!';
    setTimeout(()=>{btn.textContent='📋 העתק מספרים';},2000);
  });
}

// ─── Expiry ───────────────────────────────────────────────────
function startExpiryCountdown(expiresAt){
  const tick=()=>{
    if(Date.now()>=expiresAt){
      document.getElementById('blur-overlay').classList.remove('hidden');
      document.getElementById('copy-btn').style.display='none';
      revealed=false;return;
    }
    setTimeout(tick,10000);
  };tick();
}

// ─── PayPal ───────────────────────────────────────────────────
function onPayClick(){
  gtag_event('paypal_checkout_click',{event_category:'monetization',currency:'ILS',value:5});
  localStorage.setItem(PENDING_KEY,JSON.stringify({nums:_nums,strong:_strong,reasons:_reasons,ts:Date.now()}));
}

function checkReturnFromStripe(){
  const params=new URLSearchParams(window.location.search);
  const path=window.location.pathname;
  const isSuccess=params.get('payment')==='success'||params.get('st')==='COMPLETED'||path.includes('purchase=success');
  if(!isSuccess)return;
  const raw=localStorage.getItem(PENDING_KEY);
  if(!raw){alert('⚠️ לא נמצאו נתונים שמורים. צור קשר עם התמיכה.');return;}
  let p;try{p=JSON.parse(raw);}catch{return;}
  if(Date.now()-p.ts>EXPIRY_MS){localStorage.removeItem(PENDING_KEY);alert('⏰ פג תוקף. אנא צור שורה חדשה.');return;}
  const expiresAt=p.ts+EXPIRY_MS;
  _nums=p.nums;_strong=p.strong;_reasons=p.reasons||_nums.map(()=>'');
  _renderBalls(true);
  document.getElementById('result-wrap').classList.add('show');
  document.getElementById('blur-overlay').classList.add('hidden');
  document.getElementById('strong-hint').textContent='☝️ מספר חזק';
  document.getElementById('copy-btn').style.display='block';
  revealed=true;
  setTimeout(()=>document.querySelectorAll('.why-fill[data-w]').forEach(b=>b.style.width=b.dataset.w+'%'),80);
  localStorage.removeItem(PENDING_KEY);
  window.history.replaceState({},'',window.location.pathname);
  startExpiryCountdown(expiresAt);
  gtag_event('purchase',{event_category:'monetization',currency:'ILS',value:5});
  gtag_event('numbers_revealed',{event_category:'monetization'});
  const banner=document.createElement('div');
  banner.setAttribute('role','alert');
  banner.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#2e7d32;color:#fff;padding:12px 28px;border-radius:50px;font-family:Heebo,sans-serif;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.3);z-index:9999;white-space:nowrap';
  banner.textContent='✅ התשלום התקבל! המספרים גלויים';
  document.body.appendChild(banner);setTimeout(()=>banner.remove(),4000);
}

// ─── Cookies ─────────────────────────────────────────────────
function acceptCookies(){
  localStorage.setItem('cookies_ok','1');
  document.getElementById('cookie-banner').style.display='none';
}
function showCookieBanner(){
  if(!localStorage.getItem('cookies_ok'))
    document.getElementById('cookie-banner').style.display='block';
}

// ─── Modals ───────────────────────────────────────────────────
function makeTrap(sel,closeFn){
  return e=>{
    if(e.key==='Escape'){closeFn();return;}
    if(e.key!=='Tab')return;
    const els=[...document.querySelector(sel).querySelectorAll('a[href],button:not([disabled])')];
    if(!els.length)return;
    if(e.shiftKey){if(document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus();}}
    else{if(document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus();}}
  };
}
let accTrap=null,payTrap=null,termsTrap=null,privacyTrap=null;

function openPayModal(){
  gtag_event('reveal_click',{event_category:'monetization'});
  lastFocus=document.activeElement;
  document.getElementById('modal-bg').classList.add('open');
  payTrap=makeTrap('#modal-bg .modal',closePayModal);
  document.addEventListener('keydown',payTrap);
  setTimeout(()=>{const f=document.querySelector('#modal-bg a,#modal-bg button:not([disabled])');if(f)f.focus();},50);
}
function closePayModal(){
  document.getElementById('modal-bg').classList.remove('open');
  document.removeEventListener('keydown',payTrap);
  if(lastFocus)lastFocus.focus();
}
function payBgClose(e){if(e.target===document.getElementById('modal-bg'))closePayModal();}

function openAccModal(e){
  if(e)e.preventDefault();
  lastFocus=document.activeElement;
  document.getElementById('acc-modal-bg').classList.add('open');
  accTrap=makeTrap('#acc-modal-bg .modal',closeAccModal);
  document.addEventListener('keydown',accTrap);
  setTimeout(()=>{const f=document.querySelector('#acc-modal-bg .modal button');if(f)f.focus();},50);
}
function closeAccModal(){
  document.getElementById('acc-modal-bg').classList.remove('open');
  document.removeEventListener('keydown',accTrap);
  if(lastFocus)lastFocus.focus();
}
function accBgClose(e){if(e.target===document.getElementById('acc-modal-bg'))closeAccModal();}

function openTermsModal(e){
  if(e)e.preventDefault();
  lastFocus=document.activeElement;
  document.getElementById('terms-modal-bg').classList.add('open');
  termsTrap=e=>{if(e.key==='Escape')closeTermsModal();};
  document.addEventListener('keydown',termsTrap);
  setTimeout(()=>{const f=document.querySelector('#terms-modal-bg .modal button');if(f)f.focus();},50);
}
function closeTermsModal(){
  document.getElementById('terms-modal-bg').classList.remove('open');
  if(termsTrap)document.removeEventListener('keydown',termsTrap);
  if(lastFocus)lastFocus.focus();
}
function termsBgClose(e){if(e.target===document.getElementById('terms-modal-bg'))closeTermsModal();}

function openPrivacyModal(e){
  if(e)e.preventDefault();
  lastFocus=document.activeElement;
  document.getElementById('privacy-modal-bg').classList.add('open');
  privacyTrap=e=>{if(e.key==='Escape')closePrivacyModal();};
  document.addEventListener('keydown',privacyTrap);
  setTimeout(()=>{const f=document.querySelector('#privacy-modal-bg .modal button');if(f)f.focus();},50);
}
function closePrivacyModal(){
  document.getElementById('privacy-modal-bg').classList.remove('open');
  if(privacyTrap)document.removeEventListener('keydown',privacyTrap);
  if(lastFocus)lastFocus.focus();
}
function privacyBgClose(e){if(e.target===document.getElementById('privacy-modal-bg'))closePrivacyModal();}

// ─── Boot ─────────────────────────────────────────────────────
try{
  init();
  checkReturnFromStripe();
  showCookieBanner();
}catch(e){
  console.error('Boot error:',e);
  document.getElementById('results-card').innerHTML='<p style="text-align:center;padding:20px;color:#c8102e">שגיאה בטעינה. אנא רענן את הדף.</p>';
  document.getElementById('go-btn').disabled=false;
  }
