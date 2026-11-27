// Validates the content files and the app's syntax.  Run:  node tools/check.js
// Exit code 0 = everything is consistent. Any FAIL line must be fixed before pushing.
const path = require('path'), fs = require('fs'), cp = require('child_process');
const root = path.join(__dirname, '..');
global.window = global;
['vocab', 'grammar', 'skills'].forEach(f => require(path.join(root, 'js/data', f + '.js')));
const D = global.DATA;
let bad = 0;
const fail = m => { bad++; console.log('FAIL', m); };
const uniq = (list, key, what) => { const s = new Set(); list.forEach(x => { const k = key(x); if (s.has(k)) fail('duplicate ' + what + ': ' + k); s.add(k); }); };

// syntax of every script
['js/app.js', 'sw.js', 'server.js', 'js/data/vocab.js', 'js/data/grammar.js', 'js/data/skills.js'].forEach(f => {
  try { cp.execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); } catch (e) { fail('syntax ' + f + ': ' + String(e.stderr).split('\n')[0]); }
});

// vocabulary: [headword, part of speech, synonym, definition, example, Spanish]
const words = [];
D.vocab.forEach((u, ui) => {
  if (!u.title || !u.emoji) fail('unit ' + ui + ' needs title and emoji');
  if (u.words.length !== 12) fail('unit "' + u.title + '" must have 12 words, has ' + u.words.length);
  u.words.forEach(w => {
    words.push(w);
    if (w.length !== 6 || w.some(x => typeof x !== 'string' || !x.trim())) return fail('word fields: ' + w[0]);
    const re = new RegExp('\\b' + w[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (!re.test(w[4])) fail('example must contain the headword exactly: ' + w[0]);
    if (re.test(w[3])) fail('definition must not contain the headword: ' + w[0]);
    if (norm(w[2]) === norm(w[0])) fail('synonym equals headword: ' + w[0]);
  });
});
function norm(s) { return s.toLowerCase().trim(); }
uniq(words, w => norm(w[0]), 'headword');
uniq(words, w => norm(w[2]), 'synonym (synonyms are used as answer options, so each must be unique)');
uniq(words, w => w[3], 'definition');

// grammar: one unit per vocabulary unit, 8 questions each: [sentence with ___, correct, wrong, wrong, explanation]
if (D.grammar.length !== D.vocab.length) fail('grammar units (' + D.grammar.length + ') must match vocabulary units (' + D.vocab.length + ')');
const gqs = [];
D.grammar.forEach(g => {
  if (!g.title || !g.level || !g.rule || !g.es || !Array.isArray(g.ex) || g.ex.length < 2) fail('grammar unit fields: ' + g.title);
  if (g.qs.length !== 8) fail('grammar unit "' + g.title + '" must have 8 questions');
  g.qs.forEach(q => { gqs.push(q); if (q.length !== 5 || !q[0].includes('___') || new Set(q.slice(1, 4)).size !== 3 || !q[4]) fail('grammar question: ' + q[0]); });
});
uniq(gqs, q => q[0], 'grammar sentence');

// collocations [phrase with ___, correct, wrong, wrong]; word formation [sentence with ___ ... (base), answer]
D.colloc.forEach(q => { if (q.length !== 4 || !q[0].includes('___') || new Set(q.slice(1)).size !== 3) fail('collocation: ' + q[0]); });
uniq(D.colloc, q => q[0], 'collocation');
D.wordform.forEach(q => { if (q.length !== 2 || !q[0].includes('___') || !/\([a-z]+\)$/.test(q[0]) || !q[1]) fail('word formation: ' + q[0]); });
uniq(D.wordform, q => q[0], 'word formation');
D.british.forEach(q => { if (q.length !== 4 || new Set(q.slice(1)).size !== 3) fail('british: ' + q[0]); });

// skills
const ids = [];
D.reading.forEach(it => {
  ids.push(it.id);
  if (!it.title || !it.part) fail('reading fields: ' + it.id);
  if (it.type === 'order') { if (!Array.isArray(it.s) || it.s.length < 5) fail('reading order needs 5+ sentences: ' + it.id); return; }
  if (!it.text) fail('reading text: ' + it.id);
  checkQs(it);
});
D.listening.forEach(it => {
  ids.push(it.id);
  if (!it.title || !it.part || !Array.isArray(it.script) || !it.script.every(l => (l[0] === 'M' || l[0] === 'F') && l[1])) fail('listening script: ' + it.id);
  checkQs(it);
});
function checkQs(it) {
  it.qs.forEach(q => {
    if (it.fixed) { if (!(Number.isInteger(q[1]) && q[1] >= 0 && q[1] < it.fixed.length)) fail(it.id + ' answer index: ' + q[0]); }
    else if (q.length < 4 || new Set(q.slice(1)).size !== q.length - 1) fail(it.id + ' options: ' + q[0]);
  });
  uniq(it.qs, q => q[0], it.id + ' question');
}
const wc = s => s.trim().split(/\s+/).length;
D.writing.forEach(w => {
  ids.push(w.id);
  if (!w.title || !w.part || !w.prompt || !w.model || !Array.isArray(w.tips) || !(w.min < w.max)) return fail('writing fields: ' + w.id);
  const n = wc(w.model); if (n < w.min || n > w.max + 5) fail('writing model for ' + w.id + ' has ' + n + ' words, target ' + w.min + '-' + w.max);
});
D.speaking.forEach(s => { ids.push(s.id); if (!s.title || !s.part || !Array.isArray(s.tips) || !s.qs.every(q => q[0] && q[1] > 0)) fail('speaking fields: ' + s.id); });
uniq(ids, x => x, 'task id');

// every file the service worker caches must exist
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
(sw.match(/'[^']+\.(?:html|css|js|png|webmanifest)'/g) || []).forEach(f => { if (!fs.existsSync(path.join(root, f.slice(1, -1)))) fail('sw.js caches a missing file: ' + f); });

console.log(`units ${D.vocab.length} · words ${words.length} · grammar questions ${gqs.length} · collocations ${D.colloc.length} · word formation ${D.wordform.length} · tasks ${ids.length}`);
// play the whole app in a fake browser (only when the content itself is consistent)
if (!bad) {
  try { console.log(cp.execFileSync(process.execPath, [path.join(__dirname, 'smoke.js')], { stdio: 'pipe', timeout: 300000 }).toString().trim()); }
  catch (e) { fail('smoke test: ' + String(e.stdout || e.message).trim()); }
}
console.log(bad ? bad + ' problem(s) found' : 'OK');
process.exit(bad ? 1 : 0);
