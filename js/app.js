(function () {
'use strict';
const D = window.DATA;

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad = n => String(n).padStart(2, '0');
const sum = a => a.reduce((x, y) => x + y, 0);
const fmt = s => Math.floor(s / 60) + ':' + pad(s % 60);
const dateStr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const dayNum = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const norm = s => String(s).toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
const paras = s => s.split('\n').map(p => p.trim() ? `<p>${esc(p)}</p>` : '').join('');
const wordCount = s => (s.trim().match(/\S+/g) || []).length;

/* ---------- vocabulary index ---------- */
const ALL = [];
D.vocab.forEach((u, ui) => u.words.forEach(a => ALL.push({ w: a[0], pos: a[1], syn: a[2], def: a[3], ex: a[4], es: a[5], u: ui })));
const BY = {}; ALL.forEach(w => BY[w.w] = w);
const wre = w => new RegExp('\\b' + w.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
const gap = w => w.ex.replace(wre(w), '_____');
const hl = w => esc(w.ex).replace(wre(w), '<b>$&</b>');

/* ---------- state ---------- */
const KEY = 'cuppa_v1';
let S;
// Saved progress (and imported backup files) are untrusted input: rebuild the state field by field,
// keeping only values of the expected type, so a damaged or malicious file can neither break the app nor inject HTML.
const SKILLS = ['reading', 'listening', 'writing', 'speaking'];
const DAY = /^\d{4}-\d\d-\d\d$/;
function validPlan(p) {
  return !!p && Array.isArray(p.newW) && p.newW.every(w => typeof w === 'string' && BY[w])
    && Number.isInteger(p.gu) && p.gu >= -1 && p.gu < D.grammar.length
    && Array.isArray(p.skill) && SKILLS.includes(p.skill[0]) && D[p.skill[0]].some(x => x.id === p.skill[1])
    && Array.isArray(p.brit) && p.brit.length > 0 && p.brit.every(i => Number.isInteger(i) && !!D.british[i]);
}
function sanitize(o) {
  const num = (v, d) => typeof v === 'number' && isFinite(v) ? v : d;
  const ents = v => v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v).filter(e => e[0] !== '__proto__') : [];
  o = o && typeof o === 'object' ? o : {};
  const s = {
    xp: Math.max(0, num(o.xp, 0)), streak: Math.max(0, num(o.streak, 0)), best: Math.max(0, num(o.best, 0)), lastGoal: num(o.lastGoal, -1),
    lang: o.lang === 'en' ? 'en' : 'es', rate: [0.8, 0.95, 1.1].includes(o.rate) ? o.rate : 0.95, snd: o.snd !== false, ob: o.ob ? 1 : 0,
    mockBest: Math.max(0, num(o.mockBest, 0)), mock: null, days: {}, words: {}, gram: {}, gt: {}, err: {}, acc: {}, done: {}
  };
  const m = o.mock;
  if (m && typeof m.score === 'number' && typeof m.of === 'number' && DAY.test(m.d)) s.mock = { d: m.d, score: m.score, of: m.of };
  for (const [k, d] of ents(o.days)) {
    if (!DAY.test(k) || !d || !Array.isArray(d.c) || d.c.length !== 5) continue;
    s.days[k] = { c: d.c.map(x => x ? 1 : 0), xp: Math.max(0, num(d.xp, 0)), plan: validPlan(d.plan) ? d.plan : null };
  }
  for (const [k, r] of ents(o.words)) if (r && typeof r === 'object') s.words[k] = { box: Math.min(5, Math.max(0, Math.round(num(r.box, 0)))), due: num(r.due, 0), up: num(r.up, 0) };
  for (const f of ['gram', 'err', 'done']) for (const [k, v] of ents(o[f])) if (v) s[f][k] = 1;
  for (const [k, v] of ents(o.gt)) s.gt[k] = num(v, 0);
  for (const [k, v] of ents(o.acc)) if (Array.isArray(v)) s.acc[k] = [Math.max(0, num(v[0], 0)), Math.max(0, num(v[1], 0))];
  return s;
}
function load() {
  let o = {};
  try { o = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* first run or damaged data */ }
  S = sanitize(o);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

/* ---------- interface language (Spanish / immersion in English) ---------- */
const L = {
  today: ['Hoy', 'Today'], path: ['Ruta', 'Path'], practice: ['Práctica', 'Practice'], progress: ['Progreso', 'Progress'],
  challenges: ['Desafíos de hoy', "Today's challenges"],
  goalNote: ['Completa 3 para mantener la racha · 5 para un día perfecto', 'Complete 3 to keep your streak · 5 for a perfect day'],
  start: ['Empezar', 'Start'], again: ['Repetir', 'Again'],
  c0: ['Palabras nuevas', 'New words'], c0b: ['Palabras flojas', 'Weak words'], c1: ['Repaso', 'Review'], c2: ['Gramática', 'Grammar'], c4: ['Rincón británico', 'British corner'],
  weakSub: ['Refuerza las que más te cuestan', 'Strengthen the ones you find hardest'],
  dueSub: ['palabras · colocaciones · formación de palabras', 'words · collocations · word formation'],
  colT: ['Colocaciones (10 preguntas)', 'Collocations (10 questions)'], errT: ['Mis errores', 'My mistakes'], noErr: ['No tienes errores pendientes', 'No mistakes to review'],
  colDone: ['Colocaciones vistas', 'Collocations seen'],
  export: ['Exportar progreso', 'Export progress'], import: ['Importar progreso', 'Import progress'],
  importQ: ['¿Sustituir tu progreso actual por el del archivo?', 'Replace your current progress with the file?'], importBad: ['El archivo no es una copia válida', 'This file is not a valid backup'], importOk: ['Progreso importado', 'Progress imported'],
  mixed: ['Repaso mixto de gramática', 'Mixed grammar review'],
  britSub: ['Expresiones, ortografía y cultura del Reino Unido', 'UK expressions, spelling and culture'],
  reading: ['Reading', 'Reading'], listening: ['Listening', 'Listening'], writing: ['Writing', 'Writing'], speaking: ['Speaking', 'Speaking'],
  needWords: ['Primero completa «Palabras nuevas»', 'Complete "New words" first'],
  dayStreak: ['días de racha', 'day streak'], perfect: ['¡Día perfecto! +50 XP', 'Perfect day! +50 XP'],
  streak: ['Racha', 'Streak'], best: ['Mejor racha', 'Best streak'],
  pathIntro: ['{n} unidades de B1 a B2. Las palabras y la gramática avanzan con tus desafíos diarios.', '{n} units from B1 to B2. Words and grammar move forward with your daily challenges.'],
  words: ['Palabras', 'Words'], grammar: ['Gramática', 'Grammar'],
  learnUnit: ['Aprender / practicar vocabulario', 'Learn / practise vocabulary'], gramUnit: ['Practicar gramática', 'Practise grammar'],
  back: ['← Volver', '← Back'],
  mockT: ['Simulacro Aptis Core', 'Aptis Core mock test'], mockS: ['50 preguntas de gramática y vocabulario · 25 minutos · sin ayudas', '50 grammar and vocabulary questions · 25 minutes · no help'],
  last: ['Último resultado', 'Last result'],
  mixGram: ['Gramática mixta (10 preguntas)', 'Mixed grammar (10 questions)'], brit8: ['Rincón británico (8 preguntas)', 'British corner (8 questions)'],
  quick: ['Práctica rápida', 'Quick practice'],
  wLearnt: ['Palabras aprendidas', 'Words learnt'], wStrong: ['Palabras dominadas', 'Words mastered'], gDone: ['Unidades de gramática superadas', 'Grammar units passed'], skDone: ['Tareas de destrezas hechas', 'Skill tasks done'],
  settings: ['Ajustes', 'Settings'], immersion: ['Modo inmersión (interfaz en inglés)', 'Immersion mode (interface in English)'],
  speed: ['Velocidad de la voz', 'Voice speed'], slow: ['Lenta', 'Slow'], normal: ['Normal', 'Normal'], fast: ['Rápida', 'Fast'],
  reset: ['Borrar todo el progreso', 'Erase all progress'], resetQ: ['¿Seguro que quieres borrar todo tu progreso?', 'Are you sure you want to erase all your progress?'],
  wTitle: ['Tu camino al B2 de Aptis, en unos 15 minutos al día', 'Your path to Aptis B2, in about 15 minutes a day'],
  w1: ['5 desafíos cada día: palabras, repaso, gramática, una destreza del examen y cultura británica.', '5 challenges every day: words, review, grammar, one exam skill and British culture.'],
  w2: ['Todo en inglés, como en una academia de Inglaterra. El español queda a un toque si lo necesitas.', 'Everything in English, like a language school in England. Spanish is one tap away if you need it.'],
  w3: ['Lo que fallas vuelve; lo que dominas se espacia. Mantén la racha.', 'What you get wrong comes back; what you know is spaced out. Keep your streak.'],
  wTest: ['Hacer la prueba de nivel (5 min)', 'Take the level test (5 min)'], wSkip: ['Empezar desde el principio', 'Start from the beginning'],
  plRes: ['Dominas {n} de {t} puntos de gramática. Empiezas en la unidad {u}.', 'You have mastered {n} of {t} grammar points. You start at unit {u}.'],
  plAll: ['Dominas los {t} puntos de gramática. Tendrás repaso mixto cada día.', 'You have mastered all {t} grammar points. You will get a mixed review every day.'],
  cont: ['Continuar', 'Continue'], allDone: ['¡Día completado! Sigue en Práctica o vuelve mañana.', 'Day complete! Carry on in Practice or come back tomorrow.'],
  know: ['Ya la conozco →', 'I already know this →'],
  wfT: ['Formación de palabras (10 preguntas)', 'Word formation (10 questions)'],
  ready: ['Preparación para Aptis', 'Aptis readiness'], readyNote: ['Orientativo, según tus aciertos en la app. No es una nota oficial.', 'A rough guide based on your answers in the app. Not an official score.'],
  noData: ['faltan datos', 'not enough data'], weak: ['a reforzar', 'needs work'], tasks: ['tareas', 'tasks'],
  badges: ['Logros', 'Achievements'], sound: ['Sonidos de acierto y fallo', 'Sounds for right and wrong answers'],
  showEs: ['Ver en español', 'Show Spanish'],
  boxes: ['Memoria: de nuevas (izquierda) a dominadas (derecha)', 'Memory: from new (left) to mastered (right)'],
  noVoice: ['Tu navegador no tiene voz en inglés; el audio no sonará.', 'Your browser has no English voice; audio will not play.']
};
const t = k => L[k][S.lang === 'en' ? 1 : 0];

/* ---------- speech (British voice) ---------- */
const TTS = 'speechSynthesis' in window;
function voices() {
  const v = speechSynthesis.getVoices();
  const gb = v.filter(x => /en[-_]GB/i.test(x.lang));
  return gb.length ? gb : v.filter(x => /^en/i.test(x.lang));
}
function say(text, o = {}) {
  if (!TTS) return;
  if (o.cancel !== false) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  const vs = voices();
  if (vs.length) {
    const fem = vs.find(x => /female|sonia|libby|hazel|susan|maisie|kate|serena|martha/i.test(x.name));
    const mal = vs.find(x => /\bmale|ryan|george|thomas|daniel|oliver|arthur/i.test(x.name));
    u.voice = o.who === 'M' ? (mal || vs[vs.length - 1]) : (fem || vs[0]);
  }
  u.pitch = o.who === 'M' ? 0.8 : o.who === 'F' ? 1.15 : 1;
  u.rate = S.rate;
  speechSynthesis.speak(u);
}
function sayScript(script) { if (!TTS) return; speechSynthesis.cancel(); script.forEach(l => say(l[1], { who: l[0], cancel: false })); }
function hush() { if (TTS) speechSynthesis.cancel(); }

let AC = null;
function beep(ok) {
  if (!S.snd) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
    o.connect(g); g.connect(AC.destination);
    o.frequency.setValueAtTime(ok ? 660 : 200, n); if (ok) o.frequency.setValueAtTime(880, n + 0.1);
    g.gain.setValueAtTime(0.12, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.28);
    o.start(n); o.stop(n + 0.3);
  } catch (e) { /* no audio */ }
}

/* ---------- levels and achievements ---------- */
const level = xp => Math.floor(Math.sqrt(xp / 60)) + 1;
const rank = lv => ['Tourist', 'Visitor', 'Commuter', 'Local', 'Regular', 'Londoner', 'Honorary Brit'][lv < 3 ? 0 : lv < 5 ? 1 : lv < 8 ? 2 : lv < 11 ? 3 : lv < 15 ? 4 : lv < 20 ? 5 : 6];
const BADGES = [
  ['🌱', 'Primer paso', 'First step', () => S.xp > 0],
  ['🔥', 'Racha de 3 días', '3-day streak', () => S.best >= 3],
  ['⚡', 'Racha de 7 días', '7-day streak', () => S.best >= 7],
  ['🌟', 'Racha de 30 días', '30-day streak', () => S.best >= 30],
  ['🏆', 'Día perfecto', 'Perfect day', () => Object.values(S.days).some(d => sum(d.c) === 5)],
  ['📚', '50 palabras', '50 words', () => learnt().length >= 50],
  ['💯', 'Todas las palabras', 'Every word', () => learnt().length >= ALL.length],
  ['🔗', 'Todas las colocaciones', 'Every collocation', () => D.colloc.every((q, i) => S.words['c:' + i])],
  ['🧩', '6 unidades de gramática', '6 grammar units', () => gramPassed() >= 6],
  ['🎓', 'Toda la gramática', 'All the grammar', () => gramPassed() >= D.grammar.length],
  ['🎙️', '10 tareas de destrezas', '10 skill tasks', () => Object.keys(S.done).length >= 10],
  ['📝', 'Simulacro 40/50', 'Mock test 40/50', () => S.mockBest >= 40]
];

async function recStart() {
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(st); const ch = [];
    mr.ondataavailable = e => ch.push(e.data);
    mr.start();
    return { stop: () => new Promise(r => { mr.onstop = () => { st.getTracks().forEach(x => x.stop()); r(URL.createObjectURL(new Blob(ch, { type: mr.mimeType }))); }; mr.stop(); }) };
  } catch (e) { return null; }
}

/* ---------- spaced repetition ---------- */
const GAPS = [0, 1, 2, 4, 8, 16];
function srs(word, ok) {
  const dn = dayNum();
  const r = S.words[word] || (S.words[word] = { box: 0, due: dn });
  if (ok) { if (r.up !== dn) { r.box = Math.min(5, r.box + 1); r.up = dn; } }
  else { r.box = 1; r.up = dn; }
  r.due = dn + GAPS[r.box];
}
const learnt = () => ALL.filter(w => S.words[w.w]);
const dueWords = () => { const dn = dayNum(); return learnt().filter(w => S.words[w.w].due <= dn).sort((a, b) => S.words[a.w].due - S.words[b.w].due); };
const gramCount = ui => D.grammar[ui].qs.filter((q, qi) => S.gram[ui + '-' + qi]).length;
const gramUnitIdx = () => D.grammar.findIndex((u, ui) => gramCount(ui) < 6);
const gramPassed = () => D.grammar.filter((u, i) => gramCount(i) >= 6).length;
const accAdd = (st, ok) => { if (!st.cat) return; const a = S.acc[st.cat] || (S.acc[st.cat] = [0, 0]); a[1]++; if (ok) a[0]++; };

/* ---------- question builders ---------- */
function vq(w, kind) {
  // distractors: same part of speech but from other topics, so that only one option fits the context
  let pool = shuffle(ALL.filter(x => x.w !== w.w && x.pos === w.pos && x.u !== w.u));
  if (pool.length < 3) pool = pool.concat(shuffle(ALL.filter(x => x.w !== w.w && !pool.includes(x))));
  const o = pool.slice(0, 3);
  const base = { word: w.w, requeue: true, cat: 'core' };
  if (kind === 'build' && TTS) { const toks = w.ex.split(' '); return { ...base, t: 'build', prompt: 'Listen and put the words in order.', audio: w.ex, toks, shuf: shuffle(toks.map((x, i) => i)), ans: w.ex, after: w.def }; }
  if (kind === 'def') return { ...base, t: 'mcq', prompt: 'Which word matches this definition?', sub: w.def, opts: shuffle([w.w, ...o.map(x => x.w)]), ans: w.w, after: w.ex };
  if (kind === 'syn') return { ...base, t: 'mcq', prompt: 'Choose the closest meaning.', big: w.w, opts: shuffle([w.syn, ...o.map(x => x.syn)]), ans: w.syn, after: w.def };
  if (kind === 'gap') return { ...base, t: 'mcq', prompt: 'Complete the sentence.', sub: gap(w), opts: shuffle([w.w, ...o.map(x => x.w)]), ans: w.w, after: w.ex };
  if (kind === 'listen' && TTS) return { ...base, t: 'type', prompt: 'Listen and type what you hear.', audio: w.w, ans: w.w, after: w.def };
  return { ...base, t: 'type', prompt: 'Type the word.', sub: w.def, hint: w.w[0] + '…  (' + w.w.length + ' characters)', ans: w.w, after: w.ex };
}
function gq(ui, qi) {
  const q = D.grammar[ui].qs[qi];
  return { t: 'mcq', prompt: 'Choose the correct option.', sub: q[0], opts: shuffle([q[1], q[2], q[3]]), ans: q[1], expl: q[4], after: q[0].replace('___', q[1]), gid: ui + '-' + qi, requeue: true, cat: 'core' };
}
function gramInfo(u) {
  return { t: 'info', html: `<span class="tag">${esc(u.level)} · Grammar</span><h2>${esc(u.title)}</h2><p class="instr">Read the examples. What do you notice? Work out the rule before you open it.</p>${u.ex.map(e => `<blockquote>${esc(e)}</blockquote>`).join('')}<details><summary>The rule</summary><p>${esc(u.rule)}</p></details><details><summary>Nota en español</summary><p>${esc(u.es)}</p></details>` };
}
const britQ = i => { const q = D.british[i]; return { t: 'mcq', prompt: q[0], opts: shuffle(q.slice(1)), ans: q[1], requeue: true }; };
const cq = i => { const q = D.colloc[i]; return { t: 'mcq', prompt: 'Choose the word that completes the phrase.', sub: q[0], opts: shuffle(q.slice(1, 4)), ans: q[1], after: q[0].replace('___', q[1]), word: 'c:' + i, requeue: true, cat: 'core' }; };
const fq = i => { const q = D.wordform[i]; return { t: 'type', prompt: 'Write the word in brackets in the correct form.', sub: q[0], ans: q[1], after: q[0].replace('___', q[1]).replace(/\s*\([^)]*\)$/, ''), word: 'f:' + i, requeue: true, cat: 'core' }; };
// items due for review first, then new ones (p = key prefix in S.words)
function srsPick(p, list, n) {
  const dn = dayNum(), idx = list.map((q, i) => i), r = i => S.words[p + ':' + i];
  let a = idx.filter(i => r(i) && r(i).due <= dn).concat(idx.filter(i => !r(i)));
  if (a.length < n) a = a.concat(shuffle(idx.filter(i => !a.includes(i))));
  return a.slice(0, n);
}
const collocPick = n => srsPick('c', D.colloc, n);
const errKey = st => st.gid ? 'g:' + st.gid : st.word ? (/^[cf]:/.test(st.word) ? st.word : 'w:' + st.word) : null;
function errSteps() {
  return shuffle(Object.keys(S.err)).slice(0, 10).map(k => {
    const v = k.slice(2);
    if (k[0] === 'w') return BY[v] && vq(BY[v], anyKind());
    if (k[0] === 'c') return D.colloc[+v] && cq(+v);
    if (k[0] === 'f') return D.wordform[+v] && fq(+v);
    const p = v.split('-'); return D.grammar[p[0]] && D.grammar[p[0]].qs[p[1]] && gq(+p[0], +p[1]);
  }).filter(Boolean);
}
// grammar questions from units before `before`, least recently answered first
function oldGram(n, before) {
  const a = []; D.grammar.forEach((u, ui) => { if (ui < before) u.qs.forEach((q, qi) => a.push([ui, qi])); });
  return shuffle(a).sort((x, y) => (S.gt[x.join('-')] || 0) - (S.gt[y.join('-')] || 0)).slice(0, n).map(x => gq(x[0], x[1]));
}

