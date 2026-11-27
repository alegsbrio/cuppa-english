# Trabajo pendiente

Por orden de prioridad. En cada sesión: coge la primera tarea sin marcar, hazla entera, valida, sube y márcala con `[x]` añadiendo una línea con lo hecho. Si una tarea es grande, divídela aquí mismo en subtareas y avanza una por sesión. Lee antes `CLAUDE.md`.

## 1. Preparar la app para crecer

- [x] Quitar los números fijos del código y los textos ("12 unidades", "de 12 puntos de gramática", `'/12'`…) y calcularlos a partir de `D.vocab.length` y `D.grammar.length`, para que añadir unidades no deje textos falsos.
- [x] Prueba de nivel: que siga durando unos 5 minutos aunque haya más unidades (por ejemplo, una pregunta por unidad o un máximo de 30).
- [x] Añadir `tools/smoke.js`: una prueba automática en Node que cargue `js/app.js` con un DOM simulado mínimo (sin instalar paquetes; si no es viable, con `jsdom` instalado fuera del repositorio) y recorra una sesión de cada tipo sin errores. Integrarla en `tools/check.js`.

## 2. Contenido: segundo bloque de nivel B2 (lo más importante)

Añadir 12 unidades nuevas (13–24) al final de `js/data/vocab.js` y `js/data/grammar.js`, una o dos por sesión, cada una con 12 palabras y un punto de gramática con 8 preguntas.

- [x] 13 · Crime & justice — modales de deducción (must / might / can't have)
- [x] 14 · Science & discoveries — pasiva avanzada (have something done, it is said that…)
- [x] 15 · Relationships & feelings — used to / would / be used to / get used to
- [x] 16 · Housing & cities — future perfect y future continuous
- [x] 17 · Sport & competition — past perfect simple y continuous
- [x] 18 · Arts & culture — question tags y preguntas indirectas
- [x] 19 · Business & the economy — condicionales mixtas e inversión (Had I known…)
- [x] 20 · Global issues — conectores avanzados (nonetheless, whereas, owing to, provided that)
- [x] 21 · Language & communication — verbos de reporte (admit, deny, suggest, accuse of…)
- [x] 22 · Travel & transport problems — phrasal verbs separables e inseparables
- [x] 23 · Personality & behaviour — so / such, too / enough, énfasis (What I like is…)
- [x] 24 · Future & change — artículos y determinantes (the / a / zero article, each / every, both / either / neither)

## 3. Más práctica de examen

- [x] Colocaciones: de 48 a 120. Formación de palabras: de 40 a 100.
- [x] Reading: 12 tareas nuevas (3 por cada parte de Aptis).
- [ ] Listening: 12 tareas nuevas (repartidas entre las 4 partes).
- [ ] Writing: 6 tareas nuevas con modelo B2. Speaking: 8 nuevas.
- [ ] Rincón británico: de 24 a 60 preguntas.
- [ ] Simulacros completos y cronometrados de Reading y de Listening con todas sus partes y nota estimada, además del Core que ya existe.

## 4. Aprender mejor

- [ ] En gramática y colocaciones, explicar por qué la opción elegida es incorrecta, no solo cuál era la correcta.
- [ ] Opciones de vocabulario elegidas a mano para las palabras donde las aleatorias resulten ambiguas.
- [ ] Plan hacia la fecha del examen: el alumno indica el día y la app reparte el trabajo y avisa si va con retraso.
- [ ] Estadísticas por tema y por punto de gramática en Progreso, con acceso directo a practicar lo más flojo.
- [ ] Pronunciación: escuchar, grabarse y comparar, palabra a palabra.

## 5. Pulido

- [ ] Revisar accesibilidad (foco visible, etiquetas, contraste en modo oscuro) y el diseño en pantallas de 320 px.
- [ ] Revisar todo el contenido existente buscando preguntas con más de una respuesta defendible y corregirlas.

## Hecho

(añade aquí una línea por tarea terminada: fecha, tarea y resumen)

- 2026-11-27 · Números fijos: los textos de la ruta, el progreso y la prueba de nivel se calculan con `D.vocab.length` y `D.grammar.length`.
- 2026-11-27 · Prueba de nivel: sigue con 2 preguntas por unidad, pero termina sola cuando se fallan dos unidades seguidas (las unidades van de fácil a difícil). Probado en navegador: todo mal = 4 preguntas; 4 unidades bien = 12 preguntas; todo bien = todas.
- 2026-11-27 · `tools/smoke.js`: ejecuta la app real en Node con un navegador simulado (sin paquetes) y juega todas las sesiones: prueba de nivel, 17 días de desafíos, todas las palabras, unidades y tareas, errores y simulacro (~12.000 comprobaciones). `tools/check.js` la lanza al final. Verificado con errores introducidos a propósito (racha, plantilla rota, sesión que no acaba, opción repetida): los detecta todos.
- 2026-11-27 · Unidades 13 (Crime & justice · modales de deducción) y 14 (Science & discoveries · have something done, it is said that…): 24 palabras y 16 preguntas de gramática. Se añaden con un script que inserta al final de `vocab.js` y `grammar.js`.
- 2026-11-27 · Unidades 15 (Relationships & feelings · used to / would / be used to / get used to) y 16 (Housing & cities · future continuous y future perfect): 24 palabras y 16 preguntas de gramática.
- 2026-11-27 · Unidades 17 (Sport & competition · past perfect simple y continuous) y 18 (Arts & culture · question tags y preguntas indirectas): 24 palabras y 16 preguntas de gramática.
- 2026-11-27 · Unidades 19 a 24 (Business & the economy, Global issues, Language & communication, Travel & transport problems, Personality & behaviour, Future & change) con sus puntos de gramática: condicionales mixtas e inversión, conectores, verbos de reporte, phrasal verbs separables, so/such/too/enough y énfasis, artículos y determinantes. Bloque B2 completo: la app tiene 24 unidades, 288 palabras y 192 preguntas de gramática.
- 2026-11-27 · Colocaciones: de 48 a 152 (make/do/take/have, preposiciones dependientes y falsos amigos típicos del español: assist/attend, pretend/claim, support/stand, lend/borrow, rise/raise). Formación de palabras: de 40 a 100. Se añaden al final de sus listas con un script.
- 2026-11-27 · Reading: 12 tareas nuevas (r7–r18), tres por parte: huecos, ordenar frases, opiniones de cuatro personas y titulares por párrafo (ahora con 5 párrafos y 7 titulares, más cerca del examen). Total: 18 tareas de Reading.
