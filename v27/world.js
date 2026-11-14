/* Library Tycoon V2.7 · original Babylon.js cutaway reading hall.
   Fixed camera, assigned staff stations and zone-bounded cleaner.
   No third-party 3D models and no substituted institutional logos. */
(function(root){'use strict';
const G=root.TycoonGameplay;
function createWorld(canvas,onAction,initial){
 if(!root.BABYLON)throw Error('Babylon.js library is not available');
 const B=root.BABYLON,V=B.Vector3;
 const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true},false);
 engine.setHardwareScalingLevel(Math.max(1,Math.min(1.7,devicePixelRatio>1?devicePixelRatio/1.5:1)));
 const scene=new B.Scene(engine);scene.clearColor=new B.Color4(.055,.12,.16,1);
 scene.environmentIntensity=.6;scene.ambientColor=new B.Color3(.30,.36,.40);
 const camera=new B.ArcRotateCamera('locked-isometric',Math.PI*.24,1.13,36,new V(0,1.0,0),scene);
 camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;camera.minZ=.1;camera.maxZ=200;camera.lowerBetaLimit=camera.upperBetaLimit=1.13;camera.lowerAlphaLimit=camera.upperAlphaLimit=camera.alpha;
 camera.panningSensibility=0;camera.inertia=.5;camera.fov=.8;
 function resize(){let ratio=canvas.clientWidth/Math.max(1,canvas.clientHeight),h=14.6;camera.orthoLeft=-h*ratio;camera.orthoRight=h*ratio;camera.orthoTop=h;camera.orthoBottom=-h;engine.resize();}
 resize();
 const hemi=new B.HemisphericLight('natural skylight',new V(0,1,0),scene);hemi.intensity=1.12;hemi.diffuse=new B.Color3(.85,.92,1);hemi.groundColor=new B.Color3(.25,.26,.24);
 const sun=new B.DirectionalLight('warm sunshine',new V(-.48,-1,.4),scene);sun.position=new V(8,22,-13);sun.intensity=1.18;sun.diffuse=new B.Color3(1,.87,.67);
 const fill=new B.PointLight('warm interior lights',new V(0,9,2),scene);fill.intensity=2.1;fill.range=28;fill.diffuse=B.Color3.FromHexString('#ffe5ae');
 const mats={};const c=(hex)=>B.Color3.FromHexString(hex);
 const mat=(name,hex,props={})=>{if(mats[name])return mats[name];let m=new B.StandardMaterial(name,scene);m.diffuseColor=c(hex);m.specularColor=c(props.specular||'#24272b');m.specularPower=props.shine||28;if(props.emissive)m.emissiveColor=c(props.emissive);if(props.alpha!==undefined){m.alpha=props.alpha;m.needDepthPrePass=true;}m.backFaceCulling=false;return mats[name]=m;};
 const P={stone:mat('warm limestone','#c6ad88'),stone2:mat('limestone highlight','#dcc4a1'),stone3:mat('limestone shadow','#947a5e'),mortar:mat('mortar','#7a7467'),floor:mat('ivory stone flooring','#ddd0b2'),green:mat('library carpet green','#345c53'),green2:mat('carpet border','#ad8c4b'),navy:mat('institutional navy','#193850'),navy2:mat('deep navy','#122838'),gold:mat('brass gold','#c9a05d',{specular:'#806027',shine:50}),goldLight:mat('gold edging','#f4d28f',{emissive:'#32260c'}),wood:mat('walnut wood','#7c4931'),wood2:mat('oak wood','#a96e44'),wood3:mat('wood highlight','#c28e60'),paper:mat('paper','#e8e2c9'),ink:mat('ink charcoal','#25272c'),glass:mat('blue tinted glass','#9db8be',{alpha:.27}),darkglass:mat('window background','#54747d',{alpha:.65}),screen:mat('monitor light','#609faa',{emissive:'#224f59'}),chrome:mat('black metal','#41464c'),plants:mat('plant dark green','#426c46'),leaf2:mat('leaf soft green','#66965b'),pink:mat('rose flower','#d99d99'),lamp:mat('banker lamp shade','#267c61'),light:mat('glowing white','#fff2bf',{emissive:'#c6a054'}),shadow:mat('floor shadow','#342d26',{alpha:.12})};
 function box(n,x,y,z,w,h,d,m,parent){let b=B.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);b.position.set(x,y,z);b.material=m;if(parent)b.parent=parent;return b;}
 function ball(n,x,y,z,sx,sy,sz,m,parent){let s=B.MeshBuilder.CreateSphere(n,{diameter:1,segments:12},scene);s.position.set(x,y,z);s.scaling.set(sx,sy,sz);s.material=m;if(parent)s.parent=parent;return s;}
 function cyl(n,x,y,z,diam,height,m,parent,tess=12){let s=B.MeshBuilder.CreateCylinder(n,{diameter:diam,height,tessellation:tess},scene);s.position.set(x,y,z);s.material=m;if(parent)s.parent=parent;return s;}
 function ring(n,x,y,z,diam,m){let mesh=B.MeshBuilder.CreateTorus(n,{diameter:diam,thickness:.045,tessellation:32},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;}
 function dynamicLabel(text,w,h,color,background){const tex=new B.DynamicTexture('label_'+text,{width:512,height:128},scene,false);tex.hasAlpha=true;const ctx=tex.getContext();ctx.clearRect(0,0,512,128);ctx.fillStyle=background||'#142d43';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#c8a265';ctx.lineWidth=8;ctx.strokeRect(5,5,502,118);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color||'#ffedc5';ctx.font='bold 52px Tahoma,Arial';ctx.fillText(text,256,66,476);tex.update();const m=new B.StandardMaterial('sign_'+text,scene);m.diffuseTexture=tex;m.emissiveColor=new B.Color3(.20,.18,.12);m.backFaceCulling=false;let plane=B.MeshBuilder.CreatePlane('sign '+text,{width:w,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);plane.material=m;return plane;}
 // Central building with a visible cross-section, surroundings, architectural detail and soft lighting.
 box('stone foundation',0,-.28,0,25,.52,20,P.stone3);box('interior sandstone floor',0,-.025,0,24.3,.08,18.7,P.floor);
 box('garden ground',0,-.7,0,45,.2,36,mat('campus lawn','#456b50'));
 box('exterior stone walkway',0,-.58,13,22,.12,5,P.stone2);
 // Floor material uses a procedural tile pattern, no downloaded textures.
 const tileTex=new B.DynamicTexture('tile joints',{width:512,height:512},scene,false);let tx=tileTex.getContext();tx.fillStyle='#d8c4a7';tx.fillRect(0,0,512,512);for(let y=0;y<8;y++)for(let x=0;x<8;x++){tx.fillStyle=((x+y)%3===0?'#d5bfa1':(x+y)%2===0?'#e0cfb3':'#dac6aa');tx.fillRect(x*64+2,y*64+2,60,60);tx.strokeStyle='#a49378';tx.lineWidth=2;tx.strokeRect(x*64+2,y*64+2,60,60);}tileTex.update();tileTex.uScale=4;tileTex.vScale=3;let floorMat=mat('checkered ivory','#ffffff');floorMat.diffuseTexture=tileTex;floorMat.specularColor=new B.Color3(.08,.06,.04);box('precisely tiled floors',0,.021,0,24,.025,18.4,floorMat);
 function carpet(x,z,w,d){box('forest green reading carpet',x,.052,z,w,.035,d,P.green2);box('quiet reading rug',x,.077,z,w-.22,.025,d-.22,P.green);for(let j=0;j<3;j++)box('rug border brass',x,.096,z+(j-1)*(d-.5)/2,w-.35,.012,.019,P.gold);}
 carpet(-1.0,1.4,11.2,9.6);carpet(7,-5,8,5.8);
 function lowWall(x,z,w,d,h){box('cutaway wall',x,h/2,z,w,h,d,P.stone);box('wall plinth',x,.20,z,w,.32,d+.06,P.stone3);box('decorative navy cap',x,h+.025,z,w,.055,d+.09,P.navy);box('brass wall rail',x,h+.075,z,w,.028,d+.12,P.gold);}
 // Tall glazed back and left walls, front deliberately cut away.
 lowWall(0,-9.2,24.3,.38,2.5);lowWall(-12.05,0,.36,18.8,2.15);lowWall(12.05,-2.4,.36,13.1,2.1);
 for(let i=0;i<9;i++){let x=-10.5+i*2.65;box('window frame',x,3.7,-9.11,1.95,1.9,.13,P.stone2);box('glass pane',x,3.71,-9.02,1.65,1.56,.04,P.darkglass);box('window mullion',x,3.71,-8.98,.07,1.62,.06,P.gold);box('window sill',x,2.72,-8.98,2.13,.16,.33,P.stone3);}for(let i=0;i<6;i++){let z=-7.5+i*2.8;box('left window frame',-12,3.45,z,.13,1.5,2,P.stone2);box('left glass',-11.92,3.46,z,.04,1.25,1.7,P.darkglass);}for(let i=0;i<5;i++){let z=-7.5+i*2.75;box('right frame',12,3.35,z,.12,1.5,1.84,P.stone2);box('right glass',11.93,3.35,z,.04,1.2,1.55,P.darkglass);}
 for(let x of [-11.65,11.65])for(let z of [-8.8,8.7]){box('marble column',x,1.35,z,.55,2.7,.55,P.stone2);box('stone column top',x,2.75,z,.76,.23,.76,P.gold);}
 // Fully visible, low glass partitions with ornate navy posts.
 function partition(x,z,w,d){box('partition gold skirting',x,.44,z,w,.20,d,P.gold);box('transparent divider',x,.91,z,w,.85,d,P.glass);box('brass divider rail',x,1.38,z,w,.055,d,P.gold);if(w>d){for(let i=-Math.floor(w/2);i<=Math.floor(w/2);i+=2.5)box('divider pillar',x+i,1,z,.105,1.7,d+.13,P.navy);}else{for(let i=-Math.floor(d/2);i<=Math.floor(d/2);i+=2.3)box('divider pillar',x,1,z+i,w+.13,1.7,.10,P.navy);}}
 partition(-6.8,-1.4,10.0,.12);partition(4.4,-1.2,.12,10);partition(6.9,5.8,9.3,.12);
 // Oak shelving with individually modeled colored books, readable depth/shape, and golden pulls.
 const bookColors=['#935b47','#285c67','#d8a44d','#8a4c63','#59775e','#a66d46','#677c9c','#b58e60','#e3b66b'];const bookMats=bookColors.map((col,i)=>mat('bookCover'+i,col));
 let shelves=[];
 function shelf(x,z,id){const group=new B.TransformNode('oak shelf rack '+id,scene);group.position.set(x,0,z);for(let side of [-.72,.72])box('shelf frame leg',side,1.48,0,.14,2.85,.70,P.wood,group);box('shelf solid back',0,1.51,-.34,1.62,2.8,.08,P.wood,group);for(let row=0;row<4;row++){let y=.33+row*.66;box('oak shelf',0,y,0,1.62,.12,.80,P.wood3,group);if(row===3)break;for(let j=0;j<11;j++){const cover=bookMats[(j*3+row*2+id.charCodeAt(0))%bookMats.length];let height=.38+((j*7+row*5)%5)*.039;let m=box('individual colored book spine',-.57+j*.115,y+.07+height/2,.07,.092,height,.49,cover,group);if(j%3===0){box('book gilded title band',m.position.x,y+.18,.323,.094,.025,.008,P.goldLight,group);box('book spine lower band',m.position.x,y+.31,.321,.094,.018,.008,P.paper,group);}}}box('shelf brass skirting',0,.09,.07,1.55,.12,.87,P.gold,group);const sign=dynamicLabel('رف '+id,1.40,.42);sign.parent=group;sign.position.set(0,3.11,.43);let highMat=mat('interaction highlight','#ffde95',{emissive:'#91703c'});let halo=ring('searchable rack '+id,x,.13,z,2.1,highMat);const touch=box('clickable shelf '+id,x,1.60,z,1.65,3.3,.98,P.glass);touch.visibility=.01;touch.metadata={type:'search',rack:id,label:'البحث في الرف '+id};const tag=dynamicLabel('⌕',.62,.55,'#fff4d0','#28424a');tag.position.set(x,3.78,z+.2);tag.metadata={type:'search',rack:id,label:'فتّش الرف '+id};shelves.push({halo,tag,touch});return group;}
 shelf(-3.3,-6.0,'A');shelf(.2,-6.0,'B');shelf(3.7,-6.0,'C');shelf(7.2,-6.0,'D');
 // Readable carved signs mounted on wooden horizontal beams.
 function sign(text,x,y,z,w){box('navy sign support',x,y,z,w+.25,.70,.12,P.navy);const p=dynamicLabel(text,w,.59);p.position.set(x,y,z+.095);return p;}
 sign('قاعة المطالعة',-1.0,3.9,-1.40,4.0);sign('المقتنيات والرفوف',2.5,4.0,-8.1,4.5);sign('الإعارة',8.25,3.9,4.70,2.9);sign('الإرشاد والمراجع',-8.2,3.65,4.45,3.2);
 function desk(x,z,w=2.5,d=1.3){box('oak desk slab',x,.84,z,w,.16,d,P.wood3);box('desk top fine trim',x,.93,z,w,.035,d,P.gold);for(let dx of [-w/2+.16,w/2-.16])for(let dz of [-d/2+.16,d/2-.16])box('solid walnut leg',x+dx,.4,z+dz,.13,.74,.15,P.wood);box('under desk stretcher',x,.35,z,w-.23,.10,.11,P.wood);}
 function chair(x,z,orient=0){const g=new B.TransformNode('padded university chair',scene);g.position.set(x,0,z);g.rotation.y=orient;box('chair seat',0,.48,0,.64,.14,.57,P.navy);box('chair back',0,.98,-.28,.65,.82,.14,P.wood2);box('chair soft cushion',0,1.04,-.19,.56,.55,.065,P.navy);for(let dx of [-.24,.24])for(let dz of [-.21,.21])box('chair shaped leg',dx,.22,dz,.075,.40,.075,P.wood);box('chair back frame',0,1.40,-.28,.71,.10,.18,P.gold);return g;}
 function studyLamp(x,z){const g=new B.TransformNode('green-glass banker lamp',scene);g.position.set(x,0,z);cyl('lamp cast-brass foot',0,.98,0,.29,.06,P.gold,g);cyl('lamp slender stem',0,1.21,0,.06,.51,P.gold,g);let shade=B.MeshBuilder.CreateCylinder('banker green shade',{diameterTop:.56,diameterBottom:.40,height:.27,tessellation:20},scene);shade.position.set(0,1.53,0);shade.material=P.lamp;shade.parent=g;ball('lamp warm glow',0,1.40,0,.11,.08,.11,P.light,g);return g;}
 function bookPile(x,z){box('hardcover book',x,1.01,z,.47,.085,.34,P.navy);box('book white pages',x,1.07,z,.41,.055,.31,P.paper);box('book second cover',x-.08,1.13,z+.08,.40,.065,.34,P.wood);}
 function plant(x,z,s=.9){const rootNode=new B.TransformNode('indoor plant',scene);rootNode.position.set(x,0,z);rootNode.scaling.setAll(s);let pot=B.MeshBuilder.CreateCylinder('ceramic plant pot',{diameterTop:.58,diameterBottom:.42,height:.58,tessellation:12},scene);pot.position.y=.30;pot.material=P.stone2;pot.parent=rootNode;cyl('stem',0,.88,0,.09,.9,P.wood,rootNode);for(let i=0;i<8;i++){let a=i*Math.PI*2/8,h=.86+(i%3)*.14;let leaf=ball('broad green foliage',Math.cos(a)*.26,h,Math.sin(a)*.28,.31,.13,.16,i%2?P.plants:P.leaf2,rootNode);leaf.rotation.y=a;}ball('plant crown',0,1.22,0,.25,.18,.25,P.leaf2,rootNode);return rootNode;}
 // Five functional study tables, books, lamps, seated student actors.
 const studyPairs=[[-4.4,.4],[-.4,.4],[3.2,2.8],[-4.4,4.5],[-.4,4.5]];
 for(let [x,z] of studyPairs){desk(x,z);studyLamp(x+.8,z);bookPile(x-.55,z-.24);chair(x-.55,z+1.10,Math.PI);chair(x+.42,z-1.12,0);}
 // Computer station: discrete detailed units and chairs.
 function computer(x,z){desk(x,z,1.8,1.0);const monitor=box('LCD computer monitor',x,1.32,z-.06,.70,.51,.08,P.chrome);box('working monitor blue display',x,1.33,z+.01,.62,.41,.017,P.screen);box('screen status bar',x,1.47,z+.027,.50,.027,.02,P.gold);box('computer pedestal',x,1.04,z-.09,.07,.22,.08,P.chrome);box('keyboard',x,1.025,z+.28,.52,.028,.16,P.chrome);chair(x,z+1,Math.PI);return monitor;}
 for(let i=0;i<3;i++)computer(-9.5+i*2.5,-5.35);
 // Borrowing desk with brass trim, papers, counter service bell and visible queue stanchions.
 function counter(x,z){box('institutional solid counter',x,.75,z,3.6,1.5,1.08,P.wood);box('counter slab',x,1.59,z,3.85,.16,1.22,P.wood3);box('gold counter strip',x,1.48,z+.61,3.85,.07,.06,P.gold);box('counter navy central panel',x,.82,z+.55,3.00,1.04,.05,P.navy);box('carved book symbol',x,.84,z+.598,.48,.35,.06,P.gold);box('service call bell',x-1.1,1.72,z+.22,.30,.12,P.goldLight);bookPile(x+.8,z-.10);let marker=box('click desk to serve',x,1.85,z,3.9,.65,1.25,P.glass);marker.visibility=.02;marker.metadata={type:'serve',label:'خدمة طالب على مكتب الاستعارة'};return marker;}
 counter(8.35,3.55);counter(-8.2,3.65);
 for(let k=0;k<4;k++){let x=6.6+k*1.0,z=5.70; cyl('queue barrier post',x,.55,z,.11,1.1,P.gold);ball('barrier knob',x,1.13,z,.14,.14,.14,P.goldLight);if(k<3)box('queue velvet rope',x+.5,.93,z,.97,.055,.05,P.navy);}
 // Landscaping helps 3D diorama feel lived-in instead of flat primitives.
 for(let [x,z,s] of [[-10,7,.95],[-5,7.3,.8],[3.8,7.4,.8],[10,-1.2,.74],[-10,-1.9,.67],[-2.7,-8,.72],[10.5,-8,.80]])plant(x,z,s);
 function outdoorTree(x,z,h=1){const g=new B.TransformNode('flowering campus tree',scene);g.position.set(x,0,z);g.scaling.setAll(h);cyl('tree trunk',0,1.55,0,.42,3.4,P.wood,g);for(let j=0;j<9;j++){let a=j*Math.PI*2/9,dist=.6+(j%2)*.28;ball('layered tree crown',Math.cos(a)*dist,3.6+(j%3)*.28,Math.sin(a)*dist,.9,.80,.85,j%5===0?P.pink:j%2?P.plants:P.leaf2,g);}ball('tree upper crown',0,4.42,0,.8,.8,.8,P.leaf2,g);return g;}
 for(let [x,z,h] of [[-17,-13,1.14],[17,-12,1.09],[-17,9,.92],[17,10,1.12],[-12,15,.80],[12,15,.84]])outdoorTree(x,z,h);
 for(let x=-8;x<9;x+=4){box('campus exterior bench',x,-.14,13.8,2,.2,.52,P.wood);for(let dx of [-.72,.72])box('campus bench foot',x+dx,-.3,13.8,.12,.35,.55,P.chrome);}
 // Original stylized articulated people. No generated or copied commercial-character meshes.
 const skin=[mat('warm skin','#ba8867'),mat('olive skin','#c69a78'),mat('light skin','#dfb28b'),mat('dark skin','#88694f')],shirts=[mat('student red','#a54b42'),mat('student teal','#397980'),mat('student ochre','#b27d38'),mat('student violet','#79638b'),mat('student blue','#426f91')];
 let actors=[];
 function actor(name,x,z,opts={}){let g=new B.TransformNode(name,scene);g.position.set(x,0,z);let face=skin[opts.skin||0],shirt=opts.staff?P.navy:opts.cleaner?mat('cleaner light cyan','#6b9da4'):shirts[opts.color||0];let seated=!!opts.seated;
 let yShift=seated?-.46:0;
 ball('soft face',0,1.75+yShift,.04,.38,.40,.34,face,g);ball('styled hair crown',0,2.01+yShift,-.035,.41,.18,.35,opts.hijab?P.navy:P.ink,g);
 if(opts.hijab){ball('wrapped headscarf',0,1.80+yShift,-.15,.42,.38,.27,P.navy,g);}
 for(let xx of [-.14,.14])ball('eyes with highlights',xx,1.78+yShift,.36,.042,.055,.025,P.ink,g);
 ball('little nose',0,1.66+yShift,.37,.045,.055,.025,face,g);
 ball('upper body tailoring',0,1.11+yShift,0,.43,.53,.29,shirt,g);
 box('navy garment lower hem',0,.70+yShift,0,.70,.21,.43,opts.staff?P.navy2:shirt,g);
 if(opts.staff){box('navy uniform lapel',0,1.34+yShift,.30,.13,.28,.02,P.paper,g);box('official gold staff badge',.24,1.31+yShift,.31,.11,.09,.02,P.gold,g);}
 const arms=[];for(let xx of [-.48,.48]){let arm=new B.TransformNode('articulated arm',scene);arm.parent=g;arm.position.set(xx,1.31+yShift,0);ball('upper sleeve',0,-.20,0,.18,.32,.21,shirt,arm);ball('hand',0,-.49,.03,.13,.13,.13,face,arm);arms.push(arm);}
 const legs=[];for(let xx of [-.18,.18]){let leg=new B.TransformNode('walking leg',scene);leg.parent=g;leg.position.set(xx,.66+yShift,0);ball('tailored trouser',0,-.25,0,.17,.32,.19,opts.staff?P.navy2:P.chrome,leg);box('shoe',0,-.52,.12,.28,.12,.41,P.ink,leg);legs.push(leg);}
 actors.push({g,arms,legs,baseY:0,baseX:x,baseZ:z,opts,phase:actors.length*1.8});return g;}
 // Seated readers face desk, stationary hired staff always remain at assigned workstations.
 for(let i=0;i<studyPairs.length;i++){let [x,z]=studyPairs[i];let reader=actor('seated reader '+i,x-.55,z+1.05,{seated:true,skin:i%4,color:i%5,hijab:i===2});reader.rotation.y=Math.PI;}
 const borrow=actor('hired borrowing specialist',G.INITIAL_STAFF.borrowing[0],G.INITIAL_STAFF.borrowing[1]-.85,{staff:true,seated:true,skin:1});
 const reference=actor('hired reference specialist',G.INITIAL_STAFF.reference[0],G.INITIAL_STAFF.reference[1]-.80,{staff:true,seated:true,skin:2,hijab:true});
 const queueActors=[];for(let i=0;i<4;i++){let g=actor('waiting student '+i,6.65+i*.95,6.45,{skin:i%4,color:i%5,hijab:i===3});g.rotation.y=Math.PI;queueActors.push(g);}
 // Animated visitors circulate along curated unblocked paths, not through desks.
 let walkers=[];const WALK_PATHS=[[[ -9.8,6.7],[-6.8,6.7],[-6.8,5.8],[-4.2,5.8]],[[1.7,6.6],[3.7,6.6],[3.7,4.4],[5.3,4.4]],[[ -11,1.1],[-10.3,1.1],[-10.3,-2.2],[-9.9,-2.2]],[[5.3,-2],[8.4,-2],[8.4,-3.2],[9,-3.2]]];
 for(let i=0;i<WALK_PATHS.length;i++){let path=WALK_PATHS[i];let g=actor('moving university student '+i,path[0][0],path[0][1],{skin:(i+1)%4,color:(i+2)%5});walkers.push({g,path,seg:0,t:i*.22,actor:actors[actors.length-1]});}
 // Cleaner is confined to a visibly marked corridor/cleaning zone.
 const zone=G.INITIAL_STAFF.cleanerZone;const clean=actor('cleaning staff in zone',9.8,-6.9,{cleaner:true,skin:2});const cleaner=actors[actors.length-1];clean.rotation.y=Math.PI/4;
 const mop=cyl('cleaning mop handle',10.1,.8,-6.7,.045,1.7,P.wood);mop.rotation.z=.25;box('mop pad',10.26,.13,-6.7,.65,.09,.30,P.screen);box('caution bucket',10.6,.3,-5.9,.50,.6,.52,P.goldLight);
 const cleanZone=box('cleaner station floor tile',9.8,.08,-6.2,2.9,.015,2.5,mat('soft cleaning floor marker','#4e9175',{alpha:.13}));
 let pointerDown=null,pointerDragged=false,lastX=0,lastY=0;
 const restrict=(num,min,max)=>Math.max(min,Math.min(max,num));
 const pick=(clientX,clientY)=>{let rect=canvas.getBoundingClientRect();const p=scene.pick(clientX-rect.left,clientY-rect.top);let mesh=p?.pickedMesh;while(mesh){if(mesh.metadata?.type)return mesh.metadata;mesh=mesh.parent;}return null;};
 function onDown(e){if(e.button&&e.button!==0)return;pointerDown={x:e.clientX,y:e.clientY};lastX=e.clientX;lastY=e.clientY;pointerDragged=false;canvas.setPointerCapture?.(e.pointerId);}
 function onMove(e){if(!pointerDown)return;let dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;if(Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>5)pointerDragged=true;if(pointerDragged){camera.target.x=restrict(camera.target.x-dx*.017,-4,4);camera.target.z=restrict(camera.target.z-dy*.020,-4,4);}}
 function onUp(e){if(pointerDown&&!pointerDragged){const metadata=pick(e.clientX,e.clientY);if(metadata)onAction(metadata);}pointerDown=null;pointerDragged=false;}
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>pointerDown=null);canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1:-1);},{passive:false});
 function zoom(delta){let h=camera.orthoTop;h=restrict(h*(delta>0?.87:1.14),10.1,20.5);let ratio=canvas.clientWidth/Math.max(1,canvas.clientHeight);camera.orthoTop=h;camera.orthoBottom=-h;camera.orthoLeft=-h*ratio;camera.orthoRight=h*ratio;}
 function reset(){camera.target.set(0,1,0);camera.orthoTop=14.6;camera.orthoBottom=-14.6;let ratio=canvas.clientWidth/Math.max(1,canvas.clientHeight);camera.orthoLeft=-14.6*ratio;camera.orthoRight=14.6*ratio;}
 function updateUpgrade(lvl){for(let i=0;i<shelves.length;i++){shelves[i].halo.scaling.setAll(1+.06*(lvl-1));}P.wood3.diffuseColor=c(lvl>=3?'#d9a365':lvl===2?'#ba8155':'#c28e60');}
 function markBookDone(done){for(let s of shelves){s.halo.setEnabled(!done);s.tag.setEnabled(!done);s.touch.isPickable=!done;} }
 function animate(t,s,dt){const sec=t*.001;for(let p of actors){let seated=p.opts.seated,isMoving=!seated&&!p.opts.staff&&!p.opts.cleaner&&p.g.name.includes('moving');let intensity=isMoving?1:.17;p.arms[0].rotation.x=Math.sin(sec*2.5+p.phase)*.25*intensity;p.arms[1].rotation.x=-p.arms[0].rotation.x;p.legs[0].rotation.x=isMoving?Math.sin(sec*3.8+p.phase)*.35:0;p.legs[1].rotation.x=-p.legs[0].rotation.x;p.g.position.y=Math.sin(sec*2+p.phase)*.018;}
 for(let v of walkers){let a=v.path[v.seg],b=v.path[(v.seg+1)%v.path.length];v.t+=dt*.12;if(v.t>=1){v.t-=1;v.seg=(v.seg+1)%v.path.length;a=v.path[v.seg];b=v.path[(v.seg+1)%v.path.length];}v.g.position.x=a[0]+(b[0]-a[0])*v.t;v.g.position.z=a[1]+(b[1]-a[1])*v.t;v.g.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);}
 // Deterministic cleaner movement strictly inside one rectangle.
 cleaner.g.position.x=restrict(9.8+Math.sin(sec*.7)*.7,zone.minX,zone.maxX);cleaner.g.position.z=restrict(-6.3+Math.cos(sec*.7)*.58,zone.minZ,zone.maxZ);
 mop.position.x=cleaner.g.position.x+.35;mop.position.z=cleaner.g.position.z+.22;cleaner.g.rotation.y=Math.sin(sec*.7)*.25;
 queueActors.forEach((q,i)=>{q.setEnabled(i<Math.max(0,Math.min(4,s.queue)));});
 for(let i=0;i<shelves.length;i++)shelves[i].halo.visibility=.60+Math.sin(sec*2.2+i)*.30;
 }
 let last=performance.now(),current=initial;engine.runRenderLoop(()=>{let now=performance.now(),dt=Math.min(.06,(now-last)/1000);last=now;animate(now,current,dt);scene.render();});
 window.addEventListener('resize',resize);
 return {scene,engine,camera,zoom,reset,updateUpgrade,markBookDone,setState:s=>current=s,dispose:()=>{window.removeEventListener('resize',resize);engine.dispose();}};
}
root.createLibraryWorld=createWorld;
})(typeof window!=='undefined'?window:globalThis);