function newWordSteps(ws) {
  return [...ws.map(w => ({ t: 'card', w })), ...shuffle(ws.flatMap(w => [vq(w, 'def'), vq(w, 'gap')])), ...shuffle(ws.map(w => vq(w, 'type')))];
}
const KINDS = ['def', 'syn', 'gap', 'type', 'listen', 'build'];
const anyKind = () => KINDS[Math.floor(Math.random() * KINDS.length)];
function reviewSteps() {
  const due = dueWords().slice(0, 8);
  const rest = shuffle(learnt().filter(w => !due.includes(w))).sort((a, b) => S.words[a.w].box - S.words[b.w].box);
  return shuffle(due.concat(rest.slice(0, 8 - due.length)).map(w => vq(w, anyKind())).concat(collocPick(3).map(cq), srsPick('f', D.wordform, 2).map(fq)));
}
function weakSteps() {
  const ws = shuffle(learnt()).sort((a, b) => S.words[a.w].box - S.words[b.w].box).slice(0, 6);
  return shuffle(ws.flatMap(w => [vq(w, 'syn'), vq(w, 'type')]));
}
function gramSteps(ui, all) {
  if (ui < 0) return oldGram(8, D.grammar.length);
  const idx = D.grammar[ui].qs.map((q, i) => i);
  const order = all ? idx : shuffle(idx).sort((a, b) => (S.gram[ui + '-' + a] ? 1 : 0) - (S.gram[ui + '-' + b] ? 1 : 0)).slice(0, 6);
  return [gramInfo(D.grammar[ui]), ...order.map(i => gq(ui, i)), ...(all ? [] : oldGram(2, ui))];
}
function mixedGram(n) {
  const a = []; D.grammar.forEach((u, ui) => u.qs.forEach((q, qi) => a.push([ui, qi])));
  return shuffle(a).slice(0, n).map(x => gq(x[0], x[1]));
}
function skillSteps(type, id) {
  const it = D[type].find(x => x.id === id);
  if (type === 'writing') return [{ t: 'write', task: it }];
  if (type === 'speaking') return [{ t: 'speak', task: it }];
  if (it.type === 'order') return [{ t: 'order', title: it.title, first: it.s[0], rest: it.s.slice(1), shuf: shuffle(it.s.slice(1)), cat: 'reading' }];
  const head = `<span class="tag">Aptis ${type === 'reading' ? 'Reading' : 'Listening'} · Part ${it.part}</span><h3>${esc(it.title)}</h3>${it.instr ? `<p class="instr">${esc(it.instr)}</p>` : ''}`;
  const extra = type === 'reading' ? { passage: head + paras(it.text), cat: type } : { passage: head, script: it.script, cat: type };
  const steps = it.qs.map(q => it.fixed
    ? { ...extra, t: 'mcq', prompt: q[0], opts: it.fixed, ans: it.fixed[q[1]] }
    : { ...extra, t: 'mcq', prompt: q[0], opts: shuffle(q.slice(1)), ans: q[1] });
  if (type === 'listening') steps.push({ t: 'info', script: it.script, html: `<h2>Transcript</h2><p class="instr">Listen again while you read.</p>` + it.script.map(l => `<p>${it.script.length > 1 ? `<b>${l[0] === 'M' ? 'Man' : 'Woman'}:</b> ` : ''}${esc(l[1])}</p>`).join('') });
  return steps;
}

