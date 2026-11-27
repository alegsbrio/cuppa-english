// Smoke test: runs the real app (js/app.js) in Node against a minimal fake browser and plays every kind of session.
// No packages needed.  Run:  node tools/smoke.js   (tools/check.js runs it too)
// It catches crashes, sessions that never end, wrong answer keys and broken templates ("undefined" / "NaN" in the page).
const path = require('path');
const root = path.join(__dirname, '..');

/* ---------- fake browser ---------- */
const def = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const els = {};
const el = id => els[id] || (els[id] = {
  id, innerHTML: '', textContent: '', value: '', dataset: {}, style: {}, files: [],
  classList: { toggle() { }, add() { }, remove() { }, contains() { return false; } },
  focus() { }, click() { }, remove() { }, appendChild() { }, addEventListener() { }
});
const store = {};
def('window', globalThis);
def('localStorage', { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } });
def('document', { querySelector: s => el(s), querySelectorAll: () => [], addEventListener() { }, createElement: () => el('tmp'), body: el('body'), head: el('head') });
def('navigator', {});
def('location', { protocol: 'http:', reload() { } });
def('scrollTo', () => { });
def('confirm', () => true);
def('speechSynthesis', { getVoices: () => [], speak() { }, cancel() { } });
def('SpeechSynthesisUtterance', class { constructor(t) { this.text = t; } });
// a clock we can move forward to simulate several days
const RealDate = Date; let offset = 0;
def('Date', class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + offset); } static now() { return RealDate.now() + offset; } });
const nextDay = (n = 1) => { offset += n * 864e5; };

def('__CUPPA_TEST__', true);
['vocab', 'grammar', 'skills'].forEach(f => require(path.join(root, 'js/data', f + '.js')));
require(path.join(root, 'js/app.js'));
const C = globalThis.__cuppa, D = globalThis.DATA;

/* ---------- helpers ---------- */
let checks = 0;
const problems = [];
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };
const page = where => {
  const h = el('#app').innerHTML;
  ok(h.length > 0, where + ': empty page');
  const m = /undefined|NaN|\[object Object\]/.exec(h.replace(/<textarea[^]*?<\/textarea>/g, ''));
  ok(!m, where + ': the page shows "' + (m && m[0]) + '" near: ' + (m ? h.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, ' ') : ''));
};

