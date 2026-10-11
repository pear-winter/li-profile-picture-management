const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright' : 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const fixture=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style id="custom-style">
:root{--pear:#aabbcc;--pink:#ffaaaa;--SmartThemeBodyColor:#333333;--SmartThemeBlurTintColor:#fafafa}
#sheld{width:80vw;margin:auto}#chat{display:flex;flex-direction:column;align-items:center}#chat .mes{width:100%;background:#fefefe;border:2px solid #aabbcc} #chat .mes_text{color:#334455}
#chat .mes_text q{color:#775533} #chat .mes_text code{color:#112233;background:#aabbcc}
#chat .mes_text span{color:var(--pink)}
@media(min-width:1px){.test-gradient{background:linear-gradient(#aabbcc,#ffffff)}}
@keyframes pulse{from{color:#aabbcc;transform:scale(1)}to{color:#ffffff;transform:scale(1.2)}}
</style></head><body><select id="themes"><option>A · 蝴蝶</option><option>B · 序列</option></select><div id="extensionsMenu"></div><div id="extensions_settings2"></div><div id="sheld"><div id="chat"><div class="mes" mesid="0" is_user="false"><div class="mesAvatarWrapper"><div class="avatar"><img src="/thumbnail?type=avatar&file=shiro.png" /></div></div><div class="mes_block"><div class="name_text">白川</div><div class="mes_buttons"><button class="mes_edit">编辑</button></div><div class="mes_text"><p>梨梨的正文 <q>引用</q> <code>代码<span>内部</span></code> <em>斜体</em></p><span>颜色变量</span></div></div></div></div>
</div><script>const handlers={};window.ctx={characters:[{name:'白川',avatar:'shiro.png'},{name:'陈野',avatar:'chen.png'}],characterId:0,event_types:{CHAT_CHANGED:'chat',CHARACTER_MESSAGE_RENDERED:'message'},eventSource:{on:(n,f)=>(handlers[n] ||= new Set()).add(f),removeListener:(n,f)=>handlers[n]?.delete(f)}};window.SillyTavern={getContext:()=>ctx};window.emit=(n)=>handlers[n]?.forEach(f=>f());window.toastr={warning:console.warn};document.querySelector('#themes').onchange=()=>{document.querySelector('#custom-style').textContent=document.querySelector('#custom-style').textContent.replace(/#[0-9a-f]{6}(?=;?border)/g,'#fefefe');};</script><script type="module" src="/index.js"></script></body></html>`;
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url.startsWith('/thumbnail')){res.setHeader('Content-Type','image/png');res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64'));return;}res.setHeader('Content-Type',req.url==='/index.js'?'application/javascript':'text/html');res.end(req.url==='/index.js'?fs.readFileSync(base+'/index.js'):fixture);}).listen(0,'127.0.0.1');
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:430,height:880}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__liliSequenceAvatarV7?.extension);await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('.ll-mgr[open]').waitFor();
 assert.equal(await page.locator('.ll-mgr-tabs button').first().textContent(),'头像');assert.equal(await page.locator('.ll-mgr-tabs button').last().textContent(),'设置');
 assert.equal(await page.locator('[data-t="frame"]').isVisible(),false);assert.equal(await page.locator('[data-t="color"]').isVisible(),false);
 await page.locator('[data-t="entry"]').click();assert(await page.locator('.pane').textContent().then(t=>t.includes('v1.7.0')));
 await page.locator('[data-t="themes"]').click();assert.equal(await page.locator('.ll-theme-card').count(),2);
 await page.locator('.ll-theme-card').nth(1).getByRole('button',{name:'绑定当前角色',exact:true}).click();assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 await page.evaluate(()=>{ctx.characterId=1;emit('chat');});await page.locator('#themes').selectOption('A · 蝴蝶');await page.evaluate(()=>{ctx.characterId=0;emit('chat');});await page.waitForFunction(()=>document.querySelector('#themes').value==='B · 序列');
 await page.locator('[data-t="fonts"]').click();const normal=await page.locator('.mes_text').evaluate(n=>parseFloat(getComputedStyle(n).fontSize));
 const size=page.getByRole('slider',{name:'字体大小',exact:true});await size.evaluate(n=>{n.value='150';n.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('.mes_text').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),normal);await size.dispatchEvent('change');assert.equal(await page.locator('.mes_text').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),normal*1.5);
 await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).fill('#224466');await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).press('Tab');assert.equal(await page.locator('.mes_text p').evaluate(n=>getComputedStyle(n).color),'rgb(34, 68, 102)');
 await page.getByRole('button',{name:'正文取色盘',exact:true}).click();assert(await page.locator('.ll-picker canvas').isVisible());await page.getByRole('button',{name:'应用颜色',exact:true}).click();
 await page.locator('[data-t="bubbles"]').click();await page.getByRole('combobox',{name:'质感作用范围'}).selectOption('global');
 const width=page.getByRole('slider',{name:'显示宽度',exact:true});await width.evaluate(n=>{n.value='90';n.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('html').evaluate(n=>n.style.getPropertyValue('--ll-bubble-width')),'');await width.dispatchEvent('change');assert.equal(await page.locator('html').evaluate(n=>n.style.getPropertyValue('--ll-bubble-width')),'90vw');
 const rect=await page.locator('.mes').evaluate(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width}));assert(rect.width>300);assert(rect.left>=-1);assert(rect.right<=431);
 await page.locator('[data-t="globalBg"]').click();assert(await page.getByRole('button',{name:'只给白川用',exact:true}).isVisible());
 await page.reload();await page.waitForFunction(()=>window.__liliSequenceAvatarV7?.extension);await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('[data-t="fonts"]').click();assert.equal(await page.getByRole('slider',{name:'字体大小',exact:true}).inputValue(),'150');assert.equal(await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).inputValue(),'#224466');
 await page.setViewportSize({width:1100,height:900});await page.locator('[data-t="bubbles"]').click();await page.getByRole('slider',{name:'显示宽度',exact:true}).fill('100');await page.getByRole('slider',{name:'显示宽度',exact:true}).dispatchEvent('change');const desktop=await page.locator('.mes').evaluate(n=>n.getBoundingClientRect().width);assert(desktop>=1099);
 await page.evaluate(()=>window.__liliSequenceAvatarV7.dispose());assert.equal(await page.locator('.ll-mgr').count(),0);assert.equal(await page.locator('#ll-font-size').count(),0);assert.equal(await page.locator('#ll-theme-overrides').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: v1.7.0 UI, binding, picker, deferred font size and global width, mobile/desktop centering, persistence and disposal.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