/* ---------- daily plan ---------- */
function makePlan() {
  const dn = dayNum();
  const types = ['reading', 'listening', 'writing', 'speaking'], type = types[dn % 4], list = D[type];
  const item = (list.find(x => !S.done[x.id]) || list[Math.floor(dn / 4) % list.length]).id;
  return {
    newW: ALL.filter(w => !S.words[w.w]).slice(0, 4).map(w => w.w),
    gu: gramUnitIdx(),
    skill: [type, item],
    brit: [0, 1, 2, 3].map(i => (dn * 4 + i) % D.british.length)
  };
}
function rec() { const k = dateStr(); if (!S.days[k]) { S.days[k] = { c: [0, 0, 0, 0, 0], xp: 0, plan: makePlan() }; save(); } else if (!S.days[k].plan) { S.days[k].plan = makePlan(); save(); } return S.days[k]; }
// after learning words outside the daily challenge, point today's "New words" at words not seen yet
function refreshNew() { const r = rec(); if (!r.c[0]) { r.plan.newW = ALL.filter(w => !S.words[w.w]).slice(0, 4).map(w => w.w); save(); } }
function addXp(n) { S.xp += n; rec().xp += n; }
const ICON = { reading: '📰', listening: '🎧', writing: '✍️', speaking: '🎙️' };
function chInfo() {
  const p = rec().plan, type = p.skill[0], it = D[type].find(x => x.id === p.skill[1]);
  return [
    { ic: '📖', t: p.newW.length ? t('c0') : t('c0b'), s: p.newW.length ? p.newW.join(' · ') : t('weakSub') },
    { ic: '🔁', t: t('c1'), s: dueWords().length + ' ' + t('dueSub') },
    { ic: '🧩', t: t('c2'), s: p.gu >= 0 ? D.grammar[p.gu].title : t('mixed') },
    { ic: ICON[type], t: t(type), s: it.title },
    { ic: '🇬🇧', t: t('c4'), s: t('britSub') }
  ];
}
function startCh(i) {
  const p = rec().plan; let steps;
  if (i === 0) steps = p.newW.length ? newWordSteps(p.newW.map(w => BY[w])) : weakSteps();
  if (i === 1) steps = reviewSteps();
  if (i === 2) steps = gramSteps(p.gu);
  if (i === 3) steps = skillSteps(p.skill[0], p.skill[1]);
  if (i === 4) steps = p.brit.map(britQ);
  if (!steps.length) return toast(t('needWords'));
  run(chInfo()[i].t, steps, () => completeCh(i));
}
function completeCh(i) {
  const r = rec(), dn = dayNum(); let msg = '';
  if (i === 3) S.done[r.plan.skill[1]] = 1;
  if (!r.c[i]) {
    r.c[i] = 1; const n = sum(r.c);
    if (n >= 3 && S.lastGoal !== dn) {
      S.streak = S.lastGoal === dn - 1 ? S.streak + 1 : 1; S.lastGoal = dn; S.best = Math.max(S.best, S.streak);
      msg = '🔥 ' + S.streak + ' ' + t('dayStreak');
    }
    if (n === 5) { addXp(50); msg = '🏆 ' + t('perfect'); }
  }
  return msg;
}

