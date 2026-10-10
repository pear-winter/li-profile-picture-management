const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright' : 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const fixture=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style id="custom-style">
:root{--pear:#aabbcc;--pink:#ffaaaa;--SmartThemeBodyColor:#333333;--SmartThemeBlurTintColor:#fafafa}
#chat .mes{background:#fefefe;border:2px solid #aabbcc} #chat .mes_text{color:#334455}
#chat .mes_text q{color:#775533} #chat .mes_text code{color:#112233;background:#aabbcc}
#chat .mes_text span{color:var(--pink)}
@media(min-width:1px){.test-gradient{background:linear-gradient(#aabbcc,#ffffff)}}
@keyframes pulse{from{color:#aabbcc;transform:scale(1)}to{color:#ffffff;transform:scale(1.2)}}
</style></head><body><select id="themes"><option>A · 蝴蝶</option><option>B · 序列</option></select><div id="extensionsMenu"></div><div id="extensions_settings2"></div><div id="chat"><div class="mes" mesid="0" is_user="false"><div class="mesAvatarWrapper"><div class="avatar"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=" /></div></div><div class="mes_block"><div class="name_text">白川</div><div class="mes_buttons"><button class="mes_edit">编辑</button></div><div class="mes_text"><p>梨梨的正文 <q>引用</q> <code>代码<span>内部</span></code> <em>斜体</em></p><span>颜色变量</span></div></div></div></div>
<script>const handlers={};window.ctx={characters:[{name:'白川',avatar:'shiro.png'},{name:'陈野',avatar:'chen.png'}],characterId:0,event_types:{CHAT_CHANGED:'chat',CHARACTER_MESSAGE_RENDERED:'message'},eventSource:{on:(n,f)=>(handlers[n] ||= new Set()).add(f),removeListener:(n,f)=>handlers[n]?.delete(f)}};window.SillyTavern={getContext:()=>ctx};window.emit=(n)=>handlers[n]?.forEach(f=>f());window.toastr={warning:console.warn};document.querySelector('#themes').onchange=()=>{document.querySelector('#custom-style').textContent=document.querySelector('#custom-style').textContent.replace(/#[0-9a-f]{6}(?=;?border)/g,'#fefefe');};</script><script type="module" src="/index.js"></script></body></html>`;
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/index.js'?'application/javascript':'text/html');res.end(req.url==='/index.js'?fs.readFileSync(base+'/index.js'):fixture);}).listen(0,'127.0.0.1');
 let browser;
 try { browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:430,height:880}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__liliSequenceAvatarV7);await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('.ll-mgr[open]').waitFor();
 assert.equal(await page.locator('[data-t="frame"]').isVisible(),false);assert.equal(await page.locator('[data-t="color"]').isVisible(),false);
 assert.equal(await page.locator('.ll-mgr-tabs button').last().textContent(),'设置');
 await page.locator('[data-t="themes"]').click();assert.equal(await page.locator('.ll-theme-card').count(),2);
 await page.locator('.ll-theme-card').nth(1).getByRole('button',{name:'绑定当前角色',exact:true}).click();
 assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 await page.evaluate(()=>{ctx.characterId=1;emit('chat');});await page.waitForTimeout(150);
 await page.locator('#themes').selectOption({label:'A · 蝴蝶'});
 await page.evaluate(()=>{ctx.characterId=0;emit('chat');});await page.waitForTimeout(200);assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64');
 await page.locator('.ll-theme-card').first().locator('input[type=file]').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('.ll-theme-cover img'));
 await page.locator('[data-t="text"]').click();
 await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).fill('#224466');await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).press('Tab');
 await page.getByRole('textbox',{name:'引用 / 对话颜色代码',exact:true}).fill('#ff0088');await page.getByRole('textbox',{name:'引用 / 对话颜色代码',exact:true}).press('Tab');
 assert.equal(await page.locator('.mes_text p').evaluate(n=>getComputedStyle(n).color),'rgb(34, 68, 102)');
 assert.equal(await page.locator('.mes_text q').evaluate(n=>getComputedStyle(n).color),'rgb(255, 0, 136)');
 assert.equal(await page.locator('.mes_text code').evaluate(n=>getComputedStyle(n).color),'rgb(17, 34, 51)');
 // Replace theme literals, including nested media and keyframes, without corrupting --pink in var().
 await page.getByRole('textbox',{name:'#aabbcc颜色代码',exact:true}).fill('#00aa66');await page.getByRole('textbox',{name:'#aabbcc颜色代码',exact:true}).press('Tab');
 assert.equal(await page.locator('.mes').evaluate(n=>getComputedStyle(n).borderTopColor),'rgb(0, 170, 102)');
 assert.equal(await page.locator('.mes_text code').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(170, 187, 204)');
 const css=await page.locator('#ll-theme-overrides').textContent();assert(css.includes('@media'));assert(css.includes('@keyframes'));assert(css.includes('transform:scale(1.2)'));assert(!css.includes('var(--#'));
 await page.getByRole('button',{name:'正文取色盘',exact:true}).click();assert(await page.locator('.ll-picker canvas').isVisible());
 await page.locator('.ll-picker canvas').click({position:{x:228,y:120}});await page.getByRole('button',{name:'应用颜色',exact:true}).click();assert.equal(await page.locator('.ll-picker').count(),0);
 await page.locator('[data-t="bubbles"]').click();await page.getByLabel('纸纹效果',{exact:true}).check();
 const brightness=page.getByRole('slider',{name:'背景明暗（100% 为原色）'});await brightness.fill('60');await brightness.dispatchEvent('input');
 const visual=await page.locator('.mes').evaluate(n=>({opacity:getComputedStyle(n).opacity,filter:getComputedStyle(n).filter,backdrop:getComputedStyle(n).backdropFilter,image:getComputedStyle(n).backgroundImage}));
 assert.equal(visual.opacity,'1');assert.equal(visual.filter,'none');assert(visual.backdrop.includes('brightness(0.6)'));assert(visual.image.includes('radial-gradient'));
 await page.locator('[data-t="entry"]').click();await page.getByLabel('显示并启用头像框功能',{exact:true}).check();assert(await page.locator('[data-t="frame"]').isVisible());
 const opacity=page.getByRole('slider',{name:'管理器不透明度',exact:true});await opacity.fill('80');await opacity.dispatchEvent('input');
 await page.locator('[data-t="themes"]').click();await page.screenshot({path:'/tmp/lili-themes-mobile.png'});
 const dimensions=await page.locator('.ll-mgr-card').evaluate(n=>({width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right,viewport:innerWidth}));assert(dimensions.right<=dimensions.viewport);
 await page.reload();await page.waitForFunction(()=>window.__liliSequenceAvatarV7);await page.waitForTimeout(1200);assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('[data-t="themes"]').click();assert.equal(await page.locator('.ll-theme-cover img').count(),1);
 // Profile separation: A must not inherit B's custom literal edits.
 await page.locator('.ll-theme-card').first().getByRole('button',{name:'应用',exact:true}).click();assert.equal(await page.locator('.mes').evaluate(n=>getComputedStyle(n).borderTopColor),'rgb(170, 187, 204)');
 await page.setViewportSize({width:1100,height:900});await page.locator('[data-t="text"]').click();await page.screenshot({path:'/tmp/lili-colors-desktop.png'});
 await page.evaluate(()=>window.__liliSequenceAvatarV7.dispose());assert.equal(await page.locator('#ll-theme-overrides').count(),0);assert.equal(await page.locator('.ll-mgr').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: real browser mobile/desktop; native theme switching, char binding, upload persistence, separate theme profiles, ring picker, exclusions, nested CSS replacements, bubbles, settings, disposal.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
