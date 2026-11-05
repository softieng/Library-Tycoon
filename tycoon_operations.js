/* Library Tycoon V2.3. Owner review: read-only live operations panel.
   No changes to simulation, upgrades, hiring, finances, guardian, or saved game.
   External assets, logos, and libraries are not required. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LibraryTycoonOperations=api;
 if(typeof document!=='undefined'){
  const boot=()=>api.mount(document,root);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const jobs=['books','print','study','research'];
 const names={books:'الاستعارة',print:'الطباعة',study:'المطالعة',research:'البحث العلمي'};
 function count(n){n=Number(n);return Number.isFinite(n)?Math.max(0,Math.min(999999,Math.floor(n))):0;}
 function normalize(raw){
  if(!raw||typeof raw!=='object')return null;
  const st={day:Math.max(1,count(raw.day)),level:count(raw.level),served:count(raw.served),lost:count(raw.lost),staff:count(raw.staff),satisfaction:Math.min(100,count(raw.satisfaction)),cleanliness:Math.min(100,count(raw.cleanliness)),visitors:count(raw.visitors),navBlocked:count(raw.navBlocked),paused:!!raw.paused,services:[],nextUpgrade:null,totalWaiting:0,totalServing:0};
  for(const key of jobs){
   const s=raw.services?.[key]||{},row={key,name:names[key],queue:count(s.queue),active:!!s.active,unlocked:st.level>=count(s.unlock)};
   if(row.unlocked){st.totalWaiting+=row.queue;st.totalServing+=Number(row.active);}
   st.services.push(row);
  }
  if(raw.nextUpgrade&&typeof raw.nextUpgrade.name==='string'&&raw.nextUpgrade.name.length<100){
   st.nextUpgrade={name:raw.nextUpgrade.name,cost:count(raw.nextUpgrade.cost)};
  }
  return st;
 }
 function mount(doc,win){
  if(doc.getElementById('ltOpsToggle'))return false;
  const foot=doc.querySelector('.foot');if(!foot)return false;
  const wrap=doc.createElement('div');wrap.className='corner lt-ops-toggle-box';
  const toggle=doc.createElement('button');toggle.type='button';toggle.id='ltOpsToggle';toggle.textContent='📊 متابعة التشغيل';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','ltOpsPanel');
  wrap.appendChild(toggle);foot.appendChild(wrap);
  const panel=doc.createElement('section');panel.id='ltOpsPanel';panel.className='lt-ops-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','لوحة متابعة تشغيل المكتبة');panel.dir='rtl';panel.hidden=true;
  panel.innerHTML=`<div class="lt-ops-heading"><h2>إدارة المكتبة <small>Live · V2.3</small></h2><button type="button" id="ltOpsClose" aria-label="إغلاق لوحة المتابعة">✕</button></div><p class="lt-ops-sub">متابعة الأداء والطوابير بدون تعديل الميزانية أو التقدم.</p><div class="lt-ops-metrics"><div>👥 الزوار <b id="ltOpsVisitors">٠</b></div><div>⌛ الانتظار <b id="ltOpsWaiting">٠</b></div><div>✅ المخدومون <b id="ltOpsServed">٠</b></div><div>🧑‍💼 الموظفون <b id="ltOpsStaff">٠</b></div><div>😊 الرضا <b id="ltOpsHappy">٠٪</b></div><div>🧼 النظافة <b id="ltOpsClean">٠٪</b></div></div><h3>الخدمات والطوابير</h3><div class="lt-ops-services" id="ltOpsServices"></div><div class="lt-ops-next" id="ltOpsNext"></div><p class="lt-ops-health" id="ltOpsHealth" aria-live="polite"></p>`;
  doc.body.appendChild(panel);
  const get=id=>doc.getElementById(id),close=get('ltOpsClose'),fmt=n=>count(n).toLocaleString('ar-IQ');
  const rows={};for(const key of jobs){const row=doc.createElement('div');row.className='lt-ops-service';row.innerHTML=`<span class="lt-ops-name"></span><strong class="lt-ops-status"></strong>`;get('ltOpsServices').appendChild(row);rows[key]=row;}
  function refresh(){
   if(panel.hidden||doc.hidden)return;
   let source;try{source=win.__LT22?.operations?.();}catch(_){source=null;}
   const st=normalize(source);if(!st){get('ltOpsHealth').textContent='تعذر قراءة البيانات، شغّل اللعبة أولاً.';return;}
   for(const [id,n] of [['ltOpsVisitors',st.visitors],['ltOpsWaiting',st.totalWaiting],['ltOpsServed',st.served],['ltOpsStaff',st.staff]])get(id).textContent=fmt(n);
   get('ltOpsHappy').textContent=fmt(st.satisfaction)+'٪';get('ltOpsClean').textContent=fmt(st.cleanliness)+'٪';
   for(const r of st.services){const row=rows[r.key];row.classList.toggle('lt-locked',!r.unlocked);row.querySelector('.lt-ops-name').textContent=r.name;row.querySelector('.lt-ops-status').textContent=!r.unlocked?'مقفلة':r.active?`قيد الخدمة · ينتظر ${fmt(r.queue)}`:`ينتظر ${fmt(r.queue)}`;}
   get('ltOpsNext').textContent=st.nextUpgrade?`الترقية القادمة: ${st.nextUpgrade.name} · ${fmt(st.nextUpgrade.cost*1000)} د.ع`:'اكتملت جميع الترقيات الـ17';
   get('ltOpsHealth').textContent=(st.paused?'⏸ اللعبة متوقفة مؤقتاً. ':'')+(st.navBlocked?`مراجعة مسارات الحركة: ${fmt(st.navBlocked)} زائر أو موظف متوقف.`:'حالة الحركة: لا توجد مسارات متوقفة مرصودة.');
  }
  function open(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');refresh();close.focus();}
  function hide(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}
  toggle.addEventListener('click',()=>panel.hidden?open():hide());close.addEventListener('click',hide);
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){hide();}});
  // 1.5 s refresh. Re-reads state but never mutates it or localStorage.
  const refreshId=win.setInterval(refresh,1500);
  return {refresh,hide,stop:()=>win.clearInterval(refreshId)};
 }
 return Object.freeze({normalize,mount});
});
