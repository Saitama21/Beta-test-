const tg=window.Telegram?.WebApp;
try{tg?.ready();tg?.expand();tg?.disableVerticalSwipes?.();tg?.setHeaderColor?.('#030712');tg?.setBackgroundColor?.('#030712')}catch(e){}

function syncViewport(){
  const inTelegram=Boolean(tg?.initData||tg?.viewportHeight);
  const tgHeight=Number(tg?.viewportStableHeight||tg?.viewportHeight||0);
  const visualHeight=Number(window.visualViewport?.height||0);
  const cssHeight=Number(window.innerHeight||0);
  const height=Math.max(320,Math.round(inTelegram&&tgHeight?tgHeight:(visualHeight||cssHeight)));
  document.documentElement.style.setProperty('--app-h',`${height}px`);
}
syncViewport();
window.addEventListener('resize',syncViewport,{passive:true});
window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
tg?.onEvent?.('viewportChanged',syncViewport);

const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const CARD_RAW='4314140211726887';
const heroCard=document.getElementById('heroCard');
const copyBtn=document.getElementById('copyBtn');
let copyTimer;

async function writeClipboard(value){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return}
  const ta=document.createElement('textarea');
  ta.value=value;ta.readOnly=true;ta.style.position='fixed';ta.style.opacity='0';ta.style.pointerEvents='none';
  document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
}
async function copyCard(){
  try{await writeClipboard(CARD_RAW)}catch(e){return}
  clearTimeout(copyTimer);
  heroCard?.classList.remove('is-copied');
  if(copyBtn)void copyBtn.offsetWidth;
  heroCard?.classList.add('is-copied');
  if(window.gsap&&!reduceMotion&&copyBtn){window.gsap.fromTo(copyBtn,{scale:.93},{scale:1,duration:.52,ease:'back.out(2.1)',overwrite:true})}
  try{tg?.HapticFeedback?.notificationOccurred?.('success')}catch(e){}
  copyTimer=setTimeout(()=>heroCard?.classList.remove('is-copied'),2200);
}
copyBtn?.addEventListener('click',copyCard);