/* ---------- session engine ---------- */
let ses = null, ui = {}, tick = null, view = 'home', viewArg = null;
function run(title, steps, onDone, o = {}) {
  ses = { title, steps, i: 0, correct: 0, total: 0, xp: 0, onDone, exam: !!o.exam, fix: !!o.fix, kind: o.kind, plays: new Map(), miss: [], combo: 0, res: {}, place: !!o.place };
  if (o.mins) {
    ses.end = Date.now() + o.mins * 6e4;
    tick = setInterval(() => { const s = Math.max(0, Math.round((ses.end - Date.now()) / 1000)); const el = $('#timer'); if (el) el.textContent = fmt(s); if (s <= 0) finish(); }, 500);
  }
  ui = {}; draw(); window.scrollTo(0, 0);
}
// level test: units go from easier to harder, so it ends early once two units in a row are failed
function placeStop() {
  const n = ses.i + 1; if (n % 2) return;
  const passed = u => [0, 1].every(j => ses.res[ses.steps[u * 2 + j].gid]);
  const u = n / 2 - 1;
  if (u >= 1 && !passed(u) && !passed(u - 1)) ses.steps.length = n;
}
function stopStep() { hush(); if (ui.timer) clearInterval(ui.timer); if (ui.rec) ui.rec.stop(); }
function grade(ok) {
  const st = ses.steps[ses.i];
  ui.answered = true; ui.ok = ok; beep(ok);
  if (ok) { ses.combo++; if (ses.combo % 5 === 0) ses.xp += 5; } else ses.combo = 0;
  if (!st.retry) {
    ses.total++; accAdd(st, ok);
    if (ok) { ses.correct++; ses.xp += 10; }
    if (st.word) srs(st.word, ok);
    if (st.gid) { S.gt[st.gid] = dayNum(); if (ok) S.gram[st.gid] = 1; else delete S.gram[st.gid]; }
    const k = errKey(st);
    if (k) { if (!ok) S.err[k] = 1; else if (ses.fix) delete S.err[k]; }
    if (!ok && st.requeue) ses.steps.push({ ...st, retry: true, opts: st.opts ? shuffle(st.opts) : undefined });
  }
  save(); draw();
}
function selfDone() { ui.answered = true; ui.ok = true; ses.total++; ses.correct++; ses.xp += 30; draw(); }
function next() {
  const st = ses.steps[ses.i];
  if (st.t === 'card' && !S.words[st.w.w]) { S.words[st.w.w] = { box: 0, due: dayNum() }; save(); }
  stopStep(); ses.i++; ui = {};
  if (ses.i >= ses.steps.length) finish(); else { draw(); window.scrollTo(0, 0); }
}
function finish() {
  if (!ses || ses.fin) return;
  if (tick) { clearInterval(tick); tick = null; }
  stopStep();
  ses.fin = true;
  ses.xp = ses.exam ? ses.correct * 5 : ses.xp + 20;
  const l0 = level(S.xp);
  addXp(ses.xp);
  if (level(S.xp) > l0) ses.lvl = level(S.xp);
  ses.msg =ses.onDone ? ses.onDone(ses) || '' : '';
  save(); draw(); window.scrollTo(0, 0);
}

