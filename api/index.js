const express = require('express');
const app = express();

const SECRET = process.env.TICKET_SECRET || '';
const WIFI_URL = process.env.WIFI_URL || '';

function buildPage(wifiUrl) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket Wi-Fi</title>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#080808;color:#fff;font-family:'Courier New',monospace}
.page{display:flex;flex-direction:column;align-items:center;padding:2rem 1rem 3rem;gap:1.8rem;min-height:100vh}
#btn{background:#00c897;color:#080808;border:none;padding:1.1rem 3.5rem;font-size:1.15rem;font-weight:bold;font-family:inherit;border-radius:6px;cursor:pointer;letter-spacing:.12em;text-transform:uppercase;transition:opacity .1s,transform .1s}
#btn:hover{opacity:.88}#btn:active{transform:scale(.97)}
#code{font-size:clamp(1.8rem,9vw,4.5rem);font-weight:bold;letter-spacing:.15em;color:#00c897;min-height:1.2em;text-align:center;word-break:break-all;user-select:text;cursor:pointer}
#msg{font-size:.8rem;color:#555;min-height:1em;letter-spacing:.05em;text-align:center}
#qr{display:none;background:#fff;padding:12px;border-radius:8px}
#qr canvas{display:block}
.sep{width:100%;max-width:480px;border:none;border-top:1px solid #1a1a1a;margin:.2rem 0}
.hist-header{width:100%;max-width:480px;display:flex;justify-content:space-between;align-items:center}
.hist-title{font-size:.7rem;color:#333;letter-spacing:.15em;text-transform:uppercase}
#clear{background:none;border:none;color:#333;font-size:.7rem;font-family:inherit;cursor:pointer;letter-spacing:.1em;text-transform:uppercase}
#clear:hover{color:#666}
#history{width:100%;max-width:480px;display:flex;flex-direction:column;gap:.6rem}
.entry{background:#111;border-radius:4px;padding:.75rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;cursor:pointer}
.entry-code{font-size:1rem;font-weight:bold;letter-spacing:.08em;color:#eee}
.entry-meta{text-align:right;flex-shrink:0}
.entry-date{font-size:.62rem;color:#444}
.entry-exp{font-size:.62rem;color:#00c897}
.expired .entry-code{color:#2a2a2a}
.expired .entry-exp{color:#333}
</style>
</head>
<body>
<div class="page">
  <button id="btn" onclick="gen()">GENERER UN TICKET</button>
  <div id="code" title="Toucher pour copier"></div>
  <canvas id="qr"></canvas>
  <div id="msg"></div>
  <hr class="sep">
  <div class="hist-header">
    <span class="hist-title">Historique local</span>
    <button id="clear" onclick="clearHist()">Effacer</button>
  </div>
  <div id="history"></div>
</div>
<script>
var WIFI_URL = ${JSON.stringify(wifiUrl)};
var STORE = 'wf_tickets';
function pad(n){return String(n).padStart(2,'0');}
function fmt(ts){var d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return[];}}
function save(list){localStorage.setItem(STORE,JSON.stringify(list));}
function makeCode(){
  var buf=new Uint8Array(8);
  crypto.getRandomValues(buf);
  var C='ABCDEFGHJKLMNPQRSTUVWXYZ',D='23456789';
  return 'WF-'+C[buf[0]%C.length]+C[buf[1]%C.length]+C[buf[2]%C.length]
    +'-'+D[buf[3]%D.length]+D[buf[4]%D.length]+D[buf[5]%D.length]
    +'-'+C[buf[6]%C.length]+C[buf[7]%C.length];
}
function relay(code){
  if(!WIFI_URL) return;
  fetch(WIFI_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({code:code,expires_at:new Date(Date.now()+86400000).toISOString()}),
    mode:'no-cors'
  }).catch(function(){});
}
function copy(code){
  navigator.clipboard.writeText(code).then(function(){
    document.getElementById('msg').textContent='Copie !';
    setTimeout(function(){document.getElementById('msg').textContent='Toucher pour copier';},1200);
  }).catch(function(){});
}
function renderHist(){
  var list=load(),el=document.getElementById('history');
  if(!list.length){el.innerHTML='<div style="color:#222;font-size:.75rem;text-align:center">Aucun ticket</div>';return;}
  el.innerHTML=list.slice().reverse().map(function(t){
    var exp=Date.now()>t.exp;
    var onclick=exp?'':'onclick="copy(\''+t.code+'\')"';
    return '<div class="entry'+(exp?' expired':'')+'" '+onclick+'>'
      +'<span class="entry-code">'+t.code+'</span>'
      +'<div class="entry-meta">'
        +'<div class="entry-date">'+fmt(t.ts)+'</div>'
        +'<div class="entry-exp">'+(exp?'Expire':'Expire '+fmt(t.exp))+'</div>'
      +'</div></div>';
  }).join('');
}
function clearHist(){if(window.confirm('Effacer?')){save([]);renderHist();}}
document.getElementById('code').onclick=function(){var c=this.textContent;if(c)copy(c);};
function gen(){
  var code=makeCode();
  document.getElementById('code').textContent=code;
  document.getElementById('msg').textContent='Toucher pour copier';
  var qrEl=document.getElementById('qr');
  QRCode.toCanvas(qrEl,code,{width:200,margin:1,color:{dark:'#080808',light:'#ffffff'}},function(){
    qrEl.style.display='block';
  });
  relay(code);
  var list=load();
  list.push({code:code,ts:Date.now(),exp:Date.now()+86400000});
  save(list);renderHist();
}
renderHist();
<\/script>
</body>
</html>`;
}

app.get('/t/:secret', function(req, res) {
  if (!SECRET || req.params.secret !== SECRET) return res.status(404).end();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.send(buildPage(WIFI_URL));
});

module.exports = app;
