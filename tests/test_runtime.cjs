'use strict';
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const N = require('../tycoon_navigation.js');
function source(start,end) { const a=html.indexOf(start),b=html.indexOf(end,a+start.length); assert.ok(a>=0&&b>a);return html.substring(a,b); }
const agents=[],staffAgents=[],visualQA={obstacleAvoidance:0};
const blocks=[{x0:1,x1:3,z0:-1,z1:1,kind:'desk'},{x0:5.7,x1:6.3,z0:-.3,z1:.3,kind:'chair'}];
const R22={on:true,route:(a,b,opts)=>N.plan(a,b,blocks,opts),moveSafe:(actor,x,z)=>{const m=N.move(actor,{x,z},blocks);actor.x=m.x;actor.z=m.z;}};
const context={window:{R22},R22,agents,staffAgents,visualQA,Math};vm.createContext(context);
vm.runInContext(source('function setPath(a,ps)','function stationQueuePosition(job,i)'),context);
const a={id:1,x:0,z:0,kind:'visitor',mode:'browsing',pace:0,heading:0,path:[]};agents.push(a);
context.setPath(a,[{x:4,z:0}]);assert.equal(a.navBlocked,false);assert.ok(a.path.length>1);
for(let i=0;i<1000;i++){if(context.march(a,0.045))break;assert.equal(N.blocked(a,blocks),false,`clipping at tick ${i}: ${JSON.stringify(a)}`);}
assert.equal(a.path.length,0);assert.ok(Math.hypot(a.x-4,a.z)<0.2);console.log('PASS real setPath/march integration around desk');
const seated={id:2,x:4,z:-2,mode:'browsing',pace:0,heading:0,seat:{x:6,z:0,face:0},path:[]};agents.push(seated);
context.setPath(seated,[{x:6,z:0}]);assert.equal(seated.navBlocked,false);
for(let i=0;i<1000;i++){if(context.march(seated,0.045))break;assert.equal(N.blocked(seated,blocks),false);}
assert.equal(seated.path.length,0);assert.ok(Math.hypot(seated.x-6,seated.z)<1.5);assert.equal(N.blocked(seated,blocks),false);
console.log('PASS real browsing/march stops at seat approach');
const circle=[{x0:-2,x1:2,z0:2,z1:2.6},{x0:-2,x1:2,z0:-2.6,z1:-2},{x0:-2.6,x1:-2,z0:-2,z1:2},{x0:2,x1:2.6,z0:-2,z1:2}];
const isolated={id:3,x:0,z:0,mode:'browsing',pace:0,heading:0,path:[]};
const old=blocks.splice(0,blocks.length,...circle);
context.setPath(isolated,[{x:4,z:0}]);assert.equal(isolated.navBlocked,true);
assert.equal(context.march(isolated,0.045),false);assert.equal(isolated.x,0);
console.log('PASS route failure stalls actor rather than granting an impossible arrival');
// Verify a staff target originally inside a desk receives a legal standing anchor.
blocks.splice(0,blocks.length,{x0:1.5,x1:2.5,z0:-0.7,z1:0.7,kind:'desk'});
const st={id:4,kind:'staff',x:0,z:0,mode:'staff',station:{x:2,z:0},pace:0,heading:0,path:[]};staffAgents.push(st);
context.setPath(st,[{x:2,z:0}]);
assert.equal(st.navBlocked,false);assert.ok(st.stationApproach);
assert.equal(N.blocked(st.stationApproach,blocks),false);
for(let i=0;i<1000;i++){if(context.march(st,0.045))break;assert.equal(N.blocked(st,blocks),false);}
assert.equal(st.path.length,0);
assert.ok(Math.hypot(st.x-st.stationApproach.x,st.z-st.stationApproach.z)<.2);
console.log('PASS staff standing anchors remain reachable at furniture-clipped stations');