function stepHtml(st) {
  let h = '';
  if (st.passage) h += `<div class="passage">${st.passage}</div>`;
  if (st.script) h += `<div class="audio"><button class="btn blue" data-act="playScript">🔊 Play recording</button>${!TTS ? `<small>${t('noVoice')}</small>` : st.t === 'info' ? '' : `<small class="${(ses.plays.get(st.script) || 0) > 2 ? 'warn' : ''}">Listened ${ses.plays.get(st.script) || 0}× · in the exam you can listen twice.</small>`}</div>`;
  const dis = ui.answered ? 'disabled' : '';
  if (st.t === 'card') {
    const w = st.w;
    h += `<div class="wcard"><span class="tag">${esc(w.pos)}</span><h1>${esc(w.w)} <button class="snd" data-act="say" data-arg="${esc(w.w)}">🔊</button></h1><p class="def">${esc(w.def)}</p><blockquote>${hl(w)} <button class="snd" data-act="say" data-arg="${esc(w.ex)}">🔊</button></blockquote><p class="syn">≈ ${esc(w.syn)}</p>${ui.es ? `<p class="es">🇪🇸 ${esc(w.es)}</p>` : `<button class="link" data-act="showEs">${t('showEs')}</button>`}<p><button class="link" data-act="know">${t('know')}</button></p></div>`;
  } else if (st.t === 'build') {
    const ord = ui.order || [];
    h += `<p class="prompt">${esc(st.prompt)}</p><button class="btn blue" data-act="say" data-arg="${esc(st.audio)}">🔊 Listen</button><div class="line">${ord.map((x, n) => `<button class="chip on" data-act="unplace" data-arg="${n}" ${dis}>${esc(st.toks[st.shuf[x]])}</button>`).join('')}</div><div class="pool">${st.shuf.map((ti, x) => ord.includes(x) ? '' : `<button class="chip" data-act="place" data-arg="${x}" ${dis}>${esc(st.toks[ti])}</button>`).join('')}</div>`;
  } else if (st.t === 'info') {
    h += `<div class="info">${st.html}</div>`;
  } else if (st.t === 'mcq') {
    h += `<p class="prompt">${esc(st.prompt)}</p>` + (st.big ? `<h1 class="big">${esc(st.big)} <button class="snd" data-act="say" data-arg="${esc(st.big)}">🔊</button></h1>` : '') + (st.sub ? `<p class="sub">${esc(st.sub)}</p>` : '') + '<div class="opts">' +
      st.opts.map((o, i) => `<button class="opt ${ui.answered ? (o === st.ans ? 'good' : i === ui.pick ? 'bad' : '') : ''}" data-act="pick" data-arg="${i}" ${dis}>${esc(o)}</button>`).join('') + '</div>';
  } else if (st.t === 'type') {
    h += `<p class="prompt">${esc(st.prompt)}</p>` + (st.audio ? `<button class="btn blue" data-act="say" data-arg="${esc(st.audio)}">🔊 Listen</button>` : '') + (st.sub ? `<p class="sub">${esc(st.sub)}</p>` : '') + (st.hint ? `<p class="hint">${esc(st.hint)}</p>` : '') +
      `<input id="ti" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(ui.val || '')}" ${dis}>`;
  } else if (st.t === 'order') {
    const ord = ui.order || [];
    h += `<span class="tag">Aptis Reading · Part 2</span><h3>${esc(st.title)}</h3><p class="instr">Put the sentences in the correct order. The first one is done for you.</p><div class="sent fixed">1. ${esc(st.first)}</div>` +
      ord.map((x, n) => `<button class="sent placed" data-act="unplace" data-arg="${n}" ${dis}>${n + 2}. ${esc(st.shuf[x])}</button>`).join('') +
      (ord.length < st.shuf.length ? '<hr>' : '') + st.shuf.map((s, x) => ord.includes(x) ? '' : `<button class="sent" data-act="place" data-arg="${x}">${esc(s)}</button>`).join('');
  } else if (st.t === 'write') {
    const k = st.task, n = wordCount(ui.val || '');
    h += `<span class="tag">Aptis Writing · Part ${k.part}</span><h2>${esc(k.title)}</h2><div class="task">${paras(k.prompt)}</div><textarea id="wt" rows="9" spellcheck="false" ${ui.answered ? 'readonly' : ''}>${esc(ui.val || '')}</textarea><div id="wc" class="wc">${wcText(n, k)}</div>`;
    if (ui.answered) h += `<button class="link" data-act="copy">📋 Copy my text</button><h3>Model answer (B2)</h3><div class="model">${paras(k.model)}</div><h3>Tips</h3><ul>${k.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` + checklist(['I answered every part of the task', 'I stayed within the word limit', 'My register (formal / informal) fits the reader', 'I used linking words and checked my spelling']);
  } else if (st.t === 'speak') {
    const k = st.task, q = ui.q || 0;
    h += `<span class="tag">Aptis Speaking · Part ${k.part}</span><h2>${esc(k.title)}</h2>` + (k.pic ? `<div class="pic">🖼️ ${esc(k.pic)}</div>` : '') + (k.prep && !ui.answered ? '<p class="instr">In the exam you get one minute to prepare. Make a few notes on paper first.</p>' : '');
    if (!ui.answered) {
      h += `<p class="qn">Question ${q + 1} of ${k.qs.length}</p><p class="sub">${esc(k.qs[q][0])} <button class="snd" data-act="say" data-arg="${esc(k.qs[q][0])}">🔊</button></p>` +
        (ui.phase === 'talk' ? `<div class="count" id="count">${fmt(ui.left)}</div>${ui.rec ? '<p class="instr">● Recording…</p>' : '<p class="instr">No microphone available. Speak aloud anyway!</p>'}<button class="btn red" data-act="spStop">■ Stop</button>`
          : `<button class="btn red" data-act="spStart">● Start speaking (${k.qs[q][1]}s)</button>`);
    } else {
      h += (ui.urls || []).map((u, n) => u ? `<p class="qn">Your answer ${n + 1}</p><audio controls src="${u}"></audio>` : '').join('') +
        `<h3>Tips</h3><ul>${k.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` + checklist(['I spoke for the whole time', 'I gave reasons and examples', 'I used linking words (because, however, for example…)', 'I used a range of tenses and vocabulary']);
    }
  }
  return h;
}
const checklist = a => '<h3>Check yourself</h3>' + a.map(x => `<label class="chk"><input type="checkbox"> ${esc(x)}</label>`).join('');
const wcText = (n, k) => `<b class="${n >= k.min && n <= k.max ? 'okc' : ''}">${n}</b> words · target ${k.min}–${k.max}`;

function footHtml(st) {
  const P = (act, label) => `<button id="primary" class="btn red" data-act="${act}">${label}</button>`;
  if (ui.answered && ['mcq', 'type', 'order', 'build'].includes(st.t)) {
    const corr = st.t === 'order' ? st.rest.map((s, i) => (i + 2) + '. ' + s).join(' ') : st.ans;
    return `<div class="fb ${ui.ok ? 'good' : 'bad'}"><b>${ui.ok ? '✓ Correct!' + (ses.combo && ses.combo % 5 === 0 ? ` ${ses.combo} in a row · +5 XP` : '') : '✗ Not quite'}</b>${ui.ok ? '' : `<p>Answer: <b>${esc(corr)}</b></p>`}${st.expl ? `<p>${esc(st.expl)}</p>` : ''}${st.after ? `<p class="after">${esc(st.after)} <button class="snd" data-act="say" data-arg="${esc(st.after)}">🔊</button></p>` : ''}${P('next', 'Continue')}</div>`;
  }
  if (ui.answered || st.t === 'card' || st.t === 'info') return P('next', 'Continue');
  if (st.t === 'type') return P('check', 'Check');
  if (st.t === 'order' || st.t === 'build') return (ui.order || []).length === st.shuf.length ? P('check', 'Check') : '';
  if (st.t === 'write') return P('selfDone', 'Finish and see the model answer');
  return '';
}

