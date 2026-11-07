(() => {
  'use strict';
  const C = window.LibraryTycoonCore;
  if (!C) { document.body.textContent = 'Game core unavailable'; return; }
  const $ = id => document.getElementById(id);
  const canvas = $('world'), ctx = canvas.getContext('2d', {alpha:false});
  const SAVE_KEY = 'uot-library-tycoon-isometric-preview-v1';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) {}
  const s = C.normalizedState(saved);
  const view = {width:1300,height:790,scale:1,originX:0,originY:0,zoom:1,panX:0,panY:0};
  const Iso={ox:610,oy:79,tw:30,th:16,height:37};
  const shelves = [{id:'shelf-A',x:9.2,y:2.3},{id:'shelf-B',x:11.8,y:2.3},{id:'shelf-C',x:14.2,y:2.3}];
  let paused=false, speed=1, last=performance.now(), dragging=null, pointerMoved=false, toastTimer=0, lastSave=0;
  const rooms=[
    {x:0,y:0,w:7.4,d:5.4,color:'#b7d6d2',title:'قاعة الحاسوب',label:[3.7,1.2]},
    {x:7.4,y:0,w:8.2,d:5.4,color:'#ebcfa6',title:'المقتنيات والرفوف',label:[11.7,.7]},
    {x:15.6,y:0,w:4.4,d:5.4,color:'#d6c9b4',title:'الإدارة',label:[17.6,1.4]},
    {x:0,y:5.4,w:6.7,d:8.6,color:'#e5d6b6',title:'الإرشاد والمراجع',label:[2.1,7.2]},
    {x:6.7,y:5.4,w:8.9,d:8.6,color:'#d8e0b7',title:'قاعة المطالعة',label:[10.2,6.1]},
    {x:15.6,y:5.4,w:4.4,d:8.6,color:'#e4c8a4',title:'الإعارة والاستعارة',label:[17.45,5.4]}
  ];
  const furniture=[];
  function add(kind,x,y,extra={}){furniture.push({kind,x,y,...extra});}
  [[2.1,2.2],[3.8,2.3],[5.2,2.4],[2.2,4],[4,4.1],[5.6,4.1]].forEach((p,i)=>add('computer',...p,{i}));
  [[9.2,2.25],[11.8,2.25],[14.2,2.25],[9.5,4.3],[12.2,4.25]].forEach((p,i)=>add('shelf',...p,{i}));
  [[9.1,7.2],[11.7,7.4],[8.8,10.3],[12.7,10.2]].forEach((p,i)=>add('table',...p,{i}));
  [[.9,7.7],[17.7,8.0],[17,3.6]].forEach((p,i)=>add('counter',...p,{i}));
  [[.8,1.3],[6.9,4.9],[7.3,7.3],[14.4,6.2],[15.6,12.8],[19.3,4.8],[2,12.4],[19,12.7]].forEach(p=>add('plant',...p));
  add('printer',17.9,10.8);
  add('door',19.65,13.4);
  const people=[
    {x:2.3,y:2.75,color:'#e58a43',name:'طالب'},{x:3.75,y:2.9,color:'#b44c75',name:'طالبة'},
    {x:5.4,y:2.9,color:'#4a78a6',name:'طالب'},{x:2.4,y:4.5,color:'#4a8675',name:'طالب'},
    {x:9.3,y:8.1,color:'#c47055',name:'طالبة'},{x:11.8,y:8.1,color:'#56809b',name:'طالب'},
    {x:8.8,y:11.0,color:'#c39b5f',name:'طالب'},{x:12.9,y:11.2,color:'#b86682',name:'طالبة'},
    {x:4.4,y:9.3,color:'#617ba0',name:'طالب'},{x:13.1,y:3.8,color:'#789c5c',name:'طالبة'},
    {x:8.2,y:4.1,color:'#ae6951',name:'طالب'},{x:5.5,y:12.3,color:'#7e8bb0',name:'طالب'}
  ];
  const staff=[{role:'borrow',x:16.9,y:8},{role:'reference',x:3.9,y:7.9},{role:'computer',x:5.3,y:3.4},{role:'reading',x:11.9,y:8.8}];
  function iso(x,y,z=0){return [Iso.ox+(x-y)*Iso.tw,Iso.oy+(x+y)*Iso.th-z*Iso.height];}
  function poly(points,fill,stroke,line=1){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
  function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}}
  function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function box(x,y,w,d,h,top='#fff8d9',front='#9c774e',side='#805b45',stroke='#8d6b51'){
    const A=iso(x,y),B=iso(x+w,y),D=iso(x,y+d),C=iso(x+w,y+d);
    const at=iso(x,y,h),bt=iso(x+w,y,h),dt=iso(x,y+d,h),ct=iso(x+w,y+d,h);
    poly([B,C,ct,bt],side,stroke,.9);poly([D,C,ct,dt],front,stroke,.9);poly([at,bt,ct,dt],top,stroke,.9);
    return {A,B,C,D,at,bt,ct,dt};
  }
  function floorRect(x,y,w,d,fill,outline='#d8bf8e') {
    poly([iso(x,y),iso(x+w,y),iso(x+w,y+d),iso(x,y+d)],fill,outline,1.1);
  }
  function wall(x1,y1,x2,y2,h=1.5){
    const p=iso(x1,y1),q=iso(x2,y2),pt=iso(x1,y1,h),qt=iso(x2,y2,h);
    poly([p,q,qt,pt],'#e6d7b4','#9f8a63',1.2);
    line(pt,qt,'#fef8df',4);line(p,q,'#af914e',2.1);
  }
  function label(text,x,y,width=0){
    let [px,py]=iso(x,y,2.0);
    ctx.font='bold 15px Tahoma, Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    const w=width||Math.max(112,ctx.measureText(text).width+28),h=33;
    ctx.fillStyle='#172e4b';ctx.strokeStyle='#d9a94f';ctx.lineWidth=2.5;
    roundRect(px-w/2,py-h/2,w,h,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff0bf';ctx.fillText(text,px,py+.5);
  }
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function tree(sx,sy,large=1){
    ellipse(sx,sy,20*large,7*large,'#517b5080');
    ctx.fillStyle='#79583b';ctx.fillRect(sx-5*large,sy-44*large,10*large,44*large);
    for(let i=0;i<6;i++) {const a=i*Math.PI/3;ellipse(sx+Math.cos(a)*19*large,sy-55*large+Math.sin(a)*8*large,23*large,19*large,i%2?'#5f9e5c':'#78b76e','#4b8650');}
    ellipse(sx,sy-58*large,19*large,18*large,'#83c279');
  }
  function environment(){
    const g=ctx.createLinearGradient(0,0,0,790);g.addColorStop(0,'#b6dbaa');g.addColorStop(.5,'#b8dbaa');g.addColorStop(1,'#8bb99b');ctx.fillStyle=g;ctx.fillRect(0,0,1300,790);
    for(let i=0;i<26;i++){const x=(i*127+13)%1330,y=(i*151+29)%760;ellipse(x,y,50,10,'#e4e5ae33');}
    poly([[40,585],[410,360],[1210,545],[1330,685],[1190,760],[350,760]],'#d0c8ac','#bfb99d');
    for(let i=0;i<32;i++){const y=580+i*11;line([20,y],[1280,y+30],'#e0d8bd88',1);}
    [[78,120],[150,230],[1100,160],[1215,300],[1160,680],[160,730],[450,755],[1000,725]].forEach(([x,y],i)=>tree(x,y,i%3?.85:1.05));
    [[150,420],[1160,570],[400,92]].forEach(([x,y])=>{ellipse(x,y,40,17,'#86b98e');for(let a=0;a<6;a++){const t=a*Math.PI/3;ellipse(x+Math.cos(t)*25,y+Math.sin(t)*10,9,4,a%2?'#e5c35b':'#eea677');}});
  }
  function drawBase(){
    const A=iso(0,0),B=iso(20,0),D=iso(0,14),E=iso(20,14);
    poly([D,E,[E[0],E[1]+34],[D[0],D[1]+34]],'#987b5a','#92704c',2);
    poly([B,E,[E[0],E[1]+34],[B[0],B[1]+34]],'#b79a77','#907858',2);
    poly([A,B,E,D],'#f2dfb9','#c0a16d',3);
    rooms.forEach(r=>floorRect(r.x+.05,r.y+.05,r.w-.1,r.d-.1,r.color,'#d1b187'));
    floorRect(7.3,5.6,8,7.75,'#d5e0bc','#c9ba80');
    floorRect(7.7,6.0,7.3,6.95,'#6d998b','#c3a25b');
    floorRect(8,6.3,6.7,6.4,'#b9d6aa','#d6af60');
    for(let a=1;a<20;a+=1){if(a===8||a===14)continue;line(iso(a,0),iso(a,14),'#c4bda050',.55);}
    for(let b=1;b<14;b+=1){if(b===5)continue;line(iso(0,b),iso(20,b),'#c4bda050',.55);}
    [[0,5.4,7.4,5.4],[7.4,5.4,15.5,5.4],[15.6,5.4,20,5.4],[6.7,5.4,6.7,14],[15.6,5.4,15.6,13.9],[7.4,0,7.4,5.4],[15.6,0,15.6,5.4]].forEach(([x,y,x2,y2])=>{
      if(x===6.7||x===15.6){wall(x,y,x2,y2,.37);}else wall(x,y,x2,y2,.42);
    });
    wall(0,0,20,0,1.2); wall(0,0,0,14,1.05);
  }
  function drawShelf(obj){
    const {x,y,i}=obj; const level=s.upgrades.shelves;
    const h=1.7+(level-1)*.13;
    box(x,y,1.18,.62,h,'#b77a3d','#925726','#7e4d2e','#704627');
    const [px,py]=iso(x+.25,y+.7,h*.46);
    for(let row=0;row<2;row++) for(let col=0;col<7;col++){
      const color=['#264f74','#b7544b','#e2b44c','#578567','#784c85','#f0cfa6'][((i||0)+row+col)%6];
      ctx.fillStyle=color;const xx=px+col*4.1-row*1,yy=py-22*row;
      ctx.fillRect(xx,yy,3.6,17+((i+col)%3)*2);
    }
    const [a,b]=iso(x+.22,y+.7,h*.46);line([a-4,b+26],[a+32,b+26],'#573b2c',2);
    if(level>=3){const top=iso(x+.5,y+.3,h+.1);ellipse(top[0],top[1],8,5,'#e9ce86');}
  }
  function drawComputer(obj){
    const {x,y}=obj;
    box(x,y,.95,.73,.37,'#e7bd80','#a17349','#90694c');
    const [cx,cy]=iso(x+.42,y+.36,.6);
    ctx.fillStyle='#162f48';ctx.fillRect(cx-15,cy-19,31,21);
    ctx.fillStyle='#56aed3';ctx.fillRect(cx-12,cy-16,24,15);
    ctx.fillStyle='#c9deeb';ctx.fillRect(cx-3,cy+2,7,9);
    ellipse(cx+9,cy+13,15,5,'#6b6558');
  }
  function drawTable(obj){
    const {x,y}=obj;
    box(x,y,1.55,1.0,.41,'#e1b27a','#a8784f','#956341');
    for(const [dx,dy] of [[.3,.16],[1.0,.28]]){
      const [a,b]=iso(x+dx,y+dy,.51);
      ctx.fillStyle='#f6f1d4';ctx.fillRect(a-9,b-7,17,14);
      line([a,b],[a,b+8],'#dbb258',1);
    }
    const [a,b]=iso(x+.81,y+.48,.47);
    ctx.strokeStyle='#ae7b34';ctx.lineWidth=2;ctx.beginPath();ctx.arc(a,b-11,8,0,Math.PI*2);ctx.stroke();
    ellipse(a,b-16,8,5,'#27885a','#2e694a');
  }
  function drawCounter(obj){
    const {x,y,i}=obj;
    box(x,y,1.9,.85,.9,'#e8c38e','#bb8559','#8b6748');
    const [a,b]=iso(x+.7,y+.5,.92);
    ctx.fillStyle='#1a3652';ctx.fillRect(a-12,b-19,28,21);
    ctx.fillStyle='#8bc0c4';ctx.fillRect(a-9,b-16,22,14);
    if(i!==2){const [c,d]=iso(x+1.2,y+.7,1.02);ctx.fillStyle='#f4ebd1';ctx.fillRect(c,d-8,24,8);}
  }
  function drawPlant(obj){
    const [a,b]=iso(obj.x,obj.y,.05);ellipse(a,b+4,11,5,'#64886930');
    box(obj.x-.18,obj.y-.18,.36,.36,.32,'#cda76f','#bc8154','#a36a49');
    for(let i=0;i<5;i++){const angle=i*2.399;ellipse(a+Math.sin(angle)*10,b-23+Math.cos(angle)*8,8,12,i%2?'#3d9464':'#50a56a','#377a53');}
  }
  function drawPrinter(obj){
    box(obj.x,obj.y,1,.7,.62,'#e5e7df','#a8b3b7','#899eab');const [x,y]=iso(obj.x+.3,obj.y+.4,.65);
    ctx.fillStyle='#24445f';ctx.fillRect(x-12,y-9,25,8);ctx.fillStyle='#f5f5e9';ctx.fillRect(x-7,y-14,17,7);
    if(s.event?.type==='printer')drawBubble('!',obj.x+.4,obj.y+.3,1.35,'#bd4945');
  }
  function drawPerson(x,y,{uniform=false,cleaner=false,color='#6f8cb5',seed=0,walking=false}={}){
    const [sx,sy]=iso(x,y);
    const bob=walking?Math.sin(performance.now()*.007+seed*2)*2:Math.sin(performance.now()*.0018+seed)*.7;
    ellipse(sx,sy+5,12,5,'#384f3b55');
    ctx.strokeStyle=uniform?'#223e5b':'#4e5265';ctx.lineWidth=4.4;ctx.lineCap='round';
    line([sx-3,sy-7+bob],[sx-5,sy+2+bob],ctx.strokeStyle,4.4);
    line([sx+3,sy-7+bob],[sx+6,sy+3+bob],ctx.strokeStyle,4.4);
    ellipse(sx,sy-17+bob,10,13,cleaner?'#428fbe':uniform?'#1a3a61':color,'#26374b');
    ctx.strokeStyle=cleaner?'#8fb5cf':uniform?'#e5c16b':'#e2d0b5';ctx.lineWidth=2;
    line([sx-7,sy-22+bob],[sx+6,sy-10+bob],ctx.strokeStyle,uniform?2:1);
    ctx.fillStyle='#f1c39d';ellipse(sx,sy-34+bob,8.1,8.6,'#f1c39d','#ba8868');
    ellipse(sx,sy-38+bob,8.7,3.3,cleaner?'#2f719e':seed%4===0?'#54342e':'#363b46');
    if(cleaner){ctx.fillStyle='#3f92bf';ctx.fillRect(sx-8,sy-42+bob,18,3);}
    ellipse(sx-2.5,sy-34+bob,.85,1.1,'#28384a');ellipse(sx+3,sy-34+bob,.85,1.1,'#28384a');
    ctx.strokeStyle='#26384b';ctx.lineWidth=2;
    line([sx-10,sy-18+bob],[sx-13,sy-8+bob],'#c99b7c',2.8);
    line([sx+10,sy-18+bob],[sx+12,sy-8+bob],'#c99b7c',2.8);
    if(uniform){ctx.fillStyle='#e9c362';ctx.fillRect(sx-2,sy-24+bob,3,11);ellipse(sx+7,sy-16+bob,2.6,2,'#ecca67');}
    if(cleaner){line([sx+14,sy-4],[sx+22,sy+22],'#6b5b3f',2);ellipse(sx+22,sy+22,8,3,'#e0e4db');}
  }
  function drawBubble(text,x,y,z=1.2,bg='#ffffff') {
    const [a,b]=iso(x,y,z);ellipse(a,b,17,15,bg,'#8eacaf');
    ctx.fillStyle=bg==='#ffffff'?'#16435a':'#fff';ctx.font='bold 18px Tahoma, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,a,b+1);
  }
  function drawMissionMarker(obj){
    const [x,y]=iso(obj.x+.65,obj.y+.35,2.2);const pulse=1+Math.sin(performance.now()*.004)*.08;
    ellipse(x,y,23*pulse,20*pulse,'#fff9e9f0','#d8a53d');ctx.fillStyle='#15405a';ctx.font='bold 20px Tahoma';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🔍',x,y+1);
  }
  function drawBuilding(){
    environment();drawBase();
    furniture.sort((a,b)=>a.x+a.y-b.x-b.y);
    for(const f of furniture){
      if(f.kind==='shelf')drawShelf(f);
      else if(f.kind==='computer')drawComputer(f);
      else if(f.kind==='table')drawTable(f);
      else if(f.kind==='counter')drawCounter(f);
      else if(f.kind==='plant')drawPlant(f);
      else if(f.kind==='printer')drawPrinter(f);
    }
    const drawables=[];
    for(const p of people)drawables.push({...p,kind:'student'});
    for(const p of staff)if(s.staffing[p.role])drawables.push({...p,kind:'staff'});
    const queue=Math.min(s.waits.borrow,7);
    for(let i=0;i<queue;i++)drawables.push({x:16.2-i*.47,y:9.5+i*.47,kind:'queue',seed:i,color:['#b9775a','#7ba4aa','#9e769c'][i%3]});
    if(s.staffing.cleaner)drawables.push({...s.cleaner,kind:'cleaner'});
    drawables.sort((a,b)=>a.x+a.y-b.x-b.y);
    for(let i=0;i<drawables.length;i++){const p=drawables[i];drawPerson(p.x,p.y,{uniform:p.kind==='staff',cleaner:p.kind==='cleaner',color:p.color,seed:i,walking:p.kind==='cleaner'});}
    // Cutaway front facade, kept low enough to maintain visibility of the activities.
    wall(0,14,20,14,.34);wall(20,0,20,14,.34);
    // Main entrance frame on the street-facing edge.
    const [ex,ey]=iso(18.55,14,.05);ctx.fillStyle='#193e5c';ctx.strokeStyle='#ddb969';ctx.lineWidth=3;
    roundRect(ex-34,ey-42,70,55,8);ctx.fill();ctx.stroke();ctx.fillStyle='#c0e0e5';ctx.fillRect(ex-27,ey-32,24,39);ctx.fillRect(ex+3,ey-32,24,39);
    ctx.strokeStyle='#daac56';ctx.lineWidth=2;ctx.strokeRect(ex-27,ey-32,54,39);ctx.font='24px Arial';ctx.textAlign='center';ctx.fillStyle='#ffe49e';ctx.fillText('📖',ex,ey-50);
    rooms.forEach(r=>label(r.title,...r.label));
    if(!s.flags.lost) shelves.forEach(m=>drawMissionMarker(m));
    if(s.event?.type==='rush')drawBubble('!',14.4,8.9,1.5,'#bf4a38');
    if(s.event?.type==='inspection')drawBubble('✓',18.1,2,2,'#2e8e6e');
    if(!s.staffing.borrow)drawBubble('⏸',16.9,8,2,'#af5f42');
  }
  function resize(){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
    view.scale=Math.min(rect.width/view.width,rect.height/view.height);
    view.originX=(rect.width-view.width*view.scale)/2;
    view.originY=(rect.height-view.height*view.scale)/2;
    view.dpr=dpr;
  }
  function render(t){
    if(!canvas.width)return;
    const rect=canvas.getBoundingClientRect();
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.fillStyle='#a6cdab';ctx.fillRect(0,0,rect.width,rect.height);
    const scale=view.scale*view.zoom;
    const ox=view.originX+(view.width-view.width*view.zoom)*view.scale/2+view.panX;
    const oy=view.originY+(view.height-view.height*view.zoom)*view.scale/2+view.panY;
    ctx.setTransform(view.dpr*scale,0,0,view.dpr*scale,view.dpr*ox,view.dpr*oy);
    drawBuilding();
    const elapsed=Math.min((t-last)/1000,.1);last=t;
    if(!paused)C.tick(s,elapsed*speed);
    if(t-lastSave>6000){save();lastSave=t;}
    requestAnimationFrame(render);
  }
  function worldPointFromEvent(e){
    const r=canvas.getBoundingClientRect(),sc=view.scale*view.zoom;
    const ox=view.originX+(view.width-view.width*view.zoom)*view.scale/2+view.panX;
    const oy=view.originY+(view.height-view.height*view.zoom)*view.scale/2+view.panY;
    return [(e.clientX-r.left-ox)/sc,(e.clientY-r.top-oy)/sc];
  }
  function clickScene(e){
    const [x,y]=worldPointFromEvent(e);
    if(!s.flags.lost){
      for(const m of shelves){const [mx,my]=iso(m.x+.65,m.y+.35,2.2);
        if(Math.hypot(x-mx,y-my)<27){const r=C.inspectShelf(s,m.id);toast(r.message);return;}
      }
    }
    const [pX,pY]=iso(18.2,11.1,1.0);
    if(Math.hypot(x-pX,y-pY)<38&&s.event?.type==='printer'){toast(C.repairPrinter(s).message);return;}
    for(const role of Object.keys(C.STAFF_POS)){
      const [cx,cy]=iso(...C.STAFF_POS[role],1);
      if(Math.hypot(cx-x,cy-y)<28){toast(`${C.ROLES[role].name}، الموظف ${s.staffing[role]?'يشتغل بمكانه':'خارج الدوام'}`);return;}
    }
  }
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);dragging={x:e.clientX,y:e.clientY,panX:view.panX,panY:view.panY};pointerMoved=false;});
  canvas.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;
    if(Math.hypot(dx,dy)>6)pointerMoved=true;
    if(pointerMoved){view.panX=dragging.panX+dx;view.panY=dragging.panY+dy;}
  });
  canvas.addEventListener('pointerup',e=>{if(dragging&&!pointerMoved)clickScene(e);dragging=null;});
  canvas.addEventListener('pointercancel',()=>{dragging=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoom=C.clamp(view.zoom+(e.deltaY>0?-.11:.11),.75,1.7);},{passive:false});
  $('zoomIn').onclick=()=>{view.zoom=C.clamp(view.zoom+.12,.75,1.7);};
  $('zoomOut').onclick=()=>{view.zoom=C.clamp(view.zoom-.12,.75,1.7);};
  $('resetCam').onclick=()=>{view.zoom=1;view.panX=0;view.panY=0;};
  function toast(message){
    $('toast').textContent=message;$('scene-event').textContent=message;
    $('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3400);
  }
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch(e){return false;}}
  $('saveBtn').onclick=()=>toast(save()?'تم حفظ التقدم على هذا المتصفح':'تعذر الحفظ بهذا المتصفح');
  $('newDayBtn').onclick=()=>{C.resetDay(s);toast(s.status);save();updateUI();};
  $('pauseBtn').onclick=()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶':'⏸';toast(paused?'تم إيقاف الوقت':'استأنفنا اللعب');};
  $('speedBtn').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speedBtn').textContent='×'+speed;};
  $('rushBtn').onclick=()=>{const r=C.startEvent(s,'rush');toast(r.message);updateUI();};
  $('inspectionBtn').onclick=()=>{const r=C.startEvent(s,'inspection');toast(r.message);updateUI();};
  $('printerBtn').onclick=()=>{const r=C.startEvent(s,'printer');toast(r.message);updateUI();};
  $('quickUpgrade').onclick=()=>{const r=C.upgrade(s,'shelves');toast(r.message);updateUI();};
  const modal=$('modal');$('closeModal').onclick=()=>modal.close();
  function showModal(title,html){$('modal-title').textContent=title;$('modal-content').innerHTML=html;modal.showModal();}
  $('helpBtn').onclick=()=>showModal('🎮 طريقة اللعب',`<div class="modal-body"><p>هذا نموذج تجريبي قابل للعب، ما يحتاج تحميل أو مفاتيح API.</p><ul><li>اسحب الخريطة للتنقل، أو قرّب وأبعد بالكاميرا.</li><li>اضغط علامات 🔍 فوق الأرفف حتى تلگى الكتاب.</li><li>نفّذ تحدي التصنيف عبر الزر أسفل الشاشة.</li><li>أطلق أحداث الامتحانات ولجنة الجودة من لوحة المهمات.</li><li>كل موظف ثابت بمحطته. إذا عطّلته من لوحة الموظفين راح تتوقف خدمته.</li><li>اضغط ترقية حتى يتغير أثاث الرفوف وترتفع مستويات القاعات.</li><li>التقدم يُحفظ على متصفحك، منفصل عن حفظ V2.5 القديم.</li></ul></div>`);
  function quizModal(){
    if(s.flags.catalog){showModal('📖 تحدي التصنيف','<div class="modal-body">أنجزت كل أسئلة التصنيف. تگدر تعيدها باليوم القادم.</div>');return;}
    const q=C.QUIZZES[s.quiz.question];
    showModal(`📖 تحدي التصنيف ${s.quiz.question+1}/${C.QUIZZES.length}`,`<div class="modal-body"><p>${q.q}</p>${q.options.map((t,i)=>`<button class="quiz-choice" data-answer="${i}">${t}</button>`).join('')}</div>`);
    $('modal-content').querySelectorAll('[data-answer]').forEach(el=>el.onclick=()=>{
      const r=C.answerQuiz(s,Number(el.dataset.answer));toast(r.message);modal.close();if(r.ok&&!r.complete)quizModal();updateUI();
    });
  }
  function staffModal(){
    const labels={...Object.fromEntries(Object.entries(C.ROLES).map(([k,r])=>[k,r.name])),cleaner:'عامل النظافة'};
    showModal('👔 توزيع الموظفين',`<p class="modal-caption">كل موظف يبقى بمكانه المخصص، وعامل النظافة يتحرك فقط داخل منطقته. التحكم التالي يفعّل أو يوقف المناوبة دون تنقّل عشوائي.</p>${Object.entries(labels).map(([k,label])=>`<div class="staff-row"><div><b>${label}</b><small>${k==='cleaner'?'منطقة النظافة المحددة':'محطة العمل ثابتة'}</small></div><span class="${s.staffing[k]?'status-on':'status-off'}">${s.staffing[k]?'نشط':'متوقف'}</span><button data-staff="${k}">${s.staffing[k]?'إيقاف المناوبة':'بدء المناوبة'}</button></div>`).join('')}`);
    $('modal-content').querySelectorAll('[data-staff]').forEach(el=>el.onclick=()=>{C.toggleStaff(s,el.dataset.staff);modal.close();staffModal();updateUI();});
  }
  function upgradeModal(){
    const costs={shelves:6000,desks:5000,computers:7500},labels={shelves:'📚 رفوف المقتنيات',desks:'🪑 طاولات المطالعة',computers:'💻 حاسبات الطلبة'};
    showModal('⬆️ ترقية القاعات',`<p class="modal-caption">تغيّر الترقيات مستوى القاعة ومظهر تجهيزاتها، مع مصاريف محسوبة بالدينار العراقي.</p>${Object.entries(labels).map(([k,label])=>{
      const price=costs[k]*s.upgrades[k],maximum=s.upgrades[k]>=4;
      return `<div class="upgrade-row"><div><b>${label}</b><small>المستوى ${s.upgrades[k]} / 4</small></div><button data-upgrade="${k}" ${maximum?'disabled':''}>${maximum?'مكتمل':price.toLocaleString('en-US')+' د.ع'}</button></div>`;
    }).join('')}`);
    $('modal-content').querySelectorAll('[data-upgrade]').forEach(el=>el.onclick=()=>{const r=C.upgrade(s,el.dataset.upgrade);toast(r.message);modal.close();upgradeModal();updateUI();});
  }
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');
    switch(btn.dataset.panel){case'quiz':quizModal();break;case'staff':staffModal();break;case'upgrades':upgradeModal();break;default:document.querySelector('.missions').scrollTo({top:0,behavior:'smooth'});}
  });
  function updateUI(){
    $('stat-money').textContent=Math.floor(s.money).toLocaleString('en-US');
    $('stat-satisfaction').textContent=Math.round(s.satisfaction)+'%';$('bar-satisfaction').style.width=s.satisfaction+'%';
    $('stat-cleanliness').textContent=Math.round(s.cleanliness)+'%';$('bar-cleanliness').style.width=s.cleanliness+'%';
    $('stat-reputation').textContent=s.reputation.toFixed(1);$('stat-visitors').textContent=s.visitors;
    $('stat-served').textContent=s.served;$('day').textContent=s.day;
    const m=Math.floor(s.clock*1.6)%(10*60);const hours=8+Math.floor((30+m)/60),mins=(30+m)%60;
    $('clock').textContent=String(hours).padStart(2,'0')+':'+String(mins).padStart(2,'0');
    const servedRush=Math.max(0,s.served-s.rush.startServed);
    const progress={lost:s.flags.lost?1:s.book.guesses/3,rush:s.flags.rush?1:Math.min(1,servedRush/10),inspection:s.flags.inspection?1:0,catalog:s.flags.catalog?1:s.quiz.question/C.QUIZZES.length};
    $('mission-count').textContent=Object.values(s.flags).filter(Boolean).length+'/4';
    $('mission-list').innerHTML=C.MISSION_META.map(m=>`<div class="mission-card ${s.flags[m.id]?'done':''}"><div class="mission-name"><span>${m.name}</span><span>${s.flags[m.id]?'✅':'○'}</span></div><p>${m.description}</p><div class="mission-footer"><span class="progress">${s.flags[m.id]?'مكتملة':m.id==='lost'?s.book.guesses+'/3 محاولات':m.id==='rush'?servedRush+'/10 منجز':m.id==='catalog'?s.quiz.question+'/3 أسئلة':'بانتظار اللجنة'}</span><span class="reward">🪙 ${m.reward.toLocaleString('en-US')}</span></div><div class="progress-track"><span style="width:${Math.round(progress[m.id]*100)}%"></span></div></div>`).join('');
    const labels={rush:'ازدحام الامتحانات',inspection:'لجنة الجودة',printer:'تعطل الطابعة'};
    $('event-info').textContent=s.event?`${labels[s.event.type]}، متبقي ${Math.max(0,Math.ceil(s.event.remaining))} ثانية`:'ماكو حدث جاري حالياً';
    $('rushBtn').disabled=!!s.event||s.flags.rush;$('inspectionBtn').disabled=!!s.event||s.flags.inspection;
    $('printerBtn').disabled=!!s.event;
    const next=s.upgrades.shelves*6000;
    $('quickUpgrade').disabled=s.upgrades.shelves>=4;
    $('quickUpgrade').innerHTML=`${s.upgrades.shelves>=4?'مكتمل':'ترقية'}<br><small>${next.toLocaleString('en-US')} د.ع</small>`;
  }
  window.addEventListener('resize',resize);
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  setInterval(updateUI,550);
  resize();updateUI();requestAnimationFrame(render);
})();