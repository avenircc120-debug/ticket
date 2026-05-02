const express = require('express');
const app = express();

const SECRET = process.env.TICKET_SECRET || '';
const WIFI_URL = process.env.WIFI_URL || 'http://ze.lan';

function buildPage(wifiUrl) {
  const loginUrl = wifiUrl.replace(/\/$/, '') + '/login';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket Wi-Fi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#080808;color:#fff;font-family:'Courier New',monospace}
.page{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:2rem;min-height:100vh}
h1{font-size:.8rem;letter-spacing:.25em;color:#333;text-transform:uppercase}
#btn{background:#00c897;color:#080808;border:none;padding:1.3rem 0;font-size:1.1rem;font-weight:bold;font-family:inherit;border-radius:8px;cursor:pointer;letter-spacing:.12em;text-transform:uppercase;-webkit-tap-highlight-color:transparent;touch-action:manipulation;width:100%;max-width:360px}
#btn:active{opacity:.75}
#ticket{display:none;width:100%;max-width:360px;background:#111;border-radius:10px;padding:1.5rem;flex-direction:column;gap:1.2rem}
.field-label{font-size:.6rem;color:#555;letter-spacing:.2em;text-transform:uppercase;margin-bottom:.3rem}
.field-value{font-size:2.8rem;font-weight:bold;letter-spacing:.18em;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent}
#username-val{color:#00c897}
.field-hint{font-size:.6rem;color:#333;margin-top:.25rem}
.divider{border:none;border-top:1px solid #1c1c1c}
#msg{font-size:.78rem;color:#555;text-align:center;min-height:1em}
#send-btn{display:none;background:#1a1a1a;color:#00c897;border:1px solid #00c897;padding:.9rem 0;font-size:.85rem;font-weight:bold;font-family:inherit;border-radius:8px;cursor:pointer;letter-spacing:.1em;text-transform:uppercase;width:100%;max-width:360px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#send-btn:active{opacity:.7}
.sep{width:100%;max-width:360px;border:none;border-top:1px solid #111}
.hist-header{width:100%;max-width:360px;display:flex;justify-content:space-between;align-items:center}
.hist-title{font-size:.6rem;color:#222;letter-spacing:.15em;text-transform:uppercase}
#clear{background:none;border:none;color:#222;font-size:.6rem;font-family:inherit;cursor:pointer}
#history{width:100%;max-width:360px;display:flex;flex-direction:column;gap:.5rem}
.entry{background:#0d0d0d;border-radius:4px;padding:.6rem .8rem;display:flex;justify-content:space-between;align-items:center}
.entry-codes{display:flex;gap:.8rem;align-items:baseline}
.e-user{font-size:.9rem;font-weight:bold;color:#00c897}
.e-pass{font-size:.9rem;color:#666}
.entry-meta{text-align:right}
.entry-date{font-size:.58rem;color:#333}
.entry-exp{font-size:.58rem;color:#1a4a3a}
.expired .e-user,.expired .e-pass{color:#1a1a1a}
.expired .entry-exp{color:#1a1a1a}
</style>
</head>
<body>
<div class="page">
  <h1>Wi-Fi ze.lan</h1>
  <button id="btn" onclick="gen()">GENERER UN TICKET</button>
  <div id="ticket">
    <div>
      <div class="field-label">Identifiant (Username)</div>
      <div class="field-value" id="username-val" onclick="copyField('username-val','Identifiant copie')"></div>
      <div class="field-hint">Toucher pour copier</div>
    </div>
    <hr class="divider">
    <div>
      <div class="field-label">Code (Password)</div>
      <div class="field-value" id="password-val" onclick="copyField('password-val','Code copie')"></div>
      <div class="field-hint">Toucher pour copier</div>
    </div>
  </div>
  <div id="msg"></div>
  <button id="send-btn" onclick="sendToRouter()">ENVOYER AU ROUTEUR</button>
  <hr class="sep">
  <div class="hist-header">
    <span class="hist-title">Historique</span>
    <button id="clear" onclick="clearHist()">Effacer</button>
  </div>
  <div id="history"></div>
</div>
<script>
var LOGIN_URL=${JSON.stringify(loginUrl)};
var STORE='wf_v5';
var currentUser='',currentPass='';
function pad(n){return String(n).padStart(2,'0');}
function fmt(ts){var d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return[];}}
function save(list){localStorage.setItem(STORE,JSON.stringify(list));}
function makeUsername(){
  var buf=new Uint8Array(12);
  crypto.getRandomValues(buf);
  var letters='abcdefghjkmnpqrstuvwxyz';
  var arr=[letters[buf[0]%letters.length],letters[buf[1]%letters.length],letters[buf[2]%letters.length],letters[buf[3]%letters.length],String(buf[4]%10)];
  for(var i=arr.length-1;i>0;i--){var j=buf[6+i]%(i+1);var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}
  return arr.join('');
}
function makePassword(){
  var buf=new Uint8Array(4);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(function(b){return String(b%10);}).join('');
}
function copyField(id,label){
  var t=document.getElementById(id).textContent;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){setMsg(label+' OK');setTimeout(function(){setMsg('Toucher un champ pour copier');},1500);}).catch(function(){fbCopy(t,label);});
  } else { fbCopy(t,label); }
}
function fbCopy(t,label){
  var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.focus();ta.select();
  try{document.execCommand('copy');setMsg(label+' OK');}catch(e){setMsg('Copier manuellement');}
  document.body.removeChild(ta);setTimeout(function(){setMsg('Toucher un champ pour copier');},1500);
}
function setMsg(t){document.getElementById('msg').textContent=t;}
function sendToRouter(){
  setMsg('Envoi en cours...');
  fetch(LOGIN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'username='+encodeURIComponent(currentUser)+'&password='+encodeURIComponent(currentPass)})
  .then(function(r){setMsg(r.ok?'Accepte par le routeur':'Reponse : '+r.status);})
  .catch(function(e){setMsg('Erreur : '+e.message);});
}
function renderHist(){
  var list=load(),el=document.getElementById('history');
  if(!list.length){el.innerHTML='<div style="color:#1a1a1a;font-size:.7rem;text-align:center">Aucun ticket</div>';return;}
  el.innerHTML=list.slice().reverse().map(function(t){
    var exp=Date.now()>t.exp;
    return '<div class="entry'+(exp?' expired':'')+'">'
      +'<div class="entry-codes"><span class="e-user">'+t.user+'</span><span class="e-pass">'+t.pass+'</span></div>'
      +'<div class="entry-meta"><div class="entry-date">'+fmt(t.ts)+'</div>'
      +'<div class="entry-exp">'+(exp?'Expire':'Exp. '+fmt(t.exp))+'</div></div></div>';
  }).join('');
}
function clearHist(){if(confirm('Effacer?')){save([]);renderHist();}}
function gen(){
  currentUser=makeUsername();currentPass=makePassword();
  document.getElementById('username-val').textContent=currentUser;
  document.getElementById('password-val').textContent=currentPass;
  document.getElementById('ticket').style.display='flex';
  document.getElementById('send-btn').style.display='block';
  setMsg('Toucher un champ pour copier');
  var list=load();
  list.push({user:currentUser,pass:currentPass,ts:Date.now(),exp:Date.now()+86400000});
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