function initPremiumMotion(){
  const gsap=window.gsap;
  const MotionPathPlugin=window.MotionPathPlugin;
  if(!gsap||!MotionPathPlugin||reduceMotion)return;
  gsap.registerPlugin(MotionPathPlugin);

  const phone=document.querySelector('.phone-3d');
  const card=document.querySelector('.bank-card-3d');
  const sheen=document.querySelector('.card-sheen');
  const veil=document.querySelector('.stage-veil');
  const liveDot=document.querySelector('.live-pill span');
  const packets=['.packet-a','.packet-b','.packet-c'];
  const highlights=['.flow-highlight-a','.flow-highlight-b','.flow-highlight-c'];
  const digits=[...document.querySelectorAll('.transfer-digits text')];

  gsap.set(phone,{transformPerspective:600,rotationY:10,rotationZ:-3,transformOrigin:'50% 50%'});
  gsap.set(card,{transformPerspective:600,rotationY:-10,rotationZ:-3,transformOrigin:'50% 50%'});
  gsap.set(sheen,{xPercent:-140,opacity:0});
  gsap.set(packets,{opacity:0,scale:.55,transformOrigin:'50% 50%'});
  gsap.set(highlights,{strokeDashoffset:100,opacity:0});
  gsap.set(digits,{opacity:0,y:6,scale:.88,transformOrigin:'50% 50%'});

  const liveTween=liveDot?gsap.to(liveDot,{scale:.76,opacity:.42,boxShadow:'0 0 3px #ff245f',duration:1.35,ease:'sine.inOut',repeat:-1,yoyo:true}):null;

  const scene=gsap.timeline({repeat:-1,repeatDelay:1.25,defaults:{overwrite:'auto'}});
  scene
    .to(veil,{opacity:.82,duration:.55,ease:'sine.out'},.12)
    .to(phone,{y:-1.4,rotationY:8.4,rotationZ:-2.5,duration:.52,ease:'power2.out'},.08)
    .fromTo('.flow-highlight-a',{strokeDashoffset:100,opacity:0},{strokeDashoffset:0,opacity:.92,duration:1.6,ease:'power2.inOut'},.26)
    .fromTo('.packet-a',{opacity:0,scale:.52},{opacity:1,scale:1,duration:.18,ease:'power2.out'},.34)
    .to('.packet-a',{motionPath:{path:'#flowPathA',align:'#flowPathA',alignOrigin:[.5,.5],autoRotate:false,start:0,end:1},duration:1.52,ease:'power2.inOut'},.34)
    .to('.packet-a',{opacity:0,scale:.68,duration:.2,ease:'power2.in'},1.68)
    .fromTo('.flow-highlight-b',{strokeDashoffset:100,opacity:0},{strokeDashoffset:0,opacity:.72,duration:1.75,ease:'power2.inOut'},.62)
    .fromTo('.packet-b',{opacity:0,scale:.5},{opacity:.88,scale:.92,duration:.18,ease:'power2.out'},.7)
    .to('.packet-b',{motionPath:{path:'#flowPathB',align:'#flowPathB',alignOrigin:[.5,.5],autoRotate:false,start:0,end:1},duration:1.66,ease:'power2.inOut'},.7)
    .to('.packet-b',{opacity:0,scale:.62,duration:.2,ease:'power2.in'},2.18)
    .fromTo('.flow-highlight-c',{strokeDashoffset:100,opacity:0},{strokeDashoffset:0,opacity:.42,duration:1.9,ease:'power1.inOut'},.94)
    .fromTo('.packet-c',{opacity:0,scale:.45},{opacity:.62,scale:.8,duration:.16,ease:'power2.out'},1.02)
    .to('.packet-c',{motionPath:{path:'#flowPathC',align:'#flowPathC',alignOrigin:[.5,.5],autoRotate:false,start:0,end:1},duration:1.78,ease:'power1.inOut'},1.02)
    .to('.packet-c',{opacity:0,scale:.55,duration:.2,ease:'power2.in'},2.62)
    .fromTo(digits[0],{opacity:0,y:8,scale:.84},{opacity:.52,y:0,scale:1,duration:.3,ease:'power2.out'},.82)
    .to(digits[0],{opacity:0,y:-7,scale:.96,duration:.46,ease:'power1.in'},1.34)
    .fromTo(digits[1],{opacity:0,y:7,scale:.84},{opacity:.48,y:0,scale:1,duration:.3,ease:'power2.out'},1.06)
    .to(digits[1],{opacity:0,y:-6,scale:.95,duration:.46,ease:'power1.in'},1.56)
    .fromTo(digits[2],{opacity:0,y:7,scale:.86},{opacity:.46,y:0,scale:1,duration:.28,ease:'power2.out'},1.3)
    .to(digits[2],{opacity:0,y:-5,scale:.95,duration:.42,ease:'power1.in'},1.76)
    .to(card,{y:-2.1,rotationY:-5.2,rotationZ:-1.4,boxShadow:'inset 0 1px #ffffff62,inset -7px -10px 17px #62051e55,0 13px 22px #0008,0 0 25px #ff3c7660',duration:.26,ease:'power3.out'},1.72)
    .fromTo(sheen,{xPercent:-140,opacity:0},{xPercent:285,opacity:.62,duration:.78,ease:'power2.inOut'},1.68)
    .to(card,{y:0,rotationY:-10,rotationZ:-3,boxShadow:'inset 0 1px #ffffff52,inset -7px -10px 17px #62051e55,0 12px 20px #0008,0 0 13px #ff2c6535',duration:.74,ease:'expo.out'},2.02)
    .to(phone,{y:0,rotationY:10,rotationZ:-3,duration:.76,ease:'expo.out'},1.94)
    .to(veil,{opacity:.64,duration:.9,ease:'sine.inOut'},2.5)
    .to(highlights,{opacity:0,duration:.5,ease:'sine.out'},2.55)
    .set(sheen,{xPercent:-140,opacity:0},3.1);

  const onVisibility=()=>{document.hidden?scene.pause():scene.resume()};
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',()=>{scene.kill();liveTween?.kill();document.removeEventListener('visibilitychange',onVisibility)},{once:true});
}

const usdEl=document.getElementById('usdVal');
const eurEl=document.getElementById('eurVal');
const syncPill=document.getElementById('syncPill');
const CACHE_KEY='pumb-nbu-rates-v2';
let ratesLoading=false,lastRatesUpdate=0;
const fmtDate=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
function renderRate(el,val){if(el&&Number.isFinite(val))el.textContent=`${val.toFixed(2)} ₴`}
function readCachedRates(){try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(!c)return;renderRate(usdEl,c.usd);renderRate(eurEl,c.eur);lastRatesUpdate=c.ts||0}catch(e){}}
async function getRate(code,date){const u=`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&date=${fmtDate(date)}&json`;const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('rate');const j=await r.json();return Number(j?.[0]?.rate)||null}
async function latestRate(code){for(let i=0;i<8;i++){const d=new Date();d.setDate(d.getDate()-i);const value=await getRate(code,d).catch(()=>null);if(value)return value}return null}
function animateSync(){const icon=syncPill?.querySelector('svg');if(!icon||!window.gsap||reduceMotion)return;window.gsap.fromTo(icon,{rotation:0},{rotation:360,duration:.72,ease:'power2.inOut',overwrite:true})}
async function loadRates(){
  if(ratesLoading||!navigator.onLine)return;
  ratesLoading=true;animateSync();
  try{
    const [usd,eur]=await Promise.all([latestRate('USD'),latestRate('EUR')]);
    if(usd)renderRate(usdEl,usd);if(eur)renderRate(eurEl,eur);
    if(usd||eur){lastRatesUpdate=Date.now();localStorage.setItem(CACHE_KEY,JSON.stringify({usd:usd||null,eur:eur||null,ts:lastRatesUpdate}))}
  }finally{ratesLoading=false}
}

readCachedRates();
initPremiumMotion();
loadRates();
setInterval(loadRates,15*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRatesUpdate>60*1000)loadRates()});
window.addEventListener('online',loadRates);
