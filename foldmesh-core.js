(function(root){
'use strict';
const FACES=Object.freeze(['front','back','left','right','top','bottom']);
const MAX_DEPTH=4, MAX_BYTES=512, MAX_FOLDS=1024;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
function assert(ok,message){if(!ok)throw new Error(message);}
function address(path){
 assert(typeof path==='string'&&path.length<=40,'Fold address must be a short string');
 const parts=path.trim().split('/');
 assert(FACES.includes(parts[0]),'Address must begin with a cube face');
 assert(parts.length-1<=MAX_DEPTH,'Maximum nesting depth is '+MAX_DEPTH);
 assert(parts.slice(1).every(x=>/^[0-3]$/.test(x)),'Child quadrants must be 0, 1, 2, or 3');
 return parts.join('/');
}
function cell(path){
 const parts=address(path).split('/');
 let u=0,v=0,size=1;
 for(const digit of parts.slice(1)){size/=2;const n=Number(digit);u+=(n%2)*size;v+=Math.floor(n/2)*size;}
 return {face:parts[0],u,v,size,depth:parts.length-1};
}
function lock(phase,orientation){
 assert(Number.isInteger(phase)&&phase>=0&&phase<8,'Phase must be an integer from 0 to 7');
 assert(Number.isInteger(orientation)&&orientation>=0&&orientation<4,'Orientation must be an integer from 0 to 3');
 return {phase,orientation};
}
function checksum(bytes){
 let h=2166136261;
 for(const b of bytes){h=Math.imul(h^b,16777619)>>>0;}
 return 'fnv1a32:'+h.toString(16).padStart(8,'0');
}
function makeCube(id,seed=369){
 assert(id==='A'||id==='B','Cube ID must be A or B');
 assert(Number.isSafeInteger(seed)&&seed>=0&&seed<=999999,'Invalid seed');
 return {version:1,id,seed,revision:0,folds:{}};
}
function write(cube,path,message,options={}){
 const key=address(path),{phase,orientation}=lock(options.phase??0,options.orientation??0);
 assert(typeof message==='string','Fold payload must be text');
 const bytes=Array.from(enc.encode(message));
 assert(bytes.length<=MAX_BYTES,'Fold payload exceeds '+MAX_BYTES+' UTF-8 bytes');
 assert(Object.hasOwn(cube.folds,key)||Object.keys(cube.folds).length<MAX_FOLDS,'Fold capacity exceeded');
 const entry={path:key,bytes,checksum:checksum(bytes),phase,orientation,revision:++cube.revision};
 cube.folds[key]=entry;
 return {...entry,bytes:entry.bytes.slice()};
}
function inspect(cube,path){
 const key=address(path),r=cube.folds[key];
 if(!r)return {exists:false,path:key,valid:false};
 const valid=Array.isArray(r.bytes)&&r.bytes.every(x=>Number.isInteger(x)&&x>=0&&x<=255)&&checksum(r.bytes)===r.checksum;
 let message='';
 if(valid){try{message=dec.decode(Uint8Array.from(r.bytes));}catch(_){return {exists:true,path:key,valid:false,reason:'Invalid UTF-8'};}}
 return {exists:true,path:key,valid,message,checksum:r.checksum,phase:r.phase,orientation:r.orientation,bytes:r.bytes.length,revision:r.revision};
}
function engage(source,target,options={}){
 const from=address(options.from??'front/0'),to=address(options.to??from);
 const {phase,orientation}=lock(options.phase??0,options.orientation??0);
 if(source===target)return {ok:false,reason:'Cannot transfer to the same cube'};
 const found=inspect(source,from);
 if(!found.exists)return {ok:false,reason:'Source fold is empty'};
 if(!found.valid)return {ok:false,reason:'Source checksum failed'};
 if(found.phase!==phase||found.orientation!==orientation)return {ok:false,reason:'Gear lock mismatch: phase or orientation'};
 if(options.allowed!==true)return {ok:false,reason:'Gear permission denied'};
 if(Object.hasOwn(target.folds,to)&&options.overwrite!==true)return {ok:false,reason:'Destination occupied: enable overwrite to replace'};
 if(!Object.hasOwn(target.folds,to)&&Object.keys(target.folds).length>=MAX_FOLDS)return {ok:false,reason:'Destination capacity exceeded'};
 const src=source.folds[from];
 target.folds[to]={...src,path:to,bytes:src.bytes.slice(),revision:++target.revision};
 const result=inspect(target,to);
 return {ok:result.valid&&result.checksum===found.checksum,reason:result.valid?'Verified fold-to-fold copy':'Destination verification failed',from,to,bytes:result.bytes,checksum:result.checksum};
}
function projection(cube){
 // Deliberately hides memory: two cubes can have the same visible shell.
 return {geometry:'unit-cube',faces:6,seed:0};
}
function probe(cube,path,phase,orientation){
 const r=inspect(cube,path);
 if(!r.exists)return {status:'empty'};
 if(!r.valid)return {status:'corrupt'};
 return r.phase===phase&&r.orientation===orientation
  ?{status:'open',signature:r.checksum,bytes:r.bytes}
  :{status:'locked'};
}
function exportCube(cube){return JSON.parse(JSON.stringify(cube));}
function restoreCube(raw){
 assert(raw&&typeof raw==='object'&&(raw.id==='A'||raw.id==='B')&&raw.version===1,'Invalid cube recipe');
 const cube=makeCube(raw.id,raw.seed);
 assert(raw.folds&&typeof raw.folds==='object'&&!Array.isArray(raw.folds),'Invalid fold collection');
 const keys=Object.keys(raw.folds);
 assert(keys.length<=MAX_FOLDS,'Fold capacity exceeded');
 for(const key of keys){
  const rec=raw.folds[key];
  assert(rec&&typeof rec==='object'&&rec.path===key,'Mismatched fold path');
  address(key);lock(rec.phase,rec.orientation);
  assert(Array.isArray(rec.bytes)&&rec.bytes.length<=MAX_BYTES&&rec.bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255),'Invalid payload bytes');
  assert(checksum(rec.bytes)===rec.checksum,'Fold checksum mismatch at '+key);
  try{dec.decode(Uint8Array.from(rec.bytes));}catch(_){throw Error('Invalid UTF-8 at '+key);}
  assert(Number.isSafeInteger(rec.revision)&&rec.revision>=1,'Invalid fold revision');
  cube.folds[key]={path:key,bytes:rec.bytes.slice(),checksum:rec.checksum,phase:rec.phase,orientation:rec.orientation,revision:rec.revision};
  cube.revision=Math.max(cube.revision,rec.revision);
 }
 assert(Number.isSafeInteger(raw.revision)&&raw.revision>=cube.revision,'Invalid cube revision');
 cube.revision=raw.revision;
 return cube;
}
const api=Object.freeze({FACES,MAX_DEPTH,MAX_BYTES,address,cell,checksum,makeCube,write,inspect,engage,projection,probe,exportCube,restoreCube});
root.PhiFoldMesh=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