function sessionHtml() {
  if (ses.fin) {
    const pct = ses.total ? Math.round(ses.correct / ses.total * 100) : 100;
    let h = `<div class="end"><div class="cup">${ses.exam ? '📝' : pct >= 80 ? '☕' : '💪'}</div><h1>${ses.exam ? 'Test finished' : pct >= 80 ? 'Well done!' : 'Keep going!'}</h1><p class="score">${ses.correct} / ${ses.exam ? ses.steps.length : ses.total} correct</p><p class="xp">+${ses.xp} XP</p>${ses.lvl ? `<p class="msg">⬆️ Level ${ses.lvl} · ${rank(ses.lvl)}</p>` : ''}${ses.msg ? `<p class="msg">${esc(ses.msg)}</p>` : ''}`;
    if (ses.exam) {
      const p = ses.correct / ses.steps.length;
      h += `<p class="instr">${p >= 0.8 ? 'A strong result for a B2 target. Keep it up!' : p >= 0.6 ? 'Getting there. Review your mistakes below.' : 'More practice needed. The daily challenges will get you there.'}<br><small>Orientative only. This is not an official Aptis score.</small></p>` +
        (ses.miss.length ? '<h3>Review your mistakes</h3>' + ses.miss.map(m => `<div class="miss"><p>${esc(m.q)}</p><p>✗ ${esc(m.you)} · ✓ <b>${esc(m.ans)}</b></p></div>`).join('') : '');
    }
    return h + `<button id="primary" class="btn red" data-act="close">Continue</button></div>`;
  }
  const st = ses.steps[ses.i];
  return `<div class="sbar"><button class="x" data-act="quit" aria-label="Close">✕</button><div class="prog"><i style="width:${Math.round(ses.i / ses.steps.length * 100)}%"></i></div>${ses.combo >= 3 ? `<span class="combo">🔥 ${ses.combo}</span>` : ''}${ses.exam ? '<span id="timer" class="timer"></span>' : ''}</div><div class="step">${stepHtml(st)}</div><div class="foot">${footHtml(st)}</div>`;
}

