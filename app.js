(() => {
  'use strict';

  const STORAGE_KEY='cutcalc.history.v3';
  const THEME_KEY='cutcalc.theme.v5';
  const MAX_HISTORY=60;
  const MACHINE=Object.freeze({minChuckGripMm:Math.max(0,Number(window.CUTCALC_MACHINE_CONFIG?.minChuckGripMm)||46)});
  const $=id=>document.getElementById(id);
  const $$=sel=>Array.from(document.querySelectorAll(sel));
  const fields=['material','diameter','partLength','quantity','kerf','faceA','faceB','stockLength','stockFace','reservePct'];
  const numeric=fields.filter(id=>id!=='material');
  const ru=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
  const ru3=new Intl.NumberFormat('ru-RU',{minimumFractionDigits:3,maximumFractionDigits:3});
  let lastResult=null;
  let installPrompt=null;
  let toastTimer=0;

  const raw=id=>$(id)?.value??'';
  const input=()=>({
    material:raw('material'),diameter:raw('diameter'),partLength:raw('partLength'),quantity:raw('quantity'),
    kerf:raw('kerf'),faceA:raw('faceA'),faceB:raw('faceB'),stockLength:raw('stockLength'),
    stockFace:raw('stockFace'),reservePct:raw('reservePct'),minChuckGrip:MACHINE.minChuckGripMm
  });
  const hasCore=()=>String(raw('partLength')).trim()!==''||String(raw('quantity')).trim()!=='';

  function theme(next){
    const mode=next==='dark'?'dark':'light';
    document.documentElement.dataset.theme=mode;
    try{localStorage.setItem(THEME_KEY,mode)}catch{}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=mode==='dark'?'#060c12':'#dfe8ef';
    const icon=$('themeIcon');
    if(icon)icon.textContent=mode==='dark'?'☀︎':'☾';
    const toggle=$('themeToggle');
    if(toggle)toggle.setAttribute('aria-label',mode==='dark'?'Включить светлый режим':'Включить тёмный режим');
  }

  function toast(message){
    clearTimeout(toastTimer);
    const node=$('toast'); if(!node)return;
    node.textContent=message; node.classList.add('show');
    toastTimer=setTimeout(()=>node.classList.remove('show'),1700);
  }

  function resetResult(){
    lastResult=null;
    $('purchaseMeters').textContent='—';
    $('purchaseHint').hidden=false;
    $('purchaseHint').textContent='Заполни длину детали и количество';
    $('cycleLength').textContent='—';
    $('netLength').textContent='—';
    $('techLoss').textContent='—';
    $('partsPerBar').textContent='—';
    $('barsCount').textContent='—';
    $('gripTail').textContent='—';
    $('remainderValue').textContent='—';
    $('warning').hidden=true;
  }

  function invalid(r){
    lastResult=r;
    $('purchaseMeters').textContent='—';
    $('purchaseHint').hidden=false;
    $('purchaseHint').textContent='Нужны исходные данные';
    $('cycleLength').textContent=r.cycleLength>0?`${ru.format(r.cycleLength)} мм`:'—';
    $('netLength').textContent=r.input?.partLength>0?`${ru.format(r.input.partLength)} мм`:'—';
    $('techLoss').textContent='—';
    $('partsPerBar').textContent='—';
    $('barsCount').textContent='—';
    $('gripTail').textContent='—';
    $('remainderValue').textContent='—';
    $('warning').hidden=false;
    $('warning').textContent=r.errors.join(' ');
  }

  function render(){
    if(!hasCore()){resetResult();return}
    const r=window.CutCalcCore.calculate(input());
    if(!r.valid){invalid(r);return}
    lastResult=r;
    $('warning').hidden=true;
    $('purchaseHint').hidden=true;
    $('purchaseMeters').textContent=ru3.format(r.purchaseLength/1000);
    $('cycleLength').textContent=`${ru.format(r.cycleLength)} мм`;
    $('netLength').textContent=`${ru.format(r.input.partLength)} мм`;
    $('techLoss').textContent=`${ru.format(r.processLoss)} мм`;

    if(r.mode==='direct'){
      $('purchaseHint').textContent=`${r.targetQuantity} шт × ${ru.format(r.cycleLength)} мм${r.input.reservePct>0?' · с запасом':''}`;
      $('partsPerBar').textContent='—';$('barsCount').textContent='—';$('gripTail').textContent='—';$('remainderValue').textContent='—';
      return;
    }

    $('purchaseHint').textContent=`${r.bars} ${r.bars===1?'пруток':'прутка'} × ${ru3.format(r.input.stockLength/1000)} м · ${r.targetQuantity} шт`;
    $('partsPerBar').textContent=`${r.partsPerBar} шт`;
    $('barsCount').textContent=String(r.bars);
    $('gripTail').textContent=`${ru.format(r.fullBarGripTail)} мм`;
    $('remainderValue').textContent=r.reusableRemainder>0?`${ru.format(r.reusableRemainder)} мм`:'—';
  }

  function history(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function putHistory(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_HISTORY)))}catch{toast('Не удалось сохранить локально')}}
  function signature(i,r){return JSON.stringify({material:i.material||'',diameter:+i.diameter||0,partLength:+i.partLength||0,quantity:+i.quantity||0,kerf:+i.kerf||0,faceA:+i.faceA||0,faceB:+i.faceB||0,stockLength:+i.stockLength||0,stockFace:+i.stockFace||0,reservePct:+i.reservePct||0,purchaseLength:+r.purchaseLength||0})}
  function saveSnapshot(){
    if(!lastResult?.valid)return;
    const sig=signature(lastResult.input,lastResult);
    const list=history();
    if(list.some(x=>x.signature===sig))return;
    list.unshift({id:`${Date.now()}-${Math.random().toString(16).slice(2,8)}`,createdAt:new Date().toISOString(),signature:sig,input:lastResult.input,result:{purchaseLength:lastResult.purchaseLength}});
    putHistory(list);
  }
  function dateText(iso){
    const d=new Date(iso); if(Number.isNaN(d.valueOf()))return '';
    const now=new Date();
    return now.toDateString()===d.toDateString()
      ? `Сегодня, ${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(d)}`
      : new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function esc(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function thumb(material){return /латун|brass|cuzn/i.test(material)?'./assets/rod-brass.webp':'./assets/rod-steel.webp'}
  function renderHistory(){
    const list=$('historyList'); const items=history();
    list.replaceChildren(); $('historyEmpty').hidden=items.length>0; $('clearHistory').hidden=items.length===0;
    for(const item of items){
      const b=document.createElement('button'); b.type='button'; b.className='history-card';
      const material=item.input.material||'Материал';
      const dia=item.input.diameter>0?`Ø ${ru.format(item.input.diameter)} мм`:'Ø —';
      b.innerHTML=`<img class="history-thumb" src="${thumb(material)}" alt="">
        <span class="history-main"><strong>${esc(material)}</strong><small>${esc(dia)}</small><small>L ${ru.format(item.input.partLength)} мм · ${item.input.quantity} шт</small></span>
        <span class="history-result"><small>${dateText(item.createdAt)}</small><strong>${ru3.format(item.result.purchaseLength/1000)} м</strong></span>
        <span class="history-arrow">›</span>`;
      b.addEventListener('click',()=>{load(item.input);show('calc');toast('Расчёт загружен')});
      list.append(b);
    }
  }

  function load(data){for(const id of fields){const n=$(id);if(n)n.value=data[id]??''}render();window.scrollTo({top:0,behavior:'smooth'})}
  function clearAll(){for(const id of fields){const n=$(id);if(n)n.value=''}resetResult();$('barDetails').open=false;toast('Поля очищены')}
  function show(name){
    if(name==='history')saveSnapshot();
    document.querySelector('.app-shell')?.setAttribute('data-view',name);
    $$('.screen').forEach(n=>n.classList.toggle('is-active',n.dataset.screen===name));
    $$('.dock-item').forEach(n=>n.classList.toggle('is-active',n.dataset.target===name));
    if(name==='history')renderHistory();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function network(){
    const node=$('offlineState'); if(!node)return;
    if(navigator.onLine){node.classList.remove('is-offline');node.querySelector('span').textContent='Готов к работе'}
    else{node.classList.add('is-offline');node.querySelector('span').textContent='Офлайн'}
  }
  function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  function ios(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
  async function install(){
    if(standalone()){toast('Приложение уже установлено');return}
    if(installPrompt){installPrompt.prompt();try{await installPrompt.userChoice}catch{}installPrompt=null;return}
    if(ios())$('iosHint').hidden=false;else toast('Установка доступна из меню браузера');
  }

  function init(){
    let saved='dark';try{saved=localStorage.getItem(THEME_KEY)||document.documentElement.dataset.theme||'dark'}catch{}
    theme(saved);
    $('minGripValue').textContent=`${ru.format(MACHINE.minChuckGripMm)} мм`;
    numeric.forEach(id=>{$(id)?.addEventListener('input',render);$(id)?.addEventListener('change',render)});
    $('material')?.addEventListener('input',render);
    $('calcForm')?.addEventListener('submit',e=>e.preventDefault());
    $('themeToggle')?.addEventListener('click',()=>theme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
    $('installBtn')?.addEventListener('click',install);
    $('clearAll')?.addEventListener('click',clearAll);
    $('clearHistory')?.addEventListener('click',()=>{if(history().length&&confirm('Удалить всю историю расчётов?')){putHistory([]);renderHistory();toast('История очищена')}});
    $$('.dock-item').forEach(b=>b.addEventListener('click',()=>show(b.dataset.target)));
    $('closeIosHint')?.addEventListener('click',()=>{$('iosHint').hidden=true});
    $('iosHint')?.addEventListener('click',e=>{if(e.target===$('iosHint'))$('iosHint').hidden=true});
    window.addEventListener('online',network,{passive:true});window.addEventListener('offline',network,{passive:true});
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
    try{navigator.storage?.persist?.()}catch{}
    try{window.history.scrollRestoration='manual'}catch{}
    requestAnimationFrame(()=>window.scrollTo(0,0));
    window.addEventListener('pageshow',()=>window.scrollTo(0,0),{passive:true});
    resetResult();renderHistory();network();
  }

  init();
})();