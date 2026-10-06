// 梨梨 · 头像管理器 — 白川
// Standalone SillyTavern extension. Uses the same local data as script v0.28.
const INSTANCE_KEY = '__liliSequenceAvatarV7';
let started = false;
let waitingForDom = false;

export function init() {
    if (started && window[INSTANCE_KEY]?.extension === true) return;
    if (document.readyState === 'loading') {
        if (!waitingForDom) {
            waitingForDom = true;
            document.addEventListener('DOMContentLoaded', () => { waitingForDom = false; init(); }, { once: true });
        }
        return;
    }
    if (!document.querySelector('#chat')) return;
    startManager();
    started = true;
}

export function dispose() {
    if (window[INSTANCE_KEY]?.extension === true) window[INSTANCE_KEY].dispose();
    started = false;
}

function startManager() {

  'use strict';
  /* 梨梨 · 头像管理器 插件 v1.0.1 — 白川；头像、头像框、颜色与背景管理。 */
  const host = window;
  const doc = host.document;
  const key = '__liliSequenceAvatarV7';
  host[key]?.dispose();
  let timer = 0, dead = false;

  /* 主题专用的头像颜色快捷入口；管理器入口始终可用。 */
  const guard = doc.createElement('style');
  guard.textContent = '.ll-ink-toggle{display:none}';
  doc.head.append(guard);

  /* ---------- 系统日夜 ---------- */
  const root = doc.documentElement;
  const darkQuery = host.matchMedia?.('(prefers-color-scheme: dark)');
  const applyScheme = () => { root.dataset.llScheme = darkQuery?.matches ? 'dark' : 'light'; };
  applyScheme();
  darkQuery?.addEventListener?.('change', applyScheme);

  /* ---------- 头像元素颜色：手动切换（默认白色） ----------
   * 按头像图片记住选择：同一张头像在所有楼层一起变。 */
  const avatarSelector = '#chat .mes .avatar';
  const INK_KEY = 'lili-avatar-ink';
  let inkMap = {};
  try { inkMap = JSON.parse(host.localStorage.getItem(INK_KEY) || '{}') || {}; } catch (_) { inkMap = {}; }
  const srcOf = avatar => keyOf(avatar);
  /* 颜色顺序由主题决定：主题里写 --ll-ink-cycle（粉色版：lightpink neon white black），
   * 没写就是黑白版的 white dark。第一个是默认色。 */
  const INK_NAME = { white: '白色', dark: '黑色', black: '黑色', lightpink: '浅粉色', neon: '荧光粉色' };
  const cache = new Map();                       // 每一轮扫描清空一次
  const rootVar = p => { if (!cache.has(p)) cache.set(p, host.getComputedStyle(root).getPropertyValue(p).trim()); return cache.get(p); };
  const inkCycle = () => {
    const raw = rootVar('--ll-ink-cycle').replace(/['"]/g, '').trim();
    const list = raw ? raw.split(/[\s,]+/).filter(Boolean) : [];
    return list.length ? list : ['white', 'dark'];
  };
  const isHex = v => /^#[0-9a-f]{6}$/i.test(v || '');
  const saveInk = () => { try { host.localStorage.setItem(INK_KEY, JSON.stringify(inkMap)); } catch (_) {} };
  function inkOf(avatar) {
    const cyc = inkCycle(), k = srcOf(avatar);
    for (const v of [inkMap[k], inkMap['*']]) if (cyc.includes(v) || isHex(v)) return v;
    return cyc[0];
  }
  /* 自定义颜色：把主题里白色版本的图案换成这个颜色，写在这个头像上 */
  const CUSTOM_VARS = ['--ll-av-staff-w', '--ll-av-staff-w-static', '--ll-hang-1-w', '--ll-hang-2-w', '--ll-hang-3-w'];
  function recolor(v, hex) { return v.replace(/%23ffffff/gi, '%23' + hex.slice(1)).replace(/#ffffff/gi, hex); }
  function paintCustom(avatar, hex) {
    const w = avatar.parentElement;
    const sig = hex || ''; if (w.dataset.llCustom === sig) return; w.dataset.llCustom = sig;
    const clear = () => {
      [...CUSTOM_VARS, '--ll-wave', '--ll-av-c'].forEach(p => w.style.removeProperty(p));
      ['--ll-av-ink', '--ll-av-shine', '--ll-av-glow'].forEach(p => avatar.style.removeProperty(p));
    };
    if (!hex) { clear(); return; }
    CUSTOM_VARS.forEach(p => { const v = rootVar(p); if (v) w.style.setProperty(p, recolor(v, hex)); });
    const wave = rootVar('--ll-wave-white'); if (wave) w.style.setProperty('--ll-wave', recolor(wave, hex));
    w.style.setProperty('--ll-av-c', hex);
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    const light = (.2126 * r + .7152 * g + .0722 * b) / 255 > .6;
    avatar.style.setProperty('--ll-av-ink', hex);
    avatar.style.setProperty('--ll-av-shine', light ? '#ffffff' : 'color-mix(in srgb, ' + hex + ' 45%, #ffffff)');
    avatar.style.setProperty('--ll-av-glow', light ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.6)');
  }
  function paintInk(avatar) {
    const v = inkOf(avatar), custom = isHex(v);
    const tag = custom ? 'custom' : v;
    if (avatar.dataset.llInkSig === v) return; avatar.dataset.llInkSig = v;
    if (avatar.dataset.llInk !== tag) avatar.dataset.llInk = tag;
    paintCustom(avatar, custom ? v : '');
    const btn = avatar.parentElement?.querySelector(':scope > .ll-ink-toggle');
    if (btn) {
      btn.dataset.ink = tag; btn.title = '头像元素颜色：' + (custom ? v : (INK_NAME[v] || v)) + '（点一下换下一个）';
      btn.style.setProperty('--ll-dot', custom ? v : '');
    }
  }
  function inkToggle(wrapper) {
    const avatar = wrapper.querySelector(':scope > .avatar');
    if (!avatar) return;
    avatar.classList.remove('ll-avatar-ready');
    avatar.querySelector(':scope > .ll-avatar-score')?.remove();
    delete avatar.dataset.llBrightness;
    let btn = wrapper.querySelector(':scope > .ll-ink-toggle');
    if (!btn) {
      btn = doc.createElement('button'); btn.type = 'button'; btn.className = 'll-ink-toggle';
      btn.textContent = '♪𝒸𝒽𝒶𝓃𝑔𝑒 𝓉𝒽𝑒 𝒸ℴ𝓁ℴ𝓇.';
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const src = srcOf(avatar), cyc = inkCycle(), curV = inkOf(avatar);
        const next = cyc[(cyc.indexOf(curV) + 1) % cyc.length]; // 自定义色的下一个回到第一个预设
        if (next === cyc[0] && !inkMap['*']) delete inkMap[src]; else inkMap[src] = next;
        saveInk(); paintAll();
      });
    }
    if (wrapper.lastElementChild !== btn) wrapper.append(btn);
    paintOne(avatar);
  }

  /* ---------- 头像管理：换头像 / 头像框 / 背景 + 本地库 ----------
   * 图片存进浏览器的 IndexedDB（本地库，空间比 localStorage 大得多）；
   * 每个头像用了哪张图、怎么裁、框怎么放，存在 localStorage 的一小段设置里。
   * 换头像是直接替换聊天里 <img> 的地址，所以任何美化都能用；
   * 头像框和头像区域背景兼容普通美化；全局背景独立保存。 */
  const SET_KEY = 'lili-avatar-set';
  const BOX_A = 88.36 / 47.235;               // 头像方框内沿的宽高比
  const RING_URL = {
    white: 'https://s1.oururl.cn/autoupload/cgoqf/20260926/u3io/1968X1968/%E6%97%A0%E6%A0%87%E9%A2%98138_20260926050820.png',
    black: 'https://s1.oururl.cn/autoupload/cgoqf/20260926/L4ta/1968X1968/%E6%97%A0%E6%A0%87%E9%A2%98138_20260926050824.png',
    lightpink: 'https://s1.oururl.cn/autoupload/cgoqf/20260926/JzJ7/1968X1968/%E6%97%A0%E6%A0%87%E9%A2%98138_20260926050909.png',
    neon: 'https://s1.oururl.cn/autoupload/cgoqf/20260926/frys/1968X1968/%E6%97%A0%E6%A0%87%E9%A2%98138_20260926051024.png',
  };
  const isSequence = () => !!rootVar('--ll-ring-white');           // 是不是序列系列美化
  const isPinkTheme = () => inkCycle().includes('lightpink');
  const builtinFrames = () => [['white', '白色音符框'], ['black', '黑色音符框'], ...(isPinkTheme() || !isSequence() ? [['lightpink', '浅粉音符框'], ['neon', '荧光粉音符框']] : [])]
    .map(([c, name]) => ({ id: 'builtin:' + c, kind: 'frame', name, builtin: true, css: 'url("' + RING_URL[c] + '")' }));
  const ringCss = c => 'url("' + RING_URL[c] + '")';
  let set = { avatar: {}, bg: {}, frame: {} };
  try { set = Object.assign(set, JSON.parse(host.localStorage.getItem(SET_KEY) || '{}')); } catch (_) {}
  const saveSet = () => { try { host.localStorage.setItem(SET_KEY, JSON.stringify(set)); } catch (_) {} };
  const keyOfSrc = s => {
    if (!s) return '';
    /* 同一张头像在酒馆里有两种地址：缩略图 /thumbnail?type=persona&file=xx.png，或原图 /User Avatars/xx.png、/characters/xx.png。
     * 统一取文件名当钥匙，否则「给谁」里选的人设和聊天里的头像对不上，裁好的图就换不上去。 */
    try {
      const u = new URL(s, host.location.href);
      if (u.protocol === 'blob:' || u.protocol === 'data:') return s;
      const f = u.searchParams.get('file') || decodeURIComponent(u.pathname).split('/').pop();
      return f || s;
    } catch (_) { return String(s); }
  };
  const keyOf = avatar => { const img = avatar?.querySelector('img'); return img ? keyOfSrc(img.dataset.llOrig || img.getAttribute('src')) : ''; };

  /* 本地库（IndexedDB） */
  const DB_NAME = 'lili-avatar-lib';
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = host.indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => {
    const t = d.transaction('items', mode), st = t.objectStore('items'); const out = fn(st);
    t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }); };
  let lib = [];                                 // 内存里的一份
  const urls = new Map();                       // id -> 可用地址
  const itemUrl = it => { if (!it) return ''; if (it.builtin) return RING_URL[it.id.slice(8)] || ''; if (it.url) return it.url; if (!urls.has(it.id)) urls.set(it.id, host.URL.createObjectURL(it.blob)); return urls.get(it.id); };
  const byId = id => String(id || '').startsWith('builtin:') ? builtinFrames().find(x => x.id === id) : lib.find(x => x.id === id);
  async function libLoad() { try { lib = (await tx('readonly', s => s.getAll())) || []; } catch (_) { lib = []; } lib.sort((a, b) => b.t - a.t); }
  async function libAdd(item) {
    item.id = item.id || (item.kind + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    item.t = Date.now();
    await tx('readwrite', s => s.put(item)); lib.unshift(item); return item;
  }
  async function libDel(ids) {
    await tx('readwrite', s => ids.forEach(id => s.delete(id)));
    ids.forEach(id => { if (urls.has(id)) { host.URL.revokeObjectURL(urls.get(id)); urls.delete(id); } });
    lib = lib.filter(x => !ids.includes(x.id));
    for (const k of ['avatar', 'bg', 'frame']) for (const [key, v] of Object.entries(set[k])) {
      const id = typeof v === 'string' ? v : v?.id; if (ids.includes(id)) delete set[k][key];
    }
    if (ids.includes(set.globalBg?.id)) delete set.globalBg;
    if (ids.includes(set.entry?.iconId)) { delete set.entry.iconId; set.entry.mode = 'text'; }
    saveSet(); paintAll();
  }
  const dataUrlToBlob = async d => (await host.fetch(d)).blob();

  /* 旧版（v0.19）背景设置搬进本地库 */
  async function migrate() {
    let old = null; try { old = JSON.parse(host.localStorage.getItem('lili-avatar-bg') || 'null'); } catch (_) {}
    if (old && typeof old === 'object') {
      for (const [key, r] of Object.entries(old)) {
        if (!r?.src) continue;
        const item = String(r.src).startsWith('data:')
          ? await libAdd({ kind: 'bg', name: '旧背景', blob: await dataUrlToBlob(r.src), a: r.a || 1.6 })
          : await libAdd({ kind: 'bg', name: '旧背景', url: r.src, a: r.a || 1.6 });
        set.bg[key] = { id: item.id, z: r.z || 1, x: r.x ?? 50, y: r.y ?? 50 };
      }
      try { host.localStorage.removeItem('lili-avatar-bg'); } catch (_) {}
    }
    let s = 0; try { s = parseFloat(host.localStorage.getItem('lili-ring-scale')); } catch (_) {}
    if (s && !set.frame['*']) set.frame['*'] = { id: 'auto', s, dx: 0, dy: 0 };
    try { host.localStorage.removeItem('lili-ring-scale'); } catch (_) {}
    saveSet();
  }

  /* 把设置画到头像上 */
  const bgSize = (a, z) => (100 * z * Math.max(1, a / BOX_A)).toFixed(2) + '% auto';
  const cssUrl = u => 'url("' + String(u).replace(/["\\\n]/g, m => encodeURIComponent(m)) + '")';
  function paintAvatarImg(avatar) {
    const img = avatar.querySelector('img'); if (!img) return;
    const cur = img.getAttribute('src') || '';
    if (img.dataset.llOrig && cur !== img.dataset.llSet) { img.dataset.llOrig = cur; delete img.dataset.llSet; } // 酒馆自己换了头像
    const key = keyOfSrc(img.dataset.llOrig || cur);
    const it = byId(set.avatar[key]);
    if (it) {
      const u = itemUrl(it);
      if (!img.dataset.llOrig) img.dataset.llOrig = cur;
      if (cur !== u) { img.dataset.llSet = u; img.setAttribute('src', u); }
    } else if (img.dataset.llOrig) {
      const o = img.dataset.llOrig; delete img.dataset.llOrig; delete img.dataset.llSet;
      if (cur !== o) img.setAttribute('src', o);
    }
  }
  function paintBg(avatar) {
    const key = keyOf(avatar), r = set.bg[key] || set.bg['*'], it = r && byId(r.id);
    const nativeBg = isSequence() && !!rootVar('--ll-wave');
    const sig = it ? it.id + '|' + r.z + '|' + r.x + '|' + r.y + '|' + nativeBg : '';
    if (avatar.dataset.llBgSig === sig) return; avatar.dataset.llBgSig = sig;
    avatar.classList.toggle('ll-custom-avatar-bg', !!it && !nativeBg);
    if (!it) { ['--ll-av-bg', '--ll-av-bg-size', '--ll-av-bg-pos'].forEach(p => avatar.style.removeProperty(p)); return; }
    avatar.style.setProperty('--ll-av-bg', cssUrl(itemUrl(it)));
    avatar.style.setProperty('--ll-av-bg-size', bgSize(it.a || 1.6, r.z || 1));
    avatar.style.setProperty('--ll-av-bg-pos', (r.x ?? 50) + '% ' + (r.y ?? 50) + '%');
  }
  function paintOverlay(avatar, r, it) {
    let o = avatar.querySelector(':scope > .ll-frame-over');
    const url = it ? (it.builtin ? RING_URL[it.id.slice(8)] : itemUrl(it)) : '';
    const sig = url ? [url, r.s ?? 1.36, r.dx ?? 0, r.dy ?? 0].join('|') : '';
    if (avatar.dataset.llOverSig === sig && (!sig || o)) return; avatar.dataset.llOverSig = sig;
    if (!url) { o?.remove(); avatar.classList.remove('ll-frame-host'); return; }
    if (!o) { o = doc.createElement('span'); o.className = 'll-frame-over'; o.setAttribute('aria-hidden', 'true'); avatar.append(o); }
    avatar.classList.add('ll-frame-host');
    const S = r.s ?? 1.36;
    o.style.backgroundImage = cssUrl(url);
    o.style.width = (100 * S) + '%';
    o.style.marginLeft = `calc(${-50 * S}% + ${r.dx ?? 0}%)`;
    o.style.marginTop = `calc(${-50 * S}% + ${r.dy ?? 0}%)`;
  }
  function paintFrame(avatar) {
    const w = avatar.parentElement; if (!w) return;
    const key = keyOf(avatar), r = set.frame[key] || set.frame['*'] || {}, it = r.id && r.id !== 'auto' ? byId(r.id) : null;
    if (!isSequence()) { paintOverlay(avatar, r, it); return; }     // 其他美化：直接盖在头像上
    if (avatar.querySelector(':scope > .ll-frame-over')) { paintOverlay(avatar, r, null); }
    const ink = inkOf(avatar);
    const want = { '--ll-ring': '', '--ll-ring-mask': '', '--ll-ring-color': '' };
    if (it?.builtin) want['--ll-ring'] = it.css;
    else if (it) want['--ll-ring'] = cssUrl(itemUrl(it));
    else if (isHex(ink)) Object.assign(want, { '--ll-ring': 'none', '--ll-ring-mask': 'var(--ll-ring-white)', '--ll-ring-color': ink });
    want['--ll-ring-scale'] = String(r.s ?? 1.36); want['--ll-ring-dx'] = String(r.dx ?? 0); want['--ll-ring-dy'] = String(r.dy ?? 0);
    const sig = JSON.stringify(want); if (w.dataset.llFrameSig === sig) return; w.dataset.llFrameSig = sig;
    for (const [p, v] of Object.entries(want)) v ? w.style.setProperty(p, v) : w.style.removeProperty(p);
  }
  function paintOne(avatar) { paintAvatarImg(avatar); paintInk(avatar); paintBg(avatar); paintFrame(avatar); }
  function paintAllAny(a) { paintOne(a); }
  function paintAll() {
    cache.clear(); paintGlobalBg(); paintBubbles(); paintText(); paintEntries();
    doc.querySelectorAll('#chat .mes .avatar').forEach(a => { delete a.dataset.llInkSig; delete a.dataset.llBgSig; delete a.dataset.llOverSig; if (a.parentElement) { delete a.parentElement.dataset.llFrameSig; } }); doc.querySelectorAll('#chat .mes .avatar').forEach(a => { if (a.matches(avatarSelector)) paintOne(a); else paintAllAny(a); }); }

  function paintGlobalBg() {
    const r = set.globalBg, it = r && byId(r.id);
    root.classList.toggle('ll-custom-global-bg', !!it);
    if (!it) { ['--ll-global-bg','--ll-global-bg-size','--ll-global-bg-pos'].forEach(p => root.style.removeProperty(p)); return; }
    root.style.setProperty('--ll-global-bg', cssUrl(itemUrl(it)));
    root.style.setProperty('--ll-global-bg-size', (r.z || 1) === 1 ? 'cover' : (100 * r.z * Math.max(1, (it.a || 1.6) / (host.innerWidth / host.innerHeight))) + '% auto');
    root.style.setProperty('--ll-global-bg-pos', (r.x ?? 50) + '% ' + (r.y ?? 50) + '%');
  }

  function paintBubbles() {
    const b = set.bubbles;
    root.classList.toggle('ll-custom-bubbles', !!b?.enabled);
    if (!b?.enabled) { ['--ll-bubble-opacity','--ll-bubble-blur','--ll-bubble-color'].forEach(p => root.style.removeProperty(p)); return; }
    const opacity = Math.min(100, Math.max(0, Number(b.opacity) || 0));
    const blur = Math.min(40, Math.max(0, Number(b.blur) || 0));
    root.style.setProperty('--ll-bubble-opacity', opacity + '%');
    root.style.setProperty('--ll-bubble-blur', blur + 'px');
    if (isHex(b.color)) root.style.setProperty('--ll-bubble-color', b.color); else root.style.removeProperty('--ll-bubble-color');
  }
  function paintText() {
    const t = set.text || {};
    root.classList.toggle('ll-custom-text-color', !!t.colorEnabled && isHex(t.color));
    root.classList.toggle('ll-custom-text-glow', !!t.glowEnabled);
    if (t.colorEnabled && isHex(t.color)) root.style.setProperty('--ll-text-color', t.color); else root.style.removeProperty('--ll-text-color');
    if (t.glowEnabled) {
      root.style.setProperty('--ll-text-glow-color', isHex(t.glowColor) ? t.glowColor : '#ffffff');
      root.style.setProperty('--ll-text-glow-size', Math.min(20, Math.max(1, Number(t.glowSize) || 4)) + 'px');
    } else ['--ll-text-glow-color','--ll-text-glow-size'].forEach(p => root.style.removeProperty(p));
  }
  function paintEntry(b) {
    const r = set.entry || {}, mode = r.mode || 'text';
    const it = mode === 'icon' && r.iconId ? byId(r.iconId) : null;
    const size = Math.min(40, Math.max(12, Number(r.size) || 22));
    const text = String(r.text || '').trim() || '♡';
    const url = it ? itemUrl(it) : '';
    const sig = JSON.stringify([url, text, size]);
    if (b.dataset.llEntrySig === sig) return;
    b.dataset.llEntrySig = sig;
    b.textContent = '';
    if (url) {
      const img = doc.createElement('img'); img.src = url; img.alt = ''; img.draggable = false;
      img.addEventListener('error', () => { if (img.parentElement === b) { b.textContent = text; } });
      b.append(img);
    } else b.textContent = text;
    b.style.setProperty('--ll-entry-size', size + 'px');
  }
  function paintEntries() { doc.querySelectorAll('.ll-avatar-entry').forEach(paintEntry); }

  /* 面板样式 */
  const panelCss = doc.createElement('style');
  panelCss.textContent = `
html:root body #chat .mes .ll-avatar-entry{display:inline-flex!important;position:static!important;visibility:visible!important;opacity:1!important;align-items:center;justify-content:center;flex:0 0 auto!important;width:auto!important;min-width:28px!important;max-width:150px!important;height:var(--ll-entry-size,22px)!important;min-height:28px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;margin:0 3px!important;padding:0!important;border:0!important;border-radius:4px!important;background:transparent!important;color:inherit!important;font:var(--ll-entry-size,22px)/1 sans-serif!important;cursor:pointer!important;pointer-events:auto!important;z-index:5!important;transform:none!important}
html:root body #chat .mes .ll-avatar-entry::before,html:root body #chat .mes .ll-avatar-entry::after{content:none!important}
html:root body #chat .mes .ll-avatar-entry:hover{background:rgba(128,128,128,.15)!important}
html:root body #chat .mes .avatar.ll-custom-avatar-bg{background-image:var(--ll-av-bg)!important;background-size:var(--ll-av-bg-size,cover)!important;background-position:var(--ll-av-bg-pos,center)!important;background-repeat:no-repeat!important}
html:root.ll-custom-global-bg body{background-image:var(--ll-global-bg)!important;background-size:var(--ll-global-bg-size,cover)!important;background-position:var(--ll-global-bg-pos,center)!important;background-repeat:no-repeat!important;background-attachment:fixed!important}
html:root.ll-custom-global-bg body :is(#bg1,#bg_custom){background-image:none!important;background-color:transparent!important}
html:root body #chat .mes .ll-avatar-entry > img{display:block!important;position:static!important;width:var(--ll-entry-size,22px)!important;height:var(--ll-entry-size,22px)!important;max-width:none!important;max-height:none!important;object-fit:contain!important;border:0!important;border-radius:0!important;background:transparent!important;pointer-events:none!important;padding:0!important;margin:0!important;filter:none!important}
html:root.ll-custom-bubbles body :is(#sheld,#chat){background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
html:root.ll-custom-bubbles body #chat .mes{background:color-mix(in srgb,var(--ll-bubble-color,var(--lb-paper,var(--ll-paper,var(--SmartThemeBlurTintColor,#ffffff)))) var(--ll-bubble-opacity,100%),transparent)!important;backdrop-filter:blur(var(--ll-bubble-blur,0px))!important;-webkit-backdrop-filter:blur(var(--ll-bubble-blur,0px))!important}
html:root.ll-custom-bubbles body #chat .mes > .mes_block,html:root.ll-custom-bubbles body #chat .mes .mes_text,html:root.ll-custom-bubbles body #chat .mes > .mesAvatarWrapper{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.ll-grid>div.icon{background-size:contain!important;background-repeat:no-repeat}
.ll-mgr-preview-entry{display:flex;align-items:center;justify-content:center;min-height:48px;padding:8px;border:1px dashed var(--ll-panel-line,#ccc)}
.ll-mgr-preview-entry img{object-fit:contain;max-width:100%}
.ll-mgr-tabs{flex-wrap:nowrap}

.ll-mgr{position:fixed!important;inset:0!important;margin:0!important;width:100%!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;padding:12px!important;border:0!important;box-sizing:border-box!important;transform:none!important;z-index:2147483600;display:grid;place-items:center;background:transparent!important;font-family:var(--mainFontFamily,serif)}
.ll-mgr:not([open]){display:none!important}
.ll-mgr::backdrop{background:rgba(0,0,0,.45)}
.ll-mgr *{box-sizing:border-box}
.ll-mgr [hidden]{display:none!important}
.ll-mgr-card{position:relative!important;inset:auto!important;margin:auto!important;transform:none!important;min-height:0;min-width:0;width:min(100%,480px)!important;max-height:calc(100vh - 24px)!important;max-height:calc(100dvh - 24px)!important;overflow:auto!important;overscroll-behavior:contain;padding:14px 14px 12px;background:var(--ll-panel-paper,#fff);color:var(--ll-panel-ink,#222);border:1px solid var(--ll-panel-edge,#999);font-size:13px}
.ll-mgr h3{margin:0 0 8px;font:400 17px Georgia,'Noto Sans Symbols 2',serif;letter-spacing:.03em}
.ll-mgr select,.ll-mgr input[type=text]{flex:1;min-width:0;padding:6px 8px;border:1px solid var(--ll-panel-line,#ccc);background:var(--ll-panel-paper,#fff);color:inherit;font:inherit;border-radius:0}
.ll-mgr button{padding:5px 11px;border:1px solid var(--ll-panel-line,#ccc);background:var(--ll-panel-paper,#fff);color:inherit;font:inherit;cursor:pointer;border-radius:0}
.ll-mgr button.pri{border-color:var(--ll-panel-pink,var(--ll-panel-ink,#222));color:var(--ll-panel-pink,var(--ll-panel-ink,#222))}
.ll-mgr button.danger{color:#c0304a;border-color:#e3a0ad}
.ll-mgr-tabs{display:flex;gap:0;margin:8px 0 10px;border-bottom:1px solid var(--ll-panel-line,#ccc)}
.ll-mgr-tabs button{border:0;border-bottom:2px solid transparent;background:none;padding:6px 12px}
.ll-mgr-tabs button.on{border-bottom-color:var(--ll-panel-pink,var(--ll-panel-ink,#222));color:var(--ll-panel-pink,var(--ll-panel-ink,#222))}
.ll-row{display:flex;gap:8px;align-items:center;margin:7px 0;flex-wrap:wrap}
.ll-row input[type=range]{flex:1;accent-color:var(--ll-panel-pink,var(--ll-panel-ink,#222))}
.ll-tip{font-size:12px;color:var(--ll-panel-muted,#777);line-height:1.6}
.ll-crop{position:relative;width:100%;margin:6px 0;border:1px solid var(--ll-panel-line,#ccc);background:var(--ll-panel-soft,#f4f4f4) no-repeat;touch-action:none;cursor:grab;overflow:hidden}
.ll-crop.circle::after{content:'';position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.35);pointer-events:none}
.ll-crop.hint::after{content:'';position:absolute;top:44%;width:32%;aspect-ratio:1;transform:translate(-50%,-50%);left:var(--hx,27%);border:1px dashed rgba(255,255,255,.95);outline:1px dashed rgba(0,0,0,.4);border-radius:50%;pointer-events:none}
.ll-frame-prev{position:relative;width:min(60vw,220px);aspect-ratio:1;margin:6px auto;background:var(--ll-panel-soft,#f4f4f4);overflow:hidden;touch-action:none;cursor:grab;border:1px solid var(--ll-panel-line,#ccc)}
.ll-frame-prev img{position:absolute;left:25%;top:25%;width:50%;height:50%;border-radius:50%;object-fit:cover}
.ll-frame-prev i{position:absolute;left:50%;top:50%;background:center/contain no-repeat;pointer-events:none}
.ll-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;margin:6px 0}
.ll-grid>div{position:relative;aspect-ratio:1;border:1px solid var(--ll-panel-line,#ccc);background:var(--ll-panel-soft,#f4f4f4) center/cover no-repeat;cursor:pointer}
.ll-grid>div.frame{background-size:contain}
.ll-grid>div.on{outline:2px solid var(--ll-panel-pink,var(--ll-panel-ink,#222));outline-offset:1px}
.ll-grid>div.auto{display:grid;place-items:center;font-size:11px;text-align:center;line-height:1.3;padding:4px}
.ll-grid>div b{position:absolute;right:-6px;top:-6px;width:18px;height:18px;border-radius:50%;background:#c0304a;color:#fff;font:700 12px/18px sans-serif;text-align:center}
.ll-sec{margin:10px 0 2px;font-weight:600}
.ll-mgr label{display:flex;align-items:center;gap:6px}
.ll-mgr details{margin:6px 0;border-top:1px dashed var(--ll-panel-line,#ccc)}
.ll-mgr summary{cursor:pointer;padding:6px 0;font-weight:600;list-style:none;display:flex;justify-content:space-between;align-items:center}
.ll-mgr summary::-webkit-details-marker{display:none}
.ll-mgr summary::after{content:'▸';transition:transform .2s;color:var(--ll-panel-muted,#888)}
.ll-mgr details[open]>summary::after{transform:rotate(90deg)}
.ll-grid>div.pin::before{content:'★';position:absolute;left:3px;top:1px;font-size:10px;color:var(--ll-panel-pink,var(--ll-panel-ink,#222))}
.ll-seg{display:inline-flex;border:1px solid var(--ll-panel-line,#ccc)}
.ll-seg button{border:0;border-right:1px solid var(--ll-panel-line,#ccc)}
.ll-seg button:last-child{border-right:0}
.ll-seg button.on{background:var(--ll-panel-soft,#f4f4f4);color:var(--ll-panel-pink,var(--ll-panel-ink,#222))}
.ll-crop.guide::after{content:'';position:absolute;left:50%;top:50%;height:100%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.9),0 0 0 2px rgba(0,0,0,.35);pointer-events:none}
.ll-crop.guide.tall::after{height:auto;width:100%}
.ll-box-prev{position:relative;width:100%;margin:6px 0;border:1px solid var(--ll-panel-line,#ccc);background:var(--ll-panel-soft,#f4f4f4) no-repeat;overflow:hidden;touch-action:none;cursor:grab}
.ll-box-prev img{position:absolute;border-radius:50%;object-fit:cover;pointer-events:none}
.ll-box-prev i{position:absolute;background:center/contain no-repeat;pointer-events:none}
.ll-wheel{display:block;margin:6px auto;touch-action:none;cursor:crosshair;max-width:100%}
.ll-swatches{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.ll-swatches span{position:relative;width:26px;height:26px;border-radius:50%;border:1px solid var(--ll-panel-line,#ccc);cursor:pointer}
.ll-swatches span.on{outline:2px solid var(--ll-panel-pink,var(--ll-panel-ink,#222));outline-offset:2px}
.ll-swatches span b{position:absolute;right:-5px;top:-5px;width:14px;height:14px;border-radius:50%;background:#c0304a;color:#fff;font:700 10px/14px sans-serif;text-align:center}
.ll-hex{width:7.5em;flex:none!important}
.ll-frame-host{position:relative!important;overflow:visible!important}
.ll-frame-over{position:absolute;left:50%;top:50%;z-index:9;aspect-ratio:1/1;pointer-events:none;background:center/contain no-repeat}
/* v0.26：管理器跟随主题，标签一行滑动，原生音符滑条覆盖主题的隐藏规则。 */
html:root body .ll-mgr{
 --ll-panel-paper:var(--lb-paper,var(--ll-paper,var(--SmartThemeBlurTintColor,#ffffff)));
 --ll-panel-ink:var(--lb-ink,var(--ll-ink,var(--SmartThemeBodyColor,#222222)));
 --ll-panel-muted:var(--lb-muted,var(--ll-muted,var(--SmartThemeEmColor,#777777)));
 --ll-panel-line:var(--lb-line,var(--ll-line,var(--SmartThemeBorderColor,#999999)));
 --ll-panel-edge:var(--lb-line,var(--ll-edge,var(--SmartThemeBorderColor,#999999)));
 --ll-panel-soft:var(--lb-soft,var(--ll-soft,var(--SmartThemeChatTintColor,#eeeeee)));
 --ll-panel-pink:var(--lb-accent,var(--ll-pink,var(--SmartThemeQuoteColor,var(--ll-panel-ink))));
 --ll-range-note:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Cpath%20fill%3D%22white%22%20d%3D%22M17%203h2v19.5c0%203-3.5%206-7%206-3%200-5-1.5-5-3.5%200-3%203.5-5.5%207-5.5%201.2%200%202.2.2%203%20.7V3zm2%200c1%205%208%205%208%2010%200%203-1.5%205-4.5%207%202-2.5%202.7-4.8%201.5-6.5-1.5-2-4.5-2.5-5-4V3z%22%2F%3E%3C%2Fsvg%3E");
 color:var(--ll-panel-ink)!important;font-family:var(--lb-font,var(--mainFontFamily,serif))!important;
}
html:root body .ll-mgr .ll-mgr-card{background:var(--ll-panel-paper)!important;color:var(--ll-panel-ink)!important;border-color:var(--ll-panel-edge)!important}
html:root body .ll-mgr :is(select,input[type=text],button){background-color:var(--ll-panel-paper)!important;color:var(--ll-panel-ink)!important;border-color:var(--ll-panel-line)!important;font-family:inherit!important}
html:root body .ll-mgr select option{background:var(--ll-panel-paper)!important;color:var(--ll-panel-ink)!important}
html:root body .ll-mgr .ll-mgr-tabs{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;width:100%!important;min-width:0!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;gap:0!important;white-space:nowrap!important;touch-action:pan-x;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:var(--ll-panel-muted) transparent;-webkit-overflow-scrolling:touch;padding-bottom:5px!important}
html:root body .ll-mgr .ll-mgr-tabs button{flex:0 0 auto!important;white-space:nowrap!important;min-width:max-content!important;background:transparent!important;border:0!important;border-bottom:2px solid transparent!important;padding:8px 11px!important}
html:root body .ll-mgr .ll-mgr-tabs button.on{color:var(--ll-panel-pink)!important;border-bottom-color:var(--ll-panel-pink)!important}
html:root body .ll-mgr input[type=range]{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;appearance:none!important;-webkit-appearance:none!important;flex:1 1 130px!important;width:130px!important;min-width:100px!important;max-width:100%!important;height:32px!important;min-height:32px!important;margin:2px 0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;cursor:ew-resize!important;touch-action:pan-y;filter:none!important}
html:root body .ll-mgr input[type=range]::-webkit-slider-runnable-track{display:block!important;height:2px!important;background:var(--ll-panel-muted)!important;border:0!important;border-radius:0!important;box-shadow:none!important}
html:root body .ll-mgr input[type=range]::-webkit-slider-thumb{appearance:none!important;-webkit-appearance:none!important;width:28px!important;height:28px!important;margin-top:-13px!important;background:var(--ll-panel-ink)!important;border:0!important;border-radius:0!important;box-shadow:none!important;opacity:1!important;visibility:visible!important;-webkit-mask:var(--ll-range-note) center/contain no-repeat!important;mask:var(--ll-range-note) center/contain no-repeat!important;transform:none!important;filter:none!important}
html:root body .ll-mgr input[type=range]::-moz-range-track{height:2px!important;background:var(--ll-panel-muted)!important;border:0!important;border-radius:0!important}
html:root body .ll-mgr input[type=range]::-moz-range-thumb{width:28px!important;height:28px!important;background:var(--ll-panel-ink)!important;border:0!important;border-radius:0!important;box-shadow:none!important;mask:var(--ll-range-note) center/contain no-repeat!important}
html:root body .ll-mgr input[type=range]:focus-visible{outline:1px dashed var(--ll-panel-muted)!important;outline-offset:3px!important}
html:root body .ll-mgr .ll-tip{color:var(--ll-panel-muted)!important}

html:root.ll-custom-text-color body #chat .mes_text,html:root.ll-custom-text-color body #chat .mes_text :is(p,span,div,a,li,ul,ol,dl,dt,dd,strong,b,em,i,q,u,s,del,ins,blockquote,code,pre,h1,h2,h3,h4,h5,h6,table,thead,tbody,tr,th,td,summary,label,small,sub,sup){color:var(--ll-text-color)!important}
html:root.ll-custom-text-glow body #chat .mes_text,html:root.ll-custom-text-glow body #chat .mes_text :is(p,span,div,a,li,ul,ol,dl,dt,dd,strong,b,em,i,q,u,s,del,ins,blockquote,code,pre,h1,h2,h3,h4,h5,h6,table,thead,tbody,tr,th,td,summary,label,small,sub,sup){text-shadow:0 0 var(--ll-text-glow-size) var(--ll-text-glow-color),0 0 calc(var(--ll-text-glow-size) * 2) var(--ll-text-glow-color)!important}
html:root body .ll-mgr input[type=color]{display:block!important;width:40px!important;min-width:40px!important;height:30px!important;flex:0 0 auto!important;padding:2px!important;background:var(--ll-panel-paper)!important;border:1px solid var(--ll-panel-line)!important;border-radius:0!important;cursor:pointer}

/* v0.28 · 白川：按可见屏幕比例排版，只有内容区滚动，关闭键常驻底部。 */
html:root body .ll-mgr{inset:auto!important;left:var(--ll-mgr-vx,0px)!important;top:var(--ll-mgr-vy,0px)!important;width:var(--ll-mgr-vw,100vw)!important;height:var(--ll-mgr-vh,100dvh)!important;min-height:0!important;overflow:hidden!important;padding:max(1vh,env(safe-area-inset-top,0px)) max(1vw,env(safe-area-inset-right,0px)) max(1vh,env(safe-area-inset-bottom,0px)) max(1vw,env(safe-area-inset-left,0px))!important}
html:root body .ll-mgr .ll-mgr-card{display:flex!important;flex-direction:column!important;width:92%!important;max-width:92%!important;height:88%!important;max-height:88%!important;min-width:0!important;min-height:0!important;overflow:hidden!important;padding:clamp(8px,1.5vmin,18px)!important;margin:auto!important;box-sizing:border-box!important}
html:root body .ll-mgr .ll-mgr-card > h3,html:root body .ll-mgr .ll-mgr-card > .ll-row,html:root body .ll-mgr .ll-mgr-tabs{flex:0 0 auto!important}
html:root body .ll-mgr .ll-mgr-card > .pane{flex:1 1 0!important;min-height:0!important;min-width:0!important;max-width:100%!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain!important;touch-action:pan-y;padding:2px 3px 10px!important;-webkit-overflow-scrolling:touch}
html:root body .ll-mgr .ll-mgr-footer{display:flex!important;flex:0 0 auto!important;justify-content:flex-end!important;align-items:center!important;gap:8px!important;margin:0!important;padding:8px 0 0!important;background:var(--ll-panel-paper)!important;border-top:1px solid var(--ll-panel-line)!important;min-height:52px!important}
html:root body .ll-mgr .ll-mgr-footer .close{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:80px!important;min-height:44px!important;padding:6px 16px!important;touch-action:manipulation;flex:0 0 auto!important}
html:root body .ll-mgr[data-ll-compact="true"] .ll-mgr-card{height:96%!important;max-height:96%!important;width:96%!important;max-width:96%!important;padding:6px!important}
html:root body .ll-mgr[data-ll-compact="true"] .ll-mgr-card > h3{display:none!important}
html:root body .ll-mgr[data-ll-compact="true"] .ll-mgr-card > .ll-row:not(.ll-mgr-footer){margin:1px 0!important}
html:root body .ll-mgr[data-ll-compact="true"] .ll-mgr-tabs{margin:2px 0!important;padding-bottom:2px!important}
html:root body .ll-mgr[data-ll-compact="true"] .ll-mgr-tabs button{padding:4px 9px!important}
`;
  doc.head.append(panelCss);

  /* 读图：链接直接用；本地图压缩后存成 Blob */
  const loadImg = src => new Promise((res, rej) => { const im = new host.Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const readFile = f => new Promise(res => { const r = new host.FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
  async function shrink(dataUrl, max, type) {
    const im = await loadImg(dataUrl), k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = doc.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, type, .88));
    return { blob, a: c.width / c.height, im };
  }
  function cropperState(box, st, onDraw) {
    const draw = () => {
      if (!st.src) { box.style.backgroundImage = 'none'; return; }
      const A = box.clientWidth / box.clientHeight || 1;
      box.style.backgroundImage = cssUrl(st.src);
      box.style.backgroundSize = (100 * st.z * Math.max(1, st.a / A)).toFixed(2) + '% auto';
      box.style.backgroundPosition = st.x + '% ' + st.y + '%';
      onDraw?.();
    };
    let drag = null;
    box.addEventListener('pointerdown', e => { if (!st.src) return; drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y }; try { box.setPointerCapture(e.pointerId); } catch (_) {} });
    box.addEventListener('pointermove', e => {
      if (!drag) return;
      const r = box.getBoundingClientRect(), A = r.width / r.height;
      const iw = r.width * st.z * Math.max(1, st.a / A), ih = iw / st.a, ex = iw - r.width, ey = ih - r.height;
      if (ex > 1) st.x = Math.max(0, Math.min(100, drag.sx - (e.clientX - drag.x) / ex * 100));
      if (ey > 1) st.y = Math.max(0, Math.min(100, drag.sy - (e.clientY - drag.y) / ey * 100));
      draw();
    });
    ['pointerup', 'pointercancel'].forEach(t => box.addEventListener(t, () => { drag = null; }));
    return draw;
  }
  /* 按裁剪框切出方形头像（只有本地图 / 允许跨域的图能切） */
  async function cropRect(st, A, png) {
    const im = await loadImg(st.src);
    const Wd = st.z * Math.max(1, st.a / A), Hd = Wd / st.a;          // 以裁剪框宽为 1
    const ox = (1 - Wd) * st.x / 100, oy = (1 / A - Hd) * st.y / 100;
    const nw = im.naturalWidth, nh = im.naturalHeight;
    const sw = nw / Wd, sh = (1 / A) / Hd * nh;                        // 源图上被框住的像素
    const long = Math.min(1600, Math.max(sw, sh));                     // 不放大，最长 1600px
    const c = doc.createElement('canvas');
    c.width = Math.round(A >= 1 ? long : long * A); c.height = Math.round(A >= 1 ? long / A : long);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(im, -ox / Wd * nw, -oy / Hd * nh, sw, sh, 0, 0, c.width, c.height);
    return new Promise((r, j) => { try { c.toBlob(r, png ? 'image/png' : 'image/jpeg', .93); } catch (e) { j(e); } });
  }

  /* 当前聊天里有哪些头像 */
  /* 从头像地址推出原图地址（缩略图 → 原图），用来重新裁剪 */
  function originalOf(src) {
    try {
      const u = new URL(src, host.location.href), f = u.searchParams.get('file');
      if (u.pathname.endsWith('/thumbnail') && f) return (u.searchParams.get('type') === 'persona' ? '/User Avatars/' : '/characters/') + encodeURIComponent(f);
    } catch (_) {}
    return src;
  }
  function currentOwners() {
    const out = [];
    try {
      const c = host.SillyTavern?.getContext?.();
      const ch = c?.characters?.[c?.characterId];
      if (ch?.avatar && ch.avatar !== 'none') out.push({ key: ch.avatar, name: ch.name || ch.avatar, user: false, src: '/thumbnail?type=avatar&file=' + encodeURIComponent(ch.avatar), current: true });
    } catch (_) {}
    const p = doc.querySelector('#user_avatar_block .avatar-container.selected');
    const pf = p?.getAttribute('data-avatar-id') || p?.getAttribute('imgfile');
    if (pf) out.push({ key: pf, name: p.querySelector('.ch_name')?.textContent.trim() || '我的人设', user: true, src: '/thumbnail?type=persona&file=' + encodeURIComponent(pf), current: true });
    return out;
  }
  function chatAvatars() {
    const seen = new Map();
    currentOwners().forEach(o => seen.set(o.key, o));
    doc.querySelectorAll('#chat > .mes').forEach(mes => {
      const av = mes.querySelector('.avatar'); const k = keyOf(av); if (!k || seen.has(k)) return;
      const o = seen.get(k) || {};
      seen.set(k, { ...o, key: k, name: o.name || mes.querySelector('.name_text')?.textContent.trim() || k, user: mes.getAttribute('is_user') === 'true', avatar: av, src: av.querySelector('img')?.dataset.llOrig || av.querySelector('img')?.getAttribute('src') });
    });
    return [...seen.values()];
  }

  function fitManagerViewport(wrap) {
    const viewport = host.visualViewport;
    function fit() {
      const width = viewport?.width || host.innerWidth;
      const height = viewport?.height || host.innerHeight;
      wrap.style.setProperty('--ll-mgr-vw', width + 'px');
      wrap.style.setProperty('--ll-mgr-vh', height + 'px');
      wrap.style.setProperty('--ll-mgr-vx', (viewport?.offsetLeft || 0) + 'px');
      wrap.style.setProperty('--ll-mgr-vy', (viewport?.offsetTop || 0) + 'px');
      wrap.dataset.llCompact = height < 380 ? 'true' : 'false';
    }
    fit();
    viewport?.addEventListener('resize', fit); viewport?.addEventListener('scroll', fit);
    host.addEventListener('resize', fit);
    wrap.llCleanupViewport = () => { viewport?.removeEventListener('resize', fit); viewport?.removeEventListener('scroll', fit); host.removeEventListener('resize', fit); };
  }

  async function openManager(startAvatar, startTab) {
    await libLoad();
    const previous = doc.querySelector('.ll-mgr'); previous?.llCleanupViewport?.(); previous?.remove();
    const list = chatAvatars();
    let key = startAvatar ? keyOf(startAvatar) : (list.find(a => a.current && !a.user)?.key || list[0]?.key || '');
    const wrap = doc.createElement('dialog'); wrap.className = 'll-mgr';wrap.setAttribute('aria-label','头像管理');
    wrap.innerHTML = `<div class="ll-mgr-card" role="dialog" aria-label="头像管理">
<h3>♪ 𝒶𝓋𝒶𝓉𝒶𝓇 & 𝒷𝒶𝒸𝓀𝑔𝓇ℴ𝓊𝓃𝒹</h3>
<div class="ll-row"><span>给谁</span><select class="who"></select></div>
<div class="ll-mgr-tabs"><button data-t="avatar">头像</button><button data-t="frame">头像框</button><button data-t="color">颜色</button><button data-t="bg">头像区域背景</button><button data-t="globalBg">全局背景</button><button data-t="bubbles">气泡</button><button data-t="entry">入口</button><button data-t="text">正文</button><button data-t="lib">本地库</button></div>
<div class="pane"></div>
<div class="ll-row ll-mgr-footer"><button type="button" class="close">关闭</button></div></div>`;
    const $ = s => wrap.querySelector(s), pane = $('.pane'), who = $('.who');
    who.innerHTML = list.map(a => `<option value="${encodeURIComponent(a.key)}">${a.user ? '👤 ' : '♪ '}${a.name.replace(/</g, '&lt;')}${a.current ? '（当前）' : ''}</option>`).join('') || '<option value="">（当前聊天没有头像）</option>';
    who.value = encodeURIComponent(key);
    who.onchange = () => { key = decodeURIComponent(who.value); render(tab); };
    let tab = startTab || 'avatar';
    wrap.querySelectorAll('.ll-mgr-tabs button').forEach(b => b.onclick = () => { render(b.dataset.t); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    const closeManager = () => { wrap.llCleanupViewport?.(); if (wrap.open) wrap.close(); wrap.remove(); };
    $('.close').onclick = closeManager;
    wrap.addEventListener('cancel', e => { e.preventDefault(); closeManager(); });
    wrap.addEventListener('click', e => { if (e.target === wrap) closeManager(); });
    ['pointerdown', 'click', 'touchstart', 'keydown'].forEach(t => wrap.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    const cur = () => list.find(a => a.key === key);
    const addRow = (kind, onPicked) => {
      const row = doc.createElement('div');
      row.innerHTML = `<div class="ll-row"><input type="text" placeholder="粘贴图片链接 https://…"><button type="button" class="use">使用链接</button></div>
<div class="ll-row"><button type="button" class="pick">上传本地图片</button><input type="file" accept="image/*" hidden><span class="ll-tip">会自动压缩后存进本地库</span></div>`;
      const inp = row.querySelector('input[type=text]'), file = row.querySelector('input[type=file]');
      row.querySelector('.use').onclick = async () => {
        const u = inp.value.trim(); if (!u) return;
        try { const im = await loadImg(u); onPicked({ src: u, url: u, a: im.naturalWidth / im.naturalHeight || 1 }); }
        catch (_) { host.alert?.('这张图读不出来，换个链接试试？'); }
      };
      row.querySelector('.pick').onclick = () => file.click();
      file.onchange = async () => {
        const f = file.files?.[0]; if (!f) return;
        const d = await readFile(f);
        const png = kind === 'frame' || /png|gif|webp/i.test(f.type);
        const { blob, a } = await shrink(d, kind === 'avatar' ? 2400 : kind === 'bg' ? 1920 : kind === 'icon' ? 256 : 1280, png ? 'image/png' : 'image/jpeg');
        onPicked({ src: host.URL.createObjectURL(blob), blob, a, name: f.name });
      };
      return row;
    };
    const fold = (title, content, open = true) => {
      const d = doc.createElement('details'); d.open = open;
      const s = doc.createElement('summary'); s.textContent = title; d.append(s, content); return d;
    };
    const libGrid = (kind, selectedId, onPick, withAuto) => {
      const g = doc.createElement('div'); g.className = 'll-grid';
      if (kind === 'frame') builtinFrames().forEach(it => {
        const d = doc.createElement('div'); d.className = 'frame pin' + (it.id === selectedId ? ' on' : '');
        d.style.backgroundImage = it.css; d.title = it.name; d.dataset.id = it.id;
        d.onclick = () => onPick(it.id); g.append(d);
      });
      if (withAuto) {
        const d = doc.createElement('div'); d.className = 'auto pin' + (selectedId === 'auto' || !selectedId ? ' on' : ''); d.textContent = '跟随颜色';
        d.onclick = () => onPick('auto'); g.prepend(d);
      }
      lib.filter(x => x.kind === kind).forEach(it => {
        const d = doc.createElement('div'); if (kind === 'frame' || kind === 'icon') d.classList.add(kind);
        if (it.id === selectedId) d.classList.add('on');
        d.style.backgroundImage = cssUrl(itemUrl(it)); d.title = it.name || '';
        d.dataset.id = it.id; d.onclick = () => onPick(it.id); g.append(d);
      });
      return g;
    };
    function render(t) {
      tab = t; pane.textContent = '';
      wrap.querySelectorAll('.ll-mgr-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      const a = cur();
      if (!a && !['lib', 'globalBg', 'bubbles', 'entry', 'text'].includes(t)) { pane.innerHTML = '<p class="ll-tip">当前聊天里还没有头像。</p>'; return; }
      if (t === 'avatar') renderAvatar(a); else if (t === 'frame') renderFrame(a); else if (t === 'color') renderColor(a); else if (t === 'bg' || t === 'globalBg') renderBg(a, t === 'globalBg'); else if (t === 'bubbles') renderBubbles(); else if (t === 'entry') renderEntry(); else if (t === 'text') renderText(); else renderLib();
    }
    /* 头像 */
    function renderAvatar(a) {
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: '换头像在任何美化里都有效（只改显示，不改角色卡）。裁剪框是长方形，中间的圆是圆形头像美化会显示的部分。' }));
      pane.append(fold('本地库里的头像', libGrid('avatar', set.avatar[key], id => { set.avatar[key] = id; saveSet(); paintAll(); render('avatar'); })));
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-sec', textContent: '新头像' }));
      const st = { src: '', a: 1, z: 1, x: 50, y: 50, blob: null, url: '', png: false };
      const RATIO = { h: 16 / 9, v: 3 / 4, s: 1 };
      let mode = 'h';
      const seg = doc.createElement('div'); seg.className = 'll-row';
      seg.innerHTML = '<span>裁剪比例</span><span class="ll-seg"><button type="button" data-m="h">横图 16:9</button><button type="button" data-m="v">竖图 3:4</button><button type="button" data-m="s">方图</button></span>';
      const box = doc.createElement('div'); box.className = 'll-crop guide';
      const draw = cropperState(box, st);
      const setMode = md => {
        mode = md; box.style.aspectRatio = String(RATIO[md]);
        box.style.width = md === 'h' ? '100%' : md === 'v' ? 'min(62vw,260px)' : 'min(70vw,300px)'; box.style.margin = '6px auto';
        box.classList.toggle('tall', RATIO[md] < 1);
        seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === md));
        st.x = 50; st.y = 50; host.requestAnimationFrame(draw);
      };
      seg.querySelectorAll('button').forEach(b => b.onclick = () => setMode(b.dataset.m));
      const zoom = Object.assign(doc.createElement('input'), { type: 'range', min: 1, max: 4, step: .01, value: 1 });
      zoom.oninput = () => { st.z = +zoom.value; draw(); };
      const onPick = p => {
        Object.assign(st, { blob: null, url: '', name: '' }, p, { z: 1, x: 50, y: 50, png: !!(p.blob && p.blob.type === 'image/png') }); zoom.value = 1;
        setMode(p.a < .95 ? 'v' : p.a > 1.05 ? 'h' : 's');                // 竖图自动用竖框
      };
      const grabRow = doc.createElement('div'); grabRow.className = 'll-row';
      const grab = Object.assign(doc.createElement('button'), { type: 'button', className: 'pri', textContent: '抓取 ' + (a.name || '') + ' 的原头像' });
      grab.onclick = async () => {
        const u = originalOf(a.src || ''); if (!u) return;
        try { const im = await loadImg(u); onPick({ src: u, url: u, a: im.naturalWidth / im.naturalHeight || 1, name: (a.name || '') + ' 原头像', png: /\.png($|\?)/i.test(u) }); }
        catch (_) { host.alert?.('没有读到原头像。'); }
      };
      grabRow.append(grab, Object.assign(doc.createElement('span'), { className: 'll-tip', textContent: '用角色卡 / 人设的原图重新裁剪' }));
      pane.append(grabRow);
      pane.append(addRow('avatar', onPick));
      pane.append(seg, box);
      const zr = doc.createElement('div'); zr.className = 'll-row'; zr.append('缩放 ', zoom); pane.append(zr);
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: '拖动调整位置；圆圈里的部分会出现在圆形头像里。' }));
      const btns = doc.createElement('div'); btns.className = 'll-row'; btns.style.justifyContent = 'flex-end';
      btns.innerHTML = '<button type="button" class="reset">恢复原头像</button><button type="button" class="pri save">保存并使用</button>';
      btns.querySelector('.reset').onclick = () => { delete set.avatar[key]; saveSet(); paintAll(); render('avatar'); };
      btns.querySelector('.save').onclick = async () => {
        if (!st.src) return;
        const A = RATIO[mode]; let item;
        try { item = await libAdd({ kind: 'avatar', name: st.name || '头像', blob: await cropRect(st.blob ? st : { ...st, src: st.url }, A, st.png), a: A }); }
        catch (_) { item = await libAdd({ kind: 'avatar', name: '链接头像', url: st.url, a: st.a }); } // 跨域图不能裁，直接用
        set.avatar[key] = item.id; saveSet(); paintAll(); render('avatar');
      };
      pane.append(btns);
      setMode('h');
    }
    /* 头像框：预览就是聊天里真实的方框比例，头像在左（char）或右（user） */
    function renderFrame(a) {
      const r = { id: 'auto', s: 1.36, dx: 0, dy: 0, ...(set.frame[key] || set.frame['*'] || {}) };
      pane.append(fold('选一个框（音符框置顶）', libGrid('frame', r.id, id => { r.id = id; commit(); render('frame'); }, true)));
      pane.append(addRow('frame', async p => {
        const item = await libAdd({ kind: 'frame', name: p.name || '头像框', blob: p.blob, url: p.blob ? undefined : p.url, a: p.a });
        r.id = item.id; commit(); render('frame');
      }));
      const prev = doc.createElement('div'); prev.className = 'll-box-prev'; prev.style.aspectRatio = String(BOX_A);
      const bgv = a.avatar?.style.getPropertyValue('--ll-av-bg');
      if (bgv) { prev.style.backgroundImage = bgv; prev.style.backgroundSize = a.avatar.style.getPropertyValue('--ll-av-bg-size'); prev.style.backgroundPosition = a.avatar.style.getPropertyValue('--ll-av-bg-pos'); }
      const face = doc.createElement('img'); face.src = a.avatar?.querySelector('img')?.getAttribute('src') || a.src || '';
      const ring = doc.createElement('i'); prev.append(face, ring);
      const D = 32.07, CY = 44.46, CX = a.user ? 73 : 27, HA = BOX_A;   // 圆的直径（占内框宽%）、圆心
      face.style.width = D + '%'; face.style.aspectRatio = '1'; face.style.left = (CX - D / 2) + '%'; face.style.top = `calc(${CY}% - ${D / 2 * HA}%)`;
      const ringStyle = () => {
        const w = a.avatar ? host.getComputedStyle(a.avatar.parentElement) : { getPropertyValue: () => '' };
        if (r.id === 'auto') {
          const ink = a.avatar ? inkOf(a.avatar) : '';
          if (isHex(ink)) { ring.style.backgroundImage = 'none'; ring.style.backgroundColor = ink; ring.style.webkitMaskImage = ring.style.maskImage = ringCss('white'); }
          else { ring.style.backgroundColor = ''; ring.style.webkitMaskImage = ring.style.maskImage = ''; ring.style.backgroundImage = w.getPropertyValue('--ll-ring').trim(); }
        } else { ring.style.backgroundColor = ''; ring.style.webkitMaskImage = ring.style.maskImage = ''; const it = byId(r.id); ring.style.backgroundImage = it?.builtin ? ringCss(it.id.slice(8)) : cssUrl(itemUrl(it)); }
        ring.style.webkitMaskSize = ring.style.maskSize = 'contain'; ring.style.webkitMaskRepeat = ring.style.maskRepeat = 'no-repeat'; ring.style.webkitMaskPosition = ring.style.maskPosition = 'center';
      };
      const show = () => {
        const size = D * r.s;
        ring.style.width = size + '%'; ring.style.aspectRatio = '1';
        ring.style.left = (CX - size / 2 + D * r.dx / 100) + '%';
        ring.style.top = `calc(${CY}% - ${size / 2 * HA}% + ${D * r.dy / 100 * HA}%)`;
      };
      pane.append(prev);
      const mk = (label, prop, min, max, step) => {
        const row = doc.createElement('div'); row.className = 'll-row';
        const inp = Object.assign(doc.createElement('input'), { type: 'range', min, max, step, value: r[prop] });
        inp.oninput = () => { r[prop] = +inp.value; show(); commit(); };
        row.append(label + ' ', inp); pane.append(row); return inp;
      };
      mk('大小', 's', .8, 2.4, .01); const xIn = mk('左右', 'dx', -60, 60, .5), yIn = mk('上下', 'dy', -60, 60, .5);
      let drag = null;
      prev.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, dx: r.dx, dy: r.dy }; try { prev.setPointerCapture(e.pointerId); } catch (_) {} });
      prev.addEventListener('pointermove', e => {
        if (!drag) return; const d = prev.clientWidth * D / 100;           // 头像直径（像素）
        r.dx = Math.max(-60, Math.min(60, drag.dx + (e.clientX - drag.x) / d * 100));
        r.dy = Math.max(-60, Math.min(60, drag.dy + (e.clientY - drag.y) / d * 100));
        xIn.value = r.dx; yIn.value = r.dy; show(); commit();
      });
      ['pointerup', 'pointercancel'].forEach(t => prev.addEventListener(t, () => { drag = null; }));
      const all = doc.createElement('label'); all.innerHTML = '<input type="checkbox"> 应用到所有头像';
      const allBox = all.querySelector('input'); allBox.checked = !set.frame[key] && !!set.frame['*'];
      const row = doc.createElement('div'); row.className = 'll-row'; row.style.justifyContent = 'space-between';
      const reset = Object.assign(doc.createElement('button'), { type: 'button', textContent: '恢复默认' });
      reset.onclick = () => { if (allBox.checked) delete set.frame['*']; delete set.frame[key]; saveSet(); paintAll(); render('frame'); };
      row.append(all, reset); pane.append(row);
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: '预览和聊天里的方框同比例；在预览里拖动可以移动框，调整会立刻显示在聊天里。' }));
      function commit() {
        const rec = { id: r.id, s: +(+r.s).toFixed(3), dx: +(+r.dx).toFixed(2), dy: +(+r.dy).toFixed(2) };
        if (allBox?.checked) { set.frame['*'] = rec; delete set.frame[key]; } else set.frame[key] = rec;
        saveSet(); paintAll();
      }
      allBox.onchange = commit;
      ringStyle(); show();
    }
    /* 颜色：环形色相 + 中间方形的饱和度 / 明度 */
    function renderColor(a) {
      const PAL_KEY = 'lili-color-palette';
      let pal = []; try { pal = JSON.parse(host.localStorage.getItem(PAL_KEY) || '[]'); } catch (_) {}
      const presetHex = { white: '#ffffff', dark: '#151515', black: '#1a0a12', lightpink: '#ffc4d9', neon: '#ff3d9a' };
      const curInk = a.avatar ? inkOf(a.avatar) : inkCycle()[0];
      let hex = isHex(curInk) ? curInk : (presetHex[curInk] || '#ff8db6');
      const toHsv = h => { const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0;
        if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return { h: (hh * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx }; };
      const toHex = ({ h, s, v }) => { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
        return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
      let hsv = toHsv(hex);
      const S = 240, R1 = 120, R0 = 100, SQ = Math.floor(R0 * Math.SQRT2) - 8;     // 外环半径、内环半径、方块边长
      const cv = doc.createElement('canvas'); cv.className = 'll-wheel';
      const dpr = host.devicePixelRatio || 1; cv.width = cv.height = S * dpr; cv.style.width = cv.style.height = S + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const paint = () => {
        g.clearRect(0, 0, S, S);
        const cg = g.createConicGradient ? g.createConicGradient(0, S / 2, S / 2) : null;
        if (cg) { for (let i = 0; i <= 12; i++) cg.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`); g.fillStyle = cg; }
        else g.fillStyle = '#f39';
        g.beginPath(); g.arc(S / 2, S / 2, R1, 0, Math.PI * 2); g.arc(S / 2, S / 2, R0, 0, Math.PI * 2, true); g.fill('evenodd');
        const x0 = (S - SQ) / 2;
        g.fillStyle = `hsl(${hsv.h},100%,50%)`; g.fillRect(x0, x0, SQ, SQ);
        let lg = g.createLinearGradient(x0, 0, x0 + SQ, 0); lg.addColorStop(0, '#fff'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(x0, x0, SQ, SQ);
        lg = g.createLinearGradient(0, x0, 0, x0 + SQ); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, '#000'); g.fillStyle = lg; g.fillRect(x0, x0, SQ, SQ);
        const ang = hsv.h * Math.PI / 180, rm = (R0 + R1) / 2;
        const mark = (x, y) => { g.lineWidth = 2; g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 8.5, 0, 7); g.stroke(); };
        mark(S / 2 + Math.cos(ang) * rm, S / 2 + Math.sin(ang) * rm);
        mark(x0 + hsv.s * SQ, x0 + (1 - hsv.v) * SQ);
      };
      let grab = null;
      const pick = e => {
        const rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * S / rc.width - S / 2, y = (e.clientY - rc.top) * S / rc.height - S / 2;
        if (!grab) grab = Math.hypot(x, y) > R0 - 2 ? 'ring' : 'sq';
        if (grab === 'ring') hsv.h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        else { hsv.s = Math.max(0, Math.min(1, (x + SQ / 2) / SQ)); hsv.v = Math.max(0, Math.min(1, 1 - (y + SQ / 2) / SQ)); }
        hex = toHex(hsv); sync();
      };
      cv.addEventListener('pointerdown', e => { grab = null; try { cv.setPointerCapture(e.pointerId); } catch (_) {} pick(e); });
      cv.addEventListener('pointermove', e => { if (e.buttons || e.pressure) { if (grab) pick(e); } });
      ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { grab = null; }));
      const row = doc.createElement('div'); row.className = 'll-row';
      const sw = doc.createElement('span'); sw.style.cssText = 'width:32px;height:32px;border-radius:50%;border:1px solid var(--ll-line,#ccc);flex:none';
      const hexIn = Object.assign(doc.createElement('input'), { type: 'text', className: 'll-hex', value: hex });
      hexIn.onchange = () => { const v = hexIn.value.trim(); if (isHex(v)) { hex = v.toLowerCase(); hsv = toHsv(hex); sync(); } };
      const saveBtn = Object.assign(doc.createElement('button'), { type: 'button', textContent: '存进色板' });
      row.append(sw, hexIn, saveBtn);
      const sws = doc.createElement('div'); sws.className = 'll-swatches';
      const drawSw = () => {
        sws.textContent = '';
        [...inkCycle().map(k => ({ v: k, c: presetHex[k] || k, preset: true })), ...pal.map(c => ({ v: c, c }))].forEach(o => {
          const s = doc.createElement('span'); s.style.background = o.c; s.title = o.preset ? (INK_NAME[o.v] || o.v) + '（预设）' : o.c;
          if (a.avatar && o.v === inkOf(a.avatar)) s.classList.add('on');
          s.onclick = () => { apply(o.v); };
          if (!o.preset) { const x = doc.createElement('b'); x.textContent = '×'; x.onclick = e => { e.stopPropagation(); pal = pal.filter(c => c !== o.c); try { host.localStorage.setItem(PAL_KEY, JSON.stringify(pal)); } catch (_) {} drawSw(); }; s.append(x); }
          sws.append(s);
        });
      };
      saveBtn.onclick = () => { if (!pal.includes(hex)) pal.unshift(hex); pal = pal.slice(0, 30); try { host.localStorage.setItem(PAL_KEY, JSON.stringify(pal)); } catch (_) {} drawSw(); };
      const all = doc.createElement('label'); all.innerHTML = '<input type="checkbox"> 应用到所有头像';
      function apply(v) {
        if (all.querySelector('input').checked) { inkMap['*'] = v; Object.keys(inkMap).forEach(k => { if (k !== '*') delete inkMap[k]; }); }
        else inkMap[key] = v;
        saveInk(); paintAll(); drawSw();
      }
      function sync() { sw.style.background = hex; hexIn.value = hex; paint(); }
      const btns = doc.createElement('div'); btns.className = 'll-row'; btns.style.justifyContent = 'space-between';
      const useBtn = Object.assign(doc.createElement('button'), { type: 'button', className: 'pri', textContent: '用这个颜色' });
      useBtn.onclick = () => apply(hex);
      btns.append(all, useBtn);
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: '外环选颜色，中间方块调深浅；会改头像上的五线谱、音符、吊坠、字、音波和「跟随颜色」的头像框。' }), cv, row, btns);
      pane.append(fold('色板（预设 + 存下的颜色）', sws));
      sync(); drawSw();
    }
    /* 背景 */
    function renderBg(a, global = false) {
      const bgTab = global ? 'globalBg' : 'bg';
      const r0 = global ? set.globalBg : (set.bg[key] || set.bg['*']);
      const st = { src: '', a: 1.6, z: 1, x: 50, y: 50, id: '' };
      if (r0 && byId(r0.id)) { const it = byId(r0.id); Object.assign(st, { src: itemUrl(it), a: it.a || 1.6, z: r0.z || 1, x: r0.x ?? 50, y: r0.y ?? 50, id: it.id }); }
      const pickBg = id => {
        const it = byId(id); Object.assign(st, { id, src: itemUrl(it), a: it.a || 1.6, z: 1, x: 50, y: 50 }); zoom.value = 1; draw();
        grid.querySelectorAll('div').forEach(d => d.classList.toggle('on', d.dataset.id === id));
      };
      let grid = libGrid('bg', st.id, pickBg); pane.append(fold('本地库里的背景', grid));
      pane.append(addRow('bg', async p => {
        const item = await libAdd({ kind: 'bg', name: p.name || '背景', blob: p.blob, url: p.blob ? undefined : p.url, a: p.a });
        const ng = libGrid('bg', item.id, pickBg); grid.replaceWith(ng); grid = ng; pickBg(item.id);
      }));
      const box = doc.createElement('div'); box.className = 'll-crop' + (global ? '' : ' hint'); box.style.aspectRatio = String(global ? host.innerWidth / host.innerHeight : BOX_A);
      box.style.setProperty('--hx', cur()?.user ? '73%' : '27%');
      const draw = cropperState(box, st);
      pane.append(box);
      const zoom = Object.assign(doc.createElement('input'), { type: 'range', min: 1, max: 4, step: .01, value: st.z });
      zoom.oninput = () => { st.z = +zoom.value; draw(); };
      const zr = doc.createElement('div'); zr.className = 'll-row'; zr.append('缩放 ', zoom); pane.append(zr);
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: global ? '拖动调整全局背景位置；保存后所有聊天共用，恢复默认会回到当前美化。' : '拖动调整头像区域背景；保存后立即生效。' }));
      const all = doc.createElement('label'); all.innerHTML = '<input type="checkbox"> 设为所有头像的背景';
      const btns = doc.createElement('div'); btns.className = 'll-row'; btns.style.justifyContent = 'space-between';
      const right = doc.createElement('span'); right.style.display = 'flex'; right.style.gap = '8px';
      right.innerHTML = '<button type="button" class="clear">不用背景</button><button type="button" class="pri save">保存</button>';
      if (!global) btns.append(all); btns.append(right); pane.append(btns);
      right.querySelector('.clear').textContent = '恢复默认';
      right.querySelector('.clear').onclick = () => { if (global) delete set.globalBg; else { if (all.querySelector('input').checked) delete set.bg['*']; delete set.bg[key]; } saveSet(); paintAll(); render(bgTab); };
      right.querySelector('.save').onclick = () => {
        if (!st.id) return;
        const rec = { id: st.id, z: +st.z.toFixed(3), x: +st.x.toFixed(2), y: +st.y.toFixed(2) };
        if (global) set.globalBg = rec; else if (all.querySelector('input').checked) { set.bg['*'] = rec; delete set.bg[key]; } else set.bg[key] = rec;
        saveSet(); paintAll(); render(bgTab);
      };
      host.requestAnimationFrame(draw);
    }
    function renderBubbles() {
      const b = set.bubbles || { enabled: false, opacity: 100, blur: 0 };
      pane.innerHTML = `<div class="ll-tip">调整所有楼层的背景，不会把文字和头像变淡。修改后立即保存。</div>
<label><input type="checkbox" class="bubble-enabled"> 自定义楼层气泡</label>
<div class="ll-row"><label for="ll-bubble-opacity-input">气泡不透明度</label><input id="ll-bubble-opacity-input" class="bubble-opacity" type="range" min="0" max="100" step="1"><output class="opacity-value"></output></div>
<div class="ll-row"><label for="ll-bubble-blur-input">毛玻璃强度</label><input id="ll-bubble-blur-input" class="bubble-blur" type="range" min="0" max="40" step="1"><output class="blur-value"></output></div>
<div class="ll-row"><span>毛玻璃底色</span><input type="color" class="bubble-color" aria-label="毛玻璃底色"><input type="text" class="bubble-color-hex" maxlength="7" placeholder="#ffffff" aria-label="毛玻璃颜色代码"><button type="button" class="bubble-color-auto">跟随主题</button></div>
<div class="ll-tip">颜色通过气泡不透明度叠加在背景上；0% 时颜色不会显示。</div>
<div class="ll-tip">不透明度 0% + 毛玻璃 0px = 完全透明，直接显示背景。毛玻璃数字越大，背景越模糊。</div>
<div class="ll-row"><button type="button" class="clear-glass">完全透明</button><button type="button" class="reset-glass">恢复美化默认</button></div>`;
      const enabled = pane.querySelector('.bubble-enabled'), alpha = pane.querySelector('.bubble-opacity'), blur = pane.querySelector('.bubble-blur');
      enabled.checked = !!b.enabled; alpha.value = b.opacity ?? 100; blur.value = b.blur ?? 0;
      const color = pane.querySelector('.bubble-color'), hex = pane.querySelector('.bubble-color-hex');
      let customColor = isHex(b.color) ? b.color : ''; color.value = customColor || '#ffffff'; hex.value = customColor;
      color.oninput = () => { customColor = color.value; hex.value = customColor; enabled.checked = true; apply(); };
      hex.oninput = () => { if (isHex(hex.value)) { customColor = hex.value; color.value = customColor; enabled.checked = true; apply(); } };
      pane.querySelector('.bubble-color-auto').onclick = () => { customColor = ''; hex.value = ''; apply(); };
      function labels() { pane.querySelector('.opacity-value').textContent = alpha.value + '%'; pane.querySelector('.blur-value').textContent = blur.value + 'px'; }
      function apply() { set.bubbles = { enabled: enabled.checked, opacity: +alpha.value, blur: +blur.value, color: customColor }; labels(); saveSet(); paintBubbles(); }
      enabled.onchange = apply;
      alpha.oninput = blur.oninput = () => { enabled.checked = true; apply(); };
      pane.querySelector('.clear-glass').onclick = () => { enabled.checked = true; alpha.value = 0; blur.value = 0; apply(); };
      pane.querySelector('.reset-glass').onclick = () => { delete set.bubbles; saveSet(); paintBubbles(); render('bubbles'); };
      labels();
    }
    function renderText() {
      const t = set.text || {};
      pane.innerHTML = `<div class="ll-tip">这些设置统一应用到消息正文，包括引用、斜体和代码文字。修改后立即保存。</div>
<label><input type="checkbox" class="text-color-enabled"> 强制正文颜色</label>
<div class="ll-row"><span>文字颜色</span><input type="color" class="text-color" aria-label="正文字体颜色"><input type="text" class="text-color-hex" maxlength="7" aria-label="正文字体颜色代码"></div>
<label><input type="checkbox" class="text-glow-enabled"> 正文字体发光</label>
<div class="ll-row"><span>发光颜色</span><input type="color" class="text-glow-color" aria-label="正文发光颜色"><input type="text" class="text-glow-hex" maxlength="7" aria-label="正文发光颜色代码"></div>
<div class="ll-row"><span>发光强度</span><input type="range" class="text-glow-size" min="1" max="20" step="1"><output class="text-glow-value"></output></div>
<div class="ll-tip text-demo">♪ 文字与发光预览 · Ririshiko ♡</div>
<div class="ll-row"><button type="button" class="text-reset">恢复美化默认</button></div>`;
      const colorEnabled = pane.querySelector('.text-color-enabled'), glowEnabled = pane.querySelector('.text-glow-enabled'), color = pane.querySelector('.text-color'), hex = pane.querySelector('.text-color-hex'), glowColor = pane.querySelector('.text-glow-color'), glowHex = pane.querySelector('.text-glow-hex'), size = pane.querySelector('.text-glow-size'), demo = pane.querySelector('.text-demo');
      colorEnabled.checked = !!t.colorEnabled; glowEnabled.checked = !!t.glowEnabled;
      const themeInk = rootVar('--lb-ink') || rootVar('--ll-ink');
      color.value = isHex(t.color) ? t.color : (isHex(themeInk) ? themeInk : '#ffffff'); hex.value = color.value;
      glowColor.value = isHex(t.glowColor) ? t.glowColor : '#ffffff'; glowHex.value = glowColor.value; size.value = t.glowSize || 4;
      function show() { pane.querySelector('.text-glow-value').textContent = size.value + 'px'; demo.style.color = colorEnabled.checked ? color.value : ''; demo.style.textShadow = glowEnabled.checked ? '0 0 ' + size.value + 'px ' + glowColor.value : 'none'; }
      function apply() { set.text = { colorEnabled: colorEnabled.checked, color: color.value, glowEnabled: glowEnabled.checked, glowColor: glowColor.value, glowSize: +size.value }; saveSet(); paintText(); show(); }
      colorEnabled.onchange = glowEnabled.onchange = apply;
      color.oninput = () => { hex.value = color.value; colorEnabled.checked = true; apply(); };
      hex.oninput = () => { if (isHex(hex.value)) { color.value = hex.value; colorEnabled.checked = true; apply(); } };
      glowColor.oninput = () => { glowHex.value = glowColor.value; glowEnabled.checked = true; apply(); };
      glowHex.oninput = () => { if (isHex(glowHex.value)) { glowColor.value = glowHex.value; glowEnabled.checked = true; apply(); } };
      size.oninput = () => { glowEnabled.checked = true; apply(); };
      pane.querySelector('.text-reset').onclick = () => { delete set.text; saveSet(); paintText(); render('text'); };
      show();
    }
    function renderEntry() {
      const r = set.entry || { mode: 'text', text: '♡', size: 22 };
      pane.innerHTML = `<div class="ll-tip">编辑按钮左侧的管理器入口，可显示文字、表情或自定义图片。修改后立即保存。</div>
<div class="ll-row"><span>显示内容</span><select class="entry-mode"><option value="text">文字 / 表情</option><option value="icon">自定义图标</option></select></div>
<div class="ll-row entry-text-row"><input class="entry-text" type="text" maxlength="80" placeholder="例如：♡ / 头像 / 🍐"></div>
<div class="ll-row"><span>大小</span><input class="entry-size" type="range" min="12" max="40" step="1"><output class="entry-size-value"></output></div>
<div class="ll-mgr-preview-entry" aria-label="入口预览"></div><div class="entry-images"></div>
<div class="ll-row"><button type="button" class="entry-reset">恢复默认 ♡</button></div>`;
      const mode = pane.querySelector('.entry-mode'), text = pane.querySelector('.entry-text'), size = pane.querySelector('.entry-size'), images = pane.querySelector('.entry-images'), preview = pane.querySelector('.ll-mgr-preview-entry');
      mode.value = r.mode || 'text'; text.value = r.text || '♡'; size.value = r.size || 22;
      function previewEntry() {
        const setting = set.entry || r, it = setting.mode === 'icon' && byId(setting.iconId);
        const imageUrl = it && itemUrl(it);
        preview.textContent = ''; preview.style.fontSize = size.value + 'px';
        if (imageUrl) { const img = doc.createElement('img'); img.src = imageUrl; img.alt = '入口图标'; img.style.width = img.style.height = size.value + 'px'; preview.append(img); }
        else preview.textContent = text.value.trim() || '♡';
        pane.querySelector('.entry-text-row').hidden = mode.value === 'icon'; images.hidden = mode.value !== 'icon';
        pane.querySelector('.entry-size-value').textContent = size.value + 'px';
      }
      function apply() { set.entry = { ...(set.entry || r), mode: mode.value, text: text.value, size: +size.value }; saveSet(); paintEntries(); previewEntry(); }
      function pick(id) { set.entry = { ...(set.entry || r), iconId: id, mode: 'icon' }; mode.value = 'icon'; apply(); }
      let grid = libGrid('icon', r.iconId, pick); images.append(fold('保存的入口图标', grid));
      images.append(addRow('icon', async p => {
        try { const item = await libAdd({ kind: 'icon', name: p.name || '入口图标', blob: p.blob, url: p.blob ? undefined : p.url, a: p.a });
          const ng = libGrid('icon', item.id, pick); grid.replaceWith(ng); grid = ng; pick(item.id);
        } catch (_) { host.alert?.('图标保存失败，请检查浏览器存储空间后重试。'); }
      }));
      mode.onchange = apply; text.oninput = size.oninput = apply;
      pane.querySelector('.entry-reset').onclick = () => { delete set.entry; saveSet(); paintEntries(); render('entry'); };
      previewEntry();
    }
    /* 本地库 */
    function renderLib() {
      const names = { avatar: '头像', frame: '头像框', bg: '背景', icon: '入口图标' };
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: '这些图都存在这台设备的浏览器里。点右上角 × 删除单张。' }));
      for (const kind of ['avatar', 'frame', 'bg', 'icon']) {
        const items = lib.filter(x => x.kind === kind);
        const body = doc.createElement('div');
        const g = doc.createElement('div'); g.className = 'll-grid';
        if (kind === 'frame') builtinFrames().forEach(it => {
          const d = doc.createElement('div'); d.className = 'frame pin'; d.style.backgroundImage = it.css; d.title = it.name + '（默认，不能删）'; g.append(d);
        });
        items.forEach(it => {
          const d = doc.createElement('div'); if (kind === 'frame' || kind === 'icon') d.classList.add(kind);
          d.style.backgroundImage = cssUrl(itemUrl(it)); d.title = it.name || '';
          const x = doc.createElement('b'); x.textContent = '×';
          x.onclick = async e => { e.stopPropagation(); if (host.confirm('删除这张' + names[kind] + '？')) { await libDel([it.id]); render('lib'); } };
          d.append(x); g.append(d);
        });
        body.append(g);
        if (items.length) {
          const b = Object.assign(doc.createElement('button'), { type: 'button', className: 'danger', textContent: '删除全部' + names[kind] });
          b.onclick = async () => { if (host.confirm(`删除全部${items.length}张${names[kind]}？`)) { await libDel(items.map(x => x.id)); render('lib'); } };
          const r2 = doc.createElement('div'); r2.className = 'll-row'; r2.style.justifyContent = 'flex-end'; r2.append(b); body.append(r2);
        }
        pane.append(fold(`${names[kind]}（${items.length}${kind === 'frame' ? ' + 默认' + builtinFrames().length : ''}）`, body, false));
      }
      const row = doc.createElement('div'); row.className = 'll-row'; row.style.justifyContent = 'flex-end';
      const all = Object.assign(doc.createElement('button'), { type: 'button', className: 'danger', textContent: '全部删除（清空本地库和所有设置）' });
      all.onclick = async () => {
        if (!host.confirm('清空所有保存的头像、头像框、背景，并恢复默认？')) return;
        await libDel(lib.map(x => x.id)); set = { avatar: {}, bg: {}, frame: {} }; saveSet(); paintAll(); render('lib');
      };
      row.append(all); pane.append(row);
    }
    fitManagerViewport(wrap);
    doc.body.append(wrap);
    wrap.showModal();
    render(tab);
  }

  /* 消息操作栏：紧挨编辑按钮左侧，不依赖主题显示开关。 */
  function mgrButton(mes, avatar) {
    const edit = mes.querySelector('.mes_edit');
    if (!edit) return;
    let b = mes.querySelector('.ll-avatar-entry');
    if (!b) {
      b = doc.createElement('button'); b.type = 'button'; b.className = 'll-avatar-entry interactable';
      b.title = '头像与背景管理'; b.setAttribute('aria-label', '头像与背景管理');
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openManager(mes.querySelector('.avatar')); });
    }
    paintEntry(b);
    if (b.nextElementSibling !== edit) edit.before(b);
  }
  /* 任何美化：酒馆魔法棒菜单里的入口 */
  function menuEntry() {
    const menu = doc.getElementById('extensionsMenu');
    if (!menu || menu.querySelector('#ll-avatar-manager')) return;
    const it = doc.createElement('div'); it.id = 'll-avatar-manager'; it.className = 'list-group-item flex-container flexGap5 interactable'; it.tabIndex = 0;
    it.innerHTML = '<div class="fa-solid fa-user-pen extensionsMenuExtensionButton"></div><span>梨梨 · 头像管理</span>';
    it.addEventListener('click', () => { menu.style.display = 'none'; openManager(null); });
    menu.append(it);
  }
  function settingsEntry() {
    const container = doc.getElementById('extensions_settings2') || doc.getElementById('extensions_settings');
    if (!container || doc.getElementById('lili-avatar-extension-settings')) return;
    const section = doc.createElement('div');
    section.id = 'lili-avatar-extension-settings';
    section.className = 'extension_container';
    const drawer = doc.createElement('div'); drawer.className = 'inline-drawer';
    const header = doc.createElement('div');
    header.className = 'inline-drawer-toggle inline-drawer-header';
    header.tabIndex = 0; header.setAttribute('role', 'button');
    const heading = doc.createElement('b'); heading.textContent = '梨梨 · 头像管理器';
    const icon = doc.createElement('div');
    icon.className = 'inline-drawer-icon fa-solid fa-circle-chevron-down down';
    header.append(heading, icon);
    // Clicks use SillyTavern's delegated native drawer handler and theme styles.
    header.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); header.click(); }
    });
    const content = doc.createElement('div'); content.className = 'inline-drawer-content';
    const button = doc.createElement('button'); button.type = 'button';
    button.className = 'menu_button interactable'; button.textContent = '♡ 打开头像与背景管理';
    button.addEventListener('click', () => openManager(null));
    const note = doc.createElement('div'); note.className = 'opacity50p';
    note.textContent = '头像、头像框、背景、气泡与正文样式 · v1.0.1';
    content.append(button, note); drawer.append(header, content);
    section.append(drawer); container.append(section);
  }
  libLoad().then(() => dead ? undefined : migrate()).then(() => { if (!dead) paintAll(); }).catch(() => {});

  /* ---------- 调度（只处理有变化的楼层） ----------
   * 以前任何一条消息的正文一变（包括 AI 流式输出的每个字），都会把整个聊天重新扫一遍、
   * 重设每个头像的样式，楼层一多就会卡。现在只处理真正变化的楼层，正文里的文字变化直接忽略。 */
  const uiSelector = '.ll-ink-toggle,.ll-avatar-entry,.ll-mgr,.ll-frame-over';
  const dirty = new Set(); let full = true;
  function scanMes(mes) {
    if (!mes.isConnected) return;
    mes.querySelector(':scope > .ll-message-footer, :scope > .ll-message-outro')?.remove(); // 旧版残留

    const av = mes.querySelector('.avatar'); if (av) paintOne(av); mgrButton(mes, av);
    const w = mes.querySelector(':scope > .mesAvatarWrapper'); if (w) inkToggle(w);
  }
  function scan() {
    timer = 0; if (dead) return;
    cache.clear();
    menuEntry(); settingsEntry(); paintGlobalBg(); paintBubbles(); paintText();
    if (full) { full = false; dirty.clear(); doc.querySelectorAll('#chat > .mes').forEach(scanMes); return; }
    const list = [...dirty]; dirty.clear();
    list.forEach(scanMes);
  }
  const schedule = (wait = 150) => { if (!timer && !dead) timer = host.setTimeout(scan, wait); };
  const scheduleFull = () => { full = true; schedule(); };
  const WATCH = '.mes,.mesAvatarWrapper,.mes_buttons,.avatar,.welcomePanel,#rm_print_characters_block,#user_avatar_block';
  const observer = new host.MutationObserver(records => {
    let hit = false;
    for (const r of records) {
      const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      if (!t || t.closest(uiSelector)) continue;
      const mes = t.closest('#chat > .mes');
      const inText = t.closest('.mes_text');
      if (inText) continue; // 忽略正文流式输出
      if (r.type === 'attributes') { if (mes) { dirty.add(mes); hit = true; } continue; }
      if (t.closest('.mesIDDisplay,.mes_timer,.tokenCounterDisplay')) { if (mes) { dirty.add(mes); hit = true; } continue; }
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1 || n.matches(uiSelector)) continue;
        if (n.matches('#chat > .mes')) { dirty.add(n); hit = true; }
        else if (n.matches(WATCH) || n.querySelector?.(WATCH)) {
          if (mes) dirty.add(mes); else if (n.querySelector?.('.mes') || n.id === 'chat') full = true;
          hit = true;
        }
      }
      if (r.removedNodes.length && t.id === 'chat') hit = true;   // 聊天被清空 / 切换
    }
    if (hit) schedule();
  });
  observer.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src', 'srcset', 'mesid', 'is_user', 'is_system'] });
  function loaded(e) { if (e.target.matches?.(avatarSelector + ' img')) { paintInk(e.target.parentElement); paintBg(e.target.parentElement); paintFrame(e.target.parentElement); } }
  doc.addEventListener('load', loaded, true); host.addEventListener('resize', scheduleFull);

  function dispose() {
    if (dead) return;
    dead = true; host.clearTimeout(timer); observer.disconnect();
    host.removeEventListener('pagehide', onPageHide);
    doc.getElementById('lili-avatar-extension-settings')?.remove();
    doc.removeEventListener('load', loaded, true); host.removeEventListener('resize', scheduleFull);
    darkQuery?.removeEventListener?.('change', applyScheme); delete root.dataset.llScheme;
    doc.querySelectorAll(avatarSelector).forEach(a => { delete a.dataset.llInk; });
    doc.querySelectorAll('.ll-mgr').forEach(n => n.llCleanupViewport?.());
    doc.querySelectorAll('.ll-bubble-tail,.ll-song-stats,.ll-library-views,.ll-home-piano,.ll-ink-toggle,.ll-player,.ll-bg-button,.ll-avatar-entry,.ll-mgr,#ll-avatar-manager').forEach(n => n.remove());
    doc.querySelectorAll('#chat .mes .avatar').forEach(a => {
      ['--ll-av-bg', '--ll-av-bg-size', '--ll-av-bg-pos'].forEach(p => a.style.removeProperty(p));
      ['--ll-ring', '--ll-ring-mask', '--ll-ring-color', '--ll-ring-scale', '--ll-ring-dx', '--ll-ring-dy'].forEach(p => a.parentElement?.style.removeProperty(p));
      a.querySelector(':scope > .ll-frame-over')?.remove(); a.classList.remove('ll-frame-host', 'll-custom-avatar-bg'); delete a.dataset.llOverSig;
      delete a.dataset.llInkSig; delete a.dataset.llBgSig; if (a.parentElement) { delete a.parentElement.dataset.llFrameSig; delete a.parentElement.dataset.llCustom; [...CUSTOM_VARS, '--ll-wave', '--ll-av-c'].forEach(p => a.parentElement.style.removeProperty(p)); }
      ['--ll-av-ink', '--ll-av-shine', '--ll-av-glow'].forEach(p => a.style.removeProperty(p));
      const img = a.querySelector('img'); if (img?.dataset.llOrig) { img.setAttribute('src', img.dataset.llOrig); delete img.dataset.llOrig; delete img.dataset.llSet; }
    });
    urls.forEach(u => host.URL.revokeObjectURL(u)); panelCss.remove();
    root.classList.remove('ll-custom-global-bg', 'll-custom-bubbles', 'll-custom-text-color', 'll-custom-text-glow'); ['--ll-global-bg','--ll-global-bg-size','--ll-global-bg-pos','--ll-bubble-opacity','--ll-bubble-blur','--ll-bubble-color','--ll-text-color','--ll-text-glow-color','--ll-text-glow-size'].forEach(p => root.style.removeProperty(p));
    guard.remove(); if (host[key]?.dispose === dispose) delete host[key];
  }
  function onPageHide(event) { if (!event.persisted) dispose(); }
  host[key] = { dispose, open: () => openManager(null), extension: true };
  host.addEventListener('pagehide', onPageHide);
  scan();
}

// Auto-start also supports SillyTavern versions without lifecycle hooks.
init();

