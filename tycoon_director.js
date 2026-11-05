/* Library Tycoon V2.5. Map challenges, visitor cases and staff shifts.
   Original university/library logos and player assets are never modified here.
   Offline UI. The simulation state stays owned by index.html. */
(function(root, factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LibraryTycoonDirector=api;
 if(typeof document!=='undefined'){
  const go=()=>api.mount(document,root);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go,{once:true});else go();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const cases=Object.freeze([
  {name:'طالب مستعجل يريد استعارة كتاب',job:'books',bonus:75},
  {name:'باحثة تريد طباعة مستند',job:'print',bonus:85},
  {name:'طالب يبحث عن مكان للمطالعة',job:'study',bonus:70},
  {name:'باحث دراسات عليا يحتاج مصدراً',job:'research',bonus:115}
 ]);
 const bounded=(v,low,high)=>{const x=Number(v);return Number.isFinite(x)?Math.max(low,Math.min(high,x)):low;};
 const number=(v)=>Math.floor(bounded(v,0,1000000));
 function reputation(raw){
  const s=raw||{},happy=bounded(s.satisfaction,0,100),clean=bounded(s.cleanliness,0,100),served=number(s.served),lost=number(s.lost),waiting=number(s.waiting);
  const attendance=served+lost,service=attendance?100*served/attendance:75;
  const queueScore=Math.max(0,100-waiting*7);
  const score=Math.round(happy*.4+clean*.26+service*.24+queueScore*.1);
  const stars=Math.max(1,Math.min(5,Math.ceil(score/20)));
  return {score,stars,service:Math.round(service),queueScore};
 }
 function huntSpots(room){
  const r=room||{x:-10,z:10};
  return [{x:r.x-2.05,z:r.z+.85,label:'رف ١'},{x:r.x,z:r.z-.9,label:'رف ٢'},{x:r.x+2.05,z:r.z+.85,label:'رف ٣'}];
 }
 function mount(doc,win){
  if(doc.getElementById('ltDirectorToggle'))return false;
  const holder=doc.querySelector('.subtools');if(!holder)return false;
  const trigger=doc.createElement('button');trigger.id='ltDirectorToggle';trigger.type='button';trigger.textContent='🏛️ مكتب مدير المكتبة';trigger.setAttribute('aria-controls','ltDirectorPanel');trigger.setAttribute('aria-expanded','false');holder.insertBefore(trigger,holder.firstChild);
  const panel=doc.createElement('section');panel.id='ltDirectorPanel';panel.className='lt-director-panel';panel.dir='rtl';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','مهمات المدير التفاعلية');
  panel.innerHTML='<header class="lt-dir-head"><div><small>CENTRAL LIBRARY · DIRECTOR MODE</small><h2>🏛️ مكتب مدير المكتبة</h2></div><button id="ltDirClose" type="button" aria-label="إغلاق المكتب">✕</button></header><div id="ltDirStatus" class="lt-dir-status" aria-live="polite"></div><div id="ltDirHunt" class="lt-dir-section"></div><div id="ltDirExam" class="lt-dir-section"></div><div id="ltDirVisitors" class="lt-dir-section"></div><div id="ltDirStaff" class="lt-dir-section"></div><p class="lt-dir-credit">إدارة محاكاة جامعية · جميع الأرصدة افتراضية. تبقى الشعارات الأصلية دون تغيير.</p>';
  doc.body.appendChild(panel);
  const markers=doc.createElement('div');markers.id='ltHuntMarkers';markers.className='lt-hunt-markers';markers.setAttribute('aria-label','أماكن الأرفف على خريطة المكتبة');doc.body.appendChild(markers);
  const markerButtons=Array.from({length:3},(_,i)=>{const b=doc.createElement('button');b.type='button';b.className='lt-hunt-marker';b.textContent='📚 رف '+(i+1);b.setAttribute('aria-label','فحص الرف '+(i+1));b.onclick=()=>{const ok=win.__LT22?.checkBookShelf?.(i);if(ok)refresh();};markers.appendChild(b);return b;});
  const get=id=>doc.getElementById(id),close=get('ltDirClose');
  const money=n=>(number(n)*1000).toLocaleString('ar-IQ')+' د.ع';
  function open(){doc.body.classList.add('lt-director-open');panel.hidden=false;trigger.setAttribute('aria-expanded','true');refresh();close.focus();}
  function hide(){doc.body.classList.remove('lt-director-open');panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();}
  trigger.addEventListener('click',()=>panel.hidden?open():hide());close.addEventListener('click',hide);
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)hide();});
  const section=(id,title,paragraph)=>{const box=get(id);box.textContent='';const h=doc.createElement('h3');h.textContent=title;box.appendChild(h);const p=doc.createElement('p');p.textContent=paragraph;box.appendChild(p);return box;};
  function addButton(box,label,callback,disabled=false){const b=doc.createElement('button');b.type='button';b.className='lt-dir-action';b.textContent=label;b.disabled=disabled;b.onclick=()=>{callback();refresh();};box.appendChild(b);return b;}
  function refreshMarkers(s){
   const h=s?.hunt,active=!!h?.active;
   markers.hidden=!active;
   if(!active)return;
   const spots=huntSpots(h.room);
   for(let i=0;i<3;i++){
    const b=markerButtons[i],point=win.__LT22?.projectPoint?.(spots[i].x,1.55,spots[i].z);
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){b.hidden=true;continue;}
    b.hidden=point.x<16||point.x>win.innerWidth-16||point.y<80||point.y>win.innerHeight-35;
    b.style.left=point.x+'px';b.style.top=point.y+'px';b.textContent='📚 '+spots[i].label;
   }
  }
  function refresh(){
   const api=win.__LT22; if(!api?.directorView)return;
   let s;try{s=api.directorView();}catch(e){return;}
   if(!s)return;
   refreshMarkers(s);
   trigger.classList.toggle('lt-dir-urgent',!!s.cases.active||!!s.exam.active);
   if(panel.hidden)return;
   get('ltDirStatus').textContent=`السمعة ${'★'.repeat(s.reputation.stars)} · التقييم ${s.reputation.score}/100 · تمت خدمة ${s.served} طالب`;
   let box=section('ltDirHunt','📕 كتاب مفقود','فتّش في أرفف قاعة '+s.hunt.room.ar+' عن الكتاب المطلوب. افتح المهمة، ثم أغلق اللوحة واضغط علامة الرف على الخريطة.');
   if(s.hunt.active){const p=doc.createElement('strong');p.textContent='المتبقي '+Math.ceil(s.hunt.remaining)+' ثانية · المحاولات '+s.hunt.attempts+'/3';box.appendChild(p);
    const q=doc.createElement('p');q.textContent='تتبع مواقع الأرفف الثلاثة الظاهرة داخل القاعة.';box.appendChild(q);
   }else addButton(box,s.hunt.cooldown?'الجولة القادمة بعد '+Math.ceil(s.hunt.cooldown)+' ثانية':'ابدأ البحث عن كتاب مفقود',()=>api.startBookHunt?.(),s.hunt.cooldown>0||s.paused);
   box=section('ltDirExam','📚 أسبوع الامتحانات','فترة ضغط لمدة 115 ثانية لعب. جهّز طاقمك وخدم 8 زوار مع الحفاظ على رضا 70% أو أكثر.');
   if(s.exam.active){const p=doc.createElement('strong');p.textContent=`باقي ${Math.ceil(s.exam.remaining)} ثانية · المنجز ${s.exam.progress}/8 · الرضا ${s.satisfaction}%`;box.appendChild(p);}
   else addButton(box,s.exam.dayStarted===s.day?'انتهت فعالية هذا اليوم':'ابدأ تحدي أسبوع الامتحانات',()=>api.startExamWeek?.(),s.exam.dayStarted===s.day||s.level<2||s.staffCount<1||s.paused);
   box=section('ltDirVisitors','🧑‍🎓 طلبات الزوار الخاصة','استقبل حالة فردية في المكتبة، وامنحها الأولوية عندما تصل إلى الطابور. القرار يؤثر على رضا بقية الزوار.');
   if(s.cases.active){const a=s.cases.active;const p=doc.createElement('strong');p.textContent=`${a.name} · ${a.modeLabel}`;box.appendChild(p);
    addButton(box,a.priority?'الأولوية مُنحت':'منح أولوية في الطابور، رضا −1',()=>api.prioritizeVisitor?.(),a.priority||!a.inQueue||s.paused);
   }else addButton(box,s.cases.cooldown>0?'حالة جديدة بعد '+Math.ceil(s.cases.cooldown)+' ثانية':'استقبل طلباً خاصاً',()=>api.startVisitorCase?.(),s.cases.cooldown>0||s.paused);
   const p=doc.createElement('p');p.textContent=`أنجزت ${s.cases.completed} طلبات خاصة · غادر ${s.cases.lost} دون خدمة`;box.appendChild(p);
   box=section('ltDirStaff','👔 دوام الموظفين','كل موظف عند مكتبه الثابت، بزي كحلي موحد. الاستراحة توقف الخدمة لمدة 22 ثانية، بدون نقله إلى قاعة أخرى.');
   for(const person of s.staff){const row=doc.createElement('div');row.className='lt-dir-staff-row';const title=doc.createElement('span');title.textContent=`${person.name} · ${person.status}`;row.appendChild(title);
    const btn=doc.createElement('button');btn.type='button';btn.disabled=person.onBreak||person.cooldown>0||s.paused;btn.textContent=person.onBreak?'استراحة':person.cooldown>0?Math.ceil(person.cooldown)+'ث':'استراحة 22ث';btn.onclick=()=>{api.staffBreak?.(person.id);refresh();};row.appendChild(btn);box.appendChild(row);}
  }
  const timer=win.setInterval(refresh,900);refresh();return {refresh,stop:()=>win.clearInterval(timer),hide};
 }
 return Object.freeze({reputation,huntSpots,cases,mount});
});
