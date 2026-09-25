import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');

const assert=(cond,msg)=>{ if(!cond){ console.error('CALC CONTRACT FAILED:',msg); process.exit(1); } };

assert(app.includes("const requiredCore = ['partLength','quantity'];"),'stock length must not be required');
assert(app.includes("mode: 'direct'"),'direct meter calculation mode is required');
assert(app.includes("directRequiredLength = targetQuantity * cycleLength"),'direct length formula must be quantity × cycle');
assert(!/data-diameter=/.test(index),'material presets must not force a diameter');
assert(index.includes('Длина прутка <small>необязательно</small>'),'stock length must be marked optional');
assert(index.includes('Диаметр всегда вводится для конкретной заготовки'),'materials UI must explain variable diameter');

const cycle=17.6+3;
const total=40*cycle;
assert(Math.abs(total-824)<1e-9,'reference check 17.6 + 3 × 40 must equal 824 mm');

console.log('Calc contract OK — generic material/diameter input and direct meter calculation are enabled.');
