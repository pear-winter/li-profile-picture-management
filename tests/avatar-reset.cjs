const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const source = fs.readFileSync(__dirname + '/../index.js', 'utf8');
const keyOfSrc = src => new URL(src, 'http://localhost').searchParams.get('file');
function avatar(src) {
  const img = { dataset: {}, src, getAttribute() { return this.src; }, setAttribute(k, v) { this.src = v; } };
  return { img, querySelector() { return img; } };
}
const a = avatar('/thumbnail?type=avatar&file=A.png'), b = avatar(a.img.src), other = avatar('/thumbnail?type=persona&file=B.png');
const native = a.img.src, nativeOther = other.img.src;
const set = { avatar: { 'A.png': 'a', 'B.png': 'b' }, bg: { 'A.png': { id: 'bg' } }, frame: { 'A.png': { id: 'frame' } } };
let saved;
const ctx = { set, avatarSelector: 'avatars', keyOfSrc, keyOf: av => keyOfSrc(av.img.dataset.llOrig || av.img.src), byId: id => id && ({ id }), itemUrl: it => 'blob:' + it.id, saveSet: () => { saved = JSON.parse(JSON.stringify(set)); }, doc: { querySelectorAll: () => [a, b, other] } };
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function paintAvatarImg('), source.indexOf('  function paintBg(')), ctx);
[a, b, other].forEach(ctx.paintAvatarImg);
assert.equal(a.img.src, 'blob:a');
ctx.resetAvatar('A.png');
assert.equal(a.img.src, native); assert.equal(b.img.src, native);
assert.equal(other.img.src, 'blob:b'); assert.equal(saved.avatar['A.png'], undefined);
assert.equal(saved.bg['A.png'].id, 'bg'); assert.equal(saved.frame['A.png'].id, 'frame');
assert.equal(a.img.dataset.llOrig, undefined); assert.equal(a.img.dataset.llSet, undefined);
[a, b, other].forEach(ctx.paintAvatarImg); assert.equal(a.img.src, native);
set.avatar['A.png'] = 'a'; ctx.paintAvatarImg(a);
set.avatar['A.png'] = 'new'; ctx.paintAvatarImg(a); ctx.resetAvatar('A.png'); assert.equal(a.img.src, native);
// A host-side persona change becomes the new original, rather than restoring the old persona.
other.img.src = '/thumbnail?type=persona&file=C.png'; ctx.paintAvatarImg(other);
assert.equal(other.img.src, '/thumbnail?type=persona&file=C.png');
other.img.src = nativeOther; ctx.paintAvatarImg(other); ctx.resetAvatar('B.png'); assert.equal(other.img.src, nativeOther);
console.log('PASS: immediate multi-message reset, persistence, repeat replacement, persona changes, and independent backgrounds/frames.');
