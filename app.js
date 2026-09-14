(() => {
  'use strict';

  const STORAGE_KEY = 'cutcalc.history.v1';
  const THEME_KEY = 'cutcalc.theme.v1';
  const MAX_HISTORY = 40;

  const $ = (id) => document.getElementById(id);
  const form = $('calcForm');
  const fields = ['material','diameter','partLength','quantity','kerf','faceA','faceB','stockLength','stockFace','deadTail','reservePct'];
  const numberFields = fields.filter((id) => id !== 'material');
  const requiredCore = ['partLength','quantity','stockLength'];
  let deferredInstallPrompt = null;
  let lastResult = null;
  let toastTimer = 0;

  const ru = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const ru3 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function hasRawValue(id) {
    return String($(id).value ?? '').trim() !== '';
  }

  function hasAnyCoreInput() {
    return requiredCore.some(hasRawValue);
  }

  function readInput() {
    return {
      material: $('material').value.trim(),
      diameter: Math.max(0, finite($('diameter').value)),
      partLength: Math.max(0, finite($('partLength').value)),
      quantity: Math.max(0, Math.floor(finite($('quantity').value))),
      kerf: Math.max(0, finite($('kerf').value)),
      faceA: Math.max(0, finite($('faceA').value)),
      faceB: Math.max(0, finite($('faceB').value)),
      stockLength: Math.max(0, finite($('stockLength').value)),
      stockFace: Math.max(0, finite($('stockFace').value)),
      deadTail: Math.max(0, finite($('deadTail').value)),
      reservePct: clamp(finite($('reservePct').value), 0, 100)
    };
  }

  function calculate(i) {
    const errors = [];
    if (i.partLength <= 0) errors.push('Укажи длину детали.');
    if (i.quantity <= 0) errors.push('Укажи количество деталей.');
    if (i.stockLength <= 0) errors.push('Укажи длину прутка.');

    const cycleLength = i.partLength + i.faceA + i.faceB + i.kerf;
    const targetQuantity = i.quantity > 0 ? Math.ceil(i.quantity * (1 + i.reservePct / 100)) : 0;
    const usableForCycles = Math.max(0, i.stockLength - i.stockFace - i.deadTail);
    const partsPerBar = cycleLength > 0 ? Math.floor(usableForCycles / cycleLength) : 0;

    if (cycleLength <= 0 && i.partLength > 0) errors.push('Расход на одну деталь равен нулю.');
    if (i.deadTail + i.stockFace >= i.stockLength && i.stockLength > 0) errors.push('Мёртвый хвост и первая торцовка занимают весь пруток.');
    if (partsPerBar < 1 && i.partLength > 0 && i.stockLength > 0 && !errors.length) {
      errors.push('Из такого прутка не получается ни одной детали с заданными припусками.');
    }

    if (errors.length) return { valid: false, errors, input: i, cycleLength, targetQuantity, partsPerBar };

    const bars = Math.ceil(targetQuantity / partsPerBar);
    const fullBarsBeforeLast = Math.max(0, bars - 1);
    const partsLastBar = targetQuantity - fullBarsBeforeLast * partsPerBar;
    const purchaseLength = bars * i.stockLength;
    const netProductLength = targetQuantity * i.partLength;
    const perPartProcessLoss = i.faceA + i.faceB + i.kerf;
    const processLoss = targetQuantity * perPartProcessLoss + bars * i.stockFace;

    const exhaustedTail = i.stockLength - i.stockFace - partsPerBar * cycleLength;
    const scrapFromFullBars = fullBarsBeforeLast * exhaustedTail;
    const lastRawRemainder = i.stockLength - i.stockFace - partsLastBar * cycleLength;
    const lastIsExhausted = partsLastBar === partsPerBar;
    const reusableRemainder = lastIsExhausted ? 0 : Math.max(0, lastRawRemainder);
    const lastScrap = lastIsExhausted ? Math.max(0, lastRawRemainder) : 0;
    const unavoidableScrap = scrapFromFullBars + lastScrap;
    const accounted = netProductLength + processLoss + unavoidableScrap + reusableRemainder;
    const accountingDelta = purchaseLength - accounted;
    const efficiency = purchaseLength > 0 ? (netProductLength / purchaseLength) * 100 : 0;
    const materialUsedForBatch = purchaseLength - reusableRemainder;

    return {
      valid: true, input: i, cycleLength, targetQuantity, partsPerBar, bars, partsLastBar,
      purchaseLength, netProductLength, processLoss, exhaustedTail, unavoidableScrap,
      reusableRemainder, materialUsedForBatch, efficiency, accountingDelta
    };
  }

  function renderNeutral() {
    lastResult = null;
    $('resultLabel').textContent = 'Расчёт не выполнен';
    $('purchaseMeters').textContent = '—';
    $('purchaseHint').textContent = 'Заполни длину детали, количество и длину прутка';
    $('cycleLength').textContent = '—';
    $('partsPerBar').textContent = '—';
    $('techLoss').textContent = '—';
    $('reusableLeft').textContent = '—';
    $('efficiencyValue').textContent = '—';
    $('efficiencyRing').style.setProperty('--p', 0);
    $('barViz').replaceChildren();
    $('barBlock').hidden = true;
    $('lastBarText').textContent = '—';
    $('warning').hidden = true;
    $('saveBtn').disabled = true;
  }

  function renderInvalid(r) {
    lastResult = r;
    $('resultLabel').textContent = 'Нужны исходные данные';
    $('purchaseMeters').textContent = '—';
    $('purchaseHint').textContent = 'Заполни обязательные поля';
    $('cycleLength').textContent = r.cycleLength > 0 ? `${ru.format(r.cycleLength)} мм` : '—';
    $('partsPerBar').textContent = '—';
    $('techLoss').textContent = '—';
    $('reusableLeft').textContent = '—';
    $('efficiencyValue').textContent = '—';
    $('efficiencyRing').style.setProperty('--p', 0);
    $('barViz').replaceChildren();
    $('barBlock').hidden = true;
    $('lastBarText').textContent = '—';
    $('warning').hidden = false;
    $('warning').textContent = r.errors.join(' ');
    $('saveBtn').disabled = true;
  }

  function render() {
    if (!hasAnyCoreInput()) {
      renderNeutral();
      return;
    }

    const r = calculate(readInput());
    if (!r.valid) {
      renderInvalid(r);
      return;
    }

    lastResult = r;
    const warning = $('warning');
    warning.hidden = true;
    $('saveBtn').disabled = false;
    $('resultLabel').textContent = 'Купить материала';
    $('purchaseMeters').textContent = ru3.format(r.purchaseLength / 1000);
    $('purchaseHint').textContent = `${r.bars} ${plural(r.bars, 'пруток', 'прутка', 'прутков')} × ${ru3.format(r.input.stockLength / 1000)} м · ${r.targetQuantity} шт${r.input.reservePct > 0 ? ' с запасом' : ''}`;
    $('cycleLength').textContent = `${ru.format(r.cycleLength)} мм`;
    $('partsPerBar').textContent = `${r.partsPerBar} шт`;
    $('techLoss').textContent = `${ru.format(r.processLoss)} мм`;
    $('reusableLeft').textContent = r.reusableRemainder > 0 ? `${ru.format(r.reusableRemainder)} мм` : 'нет';
    $('efficiencyValue').textContent = `${Math.round(r.efficiency)}%`;
    $('efficiencyRing').style.setProperty('--p', clamp(r.efficiency, 0, 100).toFixed(1));
    $('lastBarText').textContent = `${r.partsLastBar} ${plural(r.partsLastBar, 'деталь', 'детали', 'деталей')}`;
    $('barBlock').hidden = false;

    const productOnLast = r.partsLastBar * r.input.partLength;
    const processOnLast = r.partsLastBar * (r.input.faceA + r.input.faceB + r.input.kerf) + r.input.stockFace;
    const leftoverOnLast = Math.max(0, r.input.stockLength - productOnLast - processOnLast);
    const total = Math.max(1, r.input.stockLength);
    const pct = (v) => `${clamp(v / total * 100, 0, 100).toFixed(3)}%`;
    $('barViz').innerHTML = `<span class="bar-product" style="width:${pct(productOnLast)}"></span><span class="bar-process" style="width:${pct(processOnLast)}"></span><span class="bar-left" style="width:${pct(leftoverOnLast)}"></span>`;
    $('barViz').setAttribute('aria-label', `Последний пруток: ${r.partsLastBar} деталей, технологические потери ${ru.format(processOnLast)} мм, остаток ${ru.format(leftoverOnLast)} мм.`);

    if (Math.abs(r.accountingDelta) > 0.01) {
      warning.hidden = false;
      warning.textContent = 'Внутренняя проверка баланса длины не сошлась. Не используй результат и сообщи об ошибке.';
      $('saveBtn').disabled = true;
    }
  }

  function plural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    toastTimer = window.setTimeout(() => node.classList.remove('show'), 1800);
  }

  function getHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
  }

  function setHistory(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))); }
    catch (_) { showToast('Не удалось сохранить локально'); }
  }

  function saveCurrent() {
    if (!lastResult?.valid) return;
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
      createdAt: new Date().toISOString(),
      input: lastResult.input,
      summary: {
        bars: lastResult.bars,
        purchaseLength: lastResult.purchaseLength,
        targetQuantity: lastResult.targetQuantity,
        reusableRemainder: lastResult.reusableRemainder
      }
    };
    const history = getHistory();
    history.unshift(item);
    setHistory(history);
    renderHistory();
    showToast('Расчёт сохранён');
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.valueOf()) ? '' : new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
  }

  function renderHistory() {
    const items = getHistory();
    const list = $('historyList');
    list.replaceChildren();
    $('historyEmpty').hidden = items.length > 0;
    $('clearHistory').hidden = items.length === 0;

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'history-card';
      const left = document.createElement('div');
      const title = document.createElement('h3');
      const mat = item.input.material || 'Без названия';
      const dia = item.input.diameter > 0 ? ` · Ø${ru.format(item.input.diameter)}` : '';
      title.textContent = `${mat}${dia}`;
      const meta = document.createElement('p');
      meta.textContent = `${item.input.quantity} шт × ${ru.format(item.input.partLength)} мм · ${formatDate(item.createdAt)}`;
      left.append(title, meta);

      const result = document.createElement('div');
      result.className = 'history-result';
      const strong = document.createElement('strong');
      strong.textContent = `${ru3.format(item.summary.purchaseLength / 1000)} м`;
      const small = document.createElement('span');
      small.textContent = `${item.summary.bars} ${plural(item.summary.bars,'пруток','прутка','прутков')}`;
      result.append(strong, small);

      const actions = document.createElement('div');
      actions.className = 'history-actions';
      const load = document.createElement('button');
      load.type = 'button';
      load.textContent = 'Открыть';
      load.addEventListener('click', () => { applyInput(item.input); switchScreen('calc'); showToast('Расчёт загружен'); });
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Удалить';
      del.className = 'delete';
      del.addEventListener('click', () => { setHistory(getHistory().filter(x => x.id !== item.id)); renderHistory(); });
      actions.append(load, del);
      card.append(left, result, actions);
      list.append(card);
    }
  }

  function applyInput(data) {
    for (const id of fields) {
      if (Object.prototype.hasOwnProperty.call(data, id)) $(id).value = data[id] ?? '';
    }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearCalculator() {
    for (const id of fields) $(id).value = '';
    renderNeutral();
    $('material').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Поля очищены');
  }

  function switchScreen(name) {
    document.querySelectorAll('.screen').forEach(x => x.classList.toggle('active', x.dataset.screen === name));
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.toggle('active', x.dataset.target === name));
    if (name === 'history') renderHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const preferred = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = preferred;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    $('networkStatus').textContent = online ? 'Онлайн · офлайн-кэш готов' : 'Офлайн режим';
  }

  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

  function setupInstall() {
    if (isStandalone()) return;
    if (isIos()) $('installBtn').hidden = false;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      $('installBtn').hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      $('installBtn').hidden = true;
      showToast('CutCalc установлен');
    });
  }

  async function requestInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch (_) {}
      deferredInstallPrompt = null;
      return;
    }
    if (isIos()) $('iosHint').hidden = false;
    else showToast('Установка доступна из меню браузера');
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); }
    catch (error) { console.error('Service worker registration failed', error); }
  }

  initTheme();
  numberFields.forEach((id) => { $(id).addEventListener('input', render); $(id).addEventListener('change', render); });
  $('material').addEventListener('input', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  $('clearAll').addEventListener('click', clearCalculator);
  $('resetLosses').addEventListener('click', () => {
    $('kerf').value = '';
    $('faceA').value = '';
    $('faceB').value = '';
    render();
  });
  $('saveBtn').addEventListener('click', saveCurrent);
  $('clearHistory').addEventListener('click', () => {
    if (getHistory().length && confirm('Удалить всю историю расчётов на этом устройстве?')) {
      setHistory([]);
      renderHistory();
      showToast('История очищена');
    }
  });
  $('themeToggle').addEventListener('click', toggleTheme);
  $('installBtn').addEventListener('click', requestInstall);
  $('closeIosHint').addEventListener('click', () => $('iosHint').hidden = true);
  $('iosHint').addEventListener('click', (e) => { if (e.target === $('iosHint')) $('iosHint').hidden = true; });
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchScreen(btn.dataset.target)));
  document.querySelectorAll('.material-card').forEach(btn => btn.addEventListener('click', () => {
    $('material').value = btn.dataset.material;
    $('diameter').value = btn.dataset.diameter;
    render();
    switchScreen('calc');
    showToast('Пресет применён');
  }));
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  renderNeutral();
  renderHistory();
  updateNetworkStatus();
  setupInstall();
  registerServiceWorker();
})();
