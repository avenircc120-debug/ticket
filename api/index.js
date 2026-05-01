const express = require('express');
const app = express();

const SECRET = process.env.TICKET_SECRET || '';
const WIFI_URL = process.env.WIFI_URL || '';

app.use(express.json());

function buildPage(secret) {
  return `<!DOCTYPE html>
<html lang='fr'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>Ticket Wi-Fi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#080808;color:#fff;font-family:'Courier New',monospace;display:flex;align-items:center;justify-content:center;user-select:none}
.wrap{display:flex;flex-direction:column;align-items:center;gap:2.5rem;width:100%;padding:2rem}
#btn{background:#00c897;color:#080808;border:none;padding:1.1rem 3.5rem;font-size:1.15rem;font-weight:bold;font-family:inherit;border-radius:6px;cursor:pointer;letter-spacing:.12em;text-transform:uppercase;transition:opacity .15s,transform .1s}
#btn:hover{opacity:.88}#btn:active{transform:scale(.97)}#btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
#code{font-size:clamp(2.5rem,12vw,6rem);font-weight:bold;letter-spacing:.2em;color:#00c897;min-height:1.2em;text-align:center;word-break:break-all;transition:opacity .2s;user-select:text}
#msg{font-size:.8rem;color:#444;min-height:1em;letter-spacing:.05em}
</style>
</head>
<body>
<div class='wrap'>
  <button id='btn' onclick='gen()'>GÉNÉRER UN TICKET</button>
  <div id='code'></div>
  <div id='msg'></div>
</div>
<script>
async function gen(){
  const btn=document.getElementById('btn');
  const codeEl=document.getElementById('code');
  const msgEl=document.getElementById('msg');
  btn.disabled=true;codeEl.style.opacity='.3';msgEl.textContent='Connexion…';
  try{
    const r=await fetch('/api/gen',{method:'POST'});
    const d=await r.json();
    if(d.code){codeEl.textContent=d.code;codeEl.style.opacity='1';msgEl.textContent='';}
    else{codeEl.textContent='';msgEl.textContent=d.error||'Aucun code trouvé.';}
  }catch(e){msgEl.textContent='Erreur — système injoignable.';}
  finally{btn.disabled=false;}
}
</script>
</body>
</html>`;
}

function extractCode(html) {
  const patterns = [
    /class=[^]*(?:ticket|voucher|code|password|token)[^]*[^>]*>s*([A-Za-z0-9-_]{4,24})s*</i,
    /<(?:code|pre|b|strong|h[1-6])[^>]*>s*([A-Za-z0-9-_]{5,24})s*<//i,
    /(?:code|ticket|voucher|password|access)s*[:-=]?s*([A-Za-z0-9-_]{6,24})/i,
    /([A-Z0-9]{8,16})/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// Page ticket (URL secrète)
app.get('/t/:secret', (req, res) => {
  if (!SECRET || req.params.secret !== SECRET) return res.status(404).end();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.send(buildPage(SECRET));
});

// Proxy vers WIFI_URL (appelé depuis la page)
app.post('/api/gen', async (req, res) => {
  if (!WIFI_URL) return res.status(503).json({ error: 'WIFI_URL non configuré.' });
  try {
    const r = await fetch(WIFI_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await r.text();
    const code = extractCode(html);
    res.json(code ? { code } : { error: 'Code introuvable dans la réponse.' });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Erreur inconnue' });
  }
});

module.exports = app;
