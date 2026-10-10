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
</style></head><body><select id="themes"><option>A · 蝴蝶</option><option>B · 序列</option></select><div id="extensionsMenu"></div><div id="extensions_settings2"></div><div id="chat"><div class="mes" mesid="0" is_user="false"><div class="mesAvatarWrapper"><div class="avatar"><img src="/thumbnail?type=avatar&file=shiro.png" /></div></div><div class="mes_block"><div class="name_text">白川</div><div class="mes_buttons"><button class="mes_edit">编辑</button></div><div class="mes_text"><p>梨梨的正文 <q>引用</q> <code>代码<span>内部</span></code> <em>斜体</em></p><span>颜色变量</span></div></div></div></div>
<script>const handlers={};window.ctx={characters:[{name:'白川',avatar:'shiro.png'},{name:'陈野',avatar:'chen.png'}],characterId:0,event_types:{CHAT_CHANGED:'chat',CHARACTER_MESSAGE_RENDERED:'message'},eventSource:{on:(n,f)=>(handlers[n] ||= new Set()).add(f),removeListener:(n,f)=>handlers[n]?.delete(f)}};window.SillyTavern={getContext:()=>ctx};window.emit=(n)=>handlers[n]?.forEach(f=>f());window.toastr={warning:console.warn};document.querySelector('#themes').onchange=()=>{document.querySelector('#custom-style').textContent=document.querySelector('#custom-style').textContent.replace(/#[0-9a-f]{6}(?=;?border)/g,'#fefefe');};</script><script type="module" src="/index.js"></script></body></html>`;
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url.startsWith('/thumbnail')){res.setHeader('Content-Type','image/png');res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64'));return;}res.setHeader('Content-Type',req.url==='/index.js'?'application/javascript':'text/html');res.end(req.url==='/index.js'?fs.readFileSync(base+'/index.js'):fixture);}).listen(0,'127.0.0.1');
 let browser;
 try { browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:430,height:880}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__liliSequenceAvatarV7);await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('.ll-mgr[open]').waitFor();
 assert.equal(await page.locator('[data-t="frame"]').isVisible(),false);assert.equal(await page.locator('[data-t="color"]').isVisible(),false);
 assert.equal(await page.locator('.ll-mgr-tabs button').last().textContent(),'设置');assert.equal(await page.locator('.ll-mgr-tabs button').first().textContent(),'美化绑定');
 await page.locator('[data-t="themes"]').click();assert.equal(await page.locator('.ll-theme-card').count(),2);
 await page.locator('.ll-theme-card').nth(1).getByRole('button',{name:'绑定当前角色',exact:true}).click();
 assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 await page.evaluate(()=>{ctx.characterId=1;emit('chat');});await page.waitForTimeout(150);
 await page.locator('#themes').selectOption({label:'A · 蝴蝶'});
 await page.evaluate(()=>{ctx.characterId=0;emit('chat');});await page.waitForTimeout(200);assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64');
 await page.locator('.ll-theme-card').first().locator('input[type=file]').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('.ll-theme-cover img'));
 await page.locator('[data-t="fonts"]').click();
 await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).fill('#224466');await page.getByRole('textbox',{name:'正文颜色代码',exact:true}).press('Tab');
 await page.getByRole('textbox',{name:'引用 / 对话颜色代码',exact:true}).fill('#ff0088');await page.getByRole('textbox',{name:'引用 / 对话颜色代码',exact:true}).press('Tab');
 assert.equal(await page.locator('.mes_text p').evaluate(n=>getComputedStyle(n).color),'rgb(34, 68, 102)');
 assert.equal(await page.locator('.mes_text q').evaluate(n=>getComputedStyle(n).color),'rgb(255, 0, 136)');
 assert.equal(await page.locator('.mes_text code').evaluate(n=>getComputedStyle(n).color),'rgb(17, 34, 51)');
 await page.locator('[data-t="text"]').click();

 await page.getByRole('textbox',{name:'#aabbcc颜色代码',exact:true}).fill('#00aa66');await page.getByRole('textbox',{name:'#aabbcc颜色代码',exact:true}).press('Tab');
 assert.equal(await page.locator('.mes').evaluate(n=>getComputedStyle(n).borderTopColor),'rgb(0, 170, 102)');
 assert.equal(await page.locator('.mes_text code').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(170, 187, 204)');
 const css=await page.locator('#ll-theme-overrides').textContent();assert(css.includes('@media'));assert(css.includes('@keyframes'));assert(css.includes('transform:scale(1.2)'));assert(!css.includes('var(--#'));
 await page.locator('[data-t="fonts"]').click();await page.getByRole('button',{name:'正文取色盘',exact:true}).click();assert(await page.locator('.ll-picker canvas').isVisible());
 await page.locator('.ll-picker canvas').click({position:{x:228,y:120}});await page.getByRole('button',{name:'应用颜色',exact:true}).click();assert.equal(await page.locator('.ll-picker').count(),0);
 await page.locator('[data-t="bubbles"]').click();await page.getByLabel('纸纹效果',{exact:true}).check();
 const brightness=page.getByRole('slider',{name:'背景明暗'});await brightness.fill('60');await brightness.dispatchEvent('input');
 const visual=await page.locator('.mes').evaluate(n=>({opacity:getComputedStyle(n).opacity,filter:getComputedStyle(n).filter,backdrop:getComputedStyle(n).backdropFilter,image:getComputedStyle(n.querySelector('.ll-paper-layer')).backgroundImage}));
 assert.equal(visual.opacity,'1');assert.equal(visual.filter,'none');assert(visual.backdrop.includes('brightness(0.6)'));assert(visual.image.includes('radial-gradient'));
 await page.locator('[data-t="entry"]').click();await page.getByLabel('显示并启用头像框功能',{exact:true}).check();assert(await page.locator('[data-t="frame"]').isVisible());
 const opacity=page.getByRole('slider',{name:'管理器页面不透明度',exact:true});await opacity.fill('80');await opacity.dispatchEvent('input');assert.equal(await opacity.getAttribute('min'),'25');assert.equal(await page.locator('.ll-mgr-card').evaluate(n=>getComputedStyle(n).opacity),'0.8');
 await page.locator('[data-t="themes"]').click();await page.screenshot({path:'/tmp/lili-themes-mobile.png'});
 const dimensions=await page.locator('.ll-mgr-card').evaluate(n=>({width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right,viewport:innerWidth}));assert(dimensions.right<=dimensions.viewport);
 await page.reload();await page.waitForFunction(()=>window.__liliSequenceAvatarV7);await page.waitForTimeout(1200);assert.equal(await page.locator('#themes').inputValue(),'B · 序列');
 await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('[data-t="themes"]').click();assert.equal(await page.locator('.ll-theme-cover img').count(),1);

 await page.locator('.ll-theme-card').first().getByRole('button',{name:'应用',exact:true}).click();assert.equal(await page.locator('.mes').evaluate(n=>getComputedStyle(n).borderTopColor),'rgb(170, 187, 204)');
 await page.setViewportSize({width:1100,height:900});await page.locator('[data-t="text"]').click();await page.screenshot({path:'/tmp/lili-colors-desktop.png'});

 await page.locator('[data-t="fonts"]').click();
 const chip=page.getByRole('button',{name:'正文取色盘',exact:true});const colorInput=page.getByRole('textbox',{name:'正文颜色代码',exact:true});const expectedColor=await colorInput.inputValue();assert.equal(await chip.evaluate(n=>getComputedStyle(n).backgroundColor),expectedColor);
 await page.getByRole('textbox',{name:'字体 CSS 代码'}).fill('font-family: monospace;');await page.getByRole('textbox',{name:'保存的字体名称'}).fill('英文等宽');await page.getByRole('button',{name:'保存 CSS 字体',exact:true}).click();await page.waitForFunction(()=>document.querySelector('select[aria-label="默认 / 其他文字字体"]')?.value);
 const id=await page.getByRole('combobox',{name:'默认 / 其他文字字体'}).inputValue();assert(id);
 await page.getByRole('textbox',{name:'字体 CSS 代码'}).fill('font-family: serif;');await page.getByRole('textbox',{name:'保存的字体名称'}).fill('中文衬线');await page.getByRole('button',{name:'保存 CSS 字体',exact:true}).click();await page.waitForFunction(old=>document.querySelector('select[aria-label="默认 / 其他文字字体"]')?.value!==old,id);
 const zh=await page.getByRole('combobox',{name:'默认 / 其他文字字体'}).inputValue();
 await page.getByRole('combobox',{name:'中文字体'}).selectOption(zh);await page.getByRole('combobox',{name:'英文 / 拉丁文字字体'}).selectOption(id);
 await page.evaluate(()=>{const p=document.createElement('p');p.id='language-test';p.textContent='中文 English こんにちは 日本語';document.querySelector('.mes_text').append(p);});await page.waitForTimeout(350);
 assert(await page.locator('#language-test [data-language="zh"]').count()>0);assert(await page.locator('#language-test [data-language="en"]').count()>0);assert(await page.locator('#language-test [data-language="ja"]').count()>0);
 assert.equal(await page.locator('#language-test [data-language="en"]').first().evaluate(n=>getComputedStyle(n).fontFamily),'monospace');
 const fontFile=page.locator('.pane input[type=file]');await fontFile.setInputFiles('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf');await page.waitForFunction(()=>document.querySelector('.ll-font-list')?.textContent.includes('DejaVuSerif.ttf'));
 await page.locator('[data-t="globalBg"]').click();await page.getByRole('button',{name:'纯色背景',exact:true}).click();await page.getByRole('textbox',{name:'全局底色颜色代码'}).fill('#336699');await page.getByRole('textbox',{name:'全局底色颜色代码'}).press('Tab');
 assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(51, 102, 153)');
 await page.locator('[data-t="bubbles"]').click();await page.getByRole('button',{name:'与全局背景同色',exact:true}).click();assert((await page.locator('html').evaluate(n=>n.style.getPropertyValue('--ll-bubble-fill'))).includes('#336699'));
 await page.getByRole('combobox',{name:'质感作用范围'}).selectOption('global');await page.getByRole('slider',{name:'背景模糊',exact:true}).fill('6');await page.getByRole('slider',{name:'背景模糊',exact:true}).dispatchEvent('input');assert.equal(await page.locator('#ll-bg-surface').count(),1);
 const filter=await page.locator('#ll-bg-surface').evaluate(n=>getComputedStyle(n).filter);assert(filter.includes('blur(6px)'));
 await page.getByRole('button',{name:'恢复原始明暗',exact:true}).click();assert((await page.locator('#ll-bg-surface').evaluate(n=>getComputedStyle(n).filter)).includes('brightness(1)'));
 await page.getByRole('combobox',{name:'纸纹样式'}).selectOption('linen');await page.getByRole('checkbox',{name:'纸纹效果',exact:true}).check();
 await page.getByRole('combobox',{name:'质感作用范围'}).selectOption('bubble');assert.equal(await page.locator('#ll-bg-surface').count(),0);
 await page.locator('.pane input[type=file]').setInputFiles({name:'paper.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('select[aria-label="纸纹样式"]')?.value.startsWith('texture-'));
 await page.locator('[data-t="bg"]').click();await page.getByRole('button',{name:'与全局背景同色',exact:true}).click();assert((await page.locator('.avatar').evaluate(n=>n.style.getPropertyValue('--ll-av-bg'))).includes('#336699'));
 await page.locator('[data-t="bubbles"]').click();await page.getByRole('button',{name:'完全透明',exact:true}).click();assert.equal(await page.getByRole('slider',{name:'气泡不透明度'}).inputValue(),'0');
 await page.reload();await page.waitForFunction(()=>window.__liliSequenceAvatarV7);await page.waitForTimeout(500);await page.evaluate(()=>window.__liliSequenceAvatarV7.open());await page.locator('[data-t="fonts"]').click();await page.waitForFunction(()=>document.querySelector('.ll-font-list')?.textContent.includes('DejaVuSerif.ttf'));assert(await page.getByRole('checkbox',{name:'启用全局字体'}).isChecked());
 await page.evaluate(()=>window.__liliSequenceAvatarV7.dispose());assert.equal(await page.locator('#ll-theme-overrides').count(),0);assert.equal(await page.locator('.ll-mgr').count(),0);assert.equal(await page.locator('.ll-font-run').count(),0);assert.equal(await page.locator('#ll-font-style').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: mobile/desktop theme binding, visible swatches, page opacity, ring picker, exclusions, pure backgrounds, global/bubble effects, uploaded textures, CSS/TTF fonts, language assignment, reload persistence and disposal.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
