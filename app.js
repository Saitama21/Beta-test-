const tg=window.Telegram?.WebApp;
try{tg?.ready();tg?.expand();tg?.disableVerticalSwipes?.();tg?.setHeaderColor?.('#030712');tg?.setBackgroundColor?.('#030712')}catch(e){}

const CARD_RAW='4314140211726887';
const heroCard=document.getElementById('heroCard');
const copyBtn=document.getElementById('copyBtn');
let copyTimer;

async function writeClipboard(value){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}
  const ta=document.createElement('textarea');
  ta.value=value;ta.readOnly=true;ta.style.position='fixed';ta.style.opacity='0';ta.style.pointerEvents='none';
  document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
}
async function copyCard(){
  try{await writeClipboard(CARD_RAW)}catch(e){return}
  clearTimeout(copyTimer);
  heroCard.classList.remove('is-copied');
  void copyBtn.offsetWidth;
  heroCard.classList.add('is-copied');
  try{tg?.HapticFeedback?.notificationOccurred?.('success')}catch(e){}
  copyTimer=setTimeout(()=>heroCard.classList.remove('is-copied'),2300);
}
copyBtn.addEventListener('click',copyCard);

const usdEl=document.getElementById('usdVal');
const eurEl=document.getElementById('eurVal');
const syncPill=document.getElementById('syncPill');
const CACHE_KEY='pumb-nbu-rates-v2';
let ratesLoading=false,lastRatesUpdate=0;
const fmtDate=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
function renderRate(el,val){if(Number.isFinite(val))el.textContent=`${val.toFixed(2)} ₴`}
function readCachedRates(){try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(!c)return;renderRate(usdEl,c.usd);renderRate(eurEl,c.eur);lastRatesUpdate=c.ts||0}catch(e){}}
async function getRate(code,date){const u=`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&date=${fmtDate(date)}&json`;const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('rate');const j=await r.json();return Number(j?.[0]?.rate)||null}
async function latestRate(code){for(let i=0;i<8;i++){const d=new Date();d.setDate(d.getDate()-i);const value=await getRate(code,d).catch(()=>null);if(value)return value}return null}
async function loadRates(){
  if(ratesLoading||!navigator.onLine)return;
  ratesLoading=true;syncPill.classList.add('is-syncing');
  try{
    const [usd,eur]=await Promise.all([latestRate('USD'),latestRate('EUR')]);
    if(usd)renderRate(usdEl,usd);if(eur)renderRate(eurEl,eur);
    if(usd||eur){lastRatesUpdate=Date.now();localStorage.setItem(CACHE_KEY,JSON.stringify({usd:usd||null,eur:eur||null,ts:lastRatesUpdate}))}
  }finally{setTimeout(()=>syncPill.classList.remove('is-syncing'),700);ratesLoading=false}
}
readCachedRates();loadRates();setInterval(loadRates,15*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRatesUpdate>60*1000)loadRates()});
window.addEventListener('online',loadRates);
