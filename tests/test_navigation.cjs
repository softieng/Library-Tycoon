'use strict';
const assert = require('node:assert/strict');
const N = require('../tycoon_navigation.js');
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function checkPath(start, path, blocks, radius = 0.24) {
  let from = start;
  for (const p of path) {
    assert.equal(N.blocked(p, blocks, radius), false, `waypoint inside furniture: ${JSON.stringify(p)}`);
    assert.equal(N.lineClear(from, p, blocks, radius), true, `line intersects furniture from ${JSON.stringify(from)} to ${JSON.stringify(p)}`);
    from = p;
  }
}
const box = (x0,x1,z0,z1,kind='desk') => ({x0,x1,z0,z1,kind});
const chair = box(3.7,4.3,-.3,.3,'chair');
test('clear path remains direct', () => {
 const path = N.plan({x:0,z:0},[{x:2,z:0}],[]);assert.equal(path.blocked,undefined);assert.deepEqual(path,[{x:2,z:0}]);
});
test('wall desk forces a detour, no intersection', () => {
 const blocks=[box(1,3,-1,1)];const s={x:0,z:0};const p=N.plan(s,[{x:4,z:0}],blocks);
 assert.equal(p.blocked,undefined);assert.ok(p.length>=2);checkPath(s,p,blocks);assert.equal(p.at(-1).x,4);
});
test('a chair is a solid obstacle, never skipped',()=>{
 const b=[chair],s={x:3,z:-1};const p=N.plan(s,[{x:5,z:0}],b);assert.equal(p.blocked,undefined);checkPath(s,p,b);
});
test('seat target returns approach point, not chair centre',()=>{
 const b=[chair,box(4.3,5.3,-.5,.5,'table')],seat={x:4,z:0,face:Math.PI/2};const s={x:1,z:0};
 const p=N.plan(s,[{x:4,z:0}],b,{seat});assert.equal(p.blocked,undefined);checkPath(s,p,b);
 assert.ok(N.blocked(seat,b));assert.ok(!N.blocked(p.at(-1),b));assert.ok(Math.hypot(p.at(-1).x-4,p.at(-1).z)<2);
});
test('blocked queue or counter goal is projected to safe side',()=>{
 const b=[box(2.5,3.5,-1,1)],s={x:0,z:0};const p=N.plan(s,[{x:3,z:0}],b);
 assert.equal(p.blocked,undefined);checkPath(s,p,b);assert.ok(!N.blocked(p.at(-1),b));
});
test('intermediate waypoint inside furniture is projected',()=>{
 const b=[box(1,2,-.5,.5)],s={x:0,z:0};const p=N.plan(s,[{x:1.5,z:0},{x:4,z:0}],b);assert.equal(p.blocked,undefined);checkPath(s,p,b);
});
test('unreachable room is BLOCKED, never returns fake direct path',()=>{
 const b=[box(-1,1,-2,-1),box(-1,1,1,2),box(-2,-1,-1,1),box(1,2,-1,1)];
 const p=N.plan({x:0,z:0},[{x:4,z:0}],b);assert.equal(p.blocked,true);
});
test('moving fast cannot tunnel through desks or chairs',()=>{
 const b=[box(.8,1.2,-.5,.5),box(2.8,3.2,-.5,.5,'chair')];
 const s={x:0,z:0};const p=N.move(s,{x:4,z:0},b);assert.equal(N.lineClear(s,p,b),true);assert.notDeepEqual(p,{x:4,z:0});
});
test('axis sliding respects blockers',()=>{
 const b=[box(.5,1.5,-.25,.25)];const s={x:0,z:0};const p=N.move(s,{x:1,z:1},b);assert.equal(N.lineClear(s,p,b),true);
});
test('routes with multiple reading-room waypoints stay outside furniture',()=>{
 const b=[box(0.8,1.5,-1,1),box(2.0,2.8,-1,1),box(3.3,4.0,-1,1)];const s={x:0,z:-3};
 const p=N.plan(s,[{x:0,z:0},{x:3,z:3},{x:5,z:0}],b);assert.equal(p.blocked,undefined);checkPath(s,p,b);
});
test('bounded performance on a furnishing-like scene',()=>{
 const b=[];for(let i=0;i<35;i++)b.push(box(-12+(i%7)*3,-11+(i%7)*3,-9+Math.floor(i/7)*4,-8+Math.floor(i/7)*4));
 const s={x:-14,z:-13},t={x:13,z:13};const at=performance.now();let last;
 for(let k=0;k<12;k++){last=N.plan(s,[t],b);assert.equal(last.blocked,undefined);checkPath(s,last,b);}
 const ms=performance.now()-at;assert.ok(ms<1500,`too slow: ${ms} ms`); console.log('navigation 12 routes:',ms.toFixed(1),'ms');
});
let failed=0;for(const {name,fn} of tests){try{fn();console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.stack)}}
console.log(`${tests.length-failed}/${tests.length} navigation tests passed`);process.exitCode=failed?1:0;
