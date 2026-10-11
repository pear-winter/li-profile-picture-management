const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync(__dirname+'/../index.js','utf8');
function section(a,b){return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));}
(async()=>{
 const queries=[];const stored=new Map([['bg-used',{id:'bg-used',t:1}],['unused',{id:'unused',t:2}],['avatar-used',{id:'avatar-used',t:3}]]);
 const ctx={dead:false,set:{globalBg:{id:'bg-used'},avatar:{char:'avatar-used'},frame:{'*':{id:'builtin:white'}}},lib:[],libIndex:new Map(),libReady:false,libLoading:null,tx:async()=>[...stored.values()]};
 ctx.indexLibrary=()=>{ctx.libIndex.clear();ctx.lib.forEach(it=>ctx.libIndex.set(it.id,it));};
 ctx.db=async()=>({transaction(){const t={objectStore(){return {get(id){queries.push(id);const r={};queueMicrotask(()=>{r.result=stored.get(id);r.onsuccess();});return r;}}}};setImmediate(()=>t.oncomplete());return t;}});
 vm.createContext(ctx);vm.runInContext(section('  async function libLoad()', '  async function libAdd('),ctx);
 await ctx.loadActiveLibrary();assert.deepEqual(queries.sort(),['avatar-used','bg-used']);assert.equal(ctx.lib.length,2);
 await Promise.all([ctx.libLoad(),ctx.libLoad()]);assert.equal(ctx.lib.length,3);assert.equal(ctx.libIndex.size,3);assert.equal(ctx.libReady,true);
 let loads=0;const ic={host:{Image:class{set src(v){loads++;queueMicrotask(()=>v==='bad'?this.onerror(Error('bad')):this.onload());}}}};vm.createContext(ic);
 vm.runInContext(section('  const imageLoads =', '  const previewObserver =')+'\nglobalThis.load=loadImg;globalThis.cache=imageLoads;',ic);
 const a=ic.load('same'),b=ic.load('same');assert.equal(a,b);await a;assert.equal(loads,1);
 await ic.load('bad').catch(()=>{});assert.equal(ic.cache.has('bad'),false);
 for(let i=0;i<8;i++)await ic.load('image'+i);assert.equal(ic.cache.size,4);
 let painted=0, frames=[];const av={isConnected:true,dataset:{llBgSig:'unchanged'}};const pc={dead:false,host:{requestAnimationFrame(fn){frames.push(fn);return frames.length;}},cache:{clear(){}},paintBubbles(){},paintText(){},paintEntries(){},doc:{querySelectorAll:()=>Array.from({length:100},()=>({...av}))},avatarSelector:'x',paintOne(a){assert.equal(a.dataset.llBgSig,'unchanged');painted++;}};vm.createContext(pc);vm.runInContext(section('  const paintQueue =','  function globalBaseColor()'),pc);pc.paintAll();assert.equal(painted,0);frames.shift()();assert.equal(painted,32);while(frames.length)frames.shift()();assert.equal(painted,100);
 const tc={themeReady:true,dead:false,restoreExcluded(){},profile:()=>({}),doc:{querySelector(){}},validColor:v=>!!v,sourceSheets(){throw Error('must not scan styles without overrides');},nativeColors:[],textKinds:[],themeStyle:{textContent:''}};vm.createContext(tc);vm.runInContext(section('  function paintTheme()', '  const fontStyle='),tc);tc.paintTheme();
 console.log('PASS: active-only loading; complete library merge; image reuse/error retry/cache bound; avatar signatures preserved; theme scan skipped without overrides.');
})().catch(e=>{console.error(e);process.exit(1);});
