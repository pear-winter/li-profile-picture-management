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
  /* 梨梨 · 头像管理器 插件 v1.1.0 — 白川；头像、头像框、颜色与背景管理。 */
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
    if (!set.appearance?.showColor) { delete avatar.dataset.llInk; delete avatar.dataset.llInkSig; paintCustom(avatar, ''); return; }
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
    for (const [theme, id] of Object.entries(set.themeCovers || {})) if (ids.includes(id)) delete set.themeCovers[theme];
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
    if (!set.appearance?.showFrame) { paintOverlay(avatar, {}, null); ['--ll-ring','--ll-ring-mask','--ll-ring-color','--ll-ring-scale','--ll-ring-dx','--ll-ring-dy'].forEach(p => w.style.removeProperty(p)); delete w.dataset.llFrameSig; return; }
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
    if (!b?.enabled) { ['--ll-bubble-opacity','--ll-bubble-blur','--ll-bubble-color','--ll-bubble-brightness','--ll-bubble-paper','--ll-bubble-fill'].forEach(p => root.style.removeProperty(p)); return; }
    const opacity = Math.min(100, Math.max(0, Number(b.opacity) || 0));
    const blur = Math.min(40, Math.max(0, Number(b.blur) || 0));
    root.style.setProperty('--ll-bubble-opacity', opacity + '%');
    root.style.setProperty('--ll-bubble-blur', (b.blurEnabled === false ? 0 : blur) + 'px');
    const brightness = Math.min(180, Math.max(20, Number(b.brightness ?? 100)));
    root.style.setProperty('--ll-bubble-brightness', brightness + '%');
    const base = isHex(b.color) ? b.color : 'var(--lb-paper,var(--ll-paper,var(--SmartThemeBlurTintColor,#ffffff)))';
    const fill = brightness <= 100 ? 'color-mix(in srgb,' + base + ' ' + brightness + '%,#000)' : 'color-mix(in srgb,' + base + ' ' + (200 - brightness) + '%,#fff)';
    root.style.setProperty('--ll-bubble-fill', fill);
    const paper = validColor(b.paperColor) ? b.paperColor : '#847765';
    const amount = Math.min(35, Math.max(0, Number(b.paperStrength ?? 12)));
    root.style.setProperty('--ll-bubble-paper', b.paper ? 'radial-gradient(ellipse at 20% 30%,color-mix(in srgb,' + paper + ' ' + amount + '%,transparent) 0 0.6px,transparent 1px),radial-gradient(ellipse at 70% 60%,color-mix(in srgb,' + paper + ' ' + amount + '%,transparent) 0 0.5px,transparent 1.1px)' : 'none');
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

  /* Theme profiles reference SillyTavern's native theme list; never overwrite the saved theme. */
  const themeStyle = doc.createElement('style'); themeStyle.id = 'll-theme-overrides';
  doc.head.append(themeStyle);
  const extrasStyle = doc.createElement('style'); extrasStyle.id = 'll-manager-extras';
  doc.head.append(extrasStyle);
  set.appearance ||= { opacity: 100, blur: 0, showFrame: false, showColor: false };
  set.themeProfiles ||= {}; set.charThemes ||= {}; set.themeCovers ||= {};
  const themeName = () => doc.querySelector('#themes')?.value || '__current__';
  const profile = () => set.themeProfiles[themeName()] ||= { colors: {}, text: {}, exclude: 'pre, code' };
  const currentCharacter = () => { const c = host.SillyTavern?.getContext?.(); return c?.groupId ? null : c?.characters?.[c?.characterId]; };
  const validColor = value => typeof value === 'string' && !/[;{}]|\/\*|var\(|url\(/i.test(value) && !!host.CSS?.supports('color', value.trim());
  const clamp = (n, min, max, fallback = min) => Number.isFinite(+n) ? Math.max(min, Math.min(max, +n)) : fallback;
  let themeChangeTimer = 0, bindingTimer = 0, bindingBusy = false, lastCharacter = null;
  let themeReady = false, lastThemeSignature = '', themeObserver = null;
  const excludedStyles = new Map();
  const colorProperties = ['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color','text-decoration-color','text-shadow','box-shadow','fill','stroke','background-image'];
  function restoreExcluded() {
    for (const [node, values] of excludedStyles) for (const [prop, [value, priority]] of Object.entries(values)) {
      value ? node.style.setProperty(prop, value, priority) : node.style.removeProperty(prop);
    }
    excludedStyles.clear();
  }
  function exclusionNodes(p) {
    if (!p.exclude?.trim()) return [];
    try {
      const nodes = new Set();
      for (const node of doc.querySelectorAll(p.exclude)) { nodes.add(node); node.querySelectorAll('*').forEach(child => nodes.add(child)); }
      return [...nodes].filter(n => !n.closest('.ll-mgr') && !/^(STYLE|SCRIPT|LINK|META|HEAD)$/.test(n.tagName));
    }
    catch (_) { return []; }
  }
  /* Tokenize colors without touching URLs, quoted strings or comments. CSSOM preserves nested conditions. */
  function colorTokens(value) {
    const out = [];
    const re = /--[\w-]+|url\((?:[^()"']|"[^"]*"|'[^']*')*\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|#[\da-f]{3,8}\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((?:[^()]|\([^()]*\))*\)|\b[a-z]+\b/gi;
    for (const m of value.matchAll(re)) {
      if (/^(?:--|url\(|["']|\/\*)/i.test(m[0]) || /^(?:inherit|initial|unset|revert|currentcolor|transparent)$/i.test(m[0])) continue;
      if (validColor(m[0])) out.push({ value: m[0], index: m.index });
    }
    return out;
  }
  const normalizedColors = new Map();
  function colorKey(value) {
    const raw = value.toLowerCase();
    if (!normalizedColors.has(raw)) { const probe = doc.createElement('span'); probe.style.color = value; normalizedColors.set(raw, probe.style.color || raw); }
    return normalizedColors.get(raw);
  }
  function replaceColors(value, colors) {
    let result = value;
    for (const token of colorTokens(value).reverse()) {
      const next = colors[colorKey(token.value)];
      if (validColor(next)) result = result.slice(0, token.index) + next + result.slice(token.index + token.value.length);
    }
    return result;
  }
  function sourceSheets() {
    const custom = doc.querySelector('#custom-style');
    // Custom CSS is the user's theme. Other readable sheets can be explicitly included.
    return [...doc.styleSheets].filter(s => s.ownerNode !== themeStyle && s.ownerNode !== extrasStyle && s.ownerNode !== panelCss && s.ownerNode !== guard &&
      (profile().allSheets || s.ownerNode === custom || s.ownerNode?.id === 'customCSS' || /custom.?style|theme/i.test(s.ownerNode?.id || '')));
  }
  function eachRule(rules, visit) {
    for (const rule of rules) {
      if (rule.style && (rule.selectorText || rule.keyText)) visit(rule);
      if (rule.cssRules) eachRule(rule.cssRules, visit);
    }
  }
  function detectColors() {
    const found = new Map(); let blocked = 0;
    for (const sheet of sourceSheets()) try {
      eachRule(sheet.cssRules, rule => {
        for (const prop of rule.style) for (const token of colorTokens(rule.style.getPropertyValue(prop))) {
          const key = colorKey(token.value);
          if (!found.has(key)) found.set(key, { value: token.value, uses: new Set() });
          found.get(key).uses.add(prop.startsWith('--') ? prop : prop + ' · ' + rule.selectorText);
        }
      });
    } catch (_) { blocked++; }
    return { found, blocked };
  }
  function rewrittenRules(rules, colors) {
    let css = '';
    for (const rule of rules) {
      if (rule.type === 7) {
        let changed = false, frames = '';
        for (const frame of rule.cssRules) {
          let declarations = '';
          for (const prop of frame.style) { const old = frame.style.getPropertyValue(prop), next = replaceColors(old, colors); changed ||= old !== next; declarations += prop + ':' + next + ';'; }
          frames += frame.keyText + '{' + declarations + '}';
        }
        if (changed) css += rule.cssText.slice(0, rule.cssText.indexOf('{') + 1) + frames + '}\n';
        continue;
      }
      if (rule.style && (rule.selectorText || rule.keyText) && !/\.ll-mgr|ll-theme-|ll-manager-/.test(rule.selectorText)) {
        let declarations = '';
        for (const prop of rule.style) {
          const old = rule.style.getPropertyValue(prop), value = replaceColors(old, colors);
          if (value !== old) declarations += prop + ':' + value + (rule.keyText ? ';' : '!important;');
        }
        if (declarations) css += (rule.selectorText || rule.keyText) + '{' + declarations + '}\n';
      } else if (rule.cssRules) {
        const inner = rewrittenRules(rule.cssRules, colors);
        if (inner) css += rule.cssText.slice(0, rule.cssText.indexOf('{') + 1) + inner + '}\n';
      }
    }
    return css;
  }
  const textKinds = [
    ['body','正文',''], ['italic','斜体','em,i'], ['underline','下划线','u'],
    ['quote','引用 / 对话','q,blockquote,.quote'], ['bold','加粗','strong,b'],
    ['link','链接','a'], ['code','代码','code,pre'], ['heading','标题','h1,h2,h3,h4,h5,h6'],
  ];
  const nativeColors = [
    ['主要文本','--SmartThemeBodyColor'], ['斜体文本','--SmartThemeEmColor'], ['下划线文本','--SmartThemeUnderlineColor'],
    ['引用文本','--SmartThemeQuoteColor'], ['阴影','--SmartThemeShadowColor'], ['聊天背景','--SmartThemeChatTintColor'],
    ['UI 背景','--SmartThemeBlurTintColor'], ['UI 边框','--SmartThemeBorderColor'],
    ['用户消息背景','--SmartThemeUserMesBlurTintColor'], ['AI 消息背景','--SmartThemeBotMesBlurTintColor'],
  ];
  function paintTheme() {
    if (!themeReady || dead) return;
    restoreExcluded(); themeStyle.textContent = '';
    const p = profile();
    const excluded = exclusionNodes(p).map(n => {
      const computed = host.getComputedStyle(n), saved = {}, values = {};
      for (const prop of colorProperties) { saved[prop] = [n.style.getPropertyValue(prop), n.style.getPropertyPriority(prop)]; values[prop] = computed.getPropertyValue(prop); }
      return { n, saved, values };
    });
    let css = '';
    for (const sheet of sourceSheets()) try { css += rewrittenRules(sheet.cssRules, p.colors || {}); } catch (_) {}
    for (const [, variable] of nativeColors) if (validColor(p.variables?.[variable])) css += ':root:root{' + variable + ':' + p.variables[variable] + '!important;}';
    for (const [kind,, tags] of textKinds) {
      const color = p.text?.[kind]; if (!validColor(color)) continue;
      const selector = tags ? tags.split(',').map(t => '#chat .mes .mes_text ' + t).join(',') : '#chat .mes .mes_text';
      css += selector + '{color:' + color + '!important;}';
      // Plain paragraphs and spans that a theme colors directly should also follow body color.
      if (kind === 'body') css += '#chat .mes .mes_text :is(p,span,div,li):not(:is(q,blockquote,.quote,em,i,b,strong,a,code,pre,h1,h2,h3,h4,h5,h6,u)):not(:is(q,blockquote,.quote,em,i,b,strong,a,code,pre,h1,h2,h3,h4,h5,h6,u) *){color:' + color + '!important;}';
    }
    if (p.glow && validColor(p.glowColor)) css += '#chat .mes .mes_text{text-shadow:0 0 ' + clamp(p.glowSize,1,20,4) + 'px ' + p.glowColor + '!important;}';
    themeStyle.textContent = css;
    for (const {n, saved, values} of excluded) {
      excludedStyles.set(n, saved);
      for (const [prop, value] of Object.entries(values)) if (value) n.style.setProperty(prop, value, 'important');
    }
  }
  function paintAppearance() {
    const a = set.appearance;
    extrasStyle.textContent = `
.ll-mgr-card{background:color-mix(in srgb,var(--ll-panel-paper,#fff) ${clamp(a.opacity,0,100,100)}%,transparent)!important;backdrop-filter:blur(${clamp(a.blur,0,40)}px)!important;-webkit-backdrop-filter:blur(${clamp(a.blur,0,40)}px)!important}
.ll-mgr [data-t="frame"]{display:${a.showFrame ? 'block' : 'none'}!important}
.ll-mgr [data-t="color"]{display:${a.showColor ? 'block' : 'none'}!important}
${a.showColor ? '' : '.ll-ink-toggle{display:none!important}'}
.ll-theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.ll-theme-card{border:1px solid var(--ll-panel-line,#aaa);border-radius:12px;overflow:hidden;min-width:0;padding:0 0 10px}
.ll-theme-card.on{outline:2px solid var(--ll-panel-ink,#333);outline-offset:1px}
.ll-theme-cover{height:120px;display:flex;align-items:center;justify-content:center;background:var(--ll-panel-line,#eee);font-size:36px;overflow:hidden}
.ll-theme-cover img{width:100%;height:100%;object-fit:cover}
.ll-theme-card strong{display:block;padding:10px;overflow-wrap:anywhere}
.ll-theme-card .ll-row{padding:0 8px;flex-wrap:wrap}
.ll-color-row{display:flex;align-items:center;gap:8px;margin:9px 0;flex-wrap:wrap}
.ll-color-row>label{flex:1;min-width:120px;overflow-wrap:anywhere}
.ll-color-row input{max-width:190px}
.ll-mgr .ll-color-chip{width:38px;height:32px;flex:none;border-radius:6px;background:var(--chip)!important}
.ll-picker{flex-basis:100%;width:100%;border:1px solid var(--ll-panel-line,#aaa);padding:12px;margin:10px 0;display:grid;justify-items:center;gap:8px}
.ll-picker canvas{max-width:100%;touch-action:none}
.ll-mgr .ll-theme-search{width:100%;margin-bottom:12px}
.ll-theme-notice{padding:8px;border:1px dashed var(--ll-panel-line,#aaa);margin:8px 0;white-space:pre-wrap}
.ll-mgr details>summary{cursor:pointer;padding:8px 0}
@media(min-width:700px){.ll-mgr:has([data-t="themes"].on) .ll-mgr-card,.ll-mgr:has([data-t="text"].on) .ll-mgr-card{width:min(92vw,940px)!important}}
`;
  }
  async function applyNativeTheme(name) {
    const select = doc.querySelector('#themes');
    if (!select || ![...select.options].some(o => o.value === name)) throw Error('找不到这套美化，可能已改名或删除，请重新绑定。');
    if (select.value !== name) {
      restoreExcluded(); themeStyle.textContent = ''; select.value = name;
      if (host.jQuery) host.jQuery(select).trigger('change'); else select.dispatchEvent(new host.Event('change', { bubbles: true }));
    }
    paintTheme(); cache.clear(); paintAll();
  }
  async function checkCharacterTheme(force = false) {
    if (dead || bindingBusy) return;
    const char = currentCharacter(), id = char?.avatar || '';
    if (!force && id === lastCharacter) return;
    lastCharacter = id;
    const bound = id && set.charThemes[id]; if (!bound) { paintTheme(); return; }
    bindingBusy = true;
    try { await applyNativeTheme(bound); }
    catch (error) { host.toastr?.warning?.(error.message, '角色美化绑定'); }
    finally { bindingBusy = false; }
  }
  function queueThemePaint() {
    host.clearTimeout(themeChangeTimer);
    themeChangeTimer = host.setTimeout(() => { themeChangeTimer = 0; if (!dead) { paintTheme(); cache.clear(); paintAll(); } }, 80);
  }
  let contextEvents, chatEvent, messageEvent;
  function startThemes() {
    themeReady = true; paintAppearance();
    // Migrate the previous global text controls once, without keeping a second overriding layer.
    if (!set.themeTextMigrated) {
      const p = profile(), old = set.text || {};
      if (old.colorEnabled && validColor(old.color)) p.text.body = old.color;
      if (old.glowEnabled) Object.assign(p, {glow:true,glowColor:old.glowColor,glowSize:old.glowSize});
      delete set.text; set.themeTextMigrated = true; saveSet(); paintText();
    }
    const c = host.SillyTavern?.getContext?.(); contextEvents = c?.eventSource;
    chatEvent = c?.event_types?.CHAT_CHANGED; messageEvent = c?.event_types?.MESSAGE_RENDERED || c?.event_types?.CHARACTER_MESSAGE_RENDERED;
    if (chatEvent) contextEvents?.on?.(chatEvent, onChatTheme);
    if (messageEvent) contextEvents?.on?.(messageEvent, queueThemePaint);
    doc.addEventListener('change', onThemeSelect);
    // A cheap signature check also covers older ST and jQuery-triggered theme changes.
    const poll = () => {
      if (dead) return;
      checkCharacterTheme();
      const sig = themeName() + '\n' + (doc.querySelector('#custom-style')?.textContent || '');
      if (sig !== lastThemeSignature) { lastThemeSignature = sig; queueThemePaint(); }
      bindingTimer = host.setTimeout(poll, 1000);
    };
    const chat = doc.querySelector('#chat');
    if (chat) { themeObserver = new host.MutationObserver(records => { if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) queueThemePaint(); }); themeObserver.observe(chat, {childList:true,subtree:true}); }
    poll(); paintTheme();
  }
  function onChatTheme() { checkCharacterTheme(true); queueThemePaint(); }
  function onThemeSelect(e) { if (e.target?.id === 'themes') queueThemePaint(); }
  function stopThemes() {
    host.clearTimeout(themeChangeTimer); host.clearTimeout(bindingTimer);
    if (chatEvent) contextEvents?.removeListener?.(chatEvent, onChatTheme);
    if (messageEvent) contextEvents?.removeListener?.(messageEvent, queueThemePaint);
    doc.removeEventListener('change', onThemeSelect);
    themeObserver?.disconnect();
    restoreExcluded(); themeStyle.remove(); extrasStyle.remove();
  }

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
html:root.ll-custom-bubbles body #chat .mes{background-color:color-mix(in srgb,var(--ll-bubble-fill) var(--ll-bubble-opacity,100%),transparent)!important;background-image:var(--ll-bubble-paper,none)!important;background-size:5px 7px,7px 11px!important;backdrop-filter:blur(var(--ll-bubble-blur,0px)) brightness(var(--ll-bubble-brightness,100%))!important;-webkit-backdrop-filter:blur(var(--ll-bubble-blur,0px)) brightness(var(--ll-bubble-brightness,100%))!important}
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
<div class="ll-mgr-tabs"><button data-t="avatar">头像</button><button data-t="frame">头像框</button><button data-t="color">颜色</button><button data-t="bg">头像区域背景</button><button data-t="globalBg">全局背景</button><button data-t="bubbles">气泡</button><button data-t="themes">美化绑定</button><button data-t="text">主题色</button><button data-t="lib">本地库</button><button data-t="entry">设置</button></div>
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
      if ((t === 'frame' && !set.appearance.showFrame) || (t === 'color' && !set.appearance.showColor)) t = 'avatar';
      tab = t; pane.textContent = '';
      wrap.querySelectorAll('.ll-mgr-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      const a = cur();
      if (!a && !['lib', 'globalBg', 'bubbles', 'entry', 'text', 'themes'].includes(t)) { pane.innerHTML = '<p class="ll-tip">当前聊天里还没有头像。</p>'; return; }
      if (t === 'avatar') renderAvatar(a); else if (t === 'frame') renderFrame(a); else if (t === 'color') renderColor(a); else if (t === 'bg' || t === 'globalBg') renderBg(a, t === 'globalBg'); else if (t === 'bubbles') renderBubbles(); else if (t === 'entry') renderEntry(); else if (t === 'text') renderThemeColors(); else if (t === 'themes') renderThemes(); else renderLib();
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
      function apply() { set.bubbles = { ...set.bubbles, enabled: enabled.checked, opacity: +alpha.value, blur: +blur.value, color: customColor }; labels(); saveSet(); paintBubbles(); }
      enabled.onchange = apply;
      alpha.oninput = blur.oninput = () => { enabled.checked = true; apply(); };
      pane.querySelector('.clear-glass').onclick = () => { enabled.checked = true; alpha.value = 0; blur.value = 0; set.bubbles = { ...set.bubbles, brightness: 100, paper: false }; apply(); render('bubbles'); };
      pane.querySelector('.reset-glass').onclick = () => { delete set.bubbles; saveSet(); paintBubbles(); render('bubbles'); };
      labels(); renderBubbleExtras();
    }
    function renderBubbleExtras() {
      const box = doc.createElement('div');
      const commit = (key, value) => { set.bubbles = { opacity: 100, blur: 0, ...set.bubbles, enabled: true, [key]: value }; pane.querySelector('.bubble-enabled').checked = true; saveSet(); paintBubbles(); };
      const b = set.bubbles || {};
      toggleRow(box, '启用背景模糊', b.blurEnabled !== false, v => commit('blurEnabled', v));
      rangeRow(box, '背景明暗（100% 为原色）', b.brightness ?? 100, 20, 180, '%', v => commit('brightness', v));
      toggleRow(box, '纸纹效果', b.paper, v => commit('paper', v));
      rangeRow(box, '纸纹强度', b.paperStrength ?? 12, 0, 35, '%', v => commit('paperStrength', v));
      colorRow(box, '纸纹颜色', b.paperColor || '#847765', v => commit('paperColor', v), () => commit('paperColor','#847765'));
      pane.append(fold('模糊、纸纹与背景明暗', box));
    }
    function notice(text) { const n = doc.createElement('div'); n.className = 'll-theme-notice'; n.textContent = text; pane.append(n); return n; }
    function button(label, click) { const b = doc.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = click; return b; }
    function rangeRow(parent, label, value, min, max, unit, commit) {
      const row = doc.createElement('div'); row.className = 'll-row';
      const title = doc.createElement('label'); title.textContent = label;
      const input = doc.createElement('input'); input.type = 'range'; input.min = min; input.max = max; input.step = 1; input.value = value; input.setAttribute('aria-label', label);
      const out = doc.createElement('output'); out.textContent = value + unit;
      input.oninput = () => { out.textContent = input.value + unit; commit(+input.value); };
      row.append(title, input, out); parent.append(row); return input;
    }
    function toggleRow(parent, label, checked, commit) {
      const row = doc.createElement('label'); row.className = 'll-row';
      const input = doc.createElement('input'); input.type = 'checkbox'; input.checked = !!checked;
      input.onchange = () => commit(input.checked); row.append(input, doc.createTextNode(label)); parent.append(row); return input;
    }
    /* A shared ring picker, with saturation/value square and independent alpha. No CDN dependency. */
    function openColorWheel(parent, initial, commit) {
      pane.querySelector('.ll-picker')?.remove();
      const box = doc.createElement('div'); box.className = 'll-picker';
      const cv = doc.createElement('canvas'); cv.width = cv.height = 240; cv.style.width = cv.style.height = '240px';
      cv.setAttribute('aria-label','外环选择色相，中间选择饱和度和明度');
      const g = cv.getContext('2d');
      const probe = doc.createElement('span'); probe.style.color = validColor(initial) ? initial : '#ffffff'; box.append(probe); parent.append(box);
      const computed = host.getComputedStyle(probe).color; probe.remove();
      // Canvas normalizes CSS color syntax, including modern color functions, into sRGB pixels.
      g.fillStyle = computed; g.fillRect(0,0,1,1);
      const rgba = g.getImageData(0,0,1,1).data;
      const rgb = [...rgba].slice(0,3).map(n => n/255), mx = Math.max(...rgb), mn = Math.min(...rgb), d = mx-mn;
      let h = !d ? 0 : mx===rgb[0] ? ((rgb[1]-rgb[2])/d)%6 : mx===rgb[1] ? (rgb[2]-rgb[0])/d+2 : (rgb[0]-rgb[1])/d+4;
      h = (h*60+360)%360; let sat = mx ? d/mx : 0, val = mx, alpha = rgba[3]/255;
      const code = doc.createElement('input'); code.type = 'text'; code.setAttribute('aria-label','颜色代码');
      const swatch = doc.createElement('span'); swatch.style.cssText = 'width:64px;height:22px;border:1px solid #888';
      const colorValue = () => {
        const f = n => { const k=(n+h/60)%6; return Math.round(255*(val-val*sat*Math.max(0,Math.min(k,4-k,1)))); };
        const colors=[f(5),f(3),f(1)]; return alpha>=.999 ? '#'+colors.map(n=>n.toString(16).padStart(2,'0')).join('') : `rgba(${colors.join(', ')}, ${alpha.toFixed(2)})`;
      };
      const draw = () => {
        g.clearRect(0,0,240,240);
        for(let i=0;i<360;i++){g.beginPath();g.strokeStyle=`hsl(${i},100%,50%)`;g.lineWidth=20;g.arc(120,120,109,i*Math.PI/180,(i+1.5)*Math.PI/180);g.stroke();}
        g.fillStyle=`hsl(${h},100%,50%)`;g.fillRect(54,54,132,132);
        let grad=g.createLinearGradient(54,0,186,0);grad.addColorStop(0,'#fff');grad.addColorStop(1,'#fff0');g.fillStyle=grad;g.fillRect(54,54,132,132);
        grad=g.createLinearGradient(0,54,0,186);grad.addColorStop(0,'#0000');grad.addColorStop(1,'#000');g.fillStyle=grad;g.fillRect(54,54,132,132);
        for(const [x,y] of [[120+109*Math.cos(h*Math.PI/180),120+109*Math.sin(h*Math.PI/180)],[54+sat*132,54+(1-val)*132]]){g.beginPath();g.arc(x,y,6,0,Math.PI*2);g.strokeStyle='#000';g.lineWidth=3;g.stroke();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();}
        code.value = colorValue(); swatch.style.background = code.value;
      };
      let grab = '';
      const pick = e => { const rect=cv.getBoundingClientRect(), x=(e.clientX-rect.left)*240/rect.width, y=(e.clientY-rect.top)*240/rect.height;
        if(grab==='ring') h=(Math.atan2(y-120,x-120)*180/Math.PI+360)%360;
        else {sat=clamp((x-54)/132,0,1);val=1-clamp((y-54)/132,0,1);} draw(); };
      cv.onpointerdown=e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*240/r.width,y=(e.clientY-r.top)*240/r.height; const dist=Math.hypot(x-120,y-120);
        if(dist>=98 && dist<=120) grab='ring'; else if(x>=54&&x<=186&&y>=54&&y<=186) grab='square'; else return;
        cv.setPointerCapture(e.pointerId);pick(e);};
      cv.onpointermove=e=>{if(grab)pick(e);};cv.onpointerup=cv.onpointercancel=()=>{grab='';};
      box.append(cv, swatch, code);
      rangeRow(box,'不透明度',Math.round(alpha*100),0,100,'%',n=>{alpha=n/100;draw();});
      const actions=doc.createElement('div');actions.className='ll-row';
      actions.append(button('应用颜色',()=>{if(!validColor(code.value)){code.setCustomValidity('请输入有效的 CSS 颜色');code.reportValidity();return;}commit(code.value.trim());box.remove();}),button('取消',()=>box.remove()));
      code.oninput=()=>code.setCustomValidity('');box.append(actions);draw();
    }
    function colorRow(parent, label, value, commit, reset, hint = '') {
      const row = doc.createElement('div'); row.className = 'll-color-row';
      const title = doc.createElement('label'); title.textContent = label; title.title = hint || label;
      const chip = button(' ',()=>openColorWheel(row, input.value || value, apply)); chip.className = 'll-color-chip'; chip.setAttribute('aria-label',label+'取色盘');
      const input = doc.createElement('input'); input.type='text'; input.value=value || '';input.placeholder='跟随美化 / CSS 颜色';input.setAttribute('aria-label',label+'颜色代码');
      const apply = color => { input.value=color;chip.style.setProperty('--chip', color || 'transparent');commit(color); };
      input.onchange=()=>{if(validColor(input.value)){input.setCustomValidity('');apply(input.value.trim());}else{input.setCustomValidity('支持 HEX、RGB、HSL 等 CSS 颜色代码');input.reportValidity();}};
      input.oninput=()=>input.setCustomValidity('');chip.style.setProperty('--chip',validColor(value)?value:'transparent');
      row.append(title,chip,input,button('还原',()=>{reset();input.value='';chip.style.setProperty('--chip','transparent');}));parent.append(row);return row;
    }
    function renderThemes() {
      const char = currentCharacter(), name = char?.name || '未选择单人角色';
      const tip = notice('当前角色：' + name + (char?.avatar && set.charThemes[char.avatar] ? '\n已绑定：' + set.charThemes[char.avatar] : '\n尚未绑定。未绑定角色保留当前美化。'));
      const search=doc.createElement('input');search.type='text';search.className='ll-theme-search';search.placeholder='搜索美化名称';search.setAttribute('aria-label','搜索美化');pane.append(search);
      const actions=doc.createElement('div');actions.className='ll-row';
      actions.append(button('刷新美化列表',()=>render('themes')),button('解除当前角色绑定',()=>{if(char?.avatar){delete set.charThemes[char.avatar];saveSet();render('themes');}}));pane.append(actions);
      const grid=doc.createElement('div');grid.className='ll-theme-grid';pane.append(grid);
      const themes=[...(doc.querySelector('#themes')?.options || [])].filter(o=>o.value && !o.disabled);
      if(!themes.length){tip.textContent+='\n酒馆的美化列表还未加载，请稍后刷新。';return;}
      function draw(){grid.textContent='';for(const theme of themes.filter(t=>t.textContent.toLowerCase().includes(search.value.toLowerCase()))){
        const card=doc.createElement('article');card.className='ll-theme-card'+(theme.value===themeName()?' on':'');
        const cover=doc.createElement('div');cover.className='ll-theme-cover';const item=byId(set.themeCovers[theme.value]);
        if(item){const img=doc.createElement('img');img.src=itemUrl(item);img.alt=theme.textContent+'封面';cover.append(img);}else cover.textContent='♪';
        const title=doc.createElement('strong');title.textContent=theme.textContent+(char?.avatar&&set.charThemes[char.avatar]===theme.value?' · 已绑定':'');
        const row=doc.createElement('div');row.className='ll-row';
        row.append(button('应用',async()=>{try{await applyNativeTheme(theme.value);draw();}catch(e){tip.textContent=e.message;}}));
        const bind=button('绑定当前角色',async()=>{const current=currentCharacter();if(!current?.avatar)return;try{await applyNativeTheme(theme.value);set.charThemes[current.avatar]=theme.value;saveSet();render('themes');}catch(e){tip.textContent=e.message;}});bind.disabled=!char?.avatar;row.append(bind);
        const upload=doc.createElement('input');upload.type='file';upload.accept='image/*';upload.hidden=true;
        upload.onchange=async()=>{const f=upload.files?.[0];if(!f)return;try{const {blob,a}=await shrink(await readFile(f),960,'image/jpeg');const it=await libAdd({kind:'cover',name:theme.value+' · 封面',blob,a});const old=set.themeCovers[theme.value];set.themeCovers[theme.value]=it.id;saveSet();if(old)await libDel([old]);draw();}catch(e){tip.textContent='封面保存失败：'+e.message;}};
        row.append(button('上传封面',()=>upload.click()),upload);
        if(item)row.append(button('移除封面',async()=>{delete set.themeCovers[theme.value];saveSet();await libDel([item.id]);draw();}));
        card.append(cover,title,row);grid.append(card);
      }} search.oninput=draw;draw();
    }
    function renderThemeColors() {
      const p=profile();p.colors ||= {};p.text ||= {};p.variables ||= {};
      const save=()=>{saveSet();paintTheme();};
      notice('当前美化：'+(themeName()==='__current__'?'当前 CSS':themeName())+'\n颜色单独记在这套美化下。点色块打开圆环取色盘，也可输入 CSS 颜色代码。');
      const exclusions=doc.createElement('input');exclusions.type='text';exclusions.value=p.exclude||'';exclusions.placeholder='例如：pre, code, .状态栏, love_letter';exclusions.setAttribute('aria-label','不生效的标签或选择器');
      const label=doc.createElement('label');label.textContent='不改色的标签 / CSS 选择器（逗号分隔，包含其中内容）';pane.append(label,exclusions);
      exclusions.onchange=()=>{try{if(exclusions.value.trim())doc.querySelector(exclusions.value);p.exclude=exclusions.value.trim();exclusions.setCustomValidity('');save();}catch(_){exclusions.setCustomValidity('选择器格式不正确，请检查逗号、标签名和括号');exclusions.reportValidity();}};
      const textBox=doc.createElement('div');
      for(const [kind,label,tags] of textKinds) colorRow(textBox,label,p.text[kind] || host.getComputedStyle(doc.querySelector(tags ? '#chat .mes_text :is(' + tags + ')' : '#chat .mes_text') || root).color,v=>{p.text[kind]=v;save();},()=>{delete p.text[kind];save();});
      toggleRow(textBox,'正文发光',p.glow,v=>{p.glow=v;save();});
      colorRow(textBox,'发光颜色',p.glowColor||'#ffffff',v=>{p.glowColor=v;save();},()=>{delete p.glowColor;p.glow=false;save();});
      rangeRow(textBox,'发光强度',p.glowSize||4,1,20,'px',v=>{p.glowSize=v;save();});pane.append(fold('正文与各种文本',textBox));
      const nativeBox=doc.createElement('div');
      for(const [label,variable] of nativeColors) colorRow(nativeBox,label,p.variables[variable]||host.getComputedStyle(root).getPropertyValue(variable).trim(),v=>{p.variables[variable]=v;save();},()=>{delete p.variables[variable];save();},variable);
      pane.append(fold('酒馆全局主题色',nativeBox,false));
      const cssBox=doc.createElement('div');
      toggleRow(cssBox,'同时读取其他可访问样式表（含界面与扩展）',p.allSheets,v=>{p.allSheets=v;save();render('text');});
      cssBox.append(button('重新读取当前 CSS 颜色',()=>render('text')));
      const result=detectColors();
      const info=doc.createElement('p');info.className='ll-tip';info.textContent=`读到 ${result.found.size} 种 CSS 颜色。可改边框、背景、渐变、阴影和颜色变量；跨域样式、图片本身及图片内的颜色无法直接读取。`;cssBox.append(info);
      const search=doc.createElement('input');search.type='text';search.placeholder='搜索颜色 / 属性 / 选择器';search.setAttribute('aria-label','搜索 CSS 颜色');cssBox.append(search);
      const rows=[];
      for(const [original,item] of result.found){const uses=[...item.uses].join('\n');const row=colorRow(cssBox,item.value,p.colors[original]||item.value,v=>{p.colors[original]=v;save();},()=>{delete p.colors[original];save();},uses);rows.push({row,text:(original+' '+uses).toLowerCase()});}
      search.oninput=()=>rows.forEach(({row,text})=>row.hidden=!text.includes(search.value.toLowerCase()));
      pane.append(fold('读取美化内的 CSS 配色',cssBox));
      pane.append(button('还原这套美化的所有颜色',()=>{if(!host.confirm('还原当前美化的颜色修改？头像、图片和角色绑定会保留。'))return;delete set.themeProfiles[themeName()];save();render('text');}));
    }
    function renderManagerSettings() {
      const box=doc.createElement('div');const a=set.appearance;
      const save=()=>{saveSet();paintAppearance();paintAll();};
      rangeRow(box,'管理器不透明度',a.opacity??100,0,100,'%',v=>{a.opacity=v;save();});
      rangeRow(box,'管理器毛玻璃',a.blur||0,0,40,'px',v=>{a.blur=v;save();});
      toggleRow(box,'显示并启用头像框功能',a.showFrame,v=>{a.showFrame=v;save();});
      toggleRow(box,'显示并启用序列头像颜色功能',a.showColor,v=>{a.showColor=v;save();});
      const note=doc.createElement('p');note.className='ll-tip';note.textContent='这两项默认关闭，开启后在前面的标签栏显示。主题色不受这个开关影响。';box.append(note);
      pane.prepend(fold('管理器外观与可选功能',box));
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
      previewEntry(); renderManagerSettings();
    }
    /* 本地库 */
    function renderLib() {
      const names = { avatar: '头像', frame: '头像框', bg: '背景', icon: '入口图标', cover: '美化封面' };
      pane.append(Object.assign(doc.createElement('div'), { className: 'll-tip', textContent: '这些图都存在这台设备的浏览器里。点右上角 × 删除单张。' }));
      for (const kind of ['avatar', 'frame', 'bg', 'icon', 'cover']) {
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
        await libDel(lib.map(x => x.id)); set = { avatar: {}, bg: {}, frame: {}, appearance: {opacity:100,blur:0,showFrame:false,showColor:false}, themeProfiles:{},charThemes:{},themeCovers:{},themeTextMigrated:true }; saveSet(); paintAppearance(); paintTheme(); paintAll(); render('lib');
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
    note.textContent = '头像、头像框、背景、气泡与正文样式 · v1.1.0';
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
    dead = true; stopThemes(); host.clearTimeout(timer); observer.disconnect();
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
    root.classList.remove('ll-custom-global-bg', 'll-custom-bubbles', 'll-custom-text-color', 'll-custom-text-glow'); ['--ll-global-bg','--ll-global-bg-size','--ll-global-bg-pos','--ll-bubble-opacity','--ll-bubble-blur','--ll-bubble-color','--ll-bubble-fill','--ll-bubble-brightness','--ll-bubble-paper','--ll-text-color','--ll-text-glow-color','--ll-text-glow-size'].forEach(p => root.style.removeProperty(p));
    guard.remove(); if (host[key]?.dispose === dispose) delete host[key];
  }
  function onPageHide(event) { if (!event.persisted) dispose(); }
  host[key] = { dispose, open: () => openManager(null), extension: true };
  host.addEventListener('pagehide', onPageHide);
  startThemes();
  scan();
}

// Auto-start also supports SillyTavern versions without lifecycle hooks.
init();

