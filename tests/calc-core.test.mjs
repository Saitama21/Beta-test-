import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('calc-core.js','utf8');
const context={module:{exports:{}},exports:{},globalThis:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'calc-core.js'});
const {calculate}=context.module.exports;

function assert(condition,message){if(!condition){console.error('CALC TEST FAILED:',message);process.exit(1);}}

let r=calculate({material:'AISI 304',diameter:25,partLength:17.6,quantity:40,kerf:3,minChuckGrip:46});
assert(r.valid,'reference calculation must be valid');
assert(r.mode==='direct','reference calculation must use direct mode');
assert(Math.abs(r.purchaseLength-824)<1e-9,'17.6 + 3 × 40 must equal 824 mm');
assert(Math.abs(r.processLoss-120)<1e-9,'kerf loss must be 120 mm');

r=calculate({material:'PA6',diameter:60,partLength:20,quantity:10,kerf:2,stockLength:1000,minChuckGrip:46});
assert(r.valid&&r.mode==='bars','stock-length calculation must use bars mode');
assert(r.partsPerBar===43,'1000 mm bar should yield 43 parts at 22 mm cycle with 46 mm grip');
assert(r.bars===1,'10 parts fit in one bar');

r=calculate({material:'Anything',diameter:123,partLength:10,quantity:2,kerf:1});
assert(r.purchaseLength===22,'material and diameter must not change length formula');

console.log('Calc core OK');
