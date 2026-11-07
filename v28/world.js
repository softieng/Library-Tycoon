/* Library Tycoon V2.8 | actual Kenney CC0 GLB props and rigged characters.
   Original source: https://github.com/Hidencod/tge-assets (Kenney Furniture Kit & Mini Characters).
   Babylon.js scene and compositions authored for UOT Central Library.
   Deliberately no logo substitutions, no AI assets, no runtime AI API. */
(function (root) {
'use strict';
const ASSETS = Object.freeze({
  bookcase:'bookcaseopen', lowcase:'bookcaseopenlow', closedcase:'bookcaseclosedwide', books:'books',
  table:'table', desk:'desk', chair:'chaircushion', deskchair:'chairdesk', roundchair:'chairrounded',
  laptop:'laptop', monitor:'computerscreen', plant:'pottedplant', plant2:'plantsmall2',
  lamp:'lamproundtable', bench:'bench', rug:'rugrectangle', trash:'trashcan', coffee:'tablecoffee',
  maleA:'character-male-b', maleB:'character-male-e', femaleA:'character-female-a', femaleB:'character-female-e'
});
const MODEL_HEIGHT = {bookcase:2.9,lowcase:1.45,closedcase:2.7,books:.26,table:.94,desk:1.0,chair:1.0,deskchair:1.14,roundchair:.94,laptop:.30,monitor:.65,plant:1.05,plant2:.48,lamp:.51,bench:.88,rug:.035,trash:.58,coffee:.66,maleA:1.7,maleB:1.7,femaleA:1.7,femaleB:1.7};
const ACTOR_IDS = new Set(['maleA','maleB','femaleA','femaleB']);
const FURNITURE_KEYS = Object.keys(ASSETS).filter(k=>!ACTOR_IDS.has(k));
const RACKS = Object.freeze(['A','B','C','D']);
const FIXED_STAFF = Object.freeze({lending:{x:8.35,z:4.15},information:{x:-8.6,z:3.75}});
const CLEAN_ZONE = Object.freeze({minX:9.5,maxX:10.7,minZ:-3.2,maxZ:-1.0});
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function routePoint(from,to,t){return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t};}
const VISITOR_ROUTES = [
  [{x:-8.0,z:6.7},{x:-6.4,z:6.7},{x:-6.4,z:5.9},{x:-3.7,z:5.9},{x:-3.7,z:6.7}],
  [{x:-1.7,z:6.5},{x:.5,z:6.5},{x:.5,z:5.5},{x:3.6,z:5.5},{x:3.6,z:6.5}],
  [{x:6.5,z:6.7},{x:7.6,z:6.7},{x:7.6,z:7.3},{x:5.6,z:7.3}],
  [{x:-1.6,z:-3.0},{x:-1.0,z:-3.0},{x:-1.0,z:-2.6},{x:1.6,z:-2.6}]
];
function routePosition(points,t){const pos=((t%1)+1)%1*(points.length-1),index=Math.min(points.length-2,Math.floor(pos));return routePoint(points[index],points[index+1],pos-index);}
function sourceURL(key){const name=ASSETS[key],folder=ACTOR_IDS.has(key)?'mini-characters':'furniture-kit';return './assets/'+name+'.glb';}
async function createLibraryWorld(canvas,onAction,options={}){
 if(!root.BABYLON)throw Error('Babylon.js missing, scene was not started');
 const B=root.BABYLON, V=B.Vector3, C=B.Color3;
 const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
 const scene=new B.Scene(engine);scene.clearColor=new B.Color4(.16,.27,.31,1);scene.ambientColor=new C(.31,.34,.35);scene.imageProcessingConfiguration.contrast=1.14;scene.imageProcessingConfiguration.exposure=1.05;
 const camera=new B.ArcRotateCamera('fixedCutaway',Math.PI*.24,1.09,38,new V(0,1,0),scene);
 camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;camera.minZ=.1;camera.maxZ=200;camera.lowerAlphaLimit=camera.upperAlphaLimit=camera.alpha;camera.lowerBetaLimit=camera.upperBetaLimit=camera.beta;camera.inertia=.30;
 const hemi=new B.HemisphericLight('warm sky',new V(.1,1,-.2),scene);hemi.intensity=.91;hemi.diffuse=C.FromHexString('#e8f0ed');hemi.groundColor=C.FromHexString('#c9b292');
 const sun=new B.DirectionalLight('late morning sunlight',new V(-.66,-1,.48),scene);sun.position.set(8,25,-14);sun.intensity=1.25;sun.diffuse=C.FromHexString('#ffdfac');
 const inside=new B.PointLight('reading warm lights',new V(0,7,0),scene);inside.range=40;inside.intensity=1.1;inside.diffuse=C.FromHexString('#f3d4a4');
 const mats={};function color(hex){return C.FromHexString(hex);}function material(name,hex,opt={}){if(mats[name])return mats[name];const m=new B.StandardMaterial(name,scene);m.diffuseColor=color(hex);m.specularColor=color(opt.specular||'#292c2d');m.specularPower=40;if(opt.emissive)m.emissiveColor=color(opt.emissive);if(opt.alpha!==undefined){m.alpha=opt.alpha;m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;}return mats[name]=m;}
 const P={floor:material('warm limestone','#decfb4'),edge:material('dark sandstone','#95816a'),frame:material('ivory stucco','#eadbbb'),navy:material('institutional navy','#1b3549'),gold:material('brass lines','#cba56a'),window:material('glass teal','#8bbcc0',{alpha:.36}),lawn:material('campus lawns','#548160'),walk:material('paving','#d3c0a0'),rug:material('forest carpet','#325a50'),rugBorder:material('carpet gold edge','#ad9160'),glow:material('task indicator','#e9cf78',{emissive:'#a37730'}),shadow:material('soft fake shadow','#15191d',{alpha:.12}),leaf:material('olive leaves','#52704d'),dark:material('charcoal','#283943')};
 function box(n,x,y,z,w,h,d,m){let mesh=B.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;}
 function disk(n,x,y,z,diam,m){const mesh=B.MeshBuilder.CreateCylinder(n,{diameter:diam,height:.024,tessellation:40},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;}
 function sign(text,x,y,z,width=3.1){const tex=new B.DynamicTexture('sign '+text,{width:1024,height:256},scene,false);tex.hasAlpha=true;let ctx=tex.getContext();ctx.fillStyle='#15334a';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#c7a260';ctx.lineWidth=15;ctx.strokeRect(9,9,1006,238);ctx.fillStyle='#fff0c9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 110px Tahoma,Arial';ctx.fillText(text,512,130,930);tex.update();let m=new B.StandardMaterial('sign material '+text,scene);m.diffuseTexture=tex;m.emissiveColor=new C(.08,.09,.07);m.backFaceCulling=false;const mesh=B.MeshBuilder.CreatePlane('sign panel '+text,{width,height:width/4,sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;}
 // Central architecture: scene built as a cross section, not a fake canvas isometric board.
 box('campus green plaza',0,-.35,0,36,.16,28,P.lawn);
 box('marble foundation',0,-.16,0,25,.35,19,P.edge);
 box('cutaway interior flooring',0,.045,0,24.2,.16,18.2,P.floor);
 box('outer walkpath',0,-.22,10.6,20,.08,3.7,P.walk);
 for(let ix=-5;ix<=5;ix++)for(let iz=-4;iz<=4;iz++){if((ix+iz)%2===0){const tile=box('polished tile',ix*2,.134,iz*2,1.95,.012,1.95,material('ivory tint a','#e5d5b9'));tile.isPickable=false;}}
 box('reading carpet gold trim',-.4,.158,1,14,.035,9,P.rugBorder);box('reading carpet central',-.4,.186,1,13.68,.025,8.7,P.rug);
 box('stacks carpet gold trim',-1,.16,-5.8,17,.025,3,P.rugBorder);box('stacks carpet green',-1,.182,-5.8,16.7,.022,2.76,P.rug);
 // Architectural rear wall, cutaway sides, arched windows and upper trim.
 box('back wall',0,1.55,-8.95,24.4,3.1,.38,P.frame);
 box('back cornice',0,3.21,-8.95,24.6,.18,.43,P.navy);box('back brass piping',0,3.30,-8.95,24.63,.04,.48,P.gold);
 box('left cutaway wall',-12.1,1.12,0,.3,2.23,18.5,P.frame);box('left wall dark cap',-12.1,2.26,0,.35,.07,18.6,P.navy);
 box('right cutaway wall',12.1,1.12,-2.7,.3,2.23,12.4,P.frame);box('right wall dark cap',12.1,2.26,-2.7,.35,.06,12.45,P.navy);
 for(let i=0;i<8;i++){const x=-10.2+i*2.9;box('window exterior trim',x,2.08,-8.72,1.87,1.73,.18,P.edge);box('window pane',x,2.09,-8.60,1.68,1.55,.075,P.window);box('window gold mullion',x,2.09,-8.54,.056,1.63,.08,P.gold);box('window arch gold beam',x,2.95,-8.53,2.04,.11,.14,P.gold);box('window ivory sill',x,1.19,-8.55,2.04,.11,.43,P.frame);}
 for(let z=-7;z<=6;z+=3.1){box('left tall narrow window',-11.95,1.65,z,.1,1.34,1.83,P.window);box('window trim left',-11.94,2.36,z,.13,.1,2,P.gold);}
 for(let x of [-11.65,11.65])for(let z of [-8.42,8.42]){box('column pale stone',x,1.35,z,.53,2.7,.53,P.frame);box('column foot',x,.19,z,.68,.37,.68,P.gold);box('column crown',x,2.78,z,.72,.26,.72,P.gold);}
 sign('المكتبة المركزية',0,3.75,-8.42,5.0);
 sign('رفوف المقتنيات',-5.5,3.46,-6.80,3.4);
 sign('قاعة المطالعة',-.6,3.53,-1.08,3.6);
 // Corridor entry at foreground. A cutaway porch keeps camera visibility.
 box('entrance stone doorstep',0,.17,8.89,5.4,.32,1.3,P.edge);box('entrance blue carpet',0,.34,8.53,4,.03,1.8,P.navy);
 for(let x of [-2.55,2.55]){box('entrance pillar',x,1.25,8.66,.4,2.5,.43,P.frame);box('entrance brass crown',x,2.56,8.66,.56,.16,.55,P.gold);}box('lintel',0,2.57,8.66,5.8,.30,.50,P.navy);box('lintel line',0,2.73,8.66,5.9,.07,.55,P.gold);
 // Soft shadows under static props and characters, improves visual grounding.
 function shadow(x,z,w=.8){let mesh=disk('soft grounded shadow',x,.18,z,w,P.shadow);mesh.isPickable=false;return mesh;}
 // Interactions are semantic, only proxies can trigger rewards.
 const interactives=[];
 function pickBox(type,id,x,z,w,d,y=1.3,h=2.6){let p=box('interaction '+type+' '+id,x,y,z,w,h,d,P.window);p.visibility=.012;p.isPickable=true;p.metadata={action:type,id};interactives.push(p);return p;}
 function promptRing(id,x,z){const r=B.MeshBuilder.CreateTorus('book search halo '+id,{diameter:1.6,thickness:.06,tessellation:32},scene);r.position.set(x,.28,z);r.material=P.glow;r.isPickable=false;const p=sign('⌕ '+id,x,3.52,z+.28,1.05);p.metadata={action:'search',id};interactives.push(p);return {r,p};}
 let bookMarkers=[];const assetNames=Object.keys(ASSETS), containers={},instances=[],actors=[],failures=[];
 options.onProgress?.(0,assetNames.length);
 let done=0;
 await Promise.all(assetNames.map(async key=>{try{
  containers[key]=await B.SceneLoader.LoadAssetContainerAsync('./assets/',ASSETS[key]+'.glb',scene);
 }catch(err){failures.push({key,error:String(err)});}finally{done++;options.onProgress?.(done,assetNames.length);}}));
 function asRoot(key,name,x,z,h=MODEL_HEIGHT[key],rotation=0,scaleFactor=1){const container=containers[key];if(!container)return null;
  const clone=container.instantiateModelsToScene(n=>name+' '+n,false,{doNotInstantiate:true});let rootNode=new B.TransformNode(name,scene);for(const n of clone.rootNodes){n.parent=rootNode;}
  rootNode.computeWorldMatrix(true);let b=rootNode.getHierarchyBoundingVectors(true),span=Math.max(.03,b.max.y-b.min.y),s=h/span*scaleFactor;rootNode.scaling.setAll(s);rootNode.computeWorldMatrix(true);b=rootNode.getHierarchyBoundingVectors(true);
  rootNode.position.set(x,.19-b.min.y,z);rootNode.rotation.y=rotation;instances.push(rootNode);return {node:rootNode,animationGroups:clone.animationGroups||[],skeletons:clone.skeletons||[]};}
 function furnish(key,name,x,z,h,rot=0,scale=1){const ret=asRoot(key,name,x,z,h,rot,scale);if(ret)shadow(x,z,key==='table'?2.7:key==='bookcase'?1.8:.8);return ret;}
 // Actual third party CC0 furniture geometry. 4 distinct clickable racks, additional corner cabinets.
 const rackLayout=[[-7.4,-5.05,'A'],[-3.6,-5.05,'B'],[.2,-5.05,'C'],[4.0,-5.05,'D']];
 for(const [x,z,id] of rackLayout){furnish('bookcase','Kenney full bookshelf '+id,x,z,3.0,0,1.03);furnish('books','Kenney book props '+id,x+.28,z+.20,.36,0,1.04);pickBox('search',id,x,z,2.3,1.5,1.42,2.95);bookMarkers.push(promptRing(id,x,z+.65));}
 furnish('closedcase','Kenney archives cabinet',8.8,-5.35,2.6,Math.PI);furnish('lowcase','Kenney literature low shelf',-10,-4.0,1.4,Math.PI/2);
 // Reading cluster tables and chairs: moving students use the aisles only.
 const TABLES=[[-4.4,-.3],[.05,-.3],[4.5,-.3],[-4.4,2.82],[.05,2.82],[4.5,2.82]];
 for(let j=0;j<TABLES.length;j++){const [x,z]=TABLES[j];furnish('table','Kenney oak reading table '+j,x,z,1.0);for(let side of [-1,1])furnish('chair','Kenney upholstered chair '+j+' '+side,x+side*1.3,z,1.04,side*Math.PI/2);furnish('lamp','Kenney table lamp '+j,x,z,.47);if(j%2===0)furnish('books','reading material '+j,x+.4,z-.32,.21);if(j%3===0)furnish('laptop','working laptop '+j,x-.42,z+.27,.32,Math.PI);}
 // Real help and circulation desks, computer and accessories.
 furnish('desk','Kenney reference counter',-8.65,4.27,1.07,Math.PI/2,1.30);furnish('deskchair','Kenney librarian seat',-8.9,3.60,1.05);
 furnish('desk','Kenney circulation counter',8.7,4.45,1.1,0,1.55);furnish('deskchair','Kenney borrowing clerk chair',8.35,3.72,1.1);
 furnish('monitor','Kenney catalog terminal',8.9,4.05,.65);furnish('monitor','Kenney reference terminal',-8.6,4.0,.65);
 furnish('bench','Kenney waiting bench',8.5,6.7,.85,-Math.PI/2,1.25);furnish('coffee','Kenney reading nook table',9.2,.35,.6);
 for(const [x,z] of [[-10.65,-6.7],[-10.6,7.5],[10.6,-7.1],[10.7,7.5],[7.85,-1.5],[-8.8,1.0]])furnish('plant','Kenney indoor plant '+x+' '+z,x,z,1.15);
 for(const [x,z] of [[-2.7,-2.1],[2.9,-2.1],[9.8,2.4]])furnish('plant2','Kenney small plant '+x+' '+z,x,z,.54);
 furnish('trash','Kenney recycling bin',11.2,6.6,.58);
 // Models have original animation groups (idle/walk/sit). Each person receives independent cloned clips.
 function character(key,name,x,z,role,rot=0){const out=asRoot(key,name,x,z,MODEL_HEIGHT[key],rot);if(!out)return null;
  const clip=(type)=>out.animationGroups.find(g=>g.name.toLowerCase().includes(type.toLowerCase()));
  for(let a of out.animationGroups)a.stop();
  const act=role==='walk'?'walk':role==='sit'?'sit':'idle';const group=clip(act)||clip('idle');if(group){group.start(true,1.0,group.from,group.to,false);}
  const actor={name,node:out.node,groups:out.animationGroups,role,base:{x,z},path:null,t:0,speed:.09};actors.push(actor);shadow(x,z,.63);return actor;}
 const staff1=character('maleA','borrow-clerk-fixed',FIXED_STAFF.lending.x,FIXED_STAFF.lending.z,'staff',Math.PI);
 const staff2=character('femaleA','reference-staff-fixed',FIXED_STAFF.information.x,FIXED_STAFF.information.z,'staff',Math.PI/2);
 for(const [key,name,x,z,rot] of [['femaleB','student seat A',-4.9,-.3,Math.PI/2],['maleB','student seat B',.45,-.3,-Math.PI/2],['maleA','student seat C',4.8,2.82,Math.PI/2],['femaleA','student seat D',-4.8,2.82,Math.PI/2]])character(key,name,x,z,'sit',rot);
 const walkers=[character('maleB','visitor-student-1',-8,6.7,'walk'),character('femaleB','visitor-student-2',-1.7,6.5,'walk'),character('maleA','visitor-student-3',6.5,6.7,'walk')].filter(Boolean);
 walkers.forEach((c,i)=>{c.path=VISITOR_ROUTES[i];c.t=0;c.speed=.075+.018*i;});
 const cleaner=character('femaleA','cleaning-staff-zone-only',10.15,-2.25,'walk',Math.PI/4);
 if(cleaner){cleaner.node.scaling.scaleInPlace(.95);}
 // Small gold identification tag for staff only. Never substitute official badges/logos.
 for(const a of [staff1,staff2,cleaner].filter(Boolean)){const badge=box('small employee ID color',a.node.position.x,1.21,a.node.position.z+.18,.21,.095,.025,P.gold);badge.isPickable=false;}
 pickBox('serve','borrowing',8.7,4.5,2.7,1.5,.9,1.5);
 const lendLabel=sign('خدمة الاستعارة',8.6,2.72,5.07,2.9);lendLabel.metadata={action:'serve',id:'borrowing'};interactives.push(lendLabel);
 function setState(state){current=state;bookMarkers.forEach((o)=>{o.r.setEnabled(!state.quests.book);o.p.setEnabled(!state.quests.book);});}
 let current=options.initialState||root.TycoonGameplay?.initialState()||{quests:{book:false},queue:0};
 const queueBubbles=[];
 for(let i=0;i<5;i++){const badge=disk('queue counter ground marker '+i,8.7,.21,5.9+i*.52,.4,P.gold);badge.isPickable=false;queueBubbles.push(badge);}
 try {const pipeline=new B.DefaultRenderingPipeline('preview tone map',true,scene,[camera]);pipeline.fxaaEnabled=true;pipeline.bloomEnabled=true;pipeline.bloomWeight=.065;pipeline.bloomThreshold=.89;pipeline.bloomKernel=40;}catch(_){/* optional, not required to run */}
 let t=0;
 scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(.06,engine.getDeltaTime()/1000);t+=dt;
  walkers.forEach((a,i)=>{a.t=(a.t+a.speed*dt)%1;const p=routePosition(a.path,a.t);const next=routePosition(a.path,(a.t+.006)%1);a.node.position.x=p.x;a.node.position.z=p.z;a.node.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);});
  if(cleaner){cleaner.node.position.x=clamp(10.1+Math.sin(t*.45)*.36,CLEAN_ZONE.minX,CLEAN_ZONE.maxX);cleaner.node.position.z=clamp(-2.10+Math.cos(t*.45)*.52,CLEAN_ZONE.minZ,CLEAN_ZONE.maxZ);}
  bookMarkers.forEach((m,i)=>{m.r.scaling.setAll(1+.12*Math.sin(t*2.3+i));m.p.visibility=.88+.10*Math.sin(t*2+i);});
  queueBubbles.forEach((q,i)=>q.setEnabled(i<Math.min(5,current.queue||0)));
 });
 let lastPointer=null, dragged=false;
 function onDown(e){if(e.button!==0)return;lastPointer={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY};dragged=false;try{canvas.setPointerCapture(e.pointerId);}catch(_){}}
 function onMove(e){if(!lastPointer)return;const dx=e.clientX-lastPointer.px,dy=e.clientY-lastPointer.py;lastPointer.px=e.clientX;lastPointer.py=e.clientY;if(Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>6)dragged=true;if(dragged){camera.target.x=clamp(camera.target.x-dx*.013,-4,4);camera.target.z=clamp(camera.target.z-dy*.016,-4,4);}}
 function onUp(e){if(!lastPointer)return;const click=!dragged;lastPointer=null;if(!click)return;const rect=canvas.getBoundingClientRect();const pk=scene.pick(e.clientX-rect.left,e.clientY-rect.top,m=>!!m.metadata?.action);const m=pk?.pickedMesh?.metadata;if(m){onAction(m.action==='search'?{type:'search',rack:m.id}:{type:'serve'});}}
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>lastPointer=null);canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1:-1);},{passive:false});
 function resize(){const ratio=Math.max(.2,canvas.clientWidth/Math.max(1,canvas.clientHeight)),h=camera.orthoTop||12.7;camera.orthoTop=h;camera.orthoBottom=-h;camera.orthoLeft=-h*ratio;camera.orthoRight=h*ratio;engine.resize();}function zoom(dir){const next=clamp(camera.orthoTop*(dir>0?.88:1.14),8.7,17.2);camera.orthoTop=next;resize();}function reset(){camera.target.set(0,1.05,0);camera.orthoTop=12.7;resize();}
 reset();window.addEventListener('resize',resize);engine.runRenderLoop(()=>scene.render());
 return {engine,scene,camera,zoom,reset,setState,assetCount:done,assetTotal:assetNames.length,failures,staffStations:FIXED_STAFF,cleaningZone:CLEAN_ZONE,dispose(){window.removeEventListener('resize',resize);engine.dispose();}};
}
root.createLibraryWorldV28=createLibraryWorld;
root.LibraryV28Spec=Object.freeze({ASSETS,RACKS,FIXED_STAFF,CLEAN_ZONE,VISITOR_ROUTES,routePosition,sourceURL});
if(typeof module==='object'&&module.exports)module.exports=root.LibraryV28Spec;
})(typeof window!=='undefined'?window:globalThis);