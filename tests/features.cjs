const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../index.js','utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');assert(start>=0,name);const tail=source.slice(start);if(name==='paintEntries')return tail.split('\n')[0];const end=tail.indexOf('\n  }');return tail.slice(0,end+4);}
function element(){const properties=new Map();return{dataset:{},children:[],style:{setProperty:(k,v)=>properties.set(k,v)},properties,set textContent(v){this.text=v;this.children=[]},get textContent(){return this.text},append(n){n.parentElement=this;this.children.push(n)},setAttribute(){},addEventListener(k,f){this[k]=f}};}
const button=element(),items=[{id:'pear',url:'https://example.test/pear.png'}];let opened=false;
const context={set:{},doc:{createElement:element,querySelectorAll:()=>[button]},byId:id=>items.find(x=>x.id===id),itemUrl:it=>it.url,openManager:()=>opened=true};vm.createContext(context);
vm.runInContext(['paintEntry','paintEntries','mgrButton'].map(extract).join('\n'),context);
context.paintEntry(button);assert.equal(button.textContent,'♡');context.set.entry={mode:'text',text:'🍐',size:18};context.paintEntries();assert.equal(button.textContent,'🍐');assert.equal(button.properties.get('--ll-entry-size'),'18px');
context.set.entry={mode:'icon',iconId:'pear',text:'♡',size:24};context.paintEntry(button);assert.equal(button.children[0].src,items[0].url);button.children[0].error();assert.equal(button.textContent,'♡');
let inserted;const edit={before:n=>inserted=n},mes={querySelector:s=>s==='.mes_edit'?edit:null};context.mgrButton(mes,null);assert(inserted);inserted.click({preventDefault(){},stopPropagation(){}});assert(opened);
assert(source.includes("lili-avatar-lib"));assert(source.includes("lili-avatar-set"));console.log('PASS: preserved entry text, image, sizing, image error fallback and edit-button placement; original storage keys.');