// plays the open session to the end; right = answer everything correctly (true) or wrongly (false)
async function play(name, right = true, opt = {}) {
  let guard = 0;
  ok(!!C.session(), name + ': session did not start');
  while (C.session()) {
    if (++guard > 3000) { problems.push(name + ': session never ends'); C.act.quit(); return null; }
    page(name);
    const s = C.session();
    if (s.fin) { const r = { correct: s.correct, total: s.exam ? s.steps.length : s.total, msg: s.msg || '' }; C.act.close(); return r; }
    const st = s.steps[s.i], u = C.ui();
    if (st.t === 'card' && opt.know) C.act.know();
    else if (u.answered || st.t === 'card' || st.t === 'info') C.act.next();
    else if (st.t === 'mcq') {
      ok(st.opts.includes(st.ans), name + ': the correct answer is not among the options: ' + (st.sub || st.prompt));
      ok(new Set(st.opts).size === st.opts.length, name + ': repeated options: ' + (st.sub || st.big || st.prompt) + ' -> ' + st.opts.join(' | '));
      C.act.pick(String(right ? st.opts.indexOf(st.ans) : st.opts.findIndex(o => o !== st.ans)));
    } else if (st.t === 'type') { C.setVal(right ? '  ' + st.ans.toUpperCase() + ' ' : 'zzz'); C.act.check(); }
    else if (st.t === 'build') {
      const want = st.toks.map((x, i) => i); if (!right) want.reverse();
      want.forEach(ti => C.act.place(String(st.shuf.indexOf(ti)))); C.act.check();
    } else if (st.t === 'order') {
      const want = st.rest.slice(); if (!right) want.reverse();
      want.forEach(x => C.act.place(String(st.shuf.indexOf(x)))); C.act.check();
    } else if (st.t === 'write') { C.setVal('<b>one</b> two three'); page(name); C.act.selfDone(); }
    else if (st.t === 'speak') { await C.act.spStart(); page(name); await C.act.spStop(); }
    else { problems.push(name + ': unknown step type ' + st.t); C.act.quit(); return null; }
  }
  return null;
}
const perfect = (r, name) => ok(r && r.correct === r.total, name + ': answering with the answer key should give full marks, got ' + (r ? r.correct + '/' + r.total : 'nothing'));
const views = where => {
  ['home', 'path', 'practice', 'progress'].forEach(v => { C.act.nav(v); page(where + ' view ' + v); });
  D.vocab.forEach((u, i) => { C.act.unit(String(i)); page(where + ' unit ' + i); });
  C.act.nav('home');
};
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  /* first visit and level test */
  page('welcome');
  C.act.placement(); let r = await play('level test, all wrong', false);
  ok(r && r.total === 4, 'level test should stop after two failed units (4 questions), took ' + (r && r.total));
  C.act.reset(); C.act.placement(); r = await play('level test, all right');
  ok(r && r.total === D.grammar.length * 2 && Object.keys(C.state().gram).length === D.grammar.length * 6, 'level test all right should pass every grammar unit');
  C.act.reset(); C.act.skipOb(); views('new user');

  /* day 1: the five daily challenges, all right */
  for (let i = 0; i < 5; i++) { C.act.startCh(String(i)); perfect(await play('day 1 challenge ' + i), 'day 1 challenge ' + i); }
  let S = C.state();
  ok(S.streak === 1 && S.days[today()].c.join('') === '11111', 'day 1: streak should be 1 and all five challenges done');
  const xp1 = S.xp;
  C.act.startCh('4'); await play('repeat challenge'); ok(C.state().streak === 1, 'repeating a challenge must not change the streak');
  views('day 1');

  /* day 2: answers wrong on purpose, then fix them in "My mistakes" */
  nextDay(); C.act.nav('home');
  ok(C.state().days[today()].plan.newW.length === 4, 'day 2 should plan four new words');
  for (let i = 0; i < 3; i++) { C.act.startCh(String(i)); await play('day 2 challenge ' + i + ' (wrong answers)', false); }
  S = C.state();
  ok(S.streak === 2, 'day 2: streak should be 2, is ' + S.streak);
  ok(Object.keys(S.err).length > 0, 'wrong answers should be stored in the mistakes list');
  for (let n = 0; n < 20 && Object.keys(C.state().err).length; n++) { C.act.errors(); await play('my mistakes'); }
  ok(Object.keys(C.state().err).length === 0, 'the mistakes list should empty once they are answered correctly');

  /* a missed day breaks the streak */
  nextDay(2); C.act.nav('home');
  for (let i = 0; i < 3; i++) { C.act.startCh(String(i)); await play('day 4 challenge ' + i, true, { know: i === 0 }); }
  S = C.state(); ok(S.streak === 1 && S.best === 2, 'after a missed day the streak restarts at 1 and best stays 2 (is ' + S.streak + '/' + S.best + ')');

  /* every word, every grammar unit, every task */
  for (let u = 0; u < D.vocab.length; u++) {
    for (let n = 0; n < 4; n++) { C.act.learnUnit(String(u)); perfect(await play('vocabulary unit ' + (u + 1)), 'vocabulary unit ' + (u + 1)); }
    C.act.gramUnit(String(u)); perfect(await play('grammar unit ' + (u + 1)), 'grammar unit ' + (u + 1));
  }
  ok(D.vocab.every(u => u.words.every(w => C.state().words[w[0]])), 'every word should be learnt after practising every unit');
  for (const type of ['reading', 'listening', 'writing', 'speaking']) for (const it of D[type]) {
    C.act.skill(type + ':' + it.id); perfect(await play(type + ' ' + it.id), type + ' ' + it.id);
    C.act.skill(type + ':' + it.id); await play(type + ' ' + it.id + ' (wrong answers)', false);
  }
  for (const a of ['colloc', 'wordform', 'mixGram', 'brit8']) for (let n = 0; n < 6; n++) { C.act[a](); perfect(await play(a), a); }

  /* spaced review over two weeks, daily challenges in English */
  C.state().lang = 'en';
  for (let d = 0; d < 14; d++) {
    nextDay(); C.act.nav('home');
    for (let i = 0; i < 5; i++) { C.act.startCh(String(i)); perfect(await play('review day ' + d + ' challenge ' + i), 'review day ' + d + ' challenge ' + i); }
  }
  ok(C.state().streak === 15, 'fifteen days in a row should give a streak of 15, is ' + C.state().streak);
  views('after two weeks, in English');

  /* mock test */
  C.act.mock(); r = await play('mock test, all right'); perfect(r, 'mock test'); ok(r && r.total === 50, 'the mock test should have 50 questions');
  C.act.mock(); r = await play('mock test, all wrong', false); ok(r && r.correct === 0 && C.state().mockBest === 50, 'a failed mock keeps the best score');
  ok(C.state().xp > xp1, 'XP should grow');
  views('end');

  console.log(problems.length ? problems.slice(0, 40).map(p => 'FAIL ' + p).join('\n') + '\n' + problems.length + ' problem(s) in ' + checks + ' checks' : 'smoke OK · ' + checks + ' checks');
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.log('FAIL smoke test crashed: ' + (e && e.stack || e)); process.exit(1); });
