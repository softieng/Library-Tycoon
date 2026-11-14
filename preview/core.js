/* Library Tycoon isometric preview gameplay core, original code, no runtime dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LibraryTycoonCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const ROLES = Object.freeze({
    borrow: { name: 'الإعارة', pos: [16.9, 8.0], fee: 170, duration: 6.5 },
    reference: { name: 'المراجع', pos: [3.9, 7.9], fee: 115, duration: 7.5 },
    computer: { name: 'الحاسوب', pos: [5.3, 3.4], fee: 140, duration: 8 },
    reading: { name: 'المطالعة', pos: [11.9, 8.8], fee: 110, duration: 5.5 }
  });
  const ROOM_NAMES = {borrow:'الاستعارة',reference:'المراجع',computer:'الحاسوب',reading:'المطالعة'};
  const INITIAL_STAFF = {borrow:true,reference:true,computer:true,reading:true,cleaner:true};
  const STAFF_POS = Object.freeze({
    borrow: Object.freeze([16.9, 8.0]), reference:Object.freeze([3.9, 7.9]),
    computer:Object.freeze([5.3, 3.4]), reading:Object.freeze([11.9, 8.8])
  });
  const CLEANING_ZONE = Object.freeze({x0:15.6,x1:19.2,y0:10.3,y1:13.7});
  const MISSION_META = [
    {id:'lost',name:'📚 كتاب مفقود',description:'فتّش الرفوف المضيئة وحدد مكان الكتاب',reward:5000},
    {id:'rush',name:'👥 ازدحام الامتحانات',description:'أكمل خدمة 10 طلبة خلال حالة الازدحام',reward:9000},
    {id:'inspection',name:'📋 زيارة لجنة الجودة',description:'حافظ على رضا 75% ونظافة 85% وطابور ≤4',reward:8000},
    {id:'catalog',name:'🔎 تحدي تصنيف الكتب',description:'حلّ سؤال التصنيف الصحيح',reward:1800}
  ];
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function initialState() {
    return {
      version: VERSION, day: 1, clock: 0, money: 72000, satisfaction: 86,
      cleanliness: 91, reputation: 4.3, visitors: 0, served: 0,
      waits: {borrow:0, reference:0, computer:0, reading:0},
      cooldowns: {borrow:0, reference:0, computer:0, reading:0},
      staffing: {...INITIAL_STAFF}, upgrades: {shelves:1, desks:1, computers:1},
      cleaner: {x:16.0,y:11.9}, _spawn:0, _cleanT:0,
      status: '', event: null, flags: {lost:false,rush:false,inspection:false,catalog:false},
      book: {target: 'shelf-B', guesses:0}, rush: {startServed:0},
      quiz: {question:0,complete:false}, announcements: []
    };
  }
  function normalizedState(input) {
    const s = initialState();
    if (!input || input.version !== VERSION) return s;
    for (const k of ['day','clock','money','satisfaction','cleanliness','reputation','visitors','served']) {
      if (typeof input[k] === 'number' && Number.isFinite(input[k])) s[k] = input[k];
    }
    for (const key of Object.keys(ROLES)) {
      if (typeof input.waits?.[key] === 'number') s.waits[key]=clamp(Math.floor(input.waits[key]),0,99);
      if (typeof input.cooldowns?.[key] === 'number') s.cooldowns[key]=clamp(input.cooldowns[key],0,100);
    }
    for (const k of Object.keys(s.upgrades)) if (Number.isInteger(input.upgrades?.[k])) s.upgrades[k] = clamp(input.upgrades[k],1,4);
    for (const k of Object.keys(s.staffing)) if (typeof input.staffing?.[k] === 'boolean') s.staffing[k]=input.staffing[k];
    for (const k of Object.keys(s.flags)) if (typeof input.flags?.[k] === 'boolean') s.flags[k]=input.flags[k];
    s.cleaner = {x:clamp(Number(input.cleaner?.x)||16, CLEANING_ZONE.x0,CLEANING_ZONE.x1), y:clamp(Number(input.cleaner?.y)||12,CLEANING_ZONE.y0,CLEANING_ZONE.y1)};
    s.book = {target: ['shelf-A','shelf-B','shelf-C'].includes(input.book?.target)?input.book.target:'shelf-B', guesses:clamp(Number(input.book?.guesses)||0,0,3)};
    s.rush = {startServed:Number(input.rush?.startServed)||0};
    s.quiz = {question:clamp(Number(input.quiz?.question)||0,0,3),complete:!!input.quiz?.complete};
    if (input.event && ['rush','inspection','printer'].includes(input.event.type)) {
      s.event={type:input.event.type, remaining:clamp(Number(input.event.remaining)||0,0,120)};
    }
    s.satisfaction=clamp(s.satisfaction,0,100); s.cleanliness=clamp(s.cleanliness,0,100); s.reputation=clamp(s.reputation,1,5);
    return s;
  }
  function enqueue(s, role) {
    if (!ROLES[role]) return false;
    if (s.waits[role] >= 18) { s.satisfaction=clamp(s.satisfaction-1.5,0,100); return false; }
    s.waits[role]++; s.visitors++; return true;
  }
  function tick(s, dt, random=Math.random) {
    dt=clamp(Number(dt)||0,0,2);
    s.clock+=dt;
    s._spawn+=dt;
    s._cleanT+=dt;
    const arrivalEvery=s.event?.type==='rush'?1.3:4.4;
    while(s._spawn>=arrivalEvery) {
      s._spawn-=arrivalEvery;
      const keys=Object.keys(ROLES);
      enqueue(s,keys[Math.floor(random()*keys.length)%keys.length]);
    }
    const waiting=Object.values(s.waits).reduce((a,b)=>a+b,0);
    if (waiting>7) s.satisfaction=clamp(s.satisfaction-dt*.32,0,100);
    if (waiting>12) s.cleanliness=clamp(s.cleanliness-dt*.14,0,100);
    for (const [role, cfg] of Object.entries(ROLES)) {
      if (!s.staffing[role]) continue;
      s.cooldowns[role]-=dt;
      if(s.waits[role]>0 && s.cooldowns[role]<=0) {
        s.waits[role]--;
        s.served++;
        s.money += cfg.fee;
        s.satisfaction=clamp(s.satisfaction+0.23,0,100);
        const speed=role==='computer'?s.upgrades.computers:role==='reading'?s.upgrades.desks:1;
        s.cooldowns[role] = cfg.duration/Math.max(1,speed*.75);
      }
    }
    s.cleanliness=clamp(s.cleanliness+dt*(s.staffing.cleaner?.12:-.17),0,100);
    if (s.staffing.cleaner) {
      // Constrained patrol. Never allow cleaner to leave assigned zone.
      const a = s.clock*.44;
      s.cleaner.x=clamp(17.25+Math.cos(a)*1.0,CLEANING_ZONE.x0,CLEANING_ZONE.x1);
      s.cleaner.y=clamp(12.0+Math.sin(a)*1.12,CLEANING_ZONE.y0,CLEANING_ZONE.y1);
    }
    if (s.event) {
      s.event.remaining-=dt;
      if(s.event.remaining<=0) finishEvent(s);
    }
    const total=s.served+waiting;
    const efficiency=total? s.served/total : 1;
    s.reputation=clamp(1+2*s.satisfaction/100+1.1*s.cleanliness/100+.9*efficiency,1,5);
    return s;
  }
  function reward(s, key, amount) {
    if (s.flags[key]) return false;
    s.flags[key]=true;
    s.money+=amount;
    s.status=`أنجزت المهمة! مكافأة ${amount.toLocaleString('en-US')} دينار`;
    s.announcements.push({t:s.clock,message:s.status});
    s.announcements=s.announcements.slice(-5);
    return true;
  }
  function inspectShelf(s,id) {
    if(s.flags.lost) return {ok:false,message:'أنجزت مهمة الكتاب المفقود بالفعل'};
    if(!['shelf-A','shelf-B','shelf-C'].includes(id)) return {ok:false,message:'هذا الرف غير معروف'};
    if(s.book.guesses>=3) return {ok:false,message:'انتهت محاولات البحث لهذه الجولة'};
    s.book.guesses++;
    if (id!==s.book.target) return {ok:false,message:'الكتاب مو بهذا الرف، حاول برف آخر'};
    reward(s,'lost',5000);
    return {ok:true,message:'عثرنا على الكتاب المفقود! +5,000 دينار'};
  }
  function startEvent(s,type) {
    if(s.event) return {ok:false,message:'أكو حدث جاري، أكمله أولاً'};
    if(type==='rush') {
      if(s.flags.rush) return {ok:false,message:'مهمة الامتحانات مكتملة'};
      s.rush.startServed=s.served;
      s.event={type,remaining:65};
      return {ok:true,message:'بدأ أسبوع الامتحانات، خدم 10 طلبة'};
    }
    if(type==='inspection') {
      if(s.flags.inspection) return {ok:false,message:'لجنة الجودة زارت المكتبة بالفعل'};
      s.event={type,remaining:22};
      return {ok:true,message:'اللجنة بالطريق، حافظ على النظافة والرضا'};
    }
    if(type==='printer') {
      s.event={type,remaining:36};
      return {ok:true,message:'الطابعة تعطلت، اضغط إصلاح العطل'};
    }
    return {ok:false,message:'حدث غير معروف'};
  }
  function finishEvent(s) {
    const event=s.event; if(!event) return;
    if(event.type==='rush') {
      const served=s.served-s.rush.startServed;
      if(served>=10 && s.satisfaction>=70) reward(s,'rush',9000);
      else s.status=`انتهى الازدحام، تمت خدمة ${served} من 10 طلبة`;
    } else if(event.type==='inspection') {
      const waiting=Object.values(s.waits).reduce((a,b)=>a+b,0);
      if(s.satisfaction>=75 && s.cleanliness>=85 && waiting<=4) reward(s,'inspection',8000);
      else s.status='لجنة الجودة تحتاج تحسين الرضا والنظافة وتقليل الطابور';
    } else if(event.type==='printer') {
      s.satisfaction=clamp(s.satisfaction-5,0,100);
      s.status='تأخر إصلاح الطابعة، انخفض رضا الزوار';
    }
    s.event=null;
  }
  function repairPrinter(s) {
    if(s.event?.type!=='printer') return {ok:false,message:'ماكو عطل بالطابعة'};
    if(s.money<400) return {ok:false,message:'الرصيد غير كافي للإصلاح'};
    s.money-=400; s.satisfaction=clamp(s.satisfaction+2,0,100);s.event=null;
    s.status='تم إصلاح الطابعة وعادت الخدمة';
    return {ok:true,message:s.status};
  }
  function upgrade(s,kind) {
    const costs={shelves:6000,desks:5000,computers:7500};
    if(!costs[kind]) return {ok:false,message:'ترقية غير معروفة'};
    if(s.upgrades[kind]>=4) return {ok:false,message:'وصلت للحد الأعلى لهذه الترقية'};
    const price=costs[kind]*s.upgrades[kind];
    if(s.money<price) return {ok:false,message:'رصيدك ما يكفي للترقية'};
    s.money-=price;s.upgrades[kind]++;
    s.satisfaction=clamp(s.satisfaction+1,0,100);
    return {ok:true,message:`تمت ترقية ${kind} إلى المستوى ${s.upgrades[kind]} بمبلغ ${price.toLocaleString('en-US')} دينار`};
  }
  function toggleStaff(s,role) {
    if(!Object.prototype.hasOwnProperty.call(s.staffing,role)) return false;
    s.staffing[role]=!s.staffing[role];return s.staffing[role];
  }
  const QUIZZES=[
    {q:'طالب يريد استعارة كتاب لمدة أسبوع. وين يتوجه؟', options:['قاعة الحاسوب','مكتب الإعارة','قاعة المطالعة'],correct:1},
    {q:'باحث يحتاج مصادر علمية ومراجع. وين يتوجه؟',options:['مكتب الإرشاد والمراجع','مكتب الإعارة','الإدارة'],correct:0},
    {q:'طالب يريد يستخدم برنامج هندسي. وين يتوجه؟',options:['قاعة المطالعة','مكتب الإعارة','قاعة الحاسوب'],correct:2}
  ];
  function answerQuiz(s,index) {
    if(s.flags.catalog) return {ok:false,message:'المهمة مكتملة'};
    const q=QUIZZES[s.quiz.question];
    if(!q) return {ok:false,message:'انتهت الأسئلة'};
    if(index!==q.correct) {s.satisfaction=clamp(s.satisfaction-.5,0,100);return {ok:false,message:'جواب غير صحيح، جرّب مرة ثانية'};}
    s.quiz.question++;
    if(s.quiz.question>=QUIZZES.length) {reward(s,'catalog',1800);return {ok:true,complete:true,message:'ممتاز! أكملت تحدي التصنيف، +1,800 دينار'};}
    return {ok:true,complete:false,message:'اختيار صحيح، انتقل للسؤال التالي'};
  }
  function resetDay(s) {
    s.day++;s.flags={lost:false,rush:false,inspection:false,catalog:false};
    s.quiz={question:0,complete:false};s.book={target:['shelf-A','shelf-B','shelf-C'][s.day%3],guesses:0};
    s.event=null; s.status='بدأ يوم جديد في المكتبة';
  }
  return { VERSION, ROLES, ROOM_NAMES, STAFF_POS, CLEANING_ZONE, MISSION_META, QUIZZES, initialState, normalizedState, clamp, enqueue, tick, inspectShelf, startEvent, finishEvent, repairPrinter, upgrade, toggleStaff, answerQuiz, resetDay };
});