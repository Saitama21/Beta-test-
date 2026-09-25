(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.CutCalcCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

  function normalize(input={}){
    return {
      material:String(input.material||'').trim(),
      diameter:Math.max(0,finite(input.diameter)),
      partLength:Math.max(0,finite(input.partLength)),
      quantity:Math.max(0,Math.floor(finite(input.quantity))),
      kerf:Math.max(0,finite(input.kerf)),
      faceA:Math.max(0,finite(input.faceA)),
      faceB:Math.max(0,finite(input.faceB)),
      stockLength:Math.max(0,finite(input.stockLength)),
      stockFace:Math.max(0,finite(input.stockFace)),
      reservePct:clamp(finite(input.reservePct),0,100),
      minChuckGrip:Math.max(0,finite(input.minChuckGrip,46))
    };
  }

  function calculate(raw){
    const i=normalize(raw);
    const errors=[];
    if(i.partLength<=0) errors.push('Укажи длину детали.');
    if(i.quantity<=0) errors.push('Укажи количество деталей.');

    const cycleLength=i.partLength+i.faceA+i.faceB+i.kerf;
    const targetQuantity=i.quantity>0?Math.ceil(i.quantity*(1+i.reservePct/100)):0;
    const perPartLoss=i.faceA+i.faceB+i.kerf;
    const directRequiredLength=targetQuantity*cycleLength;
    const netProductLength=targetQuantity*i.partLength;
    const processLossDirect=targetQuantity*perPartLoss;
    const directEfficiency=directRequiredLength>0?(netProductLength/directRequiredLength)*100:0;

    if(errors.length){
      return {valid:false,errors,input:i,cycleLength,targetQuantity};
    }

    if(i.stockLength<=0){
      return {
        valid:true,
        mode:'direct',
        input:i,
        cycleLength,
        targetQuantity,
        purchaseLength:directRequiredLength,
        netProductLength,
        processLoss:processLossDirect,
        efficiency:directEfficiency,
        partsPerBar:0,
        bars:0,
        fullBarGripTail:0,
        reusableRemainder:0,
        partsLastBar:0
      };
    }

    if(i.stockFace+i.minChuckGrip>=i.stockLength){
      errors.push(`После первой торцовки должен оставаться зажим не меньше ${i.minChuckGrip} мм.`);
    }

    const usableForCycles=Math.max(0,i.stockLength-i.stockFace-i.minChuckGrip);
    const partsPerBar=cycleLength>0?Math.floor(usableForCycles/cycleLength):0;
    if(partsPerBar<1&&!errors.length){
      errors.push(`Из такого прутка нельзя получить деталь, сохранив минимум ${i.minChuckGrip} мм в кулачках.`);
    }
    if(errors.length){
      return {valid:false,errors,input:i,cycleLength,targetQuantity,partsPerBar};
    }

    const bars=Math.ceil(targetQuantity/partsPerBar);
    const fullBarsBeforeLast=Math.max(0,bars-1);
    const partsLastBar=targetQuantity-fullBarsBeforeLast*partsPerBar;
    const purchaseLength=bars*i.stockLength;
    const processLoss=processLossDirect+bars*i.stockFace;
    const fullBarGripTail=i.stockLength-i.stockFace-partsPerBar*cycleLength;
    const lastRawRemainder=i.stockLength-i.stockFace-partsLastBar*cycleLength;
    const lastIsExhausted=partsLastBar===partsPerBar;
    const reusableRemainder=lastIsExhausted?0:Math.max(0,lastRawRemainder);
    const efficiency=purchaseLength>0?(netProductLength/purchaseLength)*100:0;

    return {
      valid:true,
      mode:'bars',
      input:i,
      cycleLength,
      targetQuantity,
      purchaseLength,
      netProductLength,
      processLoss,
      efficiency,
      partsPerBar,
      bars,
      partsLastBar,
      fullBarGripTail,
      reusableRemainder
    };
  }

  return {normalize,calculate};
});
