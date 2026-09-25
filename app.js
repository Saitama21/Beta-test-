(() => {
  'use strict';

  const STORAGE_KEY='cutcalc.history.v3';
  const THEME_KEY='cutcalc.theme.v2';
  const MAX_HISTORY=60;
  const MACHINE=Object.freeze({minChuckGripMm:Math.max(0,Number(window.CUTCALC_MACHINE_CONFIG?.minChuckGripMm)||46)});
  const $=id=>document.getElementById(id);
  const $$=sel=>Array.from(document.querySelectorAll(sel));
  const fields=['material','diameter','partLength','quantity','kerf','faceA','faceB','stockLength','stockFace','reservePct'];
  const numberFields=fields.filter(id=>id!=='material');
  const ru=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
  const ru3=new Intl.NumberFormat('ru-RU',{minimumFractionDigits:3,maximumFractionDigits:3});
  let lastResult=null;
  let deferredInstallPrompt=null;
  let toastTimer=0;

  function value(id){return $(id)?.value??'';}
  function readInput(){
    return {
      material:value('material'),diameter:value('diameter'),partLength:value('partLength'),quantity:value('quantity'),
      kerf:value('kerf'),faceA:value('faceA'),faceB:value('faceB'),stockLength:value('stockLength'),
      stockFace:value('stockFace'),reservePct:value('reservePct'),minChuckGrip:MACHINE.minChuckGripMm
    };
  }
  function hasCoreInput(){return String(value('partLength')).trim()!==''||String(value('quantity')).trim()!=='';}
  function plural(n,one,few,many){const n10=n%10,n100=n%100;if(n10===1&&n100!==11)return one;if(n10>=2&&n10<=4&&(n100<12||n100>14))return few;return many;}
  function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
  function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}

  function setTheme(theme){
    const safe=theme==='dark'?'dark':'light';
    document.documentElement.dataset.theme=safe;
    try{localStorage.setItem(THEME_KEY,safe);}catch{}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=safe==='dark'?'#0a0d11':'#f4f6f8';
    const btn=$('themeToggle');
    if(btn)btn.querySelector('span').textContent=safe==='dark'?'☾':'☼';
  }
  function initTheme(){
    let saved='light';
    try{saved=localStorage.getItem(THEME_KEY)||document.documentElement.dataset.theme||'light';}catch{}
    setTheme(saved);
  }
  function toggleTheme(){setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');}

  function showToast(message){
    clearTimeout(toastTimer);
    const node=$('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    toastTimer=setTimeout(()=>node.classList.remove('show'),1800);
  }

  function renderNeutral(){
    lastResult=null;
    $('purchaseMeters').textContent='—';
    $('purchaseHint').textContent='Заполни длину детали и количество';
    $('cycleLength').textContent='—';
    $('netLength').textContent='—';
    $('techLoss').textContent='—';
    $('partsPerBar').textContent='—';
    $('barsCount').textContent='—';
    $('gripTail').textContent='—';
    $('remainderValue').textContent='—';
    $('warning').hidden=true;
    $('saveBtn').disabled=true;
  }

  function renderInvalid(r){
    lastResult=r;
    $('purchaseMeters').textContent='—';
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
    $('saveBtn').disabled=true;
  }

  function render(){
    if(!hasCoreInput()){renderNeutral();return;}
    const r=window.CutCalcCore.calculate(readInput());
    if(!r.valid){renderInvalid(r);return;}

    lastResult=r;
    $('warning').hidden=true;
    $('saveBtn').disabled=false;
    $('purchaseMeters').textContent=ru3.format(r.purchaseLength/1000);
    $('cycleLength').textContent=`${ru.format(r.cycleLength)} мм`;
    $('netLength').textContent=`${ru.format(r.input.partLength)} мм`;
    $('techLoss').textContent=`${ru.format(r.processLoss)} мм`;

    if(r.mode==='direct'){
      $('purchaseHint').textContent=`${r.targetQuantity} шт × ${ru.format(r.cycleLength)} мм${r.input.reservePct>0?' · с запасом':''}`;
      $('partsPerBar').textContent='—';
      $('barsCount').textContent='—';
      $('gripTail').textContent='—';
      $('remainderValue').textContent='—';
      return;
    }

    $('purchaseHint').textContent=`${r.bars} ${plural(r.bars,'пруток','прутка','прутков')} × ${ru3.format(r.input.stockLength/1000)} м · ${r.targetQuantity} шт`;
    $('partsPerBar').textContent=`${r.partsPerBar} шт`;
    $('barsCount').textContent=String(r.bars);
    $('gripTail').textContent=`${ru.format(r.fullBarGripTail)} мм`;
    $('remainderValue').textContent=r.reusableRemainder>0?`${ru.format(r.reusableRemainder)} мм`:'—';
  }

  function getHistory(){
    try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(data)?data:[];}catch{return [];}
  }
  function setHistory(items){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_HISTORY)));}catch{showToast('Не удалось сохранить локально');}
  }
  function saveCurrent(){
    if(!lastResult?.valid)return;
    const item={
      id:`${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
      createdAt:new Date().toISOString(),
      input:lastResult.input,
      result:{purchaseLength:lastResult.purchaseLength,cycleLength:lastResult.cycleLength,targetQuantity:lastResult.targetQuantity}
    };
    const history=getHistory();history.unshift(item);setHistory(history);renderHistory();showToast('Расчёт сохранён');
  }
  function formatDate(iso){
    const d=new Date(iso);if(Number.isNaN(d.valueOf()))return '';
    const now=new Date();const same=now.toDateString()===d.toDateString();
    return same?`Сегодня, ${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(d)}`:new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function materialThumb(material){return /латун|brass|cuzn/i.test(material)?'./assets/rod-brass.webp':'./assets/rod-steel.webp';}
  function renderHistory(){
    const list=$('historyList');const items=getHistory();
    list.replaceChildren();$('historyEmpty').hidden=items.length>0;$('clearHistory').hidden=items.length===0;
    for(const item of items){
      const card=document.createElement('button');card.type='button';card.className='history-card';
      const material=item.input.material||'Материал';
      const dia=item.input.diameter>0?`Ø ${ru.format(item.input.diameter)} мм`:'Ø —';
      card.innerHTML=`
        <img class="history-thumb" src="${materialThumb(material)}" alt="" width="58" height="48">
        <span class="history-main"><strong>${escapeHtml(material)}</strong><small>${escapeHtml(dia)}</small><small>L ${ru.format(item.input.partLength)} мм&nbsp;&nbsp;•&nbsp;&nbsp;${item.input.quantity} шт</small></span>
        <span class="history-result"><small>${formatDate(item.createdAt)}</small><strong>${ru3.format(item.result.purchaseLength/1000)} м</strong></span>
        <span class="history-arrow">›</span>`;
      card.addEventListener('click',()=>{applyInput(item.input);switchScreen('calc');showToast('Расчёт загружен');});
      list.append(card);
    }
  }
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

  function applyInput(data){for(const id of fields){const node=$(id);if(node)node.value=data[id]??'';}render();window.scrollTo({top:0,behavior:'smooth'});}
  function clearCalculator(){for(const id of fields){const node=$(id);if(node)node.value='';}renderNeutral();$('barDetails').open=false;showToast('Поля очищены');}
  function switchScreen(name){
    $$('.screen').forEach(node=>node.classList.toggle('is-active',node.dataset.screen===name));
    $$('.dock-item').forEach(node=>node.classList.toggle('is-active',node.dataset.target===name));
    if(name==='history')renderHistory();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function updateOfflineState(){
    const node=$('offlineState');if(!node)return;
    const label=node.querySelector('b');
    if(navigator.onLine){node.classList.remove('is-offline');label.textContent='Готов к работе';}
    else{node.classList.add('is-offline');label.textContent='Офлайн';}
  }

  function setupInstall(){
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;});
    window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;showToast('CutCalc установлен');});
  }
  async function requestInstall(){
    if(isStandalone()){showToast('Приложение уже установлено');return;}
    if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice;}catch{}deferredInstallPrompt=null;return;}
    if(isIos())$('iosHint').hidden=false;else showToast('Установка доступна из меню браузера');
  }
  async function requestPersistentStorage(){try{if(navigator.storage?.persist)await navigator.storage.persist();}catch{}}

  function init(){
    initTheme();
    requestPersistentStorage();
    $('minGripValue').textContent=`${ru.format(MACHINE.minChuckGripMm)} мм`;
    numberFields.forEach(id=>{$(id)?.addEventListener('input',render);$(id)?.addEventListener('change',render);});
    $('material')?.addEventListener('input',render);
    $('calcForm')?.addEventListener('submit',event=>event.preventDefault());
    $('themeToggle')?.addEventListener('click',toggleTheme);
    $('installBtn')?.addEventListener('click',requestInstall);
    $('clearAll')?.addEventListener('click',clearCalculator);
    $('saveBtn')?.addEventListener('click',saveCurrent);
    $('clearHistory')?.addEventListener('click',()=>{if(getHistory().length&&confirm('Удалить всю историю расчётов на этом устройстве?')){setHistory([]);renderHistory();showToast('История очищена');}});
    $$('.dock-item').forEach(btn=>btn.addEventListener('click',()=>switchScreen(btn.dataset.target)));
    $('closeIosHint')?.addEventListener('click',()=>{$('iosHint').hidden=true;});
    $('iosHint')?.addEventListener('click',e=>{if(e.target===$('iosHint'))$('iosHint').hidden=true;});
    window.addEventListener('online',updateOfflineState,{passive:true});
    window.addEventListener('offline',updateOfflineState,{passive:true});
    renderNeutral();renderHistory();updateOfflineState();setupInstall();
  }

  init();
})();