/* ---------- views ---------- */
function vHome() {
  const r = rec(), n = sum(r.c), dn = dayNum(), streak = S.lastGoal >= dn - 1 ? S.streak : 0, ch = chInfo();
  const names = S.lang === 'en' ? 'SMTWTFS' : 'DLMXJVS';
  const lv = level(S.xp), lb = 60 * (lv - 1) ** 2, ln = 60 * lv ** 2 - lb, nx = r.c.findIndex(x => !x);
  let week = '';
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const x = S.days[dateStr(d)], c = x ? sum(x.c) : 0; week += `<div class="wd ${c >= 5 ? 'full' : c >= 3 ? 'ok' : c ? 'part' : ''} ${i ? '' : 'now'}"><i>${c >= 3 ? '✓' : ''}</i><span>${names[d.getDay()]}</span></div>`; }
  return `<header class="top"><div><h1>Cuppa <span>☕</span></h1><p>English daily · Aptis B2</p></div><div class="stats"><span title="${t('streak')}">🔥 ${streak}</span><span>⭐ ${S.xp}</span></div></header>
  <section class="card"><div class="lvl"><b>Level ${lv} · ${rank(lv)}</b><small>${S.xp - lb} / ${ln} XP</small></div>${bar(S.xp - lb, ln)}<div class="week">${week}</div></section>
  <section class="card"><h2>${t('challenges')} <span class="n">${n}/5</span></h2><div class="prog big"><i style="width:${n * 20}%"></i></div><p class="note">${t('goalNote')}</p>
  ${nx >= 0 ? `<button class="btn red cta" data-act="startCh" data-arg="${nx}">▶ ${t('cont')}: ${esc(ch[nx].t)}</button>` : `<p class="alldone">🏆 ${t('allDone')}</p>`}
  ${ch.map((c, i) => `<button class="ch ${r.c[i] ? 'done' : ''}" data-act="startCh" data-arg="${i}"><span class="ic">${c.ic}</span><span class="tx"><b>${esc(c.t)}</b><small>${esc(c.s)}</small></span><span class="go">${r.c[i] ? '✓' : t('start')}</span></button>`).join('')}</section>`;
}
function bar(a, b) { return `<div class="prog"><i style="width:${Math.round(a / b * 100)}%"></i></div>`; }
function vPath() {
  return `<header class="top"><div><h1>${t('path')}</h1><p>${t('pathIntro').replace('{n}', D.vocab.length)}</p></div></header>` +
    D.vocab.map((u, i) => {
      const w = u.words.filter(x => S.words[x[0]]).length, g = gramCount(i);
      return `<button class="card unit" data-act="unit" data-arg="${i}"><span class="ic">${u.emoji}</span><span class="tx"><b>${i + 1}. ${esc(u.title)}</b><small>${esc(D.grammar[i].title)} · ${D.grammar[i].level}</small><span class="bars"><em>${t('words')} ${w}/${u.words.length}</em>${bar(w, u.words.length)}<em>${t('grammar')} ${g}/8</em>${bar(g, 8)}</span></span></button>`;
    }).join('');
}
function vUnit(i) {
  const u = D.vocab[i], g = D.grammar[i];
  return `<button class="link" data-act="nav" data-arg="path">${t('back')}</button><header class="top"><div><h1>${u.emoji} ${esc(u.title)}</h1><p>${esc(g.title)} · ${g.level}</p></div></header>
  <section class="card"><button class="btn red" data-act="learnUnit" data-arg="${i}">📖 ${t('learnUnit')}</button><button class="btn blue" data-act="gramUnit" data-arg="${i}">🧩 ${t('gramUnit')}</button></section>
  <section class="card"><h2>${t('words')}</h2>${ALL.filter(w => w.u === i).map(w => `<div class="wrow ${S.words[w.w] ? 'k' : ''}"><button class="snd" data-act="say" data-arg="${esc(w.w)}">🔊</button><div><b>${esc(w.w)}</b> <small>${esc(w.pos)}</small><p>${esc(w.def)}</p></div><span class="bx">${S.words[w.w] ? '●'.repeat(Math.max(1, S.words[w.w].box)) : ''}</span></div>`).join('')}</section>`;
}
function vPractice() {
  const sec = type => `<section class="card"><h2>${ICON[type]} ${t(type)}</h2>${D[type].map(x => `<button class="row" data-act="skill" data-arg="${type}:${x.id}"><span>Part ${x.part} · ${esc(x.title)}</span><span class="go">${S.done[x.id] ? '✓' : '›'}</span></button>`).join('')}</section>`;
  return `<header class="top"><div><h1>${t('practice')}</h1></div></header>
  <section class="card"><h2>📝 ${t('mockT')}</h2><p class="note">${t('mockS')}</p>${S.mock ? `<p class="note">${t('last')}: <b>${S.mock.score}/${S.mock.of}</b> (${S.mock.d})</p>` : ''}<button class="btn red" data-act="mock">${t('start')}</button></section>
  <section class="card"><h2>⚡ ${t('quick')}</h2><button class="row" data-act="errors"><span>❌ ${t('errT')} (${Object.keys(S.err).length})</span><span class="go">›</span></button><button class="row" data-act="colloc"><span>🔗 ${t('colT')}</span><span class="go">›</span></button><button class="row" data-act="wordform"><span>🔤 ${t('wfT')}</span><span class="go">›</span></button><button class="row" data-act="mixGram"><span>🧩 ${t('mixGram')}</span><span class="go">›</span></button><button class="row" data-act="brit8"><span>🇬🇧 ${t('brit8')}</span><span class="go">›</span></button></section>` +
    ['reading', 'listening', 'writing', 'speaking'].map(sec).join('');
}
function vProgress() {
  const dn = dayNum(), lw = learnt(), boxes = [0, 0, 0, 0, 0];
  lw.forEach(w => boxes[Math.max(1, S.words[w.w].box) - 1]++);
  const mx = Math.max(1, ...boxes);
  const gd = D.grammar.filter((u, i) => gramCount(i) >= 6).length;
  const sk = ['reading', 'listening', 'writing', 'speaking'].map(k => D[k].filter(x => S.done[x.id]).length);
  const stat = (v, l) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`;
  return `<header class="top"><div><h1>${t('progress')}</h1></div></header>
  <section class="card grid">${stat('🔥 ' + (S.lastGoal >= dn - 1 ? S.streak : 0), t('streak'))}${stat(S.best, t('best'))}${stat('⭐ ' + S.xp, 'XP')}${stat(lw.length + '/' + ALL.length, t('wLearnt'))}${stat(boxes[3] + boxes[4], t('wStrong'))}${stat(Object.keys(S.words).filter(k => k.startsWith('c:')).length + '/' + D.colloc.length, t('colDone'))}${stat(gd + '/' + D.grammar.length, t('gDone'))}${stat(sum(sk), t('skDone'))}${stat(S.mock ? S.mock.score + '/' + S.mock.of : '–', t('mockT'))}</section>
  ${readiness()}
  <section class="card"><h2>🏅 ${t('badges')}</h2><div class="badges">${BADGES.map(b => `<div class="badge ${b[3]() ? 'on' : ''}"><span>${b[0]}</span><small>${S.lang === 'en' ? b[2] : b[1]}</small></div>`).join('')}</div></section>
  <section class="card"><h2>${t('words')}</h2><p class="note">${t('boxes')}</p><div class="boxes">${boxes.map(b => `<div><i style="height:${Math.round(b / mx * 60) + 4}px"></i><small>${b}</small></div>`).join('')}</div></section>
  <section class="card"><h2>${t('settings')}</h2><label class="chk"><input type="checkbox" data-change="lang" ${S.lang === 'en' ? 'checked' : ''}> ${t('immersion')}</label>
  <label class="chk">${t('speed')} <select data-change="rate">${[[0.8, 'slow'], [0.95, 'normal'], [1.1, 'fast']].map(x => `<option value="${x[0]}" ${S.rate === x[0] ? 'selected' : ''}>${t(x[1])}</option>`).join('')}</select></label>
  <label class="chk"><input type="checkbox" data-change="snd" ${S.snd ? 'checked' : ''}> ${t('sound')}</label>
  <p><button class="link" data-act="export">⬇ ${t('export')}</button> &nbsp; <label class="link">⬆ ${t('import')}<input type="file" accept=".json,application/json" data-change="import" hidden></label></p>
  <button class="link danger" data-act="reset">${t('reset')}</button></section>`;
}

function readiness() {
  const row = (name, p, lab) => `<div class="rd"><em>${name}</em>${bar(p, 100)}<small>${lab}</small></div>`;
  const acc = (k, name) => { const a = S.acc[k] || [0, 0], p = a[1] ? Math.round(a[0] / a[1] * 100) : 0; return row(name, p, a[1] < 20 ? t('noData') : p + '% · ' + (p >= 80 ? 'B2 ✓' : p >= 60 ? 'B1+' : t('weak'))); };
  const cnt = (k, name) => { const n = D[k].filter(x => S.done[x.id]).length; return row(name, n / D[k].length * 100, n + '/' + D[k].length + ' ' + t('tasks')); };
  return `<section class="card"><h2>🎯 ${t('ready')}</h2><p class="note">${t('readyNote')}</p>${acc('core', 'Grammar & Vocabulary')}${acc('reading', 'Reading')}${acc('listening', 'Listening')}${cnt('writing', 'Writing')}${cnt('speaking', 'Speaking')}</section>`;
}
function vWelcome() {
  return `<div class="end"><div class="cup">☕</div><h1>Cuppa</h1><p class="score">${t('wTitle')}</p><ul class="wl"><li>${t('w1')}</li><li>${t('w2')}</li><li>${t('w3')}</li></ul><button class="btn red" data-act="placement">${t('wTest')}</button><button class="btn blue" data-act="skipOb">${t('wSkip')}</button></div>`;
}

function draw() {
  const wel = !ses && !S.ob && S.xp === 0;
  document.body.classList.toggle('insession', !!ses || wel);
  const app = $('#app');
  if (wel) { app.innerHTML = vWelcome(); return; }
  if (ses) {
    app.innerHTML = sessionHtml();
    if (ses.fin) return;
    const st = ses.steps[ses.i], ti = $('#ti');
    if (ti && !ui.answered) ti.focus();
    if (!ui.said) { ui.said = true; if (st.t === 'card') say(st.w.w); else if (st.audio) say(st.audio); }
    return;
  }
  app.innerHTML = view === 'path' ? vPath() : view === 'unit' ? vUnit(viewArg) : view === 'practice' ? vPractice() : view === 'progress' ? vProgress() : vHome();
  $('#tabs').innerHTML = [['home', '☕', 'today'], ['path', '🗺️', 'path'], ['practice', '🎯', 'practice'], ['progress', '📈', 'progress']]
    .map(x => `<button class="${view === x[0] || (view === 'unit' && x[0] === 'path') ? 'on' : ''}" data-act="nav" data-arg="${x[0]}"><span>${x[1]}</span>${t(x[2])}</button>`).join('');
}
function toast(m) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = m; document.body.appendChild(el); setTimeout(() => el.remove(), 2500); }

/* ---------- actions ---------- */
const act = {
  nav(a) { view = a; draw(); window.scrollTo(0, 0); },
  unit(a) { view = 'unit'; viewArg = +a; draw(); window.scrollTo(0, 0); },
  startCh(a) { startCh(+a); },
  say(a) { say(a); },
  playScript() { const st = ses.steps[ses.i]; if (st.t !== 'info') { ses.plays.set(st.script, (ses.plays.get(st.script) || 0) + 1); draw(); } sayScript(st.script); },
  errors() { const s = errSteps(); if (!s.length) return toast(t('noErr')); run(t('errT'), s, null, { fix: true }); },
  colloc() { run(t('colT'), collocPick(10).map(cq)); },
  export() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    a.download = 'cuppa-progreso-' + dateStr() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  showEs() { ui.es = true; draw(); },
  pick(a) {
    const st = ses.steps[ses.i]; if (ui.answered) return;
    ui.pick = +a; const ok = st.opts[ui.pick] === st.ans;
    if (ses.exam) { accAdd(st, ok); if (st.gid) ses.res[st.gid] = ok; if (ok) ses.correct++; else { const k = errKey(st); if (k) { S.err[k] = 1; save(); } ses.miss.push({ q: st.sub || st.big || st.prompt, you: st.opts[ui.pick], ans: st.ans }); } if (ses.place) placeStop(); return next(); }
    grade(ok);
  },
  check() {
    const st = ses.steps[ses.i]; if (ui.answered) return;
    if (st.t === 'type') { if (!norm(ui.val || '')) return; grade(norm(ui.val) === norm(st.ans)); }
    else if (st.t === 'build') grade(ui.order.map(x => st.toks[st.shuf[x]]).join(' ') === st.ans);
    else grade(ui.order.map(x => st.shuf[x]).join('|') === st.rest.join('|'));
  },
  know() {
    const w = ses.steps[ses.i].w.w, dn = dayNum();
    S.words[w] = { box: 4, due: dn + 8, up: dn };
    ses.steps = ses.steps.filter((x, i) => i <= ses.i || x.word !== w);
    save(); next();
  },
  skipOb() { S.ob = 1; save(); draw(); },
  placement() {
    S.ob = 1; save(); view = 'home';
    const steps = D.grammar.flatMap((u, ui) => shuffle(u.qs.map((q, i) => i)).slice(0, 2).map(i => gq(ui, i)));
    run(t('wTest'), steps, s => {
      let n = 0;
      D.grammar.forEach((u, ui) => {
        const ks = Object.keys(s.res).filter(k => k.startsWith(ui + '-'));
        if (ks.length === 2 && ks.every(k => s.res[k])) { n++; for (let qi = 0; qi < 6; qi++) S.gram[ui + '-' + qi] = 1; }
      });
      delete S.days[dateStr()]; // rebuild today's plan from the new starting point
      const g = gramUnitIdx();
      return (g < 0 ? t('plAll') : t('plRes').replace('{n}', n).replace('{u}', g + 1)).replace('{t}', D.grammar.length);
    }, { exam: true, place: true });
  },
  wordform() { run(t('wfT'), srsPick('f', D.wordform, 10).map(fq)); },
  place(a) { ui.order = (ui.order || []).concat(+a); draw(); },
  unplace(a) { ui.order.splice(+a, 1); draw(); },
  selfDone() { selfDone(); },
  copy() { if (navigator.clipboard) navigator.clipboard.writeText(ui.val || '').then(() => toast('Copied'), () => { }); },
  async spStart() {
    if (ui.phase === 'talk') return;
    const st = ses.steps[ses.i], mine = ui; hush();
    mine.phase = 'talk'; mine.left = st.task.qs[mine.q || 0][1];
    mine.rec = await recStart();
    if (ui !== mine) { if (mine.rec) mine.rec.stop(); return; }
    draw();
    mine.timer = setInterval(() => { mine.left--; const el = $('#count'); if (el) el.textContent = fmt(Math.max(0, mine.left)); if (mine.left <= 0) act.spStop(); }, 1000);
  },
  async spStop() {
    if (ui.phase !== 'talk') return;
    const st = ses.steps[ses.i], mine = ui;
    mine.phase = 'ready'; clearInterval(mine.timer); mine.timer = null;
    const r = mine.rec; mine.rec = null;
    (mine.urls = mine.urls || []).push(r ? await r.stop() : null);
    if (ui !== mine) return;
    if ((mine.q || 0) + 1 < st.task.qs.length) { mine.q = (mine.q || 0) + 1; draw(); } else selfDone();
  },
  next() { next(); },
  quit() { if (tick) { clearInterval(tick); tick = null; } stopStep(); if (ses.kind === 'learn') refreshNew(); ses = null; ui = {}; draw(); },
  close() { if (ses.kind === 'learn') refreshNew(); ses = null; ui = {}; draw(); window.scrollTo(0, 0); },
  learnUnit(a) {
    const ws = ALL.filter(w => w.u === +a), fresh = ws.filter(w => !S.words[w.w]).slice(0, 6);
    run(D.vocab[+a].title, fresh.length ? newWordSteps(fresh) : shuffle(ws).map(w => vq(w, anyKind())), null, { kind: 'learn' });
  },
  gramUnit(a) { run(D.grammar[+a].title, gramSteps(+a, true)); },
  skill(a) { const [type, id] = a.split(':'); run(D[type].find(x => x.id === id).title, skillSteps(type, id), () => { S.done[id] = 1; }); },
  mixGram() { run(t('mixGram'), mixedGram(10)); },
  brit8() { run(t('c4'), shuffle(D.british.map((q, i) => i)).slice(0, 8).map(britQ)); },
  mock() {
    const vs = shuffle(ALL).slice(0, 20).map((w, i) => vq(w, ['def', 'syn', 'gap'][i % 3])).concat(shuffle(D.colloc.map((q, i) => i)).slice(0, 5).map(cq));
    run(t('mockT'), [...mixedGram(25), ...vs], s => { S.mock = { d: dateStr(), score: s.correct, of: s.steps.length }; S.mockBest = Math.max(S.mockBest || 0, s.correct); }, { exam: true, mins: 25 });
  },
  reset() { if (confirm(t('resetQ'))) { localStorage.removeItem(KEY); load(); view = 'home'; draw(); } }
};

document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled && act[b.dataset.act]) act[b.dataset.act](b.dataset.arg); });
document.addEventListener('input', e => {
  if (e.target.id === 'ti') ui.val = e.target.value;
  if (e.target.id === 'wt') { ui.val = e.target.value; $('#wc').innerHTML = wcText(wordCount(ui.val), ses.steps[ses.i].task); }
});
document.addEventListener('change', e => {
  const k = e.target.dataset.change;
  if (k === 'snd') { S.snd = e.target.checked; save(); beep(true); }
  if (k === 'lang') { S.lang = e.target.checked ? 'en' : 'es'; save(); draw(); }
  if (k === 'import' && e.target.files[0]) {
    if (e.target.files[0].size > 2e6) return toast(t('importBad'));
    const fr = new FileReader();
    fr.onload = () => {
      let o = null; try { o = JSON.parse(fr.result); } catch (err) { /* not JSON */ }
      if (!o || typeof o.xp !== 'number' || typeof o.words !== 'object' || typeof o.days !== 'object') return toast(t('importBad'));
      if (!confirm(t('importQ'))) return;
      localStorage.setItem(KEY, JSON.stringify(o)); load(); draw(); toast(t('importOk'));
    };
    fr.readAsText(e.target.files[0]);
  }
  if (k === 'rate') { S.rate = +e.target.value; save(); say('This is how fast I will speak.'); }
});
document.addEventListener('keydown', e => {
  if (ses && /^[1-6]$/.test(e.key) && !/INPUT|TEXTAREA/.test(e.target.tagName)) { const o = document.querySelectorAll('.opt:not(:disabled)')[e.key - 1]; if (o) o.click(); return; }
  if (e.key !== 'Enter' || !ses || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
  const p = $('#primary'); if (p) { e.preventDefault(); p.click(); }
});

// hook for the automated test in tools/smoke.js (never set in the real app)
if (window.__CUPPA_TEST__) window.__cuppa = { act, state: () => S, session: () => ses, ui: () => ui, setVal: v => { ui.val = v; } };

// offline support, only on the published (https) site so local development is never served stale files
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });

try {
  load();
  if (TTS) speechSynthesis.getVoices();
  draw();
} catch (e) {
  // last resort: never leave the user with a blank page
  $('#app').innerHTML = '<div class="end"><h1>Cuppa</h1><p>No se ha podido cargar tu progreso.</p><button class="btn red" id="fix">Reiniciar la app</button></div>';
  $('#fix').onclick = () => { localStorage.removeItem(KEY); location.reload(); };
}
})();
