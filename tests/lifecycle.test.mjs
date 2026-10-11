import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8').replace(/^export /gm, '');
function fixture(readyState = 'complete') {
    const events = new Map(), hostEvents = new Map(), nodes = new Map(), storage = new Map();
    const add = (map, key, fn) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(fn); };
    let observers = 0;
    class Element {
        constructor() { this.dataset = {}; this.children = []; this.props = new Map(); this.style = {setProperty:(k,v)=>this.props.set(k,v),removeProperty:k=>this.props.delete(k)}; const classes = new Set(); this.classList = {toggle:(c,on)=>on?classes.add(c):classes.delete(c),remove:(...cs)=>cs.forEach(c=>classes.delete(c))}; }
        append(...children) { for (const child of children) { if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(n=>n!==child); this.children.push(child); child.parentElement = this; if (child.id) nodes.set(child.id, child); } }
        remove() { if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this); nodes.delete(this.id); }
        setAttribute(k,v) { (this.attributes ||= {})[k] = v; }
        addEventListener(k,fn) { (this.listeners ||= {})[k] = fn; }
        querySelector(selector) { return selector.startsWith('#') ? nodes.get(selector.slice(1)) || null : null; }
        querySelectorAll() { return []; }
    }
    const root = new Element(), head = new Element(), body = new Element();
    nodes.set('chat', new Element()); nodes.set('extensionsMenu', new Element()); nodes.set('extensions_settings2', new Element());
    const document = {styleSheets: [],readyState,documentElement:root,head,body,createElement:()=>new Element(),querySelector:s=>s==='#chat'?nodes.get('chat'):null,querySelectorAll:()=>[],getElementById:id=>nodes.get(id)||null,addEventListener:(k,fn)=>add(events,k,fn),removeEventListener:(k,fn)=>events.get(k)?.delete(fn)};
    const window = {document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},indexedDB:{open(){throw Error('Unavailable test storage');}},getComputedStyle:()=>({getPropertyValue:()=>''}),matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),MutationObserver:class{observe(){observers++;}disconnect(){observers--;}},URL,location:{href:'http://localhost/'},setTimeout,clearTimeout,addEventListener:(k,fn)=>add(hostEvents,k,fn),removeEventListener:(k,fn)=>hostEvents.get(k)?.delete(fn)};
    const context=vm.createContext({window,document,URL,console});
    vm.runInContext(source, context);
    return {context,window,document,events,hostEvents,nodes,head,storage,get observers(){return observers;}};
}
test('standalone startup is idempotent and removes its UI/listeners on dispose',async()=>{
    const f=fixture(); assert.equal(f.observers,2); assert.equal(f.head.children.length,6);
    assert.ok(f.nodes.get('ll-avatar-manager'));assert.ok(f.nodes.get('lili-avatar-extension-settings'));
    f.context.init(); assert.equal(f.observers,2); assert.equal(f.head.children.length,6);
    await new Promise(r=>setImmediate(r));
    f.context.dispose();assert.equal(f.observers,0);assert.equal(f.head.children.length,0);
    assert.equal(f.window.__liliSequenceAvatarV7,undefined);assert.equal(f.nodes.has('lili-avatar-extension-settings'),false);
    assert.equal(f.hostEvents.get('pagehide').size,0);assert.equal(f.hostEvents.get('resize').size,0);
    f.context.init();assert.equal(f.observers,2);f.context.dispose();
});
test('startup waits for DOM and survives a cached pagehide',()=>{
    const f=fixture('loading');assert.equal(f.observers,0);f.context.init();assert.equal(f.events.get('DOMContentLoaded').size,1);
    f.document.readyState='complete';for(const fn of f.events.get('DOMContentLoaded'))fn();assert.equal(f.observers,2);
    for(const fn of f.hostEvents.get('pagehide'))fn({persisted:true});assert.equal(f.observers,2);
    f.context.dispose();
});
test('install package preserves script storage keys and has no helper dependency',()=>{
    const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
    assert.deepEqual(manifest.requires,[]);assert.ok(source.includes("'lili-avatar-set'"));assert.ok(source.includes("'lili-avatar-lib'"));
    assert.ok(!source.includes('getCurrentScriptId'));assert.equal(manifest.js,'index.js');
});
test('v1.7.0 extension and shipped script stay in sync',()=>{
    const script=JSON.parse(readFileSync(new URL('../scripts/酒馆助手脚本-梨梨头像背景管理器-v1.7.0.json',import.meta.url),'utf8'));
    const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
    const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
    assert.equal(manifest.version,'1.7.0');assert.equal(pkg.version,manifest.version);assert.ok(script.name.endsWith('v'+manifest.version));
    const body=script.content.slice(script.content.indexOf('function startManager() {'),script.content.lastIndexOf('\n      startManager();')).trim().replace('script: true','extension: true');
    assert.equal(source.slice(source.indexOf('function startManager() {'),source.lastIndexOf('\ninit();')).trim(),body);
});
