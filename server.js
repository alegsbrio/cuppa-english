// Tiny static server, no dependencies:  node server.js  ->  http://localhost:5173
// Only listens on this computer (127.0.0.1) and only serves the app's own .html / .js / .css files.
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' };

const server = http.createServer((req, res) => {
  const send = (code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', ...headers }); res.end(body); };
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method not allowed');
    let p;
    try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { return send(400, 'Bad request'); }
    if (p.includes('\0')) return send(400, 'Bad request');
    if (p === '/') p = '/index.html';
    const file = path.join(root, path.normalize(p)), type = types[path.extname(file).toLowerCase()];
    // must stay inside the app folder, be a known file type, and not be this server's own source
    if (!file.startsWith(root + path.sep) || !type || file.toLowerCase() === __filename.toLowerCase()) return send(404, 'Not found');
    fs.readFile(file, (err, data) => err ? send(404, 'Not found') : send(200, data, type));
  } catch (e) { send(500, 'Server error'); }
});
server.on('clientError', (err, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
server.listen(5173, '127.0.0.1', () => console.log('Cuppa: http://localhost:5173'));
