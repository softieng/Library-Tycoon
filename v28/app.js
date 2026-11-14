/* Library Tycoon V2.8 main controller, save key isolated from V2.5/V2.6/V2.7. */
(function(){'use strict';
const G=window.TycoonGameplay,$=id=>document.getElementById(id);
const KEY='uot-library-tycoon-v28-art-first';let state=G.initialState(),world=null,paused=false,speed=1,toastTimer=0;
try{state=G.loadState(JSON.parse(localStorage.getItem(KEY)));}catch(_){state=G.initialState();}
const num=n=>Math.round(n).toLocaleString('ar-IQ');
function store(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),2500);$('scene-callout').textContent=s;}
function update(){const p=G.progress(state);$('money').textContent=num(state.money);$('satisfaction').textContent=num(state.satisfaction)+'٪';$('reputation').textContent=state.reputation.toFixed(1);$('served').textContent=num(state.served);$('day').textContent=num(state.day);$('missionProgress').textContent=num(p.completed)+' / ٣';let t=Math.floor(510+state.clock*1.55)%1440;$('clock').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
for(const name of ['book','service','exam']){$('bar-'+name).style.width=(p[name]*100)+'%';$('mission-'+name).classList.toggle('done',!!state.quests[name]);}
$('status-book').textContent=state.quests.book?'تم العثور على الكتاب وإرجاعه':state.bookGuesses?`تم تفتيش ${num(state.bookGuesses)} رفوف. تابع البحث`:'اضغط علامة الكتاب فوق الرف';
$('status-service').textContent=state.quests.service?'تم إنجاز مهمة الخدمة':`${num(Math.min(state.served,5))} / ٥ خدمات منجزة`;
$('status-exam').textContent=state.quests.exam?'تم اجتياز أسبوع الامتحانات':state.exam?`${num(Math.min(8,state.served-state.exam.startServed))} / ٨ خدمات أثناء الامتحانات`:'ابدأ التحدي من زر الإدارة';
$('exam').disabled=!!state.exam||!!state.quests.exam;$('upgrade').disabled=state.upgrades>=4;$('upgradeCost').textContent=state.upgrades>=4?'الحد الأعلى':num(state.upgrades*6000)+' د.ع';world?.setState(state);}
function doAction(action){const r=G.apply(state,action);if(r.message)toast(r.message);if(r.changed){store();update();}}
$('exam').addEventListener('click',()=>doAction({type:'exam'}));$('upgrade').addEventListener('click',()=>doAction({type:'upgrade'}));$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';});$('speed').addEventListener('click',()=>{speed=speed===1?2:speed===2?3:1;$('speed').textContent='×'+num(speed);});
$('zoomIn').addEventListener('click',()=>world?.zoom(1));$('zoomOut').addEventListener('click',()=>world?.zoom(-1));$('reset').addEventListener('click',()=>world?.reset());
window.addEventListener('pagehide',store);
async function start(){try{
  world=await window.createLibraryWorldV28($('renderCanvas'),doAction,{initialState:state,onProgress:(n,total)=>{$('asset-count').textContent=n+' / '+total;$('load-status').textContent=`تحميل المجسمات ${n}/${total}`;}});
  if(world.failures.length){console.error('Failed CC0 assets:',world.failures);$('scene-callout').textContent=`تعذّر تحميل ${world.failures.length} مجسمات. الرجاء فحص اتصالات الملفات.`;toast('بعض المجسمات ناقصة، لم تعتمد هذه المعاينة');}
  $('loading').style.display='none';update();window.__LIBRARY_WORLD_READY=world.failures.length===0;
 }catch(err){console.error('3D loading failed:',err);$('loading').innerHTML='<h2>تعذّر عرض المشهد ثلاثي الأبعاد</h2><p>تحقق من WebGL وملفات النماذج. لم يتم استبدال العناصر بأشكال بدائية.</p><small>'+String(err.message||err).slice(0,150)+'</small>';window.__LIBRARY_WORLD_READY=false;}}
start();update();let last=performance.now(),delta=0;function tick(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(!paused){delta+=dt*speed;if(delta>.28){G.advance(state,delta);delta=0;update();store();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})();