/* Library Tycoon V2.4. Offline campaign missions and decision events.
   Uses existing gameplay metrics, game clock, and fictional game economy.
   No network access, no brand images, no external dependencies. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LibraryTycoonChallenges=api;
 if(typeof document!=='undefined'){
  const start=()=>api.mount(document,root);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SERVICE_LABELS={books:'الاستعارة',print:'الطباعة',study:'المطالعة',research:'البحث العلمي'};
 const campaign=[
  {title:'الافتتاح الرسمي',story:'استقبل أول دفعة من القرّاء حتى تبدأ المكتبة نشاطها.',requirements:[['books',3]],reward:90},
  {title:'أمين الاستعارة في موقعه',story:'عيّن أمين استعارة واتركه يباشر خلف مكتب الخدمة. ينجز العمل تلقائياً عند وصول الزوار.',requirements:[['staff',1],['position',1],['books',2]],reward:120},
  {title:'ساعة المطالعة',story:'افتح قاعة المطالعة وساعد زائرين على استخدامها.',requirements:[['level',2],['study',2]],reward:150},
  {title:'حملة النظافة',story:'عيّن فريق النظافة، وراقب نظافة القاعات أثناء استمرار استقبال الزوار.',requirements:[['staff',3],['cleaner',1],['cleanliness',90],['served',3]],reward:210},
  {title:'موسم الطباعة',story:'افتح نقطة الطباعة وأنجز ثلاث معاملات مع الحفاظ على رضا جيد.',requirements:[['level',4],['print',3],['satisfaction',75]],reward:220},
  {title:'مساعد البحث العلمي',story:'افتح قاعة البيروني، وظّف مساعد البحث، وأنجز معاملات بحث حقيقية.',requirements:[['level',7],['staff',4],['research',3]],reward:290},
  {title:'اختبار إدارة الأزمات',story:'اتخذ قراراً واحداً في حدث مفاجئ ثم حافظ على رضا ونظافة المكتبة.',requirements:[['events',1],['sorted',1],['satisfaction',80],['cleanliness',80]],reward:250},
  {title:'المكتبة الأكاديمية المتكاملة',story:'افتح قاعة الأطاريح، ثم أنجز خدمة جديدة من كل نوع.',requirements:[['level',11],['books',1],['print',1],['study',1],['research',1]],reward:400}
 ];
 const daily=[
  {title:'مهمة يومية: استقبال القرّاء',story:'خدمة دفعة جديدة من الطلبة بكفاءة.',requirements:[['served',6],['satisfaction',70]],reward:140},
  {title:'مهمة يومية: قاعات نشطة',story:'توسيع الاستفادة من الطباعة والمطالعة.',requirements:[['study',2],['print',2]],reward:160},
  {title:'مهمة يومية: جودة الخدمات',story:'استكمل البحث العلمي مع نظافة مرتفعة.',requirements:[['research',2],['cleanliness',85]],reward:170}
 ];
 const sortingCases=[
  {question:'طالب يريد كتاباً عن مبادئ البرمجة. إلى أي جناح توجهه؟',choices:['جابر بن حيان','الخوارزمي','الأطاريح'],correct:1},
  {question:'وصل كتاب عن الهندسة الكيميائية. وين مكانه المناسب؟',choices:['جابر بن حيان','المراجع','ثابت بن قرة'],correct:0},
  {question:'طالب يريد الاطلاع على رسالة ماجستير. شنو الجناح المناسب؟',choices:['البيروني','الخوارزمي','الأطاريح'],correct:2},
  {question:'باحث يحتاج موسوعة عامة. إلى وين يتوجه؟',choices:['المراجع','الاستعارة','جابر بن حيان'],correct:0},
  {question:'طالب يحتاج محطة حاسوب للدراسة. أي قاعة مناسبة؟',choices:['البيروني','ثابت بن قرة','المراجع'],correct:0},
  {question:'طالبة تريد مكاناً هادئاً للقراءة. وين توجهها؟',choices:['جابر بن حيان','الأطاريح','ثابت بن قرة'],correct:2}
 ];
 const events=[
  {title:'كتاب مفقود من الرف',detail:'طالب ما لقى كتابه المطلوب. شلون تتصرف؟',options:[
   {label:'تنظيم عملية بحث',cash:-25,satisfaction:3,cleanliness:0},
   {label:'توفير نسخة بديلة',cash:-65,satisfaction:6,cleanliness:0}
  ]},
  {title:'ازدحام وقت المحاضرات',detail:'مجموعة طلبة وصلت بنفس الوقت. اختار طريقة إدارة الازدحام.',options:[
   {label:'تخصيص موارد لتنظيم الدور',cash:-45,satisfaction:5,cleanliness:0},
   {label:'خدمة حسب الدور الحالي',cash:0,satisfaction:-3,cleanliness:0}
  ]},
  {title:'زيارة تقييم القاعات',detail:'لجنة جودة وصلت للمكتبة. رتّب أولوياتك.',options:[
   {label:'تهيئة القاعات والممرات',cash:-80,satisfaction:4,cleanliness:10},
   {label:'الاستمرار بالدوام المعتاد',cash:0,satisfaction:-2,cleanliness:-4}
  ]},
  {title:'صيانة الطباعة',detail:'الطابعة تحتاج متابعة. القرار يأثر على الرضا، لكن الخدمة تبقى شغّالة.',options:[
   {label:'صيانة وقائية',cash:-60,satisfaction:4,cleanliness:0},
   {label:'تأجيل الصيانة',cash:0,satisfaction:-4,cleanliness:0}
  ]}
 ];
 function missionAt(i){i=Math.max(0,Math.min(100000,Math.floor(Number(i)||0)));return i<campaign.length?{...campaign[i],index:i,kind:'campaign'}:{...daily[(i-campaign.length)%daily.length],index:i,kind:'daily'};}
 function snapshot(source){
  const s=source&&typeof source==='object'?source:{};
  return {served:nonneg(s.served),books:nonneg(s.serviceCounts?.books),print:nonneg(s.serviceCounts?.print),study:nonneg(s.serviceCounts?.study),research:nonneg(s.serviceCounts?.research),events:nonneg(s.eventsResolved),sorted:nonneg(s.sortedRounds)};
 }
 function nonneg(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
 function progress(index,now,baseline){
  const mission=missionAt(index),b=baseline||{},s=now||{},arr=mission.requirements.map(([k,target])=>{
   let value;
   if(['books','print','study','research','served','events','sorted'].includes(k))value=Math.max(0,nonneg(k==='events'?s.eventsResolved:k==='sorted'?s.sortedRounds:k==='served'?s.served:s.serviceCounts?.[k])-nonneg(b[k]));
   else if(k==='position')value=s.staffAtPost?.[target]===true?1:0;
   else if(k==='cleaner')value=s.cleanerInZone===true?1:0;
   else value=nonneg(s[k]);
   return {key:k,label:k==='position'?'الموظف في موقعه':k==='cleaner'?'عامل النظافة في منطقته':k==='staff'?'عدد الموظفين':k==='level'?'الترقيات':k==='events'?'أحداث تمت معالجتها':k==='sorted'?'جولة تصنيف ناجحة':k==='served'?'زوار تمت خدمتهم':k==='satisfaction'?'رضا الطلبة':k==='cleanliness'?'نظافة المكتبة':`خدمات ${SERVICE_LABELS[k]}`,value,target,done:value>=target};
  });
  return {mission,items:arr,done:arr.every(x=>x.done),reward:mission.reward};
 }
 function mount(doc,win){
  if(doc.getElementById('ltQuestToggle'))return false;
  const buttons=doc.querySelector('.subtools'); if(!buttons)return false;
  const toggle=doc.createElement('button');toggle.id='ltQuestToggle';toggle.type='button';toggle.textContent='🎯 المهمات والأحداث';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','ltQuestPanel');buttons.insertBefore(toggle,buttons.firstChild);
  const panel=doc.createElement('section');panel.id='ltQuestPanel';panel.className='lt-quest-panel';panel.dir='rtl';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','مهمات المكتبة والأحداث');
  panel.innerHTML='<div class="lt-quest-top"><div><span class="lt-quest-kicker">CENTRAL LIBRARY · V2.4</span><h2>🎯 تحديات مدير المكتبة</h2></div><button id="ltQuestClose" type="button" aria-label="إغلاق المهمات">✕</button></div><div id="ltQuestCampaign"></div><div id="ltQuestIncident" class="lt-quest-incident" hidden></div><div id="ltQuestSorting" class="lt-quest-sorting"></div><div id="ltQuestStaff" class="lt-quest-staff"></div><p class="lt-quest-footnote">المكافآت بالدينار العراقي الافتراضي داخل اللعبة. التحديات ترتبط بالخدمات الفعلية، والقرارات تغيّر الرصيد والرضا.</p>';
  doc.body.appendChild(panel);
  const get=id=>doc.getElementById(id),money=x=>(Number(x||0)*1000).toLocaleString('ar-IQ')+' د.ع';
  const close=get('ltQuestClose');
  function open(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');refresh();close.focus();}
  function hide(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}
  toggle.addEventListener('click',()=>panel.hidden?open():hide());close.addEventListener('click',hide);
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)hide();});
  function refresh(){
   const api=win.__LT22;if(!api?.challengeView)return;
   let s;try{s=api.challengeView();}catch(_){return;}if(!s)return;
   const row=progress(s.index,s.metrics,s.baseline),mission=row.mission;
   toggle.classList.toggle('lt-quest-alert',!!s.pending);
   if(panel.hidden)return;
   const slot=get('ltQuestCampaign');slot.textContent='';
   const tag=doc.createElement('p');tag.className='lt-quest-progress';tag.textContent=mission.kind==='campaign'?`الفصل ${s.index+1} من ${campaign.length}`:`المهمة المتجددة ${s.index-campaign.length+1}`;slot.appendChild(tag);
   const h=doc.createElement('h3');h.textContent=mission.title;slot.appendChild(h);
   const desc=doc.createElement('p');desc.textContent=mission.story;slot.appendChild(desc);
   const tasks=doc.createElement('div');tasks.className='lt-quest-tasks';
   row.items.forEach(t=>{const tr=doc.createElement('div');tr.className='lt-quest-task'+(t.done?' is-complete':'');const a=doc.createElement('span');a.textContent=(t.done?'✓ ':'○ ')+t.label;const b=doc.createElement('b');b.textContent=Math.min(t.target,t.value)+' / '+t.target;tr.append(a,b);tasks.appendChild(tr);});slot.appendChild(tasks);
   const claim=doc.createElement('button');claim.className='lt-quest-claim';claim.type='button';claim.disabled=!row.done;claim.textContent=row.done?'🏅 استلم مكافأة المهمة '+money(mission.reward):'أكمل أهداف المهمة · المكافأة '+money(mission.reward);claim.onclick=()=>{if(api.claimChallenge?.())refresh();};slot.appendChild(claim);
   const incident=get('ltQuestIncident');incident.textContent='';incident.hidden=!s.pending;
   if(s.pending){const ev=events[s.pending.type];if(ev){const h2=doc.createElement('h3');h2.textContent='⚠️ '+ev.title;const p=doc.createElement('p');p.textContent=ev.detail;incident.append(h2,p);const actions=doc.createElement('div');actions.className='lt-quest-choices';ev.options.forEach((option,i)=>{const btn=doc.createElement('button');btn.type='button';btn.disabled=option.cash<0&&s.cash < -option.cash;btn.textContent=option.label+(option.cash<0?` · التكلفة ${money(-option.cash)}`:' · بدون تكلفة');btn.onclick=()=>{if(api.resolveIncident?.(i))refresh();};actions.appendChild(btn);});incident.appendChild(actions);}}
   const sort=get('ltQuestSorting');sort.textContent='';const sg=api.shelfView?.();
   if(sg){const h=doc.createElement('h3');h.textContent='📚 تحدي ترتيب الكتب';sort.appendChild(h);
    const descr=doc.createElement('p');descr.textContent='اختار جناح المكتبة المناسب لكل طلب. ثلاث جولات، والنجاح يحتاج إجابتين صحيحتين على الأقل.';sort.appendChild(descr);
    const score=doc.createElement('p');score.className='lt-sort-score';score.textContent=`السؤال ${Math.min(3,sg.step+1)} / 3 · إجابات صحيحة ${sg.correct}`;sort.appendChild(score);
    if(sg.step<3){const q=doc.createElement('strong');q.className='lt-sort-question';q.textContent=sg.question.question;sort.appendChild(q);
     const choices=doc.createElement('div');choices.className='lt-quest-choices';sg.question.choices.forEach((ch,i)=>{const b=doc.createElement('button');b.type='button';b.textContent=ch;b.onclick=()=>{api.answerShelf?.(i);refresh();};choices.appendChild(b);});sort.appendChild(choices);
    }else{const msg=doc.createElement('p');msg.textContent=sg.correct>=2?'✅ نجحت بالجولة. المكافأة تنضاف لرصيدك.':'الجولة انتهت. حاول مرة ثانية لتحسن نتيجتك.';sort.appendChild(msg);
     const again=doc.createElement('button');again.className='lt-sort-restart';again.type='button';again.disabled=sg.remaining>0;again.textContent=sg.remaining>0?`الجولة القادمة بعد ${Math.ceil(sg.remaining)} ثانية من اللعب`:'بدء جولة جديدة';again.onclick=()=>{if(api.startShelfRound?.())refresh();};sort.appendChild(again);}
   }
   const staffBox=get('ltQuestStaff');staffBox.textContent='';const strong=doc.createElement('strong');strong.textContent='👔 مواقع الموظفين والزي الرسمي';staffBox.appendChild(strong);const p=doc.createElement('p');p.textContent='زي موحد كحلي وبنطال داكن وهوية ذهبية. يتوجه كل موظف لنقطة عمله ويبقى هناك. عامل النظافة يتحرك ضمن منطقته فقط.';staffBox.appendChild(p);
   (s.positions||[]).forEach(person=>{const line=doc.createElement('div');line.className='lt-quest-position';const n=doc.createElement('span');n.textContent=person.name;const v=doc.createElement('b');v.textContent=person.ok?'✓ بموقعه':'◌ بالطريق';line.append(n,v);staffBox.appendChild(line);});
  }
  const timer=win.setInterval(refresh,1100);refresh();return {refresh,stop:()=>win.clearInterval(timer)};
 }
 return Object.freeze({campaign,events,sortingCases,missionAt,snapshot,progress,mount});
});
