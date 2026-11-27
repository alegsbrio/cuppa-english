# Cuppa — instrucciones para agentes

App web estática para preparar el B2 del examen Aptis (General) con desafíos diarios. El público son hispanohablantes adultos. Publicada con GitHub Pages desde la rama `main`: **cada push a `main` sale a producción en uno o dos minutos**, y hay personas usándola en el móvil.

## Cómo está hecha

- Sin dependencias ni compilación: `index.html`, `css/styles.css`, `js/app.js` y los datos en `js/data/*.js` (variables globales en `window.DATA`). No añadas frameworks, bundlers ni `node_modules`.
- `js/app.js` es una IIFE con: estado en `localStorage` (clave `cuppa_v1`, saneado por `sanitize()`), constructores de preguntas (`vq`, `gq`, `cq`, `fq`), el motor de sesiones (`run`, `grade`, `next`, `finish`, `stepHtml`) y las vistas (`vHome`, `vPath`, `vPractice`, `vProgress`).
- `sw.js` guarda la app para uso sin conexión. Si añades archivos que la app necesita, añádelos a su lista `FILES` y sube el número de `CACHE`.
- `server.js` es solo para desarrollo local.

## Reglas que no se rompen

1. **Antes de cada commit ejecuta `node tools/check.js` y debe terminar en `OK`.** Si añades un tipo de contenido nuevo, amplía ese validador para cubrirlo.
2. **No rompas el progreso guardado de los usuarios.** No cambies el significado de los campos existentes del estado ni las claves ya usadas (palabras por su texto, gramática `unidad-pregunta`, colocaciones `c:índice`, formación `f:índice`, ids de tareas `r1`, `l1`, `w1`, `s1`…). Por eso el contenido nuevo **se añade al final** de cada lista: nunca reordenes ni borres entradas existentes. Si añades campos al estado, dales valor por defecto en `sanitize()`.
3. **Seguridad:** todo texto que llegue al HTML pasa por `esc()`. No relajes la Content-Security-Policy de `index.html`, no cargues nada de servidores externos y no añadas analítica, anuncios ni peticiones de red.
4. **Sin servicios externos:** nada que necesite servidor, base de datos, claves de API, cuentas o pagos. No toques la configuración del repositorio ni otros repositorios.
5. **Contenido original.** No copies textos ni preguntas de exámenes reales, libros o webs. No uses marcas ni logotipos de Aptis o del British Council más allá de nombrar el examen.
6. Commits pequeños y descriptivos en español, directamente en `main`, con `git pull --rebase` antes de `git push`. Nunca `--force`.

## Criterios de calidad del contenido

- **Inglés británico** en ortografía y léxico (colour, flat, queue, at the weekend). Nivel B1 → B2 (MCER).
- **Una sola respuesta correcta, sin discusión.** En cada pregunta comprueba que ninguna opción incorrecta sea aceptable en inglés británico estándar (ojo con pares como *have/take a break*, *make/take a decision*, *good at/in*). Si dudas, cambia la frase o la opción.
- Las opciones incorrectas deben ser errores verosímiles para un hispanohablante (falsos amigos, calcos del español), no absurdos.
- Vocabulario: la frase de ejemplo contiene la palabra **exactamente como está escrita en la entrada** (sin conjugar ni pluralizar), la definición no la contiene, y el sinónimo es único en toda la app.
- Gramática: cada unidad enseña por descubrimiento (ejemplos primero, regla después) e incluye la nota breve en español.
- Las tareas de destrezas siguen el formato de las partes de Aptis General; los modelos de Writing respetan el límite de palabras.

## Método de enseñanza (no lo cambies)

Todo el ejercicio va en inglés; el español solo aparece como ayuda opcional. La interfaz tiene español e inglés (`L` en `app.js`): cada texto nuevo de interfaz necesita las dos versiones.

## Trabajo pendiente

Está en `BACKLOG.md`, por orden de prioridad. Al terminar una tarea, márcala ahí y anota en una línea lo que hiciste.
