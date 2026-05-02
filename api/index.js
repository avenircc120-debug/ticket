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
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#080808;color:#fff;font-family:'Courier New',monospace}
.page{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:2.5rem;min-height:100vh}
#btn{background:#00c897;color:#080808;border:none;padding:1.3rem 4rem;font-size:1.25rem;font-weight:bold;font-family:inherit;border-radius:8px;cursor:pointer;letter-spacing:.12em;text-transform:uppercase;-webkit-tap-highlight-color:transparent;touch-action:manipulation;width:100%;max-width:400px}
#btn:active{opacity:.75}
#code{font-size:clamp(2.2rem,11vw,5.5rem);font-weight:bold;letter-spacing:.2em;color:#00c897;text-align:center;word-break:break-all;user-select:text;cursor:pointer;display:none;width:100%}
#msg{font-size:.85rem;color:#555;text-align:center;min-height:1.2em}
.sep{width:100%;max-width:480px;border:none;border-top:1px solid #1a1a1a}
.hist-header{width:100%;max-width:480px;display:flex;justify-content:space-between;align-items:center}
.hist-title{font-size:.7rem;color:#333;letter-spacing:.15em;text-transform:uppercase}
#clear{background:none;border:none;color:#333;font-size:.7rem;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
#history{width:100%;max-width:480px;display:flex;flex-direction:column;gap:.6rem}
.entry{background:#111;border-radius:4px;padding:.75rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}
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
  <div id="code"></div>
  <div id="msg"></div>
  <hr class="sep">
  <div class="hist-header">
    <span class="hist-title">Historique</span>
    <button id="clear" onclick="clearHist()">Effacer</button>
  </div>
  <div id="history"></div>
</div>
<script>
var WIFI_URL=${JSON.stringify(wifiUrl)};
var STORE='wf_tickets';
function pad(n){return String(n).padStart(2,'0');}
function fmt(ts){var d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return[];}}
function save(list){localStorage.setItem(STORE,JSON.stringify(list));}
function makeCode(){
  var buf=new Uint8Array(8);crypto.getRandomValues(buf);
  var C='ABCDEFGHJKLMNPQRSTUVWXYZ',D='23456789';
  return 'WF-'+C[buf[0]%C.length]+C[buf[1]%C.length]+C[buf[2]%C.length]
    +'-'+D[buf[3]%D.length]+D[buf[4]%D.length]+D[buf[5]%D.length]
    +'-'+C[buf[6]%C.length]+C[buf[7]%C.length];
}
function relay(code){
  if(!WIFI_URL)return;
  fetch(WIFI_URL,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({code:code,expires_at:new Date(Date.now()+86400000).toISOString()}),
    mode:'no-cors'}).catch(function(){});
}
function copy(code){
  navigator.clipboard.writeText(code).then(function(){
    document.getElementById('msg').textContent='Copie !';
    setTimeout(function(){document.getElementById('msg').textContent='Toucher pour copier';},1500);
  }).catch(function(){});
}
function renderHist(){
  var list=load(),el=document.getElementById('history');
  if(!list.length){el.innerHTML='<div style="color:#222;font-size:.75rem;text-align:center">Aucun ticket</div>';return;}
  el.innerHTML=list.slice().reverse().map(function(t){
    var exp=Date.now()>t.exp;
    return '<div class="entry'+(exp?' expired':'')+'">'
      +'<span class="entry-code">'+t.code+'</span>'
      +'<div class="entry-meta"><div class="entry-date">'+fmt(t.ts)+'</div>'
      +'<div class="entry-exp">'+(exp?'Expire':'Expire '+fmt(t.exp))+'</div></div></div>';
  }).join('');
}
function clearHist(){if(window.confirm('Effacer?')){save([]);renderHist();}}
document.getElementById('code').onclick=function(){copy(this.textContent);};
function gen(){
  var code=makeCode();
  var codeEl=document.getElementById('code');
  codeEl.textContent=code;
  codeEl.style.display='block';
  document.getElementById('msg').textContent='Toucher pour copier';
  relay(code);
  var list=load();
  list.push({code:code,ts:Date.now(),exp:Date.now()+86400000});
  save(list);renderHist();
}
renderHist();
</script>
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
