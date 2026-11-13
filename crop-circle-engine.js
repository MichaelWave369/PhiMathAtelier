/* Φ Crop Circle Observatory r0.1: deterministic geometry triage; no inference of authorship. */
(function(root){
  'use strict';
  const SAMPLE=Object.freeze([105,35,145,35,180,325,70,215,180,145]);
  const CONSTANTS=Object.freeze([
    {name:'π (rounded)',digits:'3141592654'},
    {name:'e',digits:'2718281828'},
    {name:'φ (rounded)',digits:'1618033989'},
    {name:'√2',digits:'1414213562'}
  ]);
  function parseAngles(text){
    if(typeof text!=='string')throw Error('Angles must be entered as text.');
    const bits=text.trim().split(/[\s,;]+/).filter(Boolean);
    if(bits.length<2 || bits.length>50)throw Error('Enter between 2 and 50 angular intervals.');
    const nums=bits.map(s=>Number(s));
    if(nums.some(n=>!Number.isFinite(n)||n<=0||n>360))throw Error('Each interval must be greater than 0° and no greater than 360°.');
    return nums;
  }
  function decode(angles,unit=36){
    if(!Array.isArray(angles)||angles.length<2||angles.length>50||angles.some(a=>!Number.isFinite(a)||a<=0||a>360))throw Error('Invalid angular intervals.');
    if(!Number.isFinite(unit)||unit<=0||unit>180)throw Error('Unit must be between 0 and 180 degrees.');
    const steps=angles.map((angle,index)=>{
      const digit=Math.round(angle/unit);
      const predicted=digit*unit;
      return {index:index+1,angle,digit,predicted,error:angle-predicted,valid:digit>=0&&digit<=9};
    });
    const valid=steps.every(s=>s.valid);
    const rmse=Math.sqrt(steps.reduce((sum,s)=>sum+s.error*s.error,0)/steps.length);
    const sequence=valid?steps.map(s=>s.digit).join(''):null;
    const candidates=CONSTANTS.map(c=>{
      const n=Math.min(sequence?.length||0,c.digits.length);
      const matches=n?[...sequence.slice(0,n)].filter((d,i)=>d===c.digits[i]).length:0;
      return {name:c.name,digits:c.digits,matches,compared:n,full:valid&&sequence===c.digits};
    }).sort((a,b)=>b.matches-a.matches||a.name.localeCompare(b.name));
    return {unit,steps,valid,sequence,reading:valid?(sequence[0]+'.'+sequence.slice(1)):null,rmse,candidates,sum:angles.reduce((a,b)=>a+b,0)};
  }
  function scanUnits(angles,units=[24,30,36,45,60]){
    return units.map(unit=>decode(angles,unit)).filter(d=>d.valid)
      .sort((a,b)=>a.rmse-b.rmse||a.unit-b.unit);
  }
  function clockwiseAngle(cx,cy,x,y){return (Math.atan2(y-cy,x-cx)*180/Math.PI+360)%360;}
  function traceAngles(center,points,direction='clockwise'){
    if(!center||!Array.isArray(points)||points.length<2)throw Error('Trace the centre and at least two boundary points.');
    if(direction!=='clockwise'&&direction!=='counterclockwise')throw Error('Unknown direction.');
    const bearings=points.map(p=>clockwiseAngle(center.x,center.y,p.x,p.y));
    return bearings.slice(1).map((angle,i)=>{const prev=bearings[i];const diff=direction==='clockwise'?angle-prev:prev-angle;return (diff+360)%360;});
  }
  function simulatePi(angles,{unit=36,trials=1000,seed=369}={}){
    const observed=decode(angles,unit);
    if(angles.length!==10)throw Error('π demonstration requires exactly ten intervals.');
    let state=(Number(seed)>>>0)||369;
    function random(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;}
    let exact=0,betterFit=0;
    for(let t=0;t<trials;t++){
      // Null: independent uniformly random intervals, quantized to 5° to resemble published measurements.
      const baseline=Array.from({length:10},()=>Math.max(5,Math.round((random()*360)/5)*5));
      const test=decode(baseline,unit);
      if(test.sequence==='3141592654')exact++;
      if(test.rmse<=observed.rmse)betterFit++;
    }
    return {trials,seed,unit,exactPiSequences:exact,equalOrBetterRMSE:betterFit,observedRMSE:observed.rmse,
      caveat:'Exploratory toy null: uniformly random, independent 5°-quantized angles. It does not account for human design, candidate selection, reconstruction bias, image measurement errors, or post-hoc hypotheses; not a probability of alien origin or authorship.'};
  }
  root.PhiCropCircle=Object.freeze({SAMPLE,CONSTANTS,parseAngles,decode,scanUnits,clockwiseAngle,traceAngles,simulatePi});
})(typeof window!=='undefined'?window:globalThis);
