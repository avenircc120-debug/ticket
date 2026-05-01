const express = require('express');
const app = express();
app.use(express.json());

const SECRET = process.env.TICKET_SECRET || '';
const WIFI_URL = process.env.WIFI_URL || '';

function buildPage(secret) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket Wi-Fi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#080808;color:#fff;font-family:'Courier New',monospace}
.page{display:flex;flex-direction:column;align-items:center;padding:2.5rem 1rem 3rem;gap:2rem;min-height:100vh}
#btn{background:#00c897;color:#080808;border:none;padding:1.1rem 3.5rem;font-size:1.15rem;font-weight:bold;font-family:inherit;border-radius:6px;cursor:pointer;letter-spacing:.12em;text-transform:uppercase;transition:opacity .15s,transform .1s}
#btn:hover{opacity:.88}#btn:active{transform:scale(.97)}#btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
#code{font-size:clamp(2.5rem,12vw,5.5rem);font-weight:bold;letter-spacing:.2em;color:#00c897;min-height:1.2em;text-align:center;word-break:break-all;transition:opacity .2s;user-select:text}
#msg{font-size:.8rem;color:#444;min-height:1em;letter-spacing:.05em;text-align:center}
.sep{width:100%;max-width:480px;border:none;border-top:1px solid #1e1e1e;margin:.5rem 0}
.hist-header{width:100%;max-width:480px;display:flex;justify-content:space-between;align-items:center}
.hist-title{font-size:.7rem;color:#333;letter-spacing:.15em;text-transform:uppercase}
#clear{background:none;border:none;color:#333;font-size:.7rem;font-family:inherit;cursor:pointer;letter-spacing:.1em;text-transform:uppercase}
#clear:hover{color:#666}
#history{width:100%;max-width:480px;display:flex;flex-direction:column;gap:.6rem}
.entry{background:#111;border-radius:4px;padding:.75rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}
.entry-code{font-size:1.1rem;font-weight:bold;letter-spacing:.1em;color:#eee}
.entry-meta{text-align:right;flex-shrink:0}
.entry-date{font-size:.65rem;color:#444}
.entry-exp{font-size:.65rem;color:#00c897}
.expired .entry-code{color:#333}
.expired .entry-exp{color:#555}
</style>
</head>
<body>
<div class="page">
  <button id="btn" onclick="gen()">GENERER UN TICKET</button>
  <div id="code"></div>
  <div id="msg"></div>
  <hr class="sep">
  <div class="hist-header">
    <span class="hist-title">Historique local</span>
    <button id="clear" onclick="clearHist()">Effacer</button>
  </div>
  <div id="history"></div>
</div>
<script>
var STORE='wf_tickets';
function pad(n){return String(n).padStart(2,'0');}
function fmt(ts){var d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return[];}}
function save(list){localStorage.setItem(STORE,JSON.stringify(list));}
function renderHist(){
  var list=load();
  var el=document.getElementById('history');
  if(!list.length){el.innerHTML='<div style="color:#222;font-size:.75rem;text-align:center">Aucun ticket</div>';return;}
  el.innerHTML=list.slice().reverse().map(function(t){
    var expired=Date.now()>t.exp;
    var expLabel=expired?'Expire':'Expire le '+fmt(t.exp);
    return '<div class="entry'+(expired?' expired':'')+'">'
      +'<span class="entry-code">'+t.code+'</span>'
      +'<div class="entry-meta">'
        +'<div class="entry-date">Genere '+fmt(t.ts)+'</div>'
        +'<div class="entry-exp">'+expLabel+'</div>'
      +'</div></div>';
  }).join('');
}
function clearHist(){if(window.confirm('Effacer tout?')){save([]);renderHist();}}
async function gen(){
  var btn=document.getElementById('btn');
  var codeEl=document.getElementById('code');
  var msgEl=document.getElementById('msg');
  btn.disabled=true;codeEl.style.opacity='.3';msgEl.textContent='Connexion...';
  try{
    var r=await fetch('/api/gen',{method:'POST'});
    var d=await r.json();
    if(d.code){
      codeEl.textContent=d.code;codeEl.style.opacity='1';msgEl.textContent='';
      var list=load();
      list.push({code:d.code,ts:Date.now(),exp:Date.now()+86400000});
      save(list);renderHist();
    }else{codeEl.textContent='';msgEl.textContent=d.error||'Aucun code trouve.';}
  }catch(e){msgEl.textContent='Erreur - systeme injoignable.';}
  finally{btn.disabled=false;}
}
renderHist();
</script>
</body>
</html>`;
}

function extractCode(html) {
  var patterns = [
    /class="[^"]*(?:ticket|voucher|code|password|token)[^"]*"[^>]*>\s*([A-Za-z0-9\-_]{4,24})\s*</i,
    /<(?:code|pre|b|strong|h[1-6])[^>]*>\s*([A-Za-z0-9\-_]{5,24})\s*<\//i,
    /(?:code|ticket|voucher|password|access)\s*[:\-=]?\s*([A-Za-z0-9\-_]{6,24})/i,
    /([A-Z0-9]{8,16})/,
  ];
  for (var i=0;i<patterns.length;i++) {
    var m = html.match(patterns[i]);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

app.get('/t/:secret', function(req, res) {
  if (!SECRET || req.params.secret !== SECRET) return res.status(404).end();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.send(buildPage(SECRET));
});

app.post('/api/gen', async function(req, res) {
  if (!WIFI_URL) return res.status(503).json({ error: 'WIFI_URL non configure.' });
  try {
    var r = await fetch(WIFI_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      signal: AbortSignal.timeout(8000),
    });
    var html = await r.text();
    var code = extractCode(html);
    res.json(code ? { code: code } : { error: 'Code introuvable dans la reponse.' });
  } catch(err) {
    res.status(502).json({ error: err.message || 'Erreur inconnue' });
  }
});

module.exports = app;
